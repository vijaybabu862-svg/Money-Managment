import {
  loadSyncQueue,
  markQueueItemSyncing,
  markQueueItemSuccess,
  markQueueItemFailed,
  getPendingQueueCount,
  getFailedQueueCount,
  recoverStuckSyncingQueue,
  isItemReadyForRetry,
} from './syncQueue';
import { CloudRepository } from './cloudRepository';
import { detectFinancialConflict, loadStoredConflicts, saveStoredConflicts } from './conflictResolver';
import { AppState, StorageService } from './storage';
import { getCurrentDeviceRecord } from './deviceService';
import { OverallSyncStatus, SyncConflict } from '../types/sync';
import { Transaction, Account, Debt, Payment } from '../types/finance';

const SYNC_STATUS_KEY = 'cashflow_overall_sync_status';
const LAST_SYNC_KEY = 'cashflow_last_sync_timestamp';

export function getStoredLastSyncTime(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return localStorage.getItem(LAST_SYNC_KEY);
}

export function setStoredLastSyncTime(isoDate: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.setItem(LAST_SYNC_KEY, isoDate);
}

export interface SyncEngineListener {
  onStatusChange?: (status: OverallSyncStatus) => void;
  onConflictsChange?: (conflicts: SyncConflict[]) => void;
  onStateUpdatedFromCloud?: (newState: AppState) => void;
}

export class SyncEngine {
  private userId: string | null = null;
  private isSyncing = false;
  private listeners: SyncEngineListener[] = [];
  private currentStatus: OverallSyncStatus = 'SYNCED';

