import {
  Account,
  DuplicateCandidate,
  ImportValidationError,
  ImportValidationResult,
  Transaction,
  TransactionType,
} from '../types/finance';
import { compareTransactionsForDuplicate } from './duplicateDetector';

/**
 * CASH FLOW — Stage 8 Import Validation Service
 * Follows strict safety pipeline:
 * Parse -> Validate -> Normalize -> Duplicate Detection -> Preview -> User Confirmation -> Commit
 * Never directly injects unvalidated imported data into the ledger.
 */

export interface RawImportRow {
  date?: string;
  amount?: number | string;
  type?: string;
  accountId?: string;
  accountName?: string;
  categoryId?: string;
  description?: string;
  notes?: string;
}

export function parseCsvRows(csvString: string): RawImportRow[] {
  const lines = csvString.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: RawImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const rowObj: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) {
      rowObj[header[c]] = cols[c] || '';
    }

    rows.push({
      date: rowObj['date'] || rowObj['txdate'] || rowObj['transaction_date'],
      amount: rowObj['amount'] || rowObj['txamount'] || rowObj['inr'],
      type: rowObj['type'] || rowObj['txtype'],
      accountId: rowObj['accountid'] || rowObj['account_id'],
      accountName: rowObj['account'] || rowObj['bank'],
      categoryId: rowObj['categoryid'] || rowObj['category_id'] || rowObj['category'],
      description: rowObj['description'] || rowObj['narration'] || rowObj['merchant'] || rowObj['particulars'],
      notes: rowObj['notes'] || rowObj['remark'],
    });
  }

  return rows;
}

export function validateAndPreviewImport(
  rawRows: RawImportRow[],
  existingTransactions: Transaction[],
  existingAccounts: Account[],
  defaultAccountId?: string
): ImportValidationResult {
  const validRecords: Partial<Transaction>[] = [];
  const duplicates: DuplicateCandidate[] = [];
  const errors: ImportValidationError[] = [];

  const accountIds = new Set(existingAccounts.map((a) => a.id));
  const accountByName = new Map(existingAccounts.map((a) => [a.name.toLowerCase(), a.id]));

  let rowNumber = 0;

  for (const raw of rawRows) {
    rowNumber++;

    // 1. Amount validation
    let parsedAmount = typeof raw.amount === 'number' ? raw.amount : parseFloat(String(raw.amount || '').replace(/,/g, ''));
    if (isNaN(parsedAmount) || !isFinite(parsedAmount)) {
      errors.push({
        row: rowNumber,
        field: 'amount',
        reason: 'Invalid or missing numeric amount.',
        rawData: raw,
      });
      continue;
    }
    parsedAmount = Math.abs(parsedAmount);

    // 2. Date validation
    const rawDate = (raw.date || '').trim();
    const dateObj = new Date(rawDate);
    if (!rawDate || isNaN(dateObj.getTime())) {
      errors.push({
        row: rowNumber,
        field: 'date',
        reason: `Invalid or unparseable date "${rawDate}".`,
        rawData: raw,
      });
      continue;
    }
    const isoDate = dateObj.toISOString().split('T')[0];

    // 3. Type normalization
    let txType: TransactionType = 'EXPENSE';
    const normType = (raw.type || '').toUpperCase().trim();
    if (normType === 'INCOME' || normType === 'CREDIT' || normType === 'CR') {
      txType = 'INCOME';
    } else if (normType === 'TRANSFER') {
      txType = 'TRANSFER';
    } else if (normType === 'DEBT_PAYMENT' || normType === 'EMI') {
      txType = 'DEBT_PAYMENT';
    } else if (normType === 'REFUND') {
      txType = 'REFUND';
    } else if (normType === 'ADJUSTMENT') {
      txType = 'ADJUSTMENT';
    }

    // 4. Account resolution
    let targetAccountId = raw.accountId;
    if (!targetAccountId && raw.accountName) {
      targetAccountId = accountByName.get(raw.accountName.toLowerCase());
    }
    if (!targetAccountId && defaultAccountId) {
      targetAccountId = defaultAccountId;
    }
    if (!targetAccountId || !accountIds.has(targetAccountId)) {
      errors.push({
        row: rowNumber,
        field: 'accountId',
        reason: `Unknown or unmapped account "${raw.accountName || raw.accountId || ''}".`,
        rawData: raw,
      });
      continue;
    }

    // Construct normalized candidate
    const candidate: Partial<Transaction> = {
      id: `import_tx_${Date.now()}_${rowNumber}`,
      amount: parsedAmount,
      date: isoDate,
      type: txType,
      accountId: targetAccountId,
      categoryId: raw.categoryId,
      description: raw.description ? raw.description.trim() : undefined,
      notes: raw.notes ? raw.notes.trim() : undefined,
      source: 'IMPORT',
      verificationStatus: 'CONFIRMED',
    };

    // 5. Duplicate check against existing ledger
    let matchedDup: DuplicateCandidate | null = null;
    for (const existing of existingTransactions) {
      const cmp = compareTransactionsForDuplicate(candidate, existing);
      if (cmp.status !== 'UNIQUE') {
        matchedDup = {
          id: `dup_imp_${rowNumber}_${existing.id}`,
          existingTransaction: existing,
          incomingTransaction: candidate,
          duplicateStatus: cmp.status,
          reasons: cmp.reasons,
          suggestedAction: cmp.status === 'EXACT_DUPLICATE' ? 'KEEP_EXISTING' : 'KEEP_BOTH',
        };
        break;
      }
    }

    if (matchedDup) {
      duplicates.push(matchedDup);
    }

    validRecords.push(candidate);
  }

  const exactDupCount = duplicates.filter((d) => d.duplicateStatus === 'EXACT_DUPLICATE').length;
  const possibleDupCount = duplicates.filter((d) => d.duplicateStatus === 'POSSIBLE_DUPLICATE').length;
  const invalidCount = errors.length;
  const newCount = validRecords.length - exactDupCount;

  return {
    importedCount: rawRows.length,
    newCount: Math.max(0, newCount),
    exactDuplicateCount: exactDupCount,
    possibleDuplicateCount: possibleDupCount,
    invalidCount,
    skippedCount: exactDupCount,
    validRecords,
    duplicates,
    errors,
  };
}
