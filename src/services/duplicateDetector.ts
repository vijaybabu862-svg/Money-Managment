import { DuplicateCandidate, DuplicateStatus, Transaction } from '../types/finance';

/**
 * CASH FLOW — Stage 8 Duplicate Detection Service
 * Evaluates multiple signals (amount, date, account, description, type, reference).
 * Crucial Rule: NEVER detect duplicates using amount alone.
 * Never automatically deletes transactions; flags for user review.
 */

function normalizeString(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function areDescriptionsSimilar(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // Token overlap check
  const tokensA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const tokensB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }
  return overlap >= 2 || (tokensA.size > 0 && overlap === tokensA.size);
}

function getDaysDifference(dateStrA: string, dateStrB: string): number {
  const tA = new Date(dateStrA).getTime();
  const tB = new Date(dateStrB).getTime();
  if (isNaN(tA) || isNaN(tB)) return 999;
  return Math.abs(tA - tB) / (1000 * 60 * 60 * 24);
}

/**
 * Classifies an incoming transaction candidate against an existing transaction.
 */
export function compareTransactionsForDuplicate(
  incoming: Partial<Transaction>,
  existing: Transaction
): {
  status: DuplicateStatus;
  reasons: string[];
  isDuplicate: boolean;
  confidence: 'EXACT_MATCH' | 'PROBABLE_DUPLICATE' | 'POSSIBLE_DUPLICATE' | 'NOT_DUPLICATE';
  score: number;
} {
  // Rule 1: Never flag as duplicate if IDs are the same transaction
  if (incoming.id && incoming.id === existing.id) {
    return {
      status: 'UNIQUE',
      reasons: [],
      isDuplicate: false,
      confidence: 'NOT_DUPLICATE',
      score: 0,
    };
  }

  // Amount is a prerequisite, but NEVER sufficient alone
  if (incoming.amount === undefined || Math.abs(incoming.amount - existing.amount) > 0.01) {
    return {
      status: 'UNIQUE',
      reasons: [],
      isDuplicate: false,
      confidence: 'NOT_DUPLICATE',
      score: 0,
    };
  }

  const reasons: string[] = [];
  reasons.push(`Identical amount (₹${existing.amount})`);

  const sameAccount = incoming.accountId && incoming.accountId === existing.accountId;
  const sameType = incoming.type && incoming.type === existing.type;
  const sameDate = incoming.date && incoming.date === existing.date;
  const daysDiff = incoming.date && existing.date ? getDaysDifference(incoming.date, existing.date) : 999;
  const descSimilar = areDescriptionsSimilar(incoming.description, existing.description);

  if (sameAccount) reasons.push(`Same account (${existing.accountId})`);
  if (sameType) reasons.push(`Same transaction type (${existing.type})`);
  if (sameDate) {
    reasons.push(`Exact date match (${existing.date})`);
  } else if (daysDiff <= 2) {
    reasons.push(`Close settlement date (${daysDiff.toFixed(0)} days apart)`);
  }

  if (descSimilar) {
    reasons.push(`Matching description / merchant ("${existing.description || ''}")`);
  }

  // Same SMS candidate reference
  if (
    incoming.sourceReference?.smsCandidateId &&
    incoming.sourceReference.smsCandidateId === existing.sourceReference?.smsCandidateId
  ) {
    reasons.push('Linked to the identical SMS candidate');
    return {
      status: 'EXACT_DUPLICATE',
      reasons,
      isDuplicate: true,
      confidence: 'EXACT_MATCH',
      score: 100,
    };
  }

  const descExact = (incoming.description || '').trim().toLowerCase() === (existing.description || '').trim().toLowerCase();

  // EXACT DUPLICATE: Same Amount + Same Date + Same Account + Same Type + Exact Description
  if (sameAccount && sameDate && sameType && (descExact || !incoming.description || !existing.description)) {
    return {
      status: 'EXACT_DUPLICATE',
      reasons,
      isDuplicate: true,
      confidence: 'EXACT_MATCH',
      score: 98,
    };
  }

  // PROBABLE DUPLICATE: Same Amount + Same Date + (Same Account OR Similar Description)
  if (sameDate && (sameAccount || descSimilar)) {
    return {
      status: 'EXACT_DUPLICATE',
      reasons,
      isDuplicate: true,
      confidence: 'PROBABLE_DUPLICATE',
      score: 85,
    };
  }


  // POSSIBLE DUPLICATE: Same Amount + (Exact Date OR within 2 days) + (Same Account OR Similar Description)
  if (daysDiff <= 2 && (sameAccount || descSimilar)) {
    return {
      status: 'POSSIBLE_DUPLICATE',
      reasons,
      isDuplicate: true,
      confidence: 'POSSIBLE_DUPLICATE',
      score: 65,
    };
  }

  // If only amount matches, it is strictly UNIQUE
  return {
    status: 'UNIQUE',
    reasons: [],
    isDuplicate: false,
    confidence: 'NOT_DUPLICATE',
    score: 20,
  };
}

export const findDuplicateCandidates = findDuplicateTransactions;


/**
 * Scans an entire list of transactions and finds all duplicate candidate pairs
 */
export function findDuplicateTransactions(transactions: Transaction[]): DuplicateCandidate[] {
  const duplicates: DuplicateCandidate[] = [];
  const checkedPairs = new Set<string>();

  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const t1 = transactions[i];
      const t2 = transactions[j];
      const pairKey = [t1.id, t2.id].sort().join(':');
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      const comparison = compareTransactionsForDuplicate(t2, t1);
      if (comparison.status !== 'UNIQUE') {
        duplicates.push({
          id: `dup_${t1.id}_${t2.id}`,
          existingTransaction: t1,
          incomingTransaction: t2,
          duplicateStatus: comparison.status,
          reasons: comparison.reasons,
          suggestedAction: comparison.status === 'EXACT_DUPLICATE' ? 'KEEP_EXISTING' : 'KEEP_BOTH',
        });
      }
    }
  }

  return duplicates;
}
