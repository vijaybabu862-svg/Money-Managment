import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { AppState } from './storage';
import { CloudBackupRecord, DeviceRecord } from '../types/sync';
import { generateIntegrityChecksum } from './backupService';
import { validateCloudPayload } from './cloudValidator';
import { SCHEMA_VERSION } from '../version';

export function parseFirebaseError(err: unknown): string {
  if (!err) return 'Unknown cloud error';
  const msg = (err as Error).message || String(err);
  if (msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')) {
    return 'Cloud sync permission was denied. Please re-authenticate your Google Account.';
  }
  if (msg.includes('unavailable') || msg.includes('UNAVAILABLE') || msg.includes('network-request-failed')) {
    return 'Cloud sync service is temporarily unavailable. Local data is safe and pending changes will sync when online.';
  }
  if (msg.includes('unauthenticated') || msg.includes('UNAUTHENTICATED')) {
    return 'Session expired. Please sign in to sync your changes.';
  }
  return msg;
}

export const CloudRepository = {
  /**
   * Uploads a single document under users/{userId}/{collectionName}/{docId}
   */
  async uploadEntity(
    userId: string,
    collectionName: string,
    docId: string,
    data: unknown
  ): Promise<{ success: boolean; error?: string }> {
    // Stage 10 Pre-write validation
    const validation = validateCloudPayload(collectionName, docId, data, userId);
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Invalid cloud payload.' };
    }

    if (!isFirebaseConfigured() || !db) {
      return { success: false, error: 'Firebase is not configured for cloud storage.' };
    }
    try {
      const docRef = doc(db, 'users', userId, collectionName, docId);
      const sanitized = JSON.parse(JSON.stringify(data));
      await setDoc(docRef, {
        ...sanitized,
        _syncUpdatedAt: new Date().toISOString(),
        _schemaVersion: SCHEMA_VERSION,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: parseFirebaseError(err) };
    }
  },

  /**
   * Deletes a document from the cloud
   */
  async deleteEntity(
    userId: string,
    collectionName: string,
    docId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isFirebaseConfigured() || !db) {
      return { success: false, error: 'Firebase is not configured.' };
    }
    try {
      const docRef = doc(db, 'users', userId, collectionName, docId);
      await deleteDoc(docRef);
      return { success: true };
    } catch (err) {
      return { success: false, error: parseFirebaseError(err) };
    }
  },

  /**
   * Fetches all documents from a user subcollection
   */
  async fetchCollection<T>(
    userId: string,
    collectionName: string
  ): Promise<{ success: boolean; data: T[]; error?: string }> {
    if (!isFirebaseConfigured() || !db) {
      return { success: false, data: [], error: 'Firebase not configured.' };
    }
    try {
      const colRef = collection(db, 'users', userId, collectionName);
      const snap = await getDocs(colRef);
      const items = snap.docs.map((d) => d.data() as T);
      return { success: true, data: items };
    } catch (err) {
      return { success: false, data: [], error: parseFirebaseError(err) };
    }
  },

  /**
   * Registers or updates a device record under users/{userId}/devices/{deviceId}
   */
  async registerDevice(userId: string, device: DeviceRecord): Promise<void> {
    if (!isFirebaseConfigured() || !db) return;
    try {
      const docRef = doc(db, 'users', userId, 'devices', device.deviceId);
      await setDoc(docRef, {
        ...device,
        lastActiveAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('[CloudRepository] Failed to register device:', err);
    }
  },

  /**
   * Fetches all registered devices for user
   */
  async fetchDevices(userId: string): Promise<DeviceRecord[]> {
    const res = await this.fetchCollection<DeviceRecord>(userId, 'devices');
    return res.data || [];
  },

  /**
   * Creates a full cloud backup snapshot in users/{userId}/backups/{backupId}
   */
  async createCloudBackup(
    userId: string,
    state: AppState,
    note?: string
  ): Promise<{ success: boolean; backup?: CloudBackupRecord; error?: string }> {
    if (!isFirebaseConfigured() || !db) {
      return { success: false, error: 'Firebase not configured.' };
    }
    try {
      const backupId = `cb_${Date.now()}`;
      const jsonStr = JSON.stringify(state);
      const checksum = generateIntegrityChecksum(jsonStr);

      const record: CloudBackupRecord = {
        id: backupId,
        backupId,
        createdAt: new Date().toISOString(),
        sizeBytes: typeof Buffer !== 'undefined' ? Buffer.byteLength(jsonStr, 'utf8') : jsonStr.length,
        recordCounts: {
          accounts: state.accounts?.length || 0,
          transactions: state.transactions?.length || 0,
          debts: state.debts?.length || 0,
          payments: state.payments?.length || 0,
          goals: state.goals?.length || 0,
          budgets: state.budgets?.length || 0,
        },
        storageSchemaVersion: SCHEMA_VERSION,
        checksum,
        note: note || 'Full Cloud Backup',
      };

      const docRef = doc(db, 'users', userId, 'backups', backupId);
      await setDoc(docRef, {
        record,
        data: state,
      });

      return { success: true, backup: record };
    } catch (err) {
      return { success: false, error: parseFirebaseError(err) };
    }
  },

  /**
   * Fetches available cloud backups
   */
  async listCloudBackups(userId: string): Promise<CloudBackupRecord[]> {
    if (!isFirebaseConfigured() || !db) return [];
    try {
      const colRef = collection(db, 'users', userId, 'backups');
      const q = query(colRef, orderBy('record.createdAt', 'desc'), limit(10));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data().record as CloudBackupRecord).filter(Boolean);
    } catch {
      return [];
    }
  },

  /**
   * Retrieves full state payload from a cloud backup for preview and restore
   */
  async getCloudBackupState(
    userId: string,
    backupId: string
  ): Promise<{ success: boolean; state?: AppState; error?: string }> {
    if (!isFirebaseConfigured() || !db) {
      return { success: false, error: 'Firebase not configured.' };
    }
    try {
      const docRef = doc(db, 'users', userId, 'backups', backupId);
      const snap = await getDoc(docRef);
      if (!snap || !snap.exists()) {
        return { success: false, error: 'Cloud backup record not found.' };
      }
      const data = snap.data()?.data as AppState;
      return { success: true, state: data };
    } catch (err) {
      return { success: false, error: parseFirebaseError(err) };
    }
  },

  /**
   * Bulk uploads initial local state to cloud under users/{userId}
   * Used for initial account linking
   */
  async uploadFullState(
    userId: string,
    state: AppState
  ): Promise<{ success: boolean; error?: string }> {
    if (!isFirebaseConfigured() || !db) {
      return { success: false, error: 'Firebase not configured.' };
    }
    try {
      const batch = writeBatch(db);

      // Accounts
      for (const acc of state.accounts || []) {
        const ref = doc(db, 'users', userId, 'accounts', acc.id);
        batch.set(ref, { ...acc, _schemaVersion: 9 });
      }

      // Transactions
      for (const tx of state.transactions || []) {
        const ref = doc(db, 'users', userId, 'transactions', tx.id);
        batch.set(ref, { ...tx, _schemaVersion: 9 });
      }

      // Debts
      for (const debt of state.debts || []) {
        const ref = doc(db, 'users', userId, 'debts', debt.id);
        batch.set(ref, { ...debt, _schemaVersion: 9 });
      }

      // Payments
      for (const p of state.payments || []) {
        const ref = doc(db, 'users', userId, 'payments', p.id);
        batch.set(ref, { ...p, _schemaVersion: 9 });
      }

      // Goals
      for (const g of state.goals || []) {
        const ref = doc(db, 'users', userId, 'goals', g.id);
        batch.set(ref, { ...g, _schemaVersion: 9 });
      }

      // Budgets
      for (const b of state.budgets || []) {
        const ref = doc(db, 'users', userId, 'budgets', b.id);
        batch.set(ref, { ...b, _schemaVersion: 9 });
      }

      await batch.commit();
      return { success: true };
    } catch (err) {
      return { success: false, error: parseFirebaseError(err) };
    }
  },

  /**
   * Completely deletes user cloud data under users/{userId}
   * Strictly requires explicit confirmation
   */
  async deleteUserCloudData(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!isFirebaseConfigured() || !db) {
      return { success: false, error: 'Firebase not configured.' };
    }
    try {
      const collectionsToClear = [
        'accounts',
        'transactions',
        'debts',
        'payments',
        'goals',
        'budgets',
        'devices',
        'backups',
        'conflicts',
      ];

      for (const colName of collectionsToClear) {
        const colRef = collection(db, 'users', userId, colName);
        const snap = await getDocs(colRef);
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: parseFirebaseError(err) };
    }
  },
};
