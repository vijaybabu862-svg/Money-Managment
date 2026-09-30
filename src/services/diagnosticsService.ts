import {
  AppDiagnostics,
  AppError,
  FinancialNotification,
  SmsTransactionCandidate,
} from '../types/finance';
import { AppState } from './storage';
import { runDataIntegrityCheck } from './dataIntegrity';
import { APP_VERSION, SCHEMA_VERSION } from '../version';
import { isFirebaseConfigured } from './firebase';
import { getPendingQueueCount, getFailedQueueCount } from './syncQueue';
import { getStoredLastSyncTime } from './syncEngine';
import { loadStoredConflicts } from './conflictResolver';

/**
 * CASH FLOW — Stage 10 Diagnostics Service
 * Aggregates runtime system diagnostics, storage state, and error logs.
 * Export format contains technical metadata ONLY — zero raw SMS and zero account numbers.
 */

export function buildAppDiagnostics(state: AppState): AppDiagnostics {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const swActive =
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
  const pwaInstalled =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  const pendingSmsCount = (state.smsCandidates || []).filter(
    (c: SmsTransactionCandidate) => c.reviewStatus === 'PENDING'
  ).length;

  const urgentNotificationCount = (state.notifications || []).filter(
    (n: FinancialNotification) => n.priority === 'URGENT' && n.status === 'UNREAD'
  ).length;

  const integrity = runDataIntegrityCheck(state);
  const pendingQueue = getPendingQueueCount();
  const failedQueue = getFailedQueueCount();
  const openConflicts = loadStoredConflicts().filter((c) => c.status === 'OPEN').length;

  return {
    appVersion: APP_VERSION,
    storageVersion: state.version || SCHEMA_VERSION,
    pwaInstalled,
    serviceWorkerActive: swActive,
    isOnline,
    lastSaveAt: new Date().toISOString(),
    lastBackupAt: state.reliabilitySettings?.lastBackupTimestamp,
    recordCounts: {
      accounts: state.accounts?.length || 0,
      transactions: state.transactions?.length || 0,
      debts: state.debts?.length || 0,
      payments: state.payments?.length || 0,
      goals: state.goals?.length || 0,
      budgets: state.budgets?.length || 0,
      swiggyShifts: (state.swiggyShifts || state.swiggyEarnings)?.length || 0,
      smsCandidates: state.smsCandidates?.length || 0,
      notifications: state.notifications?.length || 0,
      auditEvents: state.auditEvents?.length || 0,
      backupSnapshots: state.backupSnapshots?.length || 0,
    },
    pendingSmsCount,
    urgentNotificationCount,
    integrityIssuesCount: integrity.issues.length,
    errorLogCount: state.errorLogs?.length || 0,
    firebaseConfigured: isFirebaseConfigured(),
    syncStatus: isOnline ? (openConflicts > 0 ? 'CONFLICT' : (pendingQueue > 0 ? 'PENDING' : 'SYNCED')) : 'OFFLINE',
    pendingQueueCount: pendingQueue,
    failedQueueCount: failedQueue,
    conflictCount: openConflicts,
    lastSyncAt: getStoredLastSyncTime() || undefined,
    environment: typeof process !== 'undefined' && process.env?.NODE_ENV ? process.env.NODE_ENV : 'production',
  };
}

export function logAppError(
  existingLogs: AppError[] = [],
  area: string,
  message: string,
  severity: 'INFO' | 'WARNING' | 'ERROR' = 'ERROR',
  errorObj?: unknown
): AppError[] {
  const newError: AppError = {
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    area,
    message,
    severity,
    stack: errorObj instanceof Error ? errorObj.stack : undefined,
  };

  // Keep up to 50 most recent errors
  return [newError, ...existingLogs].slice(0, 50);
}

export function exportTechnicalDiagnostics(state: AppState): string {
  const diag = buildAppDiagnostics(state);
  const integrity = runDataIntegrityCheck(state);

  const payload = {
    appName: 'CASH_FLOW',
    storageVersion: state.version || SCHEMA_VERSION,
    exportType: 'CASH_FLOW_TECHNICAL_DIAGNOSTICS',
    generatedAt: new Date().toISOString(),
    summary: diag,
    diagnostics: diag,
    integritySummary: {
      status: integrity.status,
      errorCount: integrity.issues.filter((i) => i.severity === 'ERROR').length,
      warningCount: integrity.issues.filter((i) => i.severity === 'WARNING').length,
      issueTitles: integrity.issues.map((i) => `[${i.severity}] ${i.entityType}: ${i.title}`),
    },
    recentErrorLogs: (state.errorLogs || []).slice(0, 10).map((e: AppError) => ({
      timestamp: e.timestamp,
      area: e.area,
      severity: e.severity,
      message: e.message,
    })),

  };

  return JSON.stringify(payload, null, 2);
}

export function generateDiagnosticsSummary(state: AppState) {
  const diag = buildAppDiagnostics(state);
  const jsonStr = JSON.stringify(state);
  const bytesUsed = typeof Buffer !== 'undefined' ? Buffer.byteLength(jsonStr, 'utf8') : jsonStr.length;
  const integrityScore = Math.max(0, 100 - diag.integrityIssuesCount * 5);

  return {
    ...diag,
    storageBytesUsed: bytesUsed,
    integrityScore,
    accountsCount: diag.recordCounts.accounts,
    transactionsCount: diag.recordCounts.transactions,
  };
}

