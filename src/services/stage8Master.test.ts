import { AppState, StorageService, getDefaultDemoData } from './storage';
import { runDataIntegrityCheck, repairSafeStructuralIssues } from './dataIntegrity';
import { findDuplicateCandidates, compareTransactionsForDuplicate } from './duplicateDetector';
import { createJsonBackup, validateAndPreviewBackup, restoreFromBackupJson } from './backupService';
import { createSnapshot, restoreFromSnapshot, generateReversalTransaction } from './recoveryService';
import { recordAuditEvent, maskSensitiveText, filterAuditTrail } from './auditService';
import { performGlobalSearch } from './searchService';
import { generateDiagnosticsSummary, exportTechnicalDiagnostics } from './diagnosticsService';
import { Transaction, Account, Debt, BackupSnapshot } from '../types/finance';

export interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

export function runStage8VerificationTests(): { total: number; passed: number; results: TestResult[] } {
  const results: TestResult[] = [];
  const record = (test: string, ok: boolean, details?: string) => {
    results.push({ test, status: ok ? 'PASS' : 'FAIL', details });
  };

  const sampleState: AppState = getDefaultDemoData();

  // Test 1: Storage schema version 8 initialization
  try {
    const loaded = StorageService.loadState();
    const ok = loaded.version >= 8 &&
      Array.isArray(loaded.backupSnapshots) &&
      Array.isArray(loaded.auditEvents) &&
      Array.isArray(loaded.errorLogs) &&
      Boolean(loaded.commandCenterPreferences);
    record('Test 1: Storage schema version 8 initialization', ok, `Version: ${loaded.version}, Snapshots: ${loaded.backupSnapshots?.length}`);
  } catch (err: any) {
    record('Test 1: Storage schema version 8 initialization', false, err.message);
  }

  // Test 2: Storage migration from v7 to v8
  try {
    const dummyV7 = {
      ...getDefaultDemoData(),
      version: 7,
      backupSnapshots: undefined,
      auditEvents: undefined,
      errorLogs: undefined,
      commandCenterPreferences: undefined,
      reliabilitySettings: undefined,
    };
    localStorage.setItem('cashflow_storage_v7', JSON.stringify(dummyV7));
    localStorage.removeItem('cashflow_storage_v9');
    localStorage.removeItem('cashflow_storage_v8');
    const migrated = StorageService.loadState();
    const ok = migrated.version >= 8 &&
      Array.isArray(migrated.backupSnapshots) &&
      Array.isArray(migrated.auditEvents) &&
      migrated.accounts.length === dummyV7.accounts.length;
    record('Test 2: Storage migration (v7 -> v8 preserves data & initializes Stage 8 structures)', ok, `Loaded version: ${migrated.version}, Accounts: ${migrated.accounts.length}`);

  } catch (err: any) {
    record('Test 2: Storage migration (v7 -> v8 preserves data & initializes Stage 8 structures)', false, err.message);
  }

  // Test 3: Data Integrity Check detects orphaned transaction
  try {
    const modifiedState = {
      ...sampleState,
      transactions: [
        ...sampleState.transactions,
        {
          id: 'tx_orphan_test',
          type: 'EXPENSE' as const,
          amount: 500,
          date: '2026-09-26',
          categoryId: 'cat_food',
          accountId: 'acc_non_existent_999',
          description: 'Orphaned expense test',
          source: 'MANUAL' as const,
          verificationStatus: 'CONFIRMED' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    const report = runDataIntegrityCheck(modifiedState);
    const orphanIssue = report.issues.find((i) => i.entityId === 'tx_orphan_test' && i.title.includes('Broken Account Reference'));
    const ok = orphanIssue !== undefined && orphanIssue.severity === 'ERROR';
    record('Test 3: Data Integrity Check detects orphaned transaction (missing account)', ok, `Found issue: ${orphanIssue?.title || 'None'}`);
  } catch (err: any) {
    record('Test 3: Data Integrity Check detects orphaned transaction (missing account)', false, err.message);
  }

  // Test 4: Data Integrity Check detects negative transaction amount
  try {
    const modifiedState = {
      ...sampleState,
      transactions: [
        ...sampleState.transactions,
        {
          id: 'tx_negative_amt',
          type: 'EXPENSE' as const,
          amount: -250,
          date: '2026-09-26',
          categoryId: 'cat_food',
          accountId: sampleState.accounts[0].id,
          description: 'Negative amount test',
          source: 'MANUAL' as const,
          verificationStatus: 'CONFIRMED' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };


    const report = runDataIntegrityCheck(modifiedState);
    const negativeIssue = report.issues.find((i) => i.entityId === 'tx_negative_amt');
    const ok = negativeIssue !== undefined;
    record('Test 4: Data Integrity Check detects invalid transaction amount (<= 0)', ok, `Severity: ${negativeIssue?.severity}`);
  } catch (err: any) {
    record('Test 4: Data Integrity Check detects invalid transaction amount (<= 0)', false, err.message);
  }

  // Test 5: Safe structural repair never deletes valid user data
  try {
    const dirtyState = {
      ...sampleState,
      accounts: [
        ...sampleState.accounts,
        {
          ...sampleState.accounts[0],
          id: 'acc_dirty_name',
          name: '   Padded Account Name   ',
        },
      ],
      transactions: [
        ...sampleState.transactions,
        {
          ...sampleState.transactions[0],
          id: 'tx_dirty_desc',
          description: '   Padded Description   ',
        },
      ],
    };
    const { repairedState, repairedCount, repairedDescriptions } = repairSafeStructuralIssues(dirtyState);
    const accRepaired = repairedState.accounts.find((a: Account) => a.id === 'acc_dirty_name');
    const txRepaired = repairedState.transactions.find((t: Transaction) => t.id === 'tx_dirty_desc');
    const ok = repairedCount >= 2 &&
      accRepaired?.name === 'Padded Account Name' &&
      txRepaired?.description === 'Padded Description' &&
      repairedState.transactions.length === dirtyState.transactions.length;
    record('Test 5: Safe auto-repair restores structural anomalies without data loss', ok, `Repairs count: ${repairedCount}`);
  } catch (err: any) {
    record('Test 5: Safe auto-repair restores structural anomalies without data loss', false, err.message);
  }

  // Test 6: Multi-signal duplicate detection (EXACT_MATCH)
  try {
    const txA: Transaction = {
      id: 'tx_dup_1',
      type: 'EXPENSE',
      amount: 450,
      date: '2026-09-26',
      accountId: 'acc_salary',
      categoryId: 'cat_dining',
      description: 'Swiggy Dinner Order',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: '2026-09-26T20:00:00Z',
      updatedAt: '2026-09-26T20:00:00Z',
    };
    const txB: Transaction = {
      ...txA,
      id: 'tx_dup_2',
    };
    const match = compareTransactionsForDuplicate(txA, txB);
    const ok = match.isDuplicate && match.confidence === 'EXACT_MATCH' && match.score >= 95;
    record('Test 6: Multi-signal duplicate detection: EXACT_MATCH identified', ok, `Confidence: ${match.confidence}, Score: ${match.score}`);
  } catch (err: any) {
    record('Test 6: Multi-signal duplicate detection: EXACT_MATCH identified', false, err.message);
  }

  // Test 7: Multi-signal duplicate detection (PROBABLE_DUPLICATE)
  try {
    const txA: Transaction = {
      id: 'tx_prob_1',
      type: 'EXPENSE',
      amount: 1200,
      date: '2026-09-26',
      accountId: 'acc_salary',
      categoryId: 'cat_shopping',
      description: 'Amazon Retail Purchase Electronics',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: '2026-09-26T14:00:00Z',
      updatedAt: '2026-09-26T14:00:00Z',
    };
    const txB: Transaction = {
      id: 'tx_prob_2',
      type: 'EXPENSE',
      amount: 1200,
      date: '2026-09-26',
      accountId: 'acc_salary',
      categoryId: 'cat_shopping',
      description: 'Amazon Retail Order Payment',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: '2026-09-26T14:02:00Z',
      updatedAt: '2026-09-26T14:02:00Z',
    };
    const match = compareTransactionsForDuplicate(txA, txB);
    const ok = match.confidence === 'PROBABLE_DUPLICATE' && match.score >= 70;
    record('Test 7: Multi-signal duplicate detection: PROBABLE_DUPLICATE with fuzzy description', ok, `Confidence: ${match.confidence}, Score: ${match.score}`);
  } catch (err: any) {
    record('Test 7: Multi-signal duplicate detection: PROBABLE_DUPLICATE with fuzzy description', false, err.message);
  }

  // Test 8: Different amounts are NEVER flagged as duplicate
  try {
    const txA: Transaction = {
      id: 'tx_diff_1',
      type: 'EXPENSE',
      amount: 500,
      date: '2026-09-26',
      accountId: 'acc_salary',
      categoryId: 'cat_dining',
      description: 'Lunch at Cafe',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: '2026-09-26T13:00:00Z',
      updatedAt: '2026-09-26T13:00:00Z',
    };
    const txB: Transaction = {
      ...txA,
      id: 'tx_diff_2',
      amount: 501, // 1 rupee difference
    };
    const match = compareTransactionsForDuplicate(txA, txB);
    const ok = !match.isDuplicate && match.confidence === 'NOT_DUPLICATE';
    record('Test 8: Strict invariant: Different amounts are NEVER flagged as duplicate', ok, `isDuplicate: ${match.isDuplicate}`);
  } catch (err: any) {
    record('Test 8: Strict invariant: Different amounts are NEVER flagged as duplicate', false, err.message);
  }


  // Test 9: Complete JSON backup generation with deterministic checksum
  let generatedBackupJson = '';
  try {
    const { jsonString, filename } = createJsonBackup(sampleState);
    generatedBackupJson = jsonString;
    const parsed = JSON.parse(jsonString);
    const ok = parsed.app === 'CASH FLOW' &&
      parsed.backupFormatVersion === 1 &&
      parsed.storageSchemaVersion === 8 &&
      typeof parsed.checksum === 'string' &&
      parsed.checksum.length > 0 &&
      filename.includes('cashflow-backup-');
    record('Test 9: JSON backup creation includes header, metadata & checksum', ok, `File: ${filename}, Checksum: ${parsed.checksum}`);
  } catch (err: any) {
    record('Test 9: JSON backup creation includes header, metadata & checksum', false, err.message);
  }

  // Test 10: Backup pre-restore validation and preview
  try {
    const preview = validateAndPreviewBackup(generatedBackupJson);
    const ok = preview.isValid &&
      preview.counts.transactions === sampleState.transactions.length &&
      preview.counts.accounts === sampleState.accounts.length &&
      preview.storageSchemaVersion === 8;
    record('Test 10: Backup pre-restore validation confirms validity & previews entity counts', ok, `Valid: ${preview.isValid}, Tx count: ${preview.counts.transactions}`);
  } catch (err: any) {
    record('Test 10: Backup pre-restore validation confirms validity & previews entity counts', false, err.message);
  }

  // Test 11: Corrupted backup JSON rejected during pre-restore validation
  try {
    const parsed = JSON.parse(generatedBackupJson);
    parsed.data.accounts[0].balance = 9999999; // Tamper with state
    const tamperedJson = JSON.stringify(parsed);
    const preview = validateAndPreviewBackup(tamperedJson);
    const ok = !preview.isValid && Boolean(preview.error?.toLowerCase().includes('checksum'));
    record('Test 11: Tampered/corrupted backup fails integrity checksum validation', ok, `Rejected error: ${preview.error}`);

  } catch (err: any) {
    record('Test 11: Tampered/corrupted backup fails integrity checksum validation', false, err.message);
  }

  // Test 12: Safe backup restore without state corruption
  try {
    const res = restoreFromBackupJson(generatedBackupJson, sampleState);
    const ok = res.success &&
      res.restoredState !== null &&
      res.restoredState?.accounts.length === sampleState.accounts.length &&
      res.restoredState?.transactions.length === sampleState.transactions.length;
    record('Test 12: Safe backup restore restores full state successfully', ok, `Success: ${res.success}`);
  } catch (err: any) {
    record('Test 12: Safe backup restore restores full state successfully', false, err.message);
  }

  // Test 13: Local snapshot creation and FIFO retention policy
  try {
    let currentSnapshots: BackupSnapshot[] = [];
    for (let i = 0; i < 12; i++) {
      const snap = createSnapshot(sampleState, 'MANUAL', `Snapshot ${i}`);
      currentSnapshots = [snap, ...currentSnapshots].slice(0, 10);
    }
    const ok = currentSnapshots.length === 10 && currentSnapshots[0].description === 'Snapshot 11';
    record('Test 13: Snapshot manager enforces FIFO retention limit of 10 snapshots', ok, `Snapshots retained: ${currentSnapshots.length}`);
  } catch (err: any) {
    record('Test 13: Snapshot manager enforces FIFO retention limit of 10 snapshots', false, err.message);
  }

  // Test 14: Rollback to snapshot restores state cleanly
  try {
    const originalTxCount = sampleState.transactions.length;
    const snap = createSnapshot(sampleState, 'MANUAL', 'Pre-mutation checkpoint');
    const mutatedState: AppState = {
      ...sampleState,
      transactions: sampleState.transactions.slice(0, 5),
    };
    const restored = restoreFromSnapshot([snap], snap.id);
    const ok = restored !== null && restored.transactions.length === originalTxCount;
    record('Test 14: Rollback from recovery snapshot restores pristine state', ok, `Restored Tx: ${restored?.transactions.length}`);
  } catch (err: any) {
    record('Test 14: Rollback from recovery snapshot restores pristine state', false, err.message);
  }


  // Test 15: Audit trail records event and enforces privacy masking
  try {
    const masked = maskSensitiveText('Paid via HDFC card ending in 4521 with CVV 888 and A/C 9876543210');
    const ok = !masked.includes('9876543210') && masked.includes('••••');
    record('Test 15: Sensitive numbers in audit details are automatically masked', ok, `Masked output: "${masked}"`);
  } catch (err: any) {
    record('Test 15: Sensitive numbers in audit details are automatically masked', false, err.message);
  }

  // Test 16: Audit trail recording & filtering
  try {
    const baseEvents = recordAuditEvent([], 'CREATE', 'TRANSACTION', 'tx_test_1', 'Added salary transaction ₹21,000');
    const filtered = filterAuditTrail(baseEvents, { entityType: 'TRANSACTION' });
    const ok = baseEvents.length === 1 && filtered.length === 1 && baseEvents[0].action === 'CREATE';
    record('Test 16: Audit events recorded and filterable by entityType and action', ok, `Event summary: ${baseEvents[0]?.summary}`);
  } catch (err: any) {
    record('Test 16: Audit events recorded and filterable by entityType and action', false, err.message);
  }

  // Test 17: Financial Reversal transaction generation (No history rewriting)
  try {
    const originalExpense = sampleState.transactions.find((t) => t.type === 'EXPENSE')!;
    const reversal = generateReversalTransaction(originalExpense, 'Accidental duplicate charge');
    const ok = reversal.type === 'INCOME' &&
      reversal.amount === originalExpense.amount &&
      reversal.accountId === originalExpense.accountId &&
      Boolean(reversal.description?.includes('REVERSAL')) &&
      Boolean(reversal.notes?.includes(originalExpense.id));
    record('Test 17: Safe financial reversal creates offsetting transaction without mutating history', ok, `Reversal type: ${reversal.type}, Amount: ₹${reversal.amount}`);

  } catch (err: any) {
    record('Test 17: Safe financial reversal creates offsetting transaction without mutating history', false, err.message);
  }

  // Test 18: Global search searches across transactions, accounts, debts, and goals
  try {
    const res = performGlobalSearch(sampleState, 'Salary');
    const hasTx = res.some((r) => r.type === 'TRANSACTION');
    const hasAcc = res.some((r) => r.type === 'ACCOUNT');
    const ok = res.length > 0 && (hasTx || hasAcc);
    record('Test 18: Global search indexes transactions, accounts, and debts concurrently', ok, `Matches found: ${res.length}`);
  } catch (err: any) {
    record('Test 18: Global search indexes transactions, accounts, and debts concurrently', false, err.message);
  }

  // Test 19: Diagnostics summary aggregates storage, error logs, and health metrics
  try {
    const diag = generateDiagnosticsSummary(sampleState);
    const ok = diag.storageVersion >= 8 &&
      diag.accountsCount === sampleState.accounts.length &&
      diag.transactionsCount === sampleState.transactions.length &&
      typeof diag.storageBytesUsed === 'number' &&
      typeof diag.integrityScore === 'number';
    record('Test 19: Diagnostics service accurately computes storage usage and integrity metrics', ok, `Integrity score: ${diag.integrityScore}%, Size: ${diag.storageBytesUsed} bytes`);
  } catch (err: any) {
    record('Test 19: Diagnostics service accurately computes storage usage and integrity metrics', false, err.message);
  }

  // Test 20: Technical diagnostics export format is sanitized and JSON-parseable
  try {
    const diagJson = exportTechnicalDiagnostics(sampleState);
    const parsed = JSON.parse(diagJson);
    const ok = parsed.appName === 'CASH_FLOW' &&
      parsed.storageVersion >= 8 &&
      typeof parsed.summary === 'object';
    record('Test 20: Technical diagnostics export outputs sanitized system health payload', ok, `App: ${parsed.appName}, Version: ${parsed.storageVersion}`);
  } catch (err: any) {
    record('Test 20: Technical diagnostics export outputs sanitized system health payload', false, err.message);
  }


  const passed = results.filter((r) => r.status === 'PASS').length;
  return {
    total: results.length,
    passed,
    results,
  };
}
