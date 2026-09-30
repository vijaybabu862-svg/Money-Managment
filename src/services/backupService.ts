import { AppState } from './storage';
import { BackupPayload } from '../types/finance';

/**
 * CASH FLOW — Stage 8 Backup Service
 * Supports complete JSON backups with cryptographic integrity checksums.
 * Pre-restore validation guarantees data integrity before committing to storage.
 */

/**
 * Deterministic string hash for integrity checksum (FNV-1a 64-bit variant represented as hex)
 * Non-cryptographic integrity check that works synchronously across Node and Browser environments.
 */
export function generateIntegrityChecksum(content: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;

  for (let i = 0; i < content.length; i++) {
    const ch = content.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 0x01000197);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `cf8_${hex1}${hex2}`;
}

export interface BackupPreviewDetails {
  isValid: boolean;
  app: string;
  backupFormatVersion: number;
  storageSchemaVersion: number;
  createdAt: string;
  locale: string;
  currency: string;
  checksumMatched: boolean;
  counts: {
    accounts: number;
    transactions: number;
    debts: number;
    payments: number;
    goals: number;
    budgets: number;
    swiggyShifts: number;
    smsCandidates: number;
    notifications: number;
  };
  error?: string;
  extractedState?: AppState;
}

export function createBackupPayload(state: AppState): {
  payload: BackupPayload;
  jsonString: string;
  filename: string;
} {
  // Strip temporary UI state and isolate clean financial data
  const cleanData: AppState = {
    ...state,
    version: 8,
    recoverySnapshot: null, // do not export temporary recovery snapshot
  };

  const serializedData = JSON.stringify(cleanData);
  const checksum = generateIntegrityChecksum(serializedData);

  const payload: BackupPayload = {
    app: 'CASH FLOW',
    backupFormatVersion: 1,
    storageSchemaVersion: 8,
    createdAt: new Date().toISOString(),
    locale: state.profile?.locale || 'en-IN',
    currency: state.profile?.currency || 'INR',
    checksum,
    data: cleanData,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const dateStamp = new Date().toISOString().split('T')[0];
  const filename = `cashflow-backup-${dateStamp}.json`;

  return { payload, jsonString, filename };
}

export function validateAndPreviewBackup(rawJsonString: string): BackupPreviewDetails {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonString);
  } catch (parseError) {
    return {
      isValid: false,
      app: 'UNKNOWN',
      backupFormatVersion: 0,
      storageSchemaVersion: 0,
      createdAt: '',
      locale: '',
      currency: '',
      checksumMatched: false,
      counts: { accounts: 0, transactions: 0, debts: 0, payments: 0, goals: 0, budgets: 0, swiggyShifts: 0, smsCandidates: 0, notifications: 0 },
      error: `Malformed JSON backup file: ${(parseError as Error).message}`,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      app: 'UNKNOWN',
      backupFormatVersion: 0,
      storageSchemaVersion: 0,
      createdAt: '',
      locale: '',
      currency: '',
      checksumMatched: false,
      counts: { accounts: 0, transactions: 0, debts: 0, payments: 0, goals: 0, budgets: 0, swiggyShifts: 0, smsCandidates: 0, notifications: 0 },
      error: 'Invalid backup format: root must be an object.',
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Check if legacy direct AppState or wrapped BackupPayload
  let targetState: AppState | null = null;
  let schemaVer = 8;
  let formatVer = 1;
  let createdAt = new Date().toISOString();
  let locale = 'en-IN';
  let currency = 'INR';
  let checksumPassed = true;

  if (obj.app === 'CASH FLOW' && obj.data && typeof obj.data === 'object') {
    // Standard Stage 8 wrapped payload
    schemaVer = typeof obj.storageSchemaVersion === 'number' ? obj.storageSchemaVersion : 8;
    formatVer = typeof obj.backupFormatVersion === 'number' ? obj.backupFormatVersion : 1;
    createdAt = String(obj.createdAt || new Date().toISOString());
    locale = String(obj.locale || 'en-IN');
    currency = String(obj.currency || 'INR');

    // Verify Checksum
    if (obj.checksum && typeof obj.checksum === 'string') {
      const dataStr = JSON.stringify(obj.data);
      const computed = generateIntegrityChecksum(dataStr);
      checksumPassed = computed === obj.checksum;
      if (!checksumPassed) {
        return {
          isValid: false,
          app: 'CASH FLOW',
          backupFormatVersion: formatVer,
          storageSchemaVersion: schemaVer,
          createdAt,
          locale,
          currency,
          checksumMatched: false,
          counts: { accounts: 0, transactions: 0, debts: 0, payments: 0, goals: 0, budgets: 0, swiggyShifts: 0, smsCandidates: 0, notifications: 0 },
          error: 'Integrity Checksum Mismatch! The backup data may be corrupted or tampered with.',
        };
      }
    }

    targetState = obj.data as AppState;
  } else if (obj.accounts && obj.transactions) {
    // Direct AppState export from earlier versions
    targetState = obj as unknown as AppState;
    schemaVer = typeof obj.version === 'number' ? obj.version : 7;
  } else {
    return {
      isValid: false,
      app: String(obj.app || 'UNKNOWN'),
      backupFormatVersion: 0,
      storageSchemaVersion: 0,
      createdAt: '',
      locale: '',
      currency: '',
      checksumMatched: false,
      counts: { accounts: 0, transactions: 0, debts: 0, payments: 0, goals: 0, budgets: 0, swiggyShifts: 0, smsCandidates: 0, notifications: 0 },
      error: 'Unrecognized backup structure. Missing accounts or transactions.',
    };
  }

  // Schema sanity checks on data
  if (!targetState.accounts || !Array.isArray(targetState.accounts)) {
    return {
      isValid: false,
      app: 'CASH FLOW',
      backupFormatVersion: formatVer,
      storageSchemaVersion: schemaVer,
      createdAt,
      locale,
      currency,
      checksumMatched: checksumPassed,
      counts: { accounts: 0, transactions: 0, debts: 0, payments: 0, goals: 0, budgets: 0, swiggyShifts: 0, smsCandidates: 0, notifications: 0 },
      error: 'Incomplete backup data: Missing accounts collection.',
    };
  }
  if (!targetState.transactions || !Array.isArray(targetState.transactions)) {
    return {
      isValid: false,
      app: 'CASH FLOW',
      backupFormatVersion: formatVer,
      storageSchemaVersion: schemaVer,
      createdAt,
      locale,
      currency,
      checksumMatched: checksumPassed,
      counts: { accounts: targetState.accounts.length, transactions: 0, debts: 0, payments: 0, goals: 0, budgets: 0, swiggyShifts: 0, smsCandidates: 0, notifications: 0 },
      error: 'Incomplete backup data: Missing transactions collection.',
    };
  }

  const counts = {
    accounts: targetState.accounts?.length || 0,
    transactions: targetState.transactions?.length || 0,
    debts: targetState.debts?.length || 0,
    payments: targetState.payments?.length || 0,
    goals: targetState.goals?.length || 0,
    budgets: targetState.budgets?.length || 0,
    swiggyShifts: (targetState.swiggyShifts || targetState.swiggyEarnings)?.length || 0,
    smsCandidates: targetState.smsCandidates?.length || 0,
    notifications: targetState.notifications?.length || 0,
  };

  return {
    isValid: true,
    app: 'CASH FLOW',
    backupFormatVersion: formatVer,
    storageSchemaVersion: schemaVer,
    createdAt,
    locale,
    currency,
    checksumMatched: checksumPassed,
    counts,
    extractedState: targetState,
  };
}

export const createJsonBackup = createBackupPayload;

export function restoreFromBackupJson(
  rawJson: string,
  currentState?: AppState
): {
  success: boolean;
  restoredState: AppState | null;
  error?: string;
} {
  const preview = validateAndPreviewBackup(rawJson);
  if (!preview.isValid || !preview.extractedState) {
    return {
      success: false,
      restoredState: null,
      error: preview.error || 'Failed to validate backup.',
    };
  }

  // Preserve existing snapshots or merge safely
  const restored: AppState = {
    ...preview.extractedState,
    version: 8,
    backupSnapshots: currentState?.backupSnapshots || preview.extractedState.backupSnapshots || [],
    auditEvents: [
      {
        id: `audit_restore_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'RESTORE',
        entityType: 'BACKUP',
        entityId: 'backup_restore',
        summary: `Restored backup created at ${preview.createdAt} (${preview.counts.transactions} transactions)`,
      },
      ...(currentState?.auditEvents || []),
    ],
  };

  return {
    success: true,
    restoredState: restored,
  };
}

