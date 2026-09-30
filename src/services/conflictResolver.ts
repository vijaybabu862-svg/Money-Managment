import { SyncConflict, ConflictResolution } from '../types/sync';
import { Transaction, Account, Debt, Payment } from '../types/finance';
import { recordAuditEvent } from './auditService';
import { AppState, StorageService } from './storage';

const CONFLICTS_STORAGE_KEY = 'cashflow_sync_conflicts_v9';

const getStorage = (): Storage | null => {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
  return null;
};

export function loadStoredConflicts(): SyncConflict[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(CONFLICTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SyncConflict[];
  } catch {
    return [];
  }
}

export function saveStoredConflicts(conflicts: SyncConflict[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(CONFLICTS_STORAGE_KEY, JSON.stringify(conflicts));
  } catch (err) {
    console.warn('[ConflictResolver] Failed to save conflicts:', err);
  }
}

/**
 * Checks whether an incoming cloud entity conflicts with an existing local entity.
 * Financial records (amount, type, account, date) are protected with strict conflict detection.
 */
export function detectFinancialConflict(
  entityType: SyncConflict['entityType'],
  localEntity: unknown,
  cloudEntity: unknown,
  deviceId: string
): SyncConflict | null {
  if (!localEntity || !cloudEntity) return null;

  const local = localEntity as Record<string, any>;
  const cloud = cloudEntity as Record<string, any>;

  // If payloads are byte-for-byte identical, there is no conflict
  if (JSON.stringify(local) === JSON.stringify(cloud)) {
    return null;
  }

  // Financial Transaction conflict detection
  if (entityType === 'TRANSACTION') {
    const txLocal = local as Transaction;
    const txCloud = cloud as Transaction;

    const amountDiff = Math.abs(txLocal.amount - txCloud.amount) > 0.01;
    const dateDiff = txLocal.date !== txCloud.date;
    const typeDiff = txLocal.type !== txCloud.type;
    const accountDiff = txLocal.accountId !== txCloud.accountId;

    if (amountDiff || dateDiff || typeDiff || accountDiff) {
      return {
        id: `conflict_${txLocal.id}_${Date.now()}`,
        entityType: 'TRANSACTION',
        entityId: txLocal.id,
        localVersion: txLocal,
        cloudVersion: txCloud,
        detectedAt: new Date().toISOString(),
        deviceId,
        status: 'OPEN',
      };
    }
  }

  // Account balance / name conflict detection
  if (entityType === 'ACCOUNT') {
    const accLocal = local as Account;
    const accCloud = cloud as Account;

    const balanceDiff = Math.abs(accLocal.currentBalance - accCloud.currentBalance) > 0.01;
    if (balanceDiff) {
      return {
        id: `conflict_${accLocal.id}_${Date.now()}`,
        entityType: 'ACCOUNT',
        entityId: accLocal.id,
        localVersion: accLocal,
        cloudVersion: accCloud,
        detectedAt: new Date().toISOString(),
        deviceId,
        status: 'OPEN',
      };
    }
  }

  // Debt balance conflict detection
  if (entityType === 'DEBT') {
    const debtLocal = local as Debt;
    const debtCloud = cloud as Debt;

    const principalDiff = Math.abs(
      (debtLocal.outstandingPrincipal ?? 0) - (debtCloud.outstandingPrincipal ?? 0)
    ) > 0.01;

    if (principalDiff) {
      return {
        id: `conflict_${debtLocal.id}_${Date.now()}`,
        entityType: 'DEBT',
        entityId: debtLocal.id,
        localVersion: debtLocal,
        cloudVersion: debtCloud,
        detectedAt: new Date().toISOString(),
        deviceId,
        status: 'OPEN',
      };
    }
  }

  // For non-financial fields (or if timestamps match), perform safe merge without creating open conflict
  return null;
}

/**
 * Resolves a sync conflict with an explicit user choice.
 * Generates an audit trail event and updates the financial state appropriately.
 */
export function resolveSyncConflict(
  currentState: AppState,
  conflict: SyncConflict,
  resolution: ConflictResolution
): {
  updatedState: AppState;
  auditMessage: string;
} {
  let updatedState = { ...currentState };
  let auditSummary = '';

  if (conflict.entityType === 'TRANSACTION') {
    const localTx = conflict.localVersion as Transaction;
    const cloudTx = conflict.cloudVersion as Transaction;

    if (resolution === 'KEEP_LOCAL') {
      // Keep local version intact; will overwrite cloud on next sync
      auditSummary = `Resolved conflict on transaction ${localTx.id}: Kept local version (₹${localTx.amount})`;
    } else if (resolution === 'KEEP_CLOUD') {
      // Replace local transaction with cloud version
      updatedState = {
        ...updatedState,
        transactions: (updatedState.transactions || []).map((t) => (t.id === cloudTx.id ? cloudTx : t)),
      };
      auditSummary = `Resolved conflict on transaction ${cloudTx.id}: Applied cloud version (₹${cloudTx.amount})`;
    } else if (resolution === 'KEEP_BOTH') {
      // Create secondary transaction for cloud version with unique ID to preserve both monetary values
      const secondaryTx: Transaction = {
        ...cloudTx,
        id: `tx_cloud_copy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        description: `${cloudTx.description || 'Transaction'} (Cloud Synced Copy)`,
        notes: `Preserved via conflict resolution 'Keep Both' on device ${conflict.deviceId}`,
      };
      updatedState = {
        ...updatedState,
        transactions: [secondaryTx, ...(updatedState.transactions || [])],
      };
      auditSummary = `Resolved conflict on transaction ${localTx.id}: Kept both versions (Local ₹${localTx.amount}, Cloud ₹${cloudTx.amount})`;
    } else if (resolution === 'MERGE') {
      // Keep local amount & accounting fields, merge notes/description
      const mergedTx: Transaction = {
        ...localTx,
        description: cloudTx.description || localTx.description,
        notes: `${localTx.notes || ''}\nCloud note: ${cloudTx.notes || ''}`.trim(),
        updatedAt: new Date().toISOString(),
      };
      updatedState = {
        ...updatedState,
        transactions: (updatedState.transactions || []).map((t) => (t.id === mergedTx.id ? mergedTx : t)),
      };
      auditSummary = `Resolved conflict on transaction ${localTx.id}: Merged metadata`;
    }
  }

  // Record audit trail event
  const newAuditEvents = recordAuditEvent(
    updatedState.auditEvents || [],
    'UPDATE',
    conflict.entityType,
    conflict.entityId,
    auditSummary || `Resolved sync conflict (${resolution}) on ${conflict.entityType} ${conflict.entityId}`,
    {
      before: conflict.localVersion,
      after: conflict.cloudVersion,
      source: 'SYNC_RESOLVER',
    }
  );

  updatedState.auditEvents = newAuditEvents;
  StorageService.saveState(updatedState);

  // Update conflict in stored list
  const allConflicts = loadStoredConflicts();
  const updatedConflicts = allConflicts.map((c) =>
    c.id === conflict.id
      ? {
          ...c,
          status: 'RESOLVED' as const,
          resolution,
          resolvedAt: new Date().toISOString(),
        }
      : c
  );
  saveStoredConflicts(updatedConflicts);

  return {
    updatedState,
    auditMessage: auditSummary,
  };
}
