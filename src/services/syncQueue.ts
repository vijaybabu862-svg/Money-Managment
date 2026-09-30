import { SyncQueueItem, SyncOperation, SyncQueueStatus } from '../types/sync';

const QUEUE_STORAGE_KEY = 'cashflow_sync_queue_v9';
const MAX_ATTEMPTS = 5;

const getStorage = (): Storage | null => {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
  return null;
};

export function computeBackoffDelay(attempts: number): number {
  // Bounded exponential backoff: 1s, 2s, 4s, 8s, 16s... up to max 60s
  const baseMs = 1000;
  const factor = Math.min(6, Math.max(0, attempts));
  return Math.min(60000, baseMs * Math.pow(2, factor));
}

export function isItemReadyForRetry(item: SyncQueueItem): boolean {
  if (item.status !== 'PENDING') return false;
  if (!item.lastAttemptAt || item.attempts === 0) return true;
  const elapsed = Date.now() - new Date(item.lastAttemptAt).getTime();
  const backoff = computeBackoffDelay(item.attempts);
  return elapsed >= backoff;
}

export function recoverStuckSyncingQueue(): number {
  const current = loadSyncQueue();
  let recoveredCount = 0;
  const modified = current.map((item) => {
    if (item.status === 'SYNCING') {
      recoveredCount++;
      return { ...item, status: 'PENDING' as SyncQueueStatus };
    }
    return item;
  });
  if (recoveredCount > 0) {
    saveSyncQueue(modified);
  }
  return recoveredCount;
}

export function loadSyncQueue(): SyncQueueItem[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SyncQueueItem[];
  } catch {
    return [];
  }
}

export function saveSyncQueue(queue: SyncQueueItem[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[SyncQueue] Failed to persist sync queue:', err);
  }
}

export function enqueueSyncMutation(
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  operation: SyncOperation,
  payload: unknown
): SyncQueueItem {
  const currentQueue = loadSyncQueue();

  // If there's an existing PENDING item for this exact entity, coalesce/update it
  const existingIndex = currentQueue.findIndex(
    (item) => item.entityId === entityId && item.entityType === entityType && item.status === 'PENDING'
  );

  let queueItem: SyncQueueItem;

  if (existingIndex >= 0) {
    const existing = currentQueue[existingIndex];
    // If it was CREATE and now UPDATE, keep CREATE with new payload
    const effectiveOp: SyncOperation = existing.operation === 'CREATE' && operation === 'UPDATE' ? 'CREATE' : operation;

    queueItem = {
      ...existing,
      operation: effectiveOp,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      error: undefined,
    };
    currentQueue[existingIndex] = queueItem;
  } else {
    queueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      entityType,
      entityId,
      operation,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: 'PENDING',
    };
    currentQueue.push(queueItem);
  }

  saveSyncQueue(currentQueue);
  return queueItem;
}

export function markQueueItemSyncing(id: string): void {
  const queue = loadSyncQueue();
  const item = queue.find((i) => i.id === id);
  if (item) {
    item.status = 'SYNCING';
    item.lastAttemptAt = new Date().toISOString();
    saveSyncQueue(queue);
  }
}

export function markQueueItemSuccess(id: string): void {
  const queue = loadSyncQueue();
  // Filter out completed item or mark as completed
  const remaining = queue.filter((i) => i.id !== id);
  saveSyncQueue(remaining);
}

export function markQueueItemFailed(id: string, errorMsg: string): void {
  const queue = loadSyncQueue();
  const item = queue.find((i) => i.id === id);
  if (item) {
    item.attempts += 1;
    item.error = errorMsg;
    item.lastAttemptAt = new Date().toISOString();
    item.status = item.attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
    saveSyncQueue(queue);
  }
}

export function getPendingQueueCount(): number {
  const queue = loadSyncQueue();
  return queue.filter((i) => i.status === 'PENDING' || i.status === 'SYNCING').length;
}

export function getFailedQueueCount(): number {
  const queue = loadSyncQueue();
  return queue.filter((i) => i.status === 'FAILED').length;
}

export function clearCompletedAndFailedQueue(): void {
  saveSyncQueue([]);
}
