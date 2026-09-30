import { Transaction, Account, Debt, Payment, Budget, Goal } from './finance';

/**
 * CASH FLOW — Stage 9 Cloud Sync & Authentication Types
 */

export type SyncState = 'LOCAL_ONLY' | 'PENDING_UPLOAD' | 'SYNCED' | 'CONFLICT' | 'ERROR';

export interface SyncMetadata {
  entityId: string;
  version: number;
  updatedAt: string;
  createdAt: string;
  deviceId: string;
  userId?: string;
  syncState: SyncState;
  deletedAt?: string;
}

export interface DeviceRecord {
  deviceId: string;
  name: string;
  platform: string;
  browser?: string;
  firstSeenAt: string;
  lastActiveAt: string;
  lastSyncAt?: string;
  appVersion: string;
  isCurrentDevice?: boolean;
}

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncQueueStatus = 'PENDING' | 'SYNCING' | 'FAILED' | 'COMPLETED';

export interface SyncQueueItem {
  id: string;
  entityType: 'TRANSACTION' | 'ACCOUNT' | 'DEBT' | 'PAYMENT' | 'BUDGET' | 'GOAL' | 'SETTINGS' | 'PROFILE';
  entityId: string;
  operation: SyncOperation;
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  error?: string;
  status: SyncQueueStatus;
}

export type ConflictResolution = 'KEEP_LOCAL' | 'KEEP_CLOUD' | 'KEEP_BOTH' | 'MERGE';

export interface SyncConflict {
  id: string;
  entityType: 'TRANSACTION' | 'ACCOUNT' | 'DEBT' | 'PAYMENT' | 'BUDGET' | 'GOAL' | 'SETTINGS';
  entityId: string;
  localVersion: unknown;
  cloudVersion: unknown;
  detectedAt: string;
  deviceId: string;
  status: 'OPEN' | 'RESOLVED';
  resolution?: ConflictResolution;
  resolvedAt?: string;
}

export type OverallSyncStatus = 'SYNCED' | 'SYNCING' | 'OFFLINE' | 'PENDING' | 'CONFLICT' | 'ERROR';

export interface CloudBackupRecord {
  id: string;
  backupId: string;
  createdAt: string;
  sizeBytes: number;
  recordCounts: {
    accounts: number;
    transactions: number;
    debts: number;
    payments: number;
    goals: number;
    budgets: number;
  };
  storageSchemaVersion: number;
  checksum: string;
  note?: string;
}

export interface AuthState {
  status: 'loading' | 'signed_out' | 'signed_in';
  userId?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  isAnonymous?: boolean;
}

export type FirstRunLinkingChoice =
  | 'UPLOAD_LOCAL'
  | 'DOWNLOAD_CLOUD'
  | 'COMPARE'
  | 'KEEP_LOCAL_ONLY';

export interface CloudSyncSettings {
  syncEnabled: boolean;
  autoSyncOnOnline: boolean;
  syncIntervalMinutes: number;
  allowRawSmsCloudSync: boolean;
  lastSyncTimestamp?: string;
  activeDeviceId: string;
}