  constructor() {
    recoverStuckSyncingQueue();
    this.updateOnlineStatus();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkReturn());
      window.addEventListener('offline', () => this.updateOnlineStatus());
    }
  }

  public setUserId(userId: string | null) {
    this.userId = userId;
    if (userId) {
      const dev = getCurrentDeviceRecord();
      CloudRepository.registerDevice(userId, dev);
    }
    this.updateOnlineStatus();
  }

  public getUserId(): string | null {
    return this.userId;
  }

  public getStatus(): OverallSyncStatus {
    return this.currentStatus;
  }

  public subscribe(listener: SyncEngineListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyStatus(status: OverallSyncStatus) {
    this.currentStatus = status;
    this.listeners.forEach((l) => l.onStatusChange?.(status));
  }

  private updateOnlineStatus() {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const conflicts = loadStoredConflicts().filter((c) => c.status === 'OPEN');

    if (!isOnline) {
      this.notifyStatus('OFFLINE');
      return;
    }

    if (conflicts.length > 0) {
      this.notifyStatus('CONFLICT');
      return;
    }

    const failed = getFailedQueueCount();
    if (failed > 0) {
      this.notifyStatus('ERROR');
      return;
    }

    const pending = getPendingQueueCount();
    if (pending > 0) {
      this.notifyStatus('PENDING');
    } else {
      this.notifyStatus('SYNCED');
    }
  }

  private handleNetworkReturn() {
    this.updateOnlineStatus();
    if (this.userId) {
      this.syncNow();
    }
  }

  /**
   * Main synchronization routine:
   * 1. Check connectivity & auth
   * 2. Push local mutations from SyncQueue
   * 3. Pull remote updates from Firestore
   * 4. Check for conflicts & apply changes
   */
  public async syncNow(overrideState?: AppState): Promise<{
    success: boolean;
    syncedItemsCount: number;
    conflictsDetected: number;
    error?: string;
  }> {
    if (this.isSyncing) {
      return { success: false, syncedItemsCount: 0, conflictsDetected: 0, error: 'Sync already in progress.' };
    }

    if (!this.userId) {
      this.updateOnlineStatus();
      return { success: false, syncedItemsCount: 0, conflictsDetected: 0, error: 'No user signed in for cloud sync.' };
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      this.notifyStatus('OFFLINE');
      return { success: false, syncedItemsCount: 0, conflictsDetected: 0, error: 'Device is offline.' };
    }

    this.isSyncing = true;
    this.notifyStatus('SYNCING');

    let syncedCount = 0;
    let conflictsCount = 0;

    try {
      const state = overrideState || StorageService.loadState();
      const device = getCurrentDeviceRecord();

      // Step 1: Process Local Outbox Queue with Bounded Backoff
      const queue = loadSyncQueue();
      const pendingItems = queue.filter((i) => i.status === 'PENDING' && isItemReadyForRetry(i));

      for (const item of pendingItems) {
        markQueueItemSyncing(item.id);
        const colName = this.mapEntityTypeToCollection(item.entityType);

        if (item.operation === 'DELETE') {
          const res = await CloudRepository.deleteEntity(this.userId, colName, item.entityId);
          if (res.success) {
            markQueueItemSuccess(item.id);
            syncedCount++;
          } else {
            markQueueItemFailed(item.id, res.error || 'Delete failed');
          }
        } else {
          const res = await CloudRepository.uploadEntity(this.userId, colName, item.entityId, item.payload);
          if (res.success) {
            markQueueItemSuccess(item.id);
            syncedCount++;
          } else {
            markQueueItemFailed(item.id, res.error || 'Upload failed');
          }
        }
      }

      // Step 2: Pull Remote Changes from Firestore
      const remoteTxs = await CloudRepository.fetchCollection<Transaction>(this.userId, 'transactions');
      const remoteAccs = await CloudRepository.fetchCollection<Account>(this.userId, 'accounts');
      const remoteDebts = await CloudRepository.fetchCollection<Debt>(this.userId, 'debts');
      const remotePayments = await CloudRepository.fetchCollection<Payment>(this.userId, 'payments');

      let updatedState = { ...state };
      let stateModified = false;
      const newConflicts: SyncConflict[] = [];

      // Reconcile Transactions
      if (remoteTxs.success && remoteTxs.data.length > 0) {
        const localTxMap = new Map((updatedState.transactions || []).map((t) => [t.id, t]));

        for (const rTx of remoteTxs.data) {
          const lTx = localTxMap.get(rTx.id);
          if (!lTx) {
            // New transaction from another device: add to local ledger
            updatedState.transactions = [rTx, ...(updatedState.transactions || [])];
            stateModified = true;
            syncedCount++;
          } else {
            // Both exist: run financial conflict detector
            const conflict = detectFinancialConflict('TRANSACTION', lTx, rTx, device.deviceId);
            if (conflict) {
              newConflicts.push(conflict);
              conflictsCount++;
            }
          }
        }
      }

      // Reconcile Accounts
      if (remoteAccs.success && remoteAccs.data.length > 0) {
        const localAccMap = new Map((updatedState.accounts || []).map((a) => [a.id, a]));

        for (const rAcc of remoteAccs.data) {
          const lAcc = localAccMap.get(rAcc.id);
          if (!lAcc) {
            updatedState.accounts = [...(updatedState.accounts || []), rAcc];
            stateModified = true;
            syncedCount++;
          } else {
            const conflict = detectFinancialConflict('ACCOUNT', lAcc, rAcc, device.deviceId);
            if (conflict) {
              newConflicts.push(conflict);
              conflictsCount++;
            }
          }
        }
      }

      // Reconcile Debts
      if (remoteDebts.success && remoteDebts.data.length > 0) {
        const localDebtMap = new Map((updatedState.debts || []).map((d) => [d.id, d]));

        for (const rDebt of remoteDebts.data) {
          const lDebt = localDebtMap.get(rDebt.id);
          if (!lDebt) {
            updatedState.debts = [...(updatedState.debts || []), rDebt];
            stateModified = true;
            syncedCount++;
          } else {
            const conflict = detectFinancialConflict('DEBT', lDebt, rDebt, device.deviceId);
            if (conflict) {
              newConflicts.push(conflict);
              conflictsCount++;
            }
          }
        }
      }

      // Save conflicts if detected
      if (newConflicts.length > 0) {
        const existing = loadStoredConflicts();
        const merged = [...newConflicts, ...existing.filter((e) => !newConflicts.some((n) => n.id === e.id))];
        saveStoredConflicts(merged);
        this.listeners.forEach((l) => l.onConflictsChange?.(merged));
      }

      // If state received new records from cloud, commit to storage and notify
      if (stateModified) {
        StorageService.saveState(updatedState);
        this.listeners.forEach((l) => l.onStateUpdatedFromCloud?.(updatedState));
      }

      // Update timestamp and status
      const nowIso = new Date().toISOString();
      setStoredLastSyncTime(nowIso);
      this.isSyncing = false;
      this.updateOnlineStatus();

      return {
        success: true,
        syncedItemsCount: syncedCount,
        conflictsDetected: conflictsCount,
      };
    } catch (err: any) {
      this.isSyncing = false;
      this.notifyStatus('ERROR');
      return {
        success: false,
        syncedItemsCount: syncedCount,
        conflictsDetected: conflictsCount,
        error: err.message || 'Sync failed due to an unexpected error.',
      };
    }
  }

  private mapEntityTypeToCollection(entityType: string): string {
    switch (entityType) {
      case 'TRANSACTION':
        return 'transactions';
      case 'ACCOUNT':
        return 'accounts';
      case 'DEBT':
        return 'debts';
      case 'PAYMENT':
        return 'payments';
      case 'GOAL':
        return 'goals';
      case 'BUDGET':
        return 'budgets';
      default:
        return 'settings';
    }
  }
}

export const globalSyncEngine = new SyncEngine();
