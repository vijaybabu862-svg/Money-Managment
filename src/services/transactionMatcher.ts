/**
 * CASH FLOW — Stage 5 Master Service
 * Transaction Matcher & Duplicate Detection
 *
 * Deterministic matching engine for SMS candidates against:
 * - Existing financial ledger transactions (duplicate & match detection)
 * - Active debts and EMI commitments
 * - Credit cards & settlement records
 * - Swiggy operational shift records (with duplicate income prevention)
 *
 * Never automatically modifies financial records.
 */

import {
  Account,
  CandidateMatchResult,
  CreditCard,
  Debt,
  DuplicateStatus,
  MatchConfidence,
  Payment,
  RecurringCommitment,
  SmsTransactionCandidate,
  SwiggyShift,
  Transaction,
} from '../types/finance';

export interface MatchEngineContext {
  transactions: Transaction[];
  debts: Debt[];
  recurringCommitments?: RecurringCommitment[];
  payments?: Payment[];
  creditCards?: CreditCard[];
  accounts?: Account[];
  swiggyShifts?: SwiggyShift[];
  existingCandidates?: SmsTransactionCandidate[];
}

/**
 * Checks if a candidate is an exact duplicate or possible duplicate of an existing transaction
 * or of an already imported SMS candidate.
 */
export function detectDuplicate(
  candidate: SmsTransactionCandidate,
  context: MatchEngineContext
): {
  status: DuplicateStatus;
  duplicateTransactionId?: string;
  explanation?: string;
} {
  const { transactions, existingCandidates } = context;
  const candidateAmt = candidate.detectedAmount;
  const candidateDate = candidate.detectedTransactionDate;

  if (!candidateAmt || candidateAmt <= 0) {
    return { status: 'UNIQUE' };
  }

  // 1. Check against other SMS candidates (e.g. same SMS pasted twice)
  if (existingCandidates && existingCandidates.length > 0) {
    const candidateDup = existingCandidates.find(
      (c) =>
        c.id !== candidate.id &&
        c.normalizedText === candidate.normalizedText &&
        c.reviewStatus !== 'REJECTED' &&
        c.reviewStatus !== 'IGNORED'
    );
    if (candidateDup) {
      return {
        status: 'DUPLICATE',
        explanation: `Identical SMS already imported in review inbox (${candidateDup.id}).`,
      };
    }
  }

  // 2. Check against existing confirmed ledger transactions
  for (const tx of transactions) {
    // If sourceReference explicitly points to this candidate
    if (tx.sourceReference?.smsCandidateId === candidate.id) {
      return {
        status: 'DUPLICATE',
        duplicateTransactionId: tx.id,
        explanation: `Transaction ${tx.id} was already confirmed from this SMS candidate.`,
      };
    }

    const isExactAmount = Math.abs(tx.amount - candidateAmt) < 0.01;
    const isSameDate = tx.date === candidateDate;

    // Date proximity calculation
    const txTime = new Date(tx.date).getTime();
    const candTime = candidateDate ? new Date(candidateDate).getTime() : 0;
    const dayDiff = Math.abs(Math.round((txTime - candTime) / (1000 * 60 * 60 * 24)));

    if (isExactAmount && isSameDate) {
      // Check type compatibility
      if (
        (tx.type === 'EXPENSE' && candidate.transactionType === 'EXPENSE') ||
        (tx.type === 'INCOME' && candidate.transactionType === 'INCOME') ||
        (tx.type === 'DEBT_PAYMENT' && candidate.transactionType === 'DEBT_PAYMENT') ||
        (tx.type === 'TRANSFER' && candidate.transactionType === 'TRANSFER')
      ) {
        return {
          status: 'DUPLICATE',
          duplicateTransactionId: tx.id,
          explanation: `Exact duplicate: ₹${tx.amount} on ${tx.date} (${tx.description || tx.type}).`,
        };
      }
    }

    // Possible duplicate: exact amount within 1-2 days and similar description/type
    if (isExactAmount && dayDiff <= 2) {
      return {
        status: 'POSSIBLE_DUPLICATE',
        duplicateTransactionId: tx.id,
        explanation: `Possible duplicate: ₹${tx.amount} recorded on ${tx.date} (differs by ${dayDiff} day${dayDiff === 1 ? '' : 's'}).`,
      };
    }
  }

  return { status: 'UNIQUE' };
}

/**
 * Matches an SMS candidate against existing financial transactions, debts, commitments, and Swiggy shifts.
 */
export function matchCandidate(
  candidate: SmsTransactionCandidate,
  context: MatchEngineContext
): CandidateMatchResult {
  const { transactions, debts, recurringCommitments, swiggyShifts, accounts, creditCards } = context;

  const candidateAmt = candidate.detectedAmount || 0;
  const candidateDate = candidate.detectedTransactionDate || '';

  // 1. Check Duplicates first
  const dupCheck = detectDuplicate(candidate, context);

  let bestMatchScore = 0;
  let bestMatchConfidence: MatchConfidence = 'NO_MATCH';
  let bestExplanation = 'No existing transaction match found.';
  let matchedTxId: string | undefined;
  let matchedDebtId: string | undefined;
  let matchedCommitmentId: string | undefined;
  let matchedShiftId: string | undefined;
  let matchedAccId: string | undefined;

  // Match account reference if present
  if (candidate.detectedAccountReference && accounts) {
    const acc = accounts.find((a) => {
      const masked = a.accountNumberMasked?.replace(/\D/g, '');
      const candRef = candidate.detectedAccountReference?.replace(/\D/g, '');
      return masked && candRef && masked.endsWith(candRef);
    });
    if (acc) {
      matchedAccId = acc.id;
    }
  }

  // Match credit card reference if present
  if (candidate.detectedCardReference && accounts) {
    const cardAcc = accounts.find((a) => {
      if (a.type !== 'CREDIT_CARD') return false;
      const masked = a.accountNumberMasked?.replace(/\D/g, '');
      const candRef = candidate.detectedCardReference?.replace(/\D/g, '');
      return masked && candRef && (masked.endsWith(candRef) || candRef.endsWith(masked));
    });
    if (cardAcc) {
      matchedAccId = cardAcc.id;
    }
  }

  // ==========================================
  // A. Swiggy Payout Matching & Duplicate Prevention (Section 17, 53 / Test 16, 17)
  // ==========================================
  const lowerText = candidate.normalizedText.toLowerCase();
  const isSwiggy =
    lowerText.includes('swiggy') ||
    lowerText.includes('bundl') ||
    candidate.detectedCategory === 'cat_swiggy_inc' ||
    candidate.detectedMerchant?.toLowerCase().includes('swiggy');

  if (isSwiggy && swiggyShifts && swiggyShifts.length > 0 && candidate.transactionType === 'INCOME') {
    for (const shift of swiggyShifts) {
      const shiftDate = shift.date;
      const shiftGross = shift.grossEarnings;

      const amtDiff = Math.abs(shiftGross - candidateAmt);
      const isExactAmt = amtDiff === 0;
      const isCloseAmt = amtDiff <= 50;

      const dayDiff = Math.abs(
        Math.round((new Date(shiftDate).getTime() - new Date(candidateDate).getTime()) / (1000 * 60 * 60 * 24))
      );

      // Duplicate prevention rule: If shift already has a linked income transaction!
      if (shift.linkedIncomeTxId) {
        if (isExactAmt && dayDiff <= 1) {
          return {
            candidateId: candidate.id,
            duplicateStatus: 'DUPLICATE',
            duplicateTransactionId: shift.linkedIncomeTxId,
            duplicateExplanation: `Swiggy shift on ${shift.date} already has a linked payout transaction (${shift.linkedIncomeTxId}). Prevents duplicate income.`,
            matchConfidence: 'STRONG_MATCH',
            matchedSwiggyShiftId: shift.id,
            matchedTransactionId: shift.linkedIncomeTxId,
            matchScore: 95,
            matchExplanation: `Swiggy shift on ${shift.date} is already confirmed with payout ₹${shiftGross}.`,
          };
        }
      }

      // Unlinked shift matching
      let score = 0;
      if (isExactAmt) score += 50;
      else if (isCloseAmt) score += 30;

      if (dayDiff === 0) score += 30;
      else if (dayDiff === 1) score += 20;
      else if (dayDiff <= 3) score += 10;

      score += 15; // Swiggy keyword verified

      if (score > bestMatchScore) {
        bestMatchScore = score;
        matchedShiftId = shift.id;
        if (score >= 75) {
          bestMatchConfidence = 'STRONG_MATCH';
          bestExplanation = `Strong match with Swiggy shift on ${shift.date} (${shift.slot || 'Shift'}, ₹${shiftGross}).`;
        } else if (score >= 45) {
          bestMatchConfidence = 'POSSIBLE_MATCH';
          bestExplanation = `Possible match with Swiggy shift on ${shift.date} (₹${shiftGross}${amtDiff > 0 ? `, diff: ₹${amtDiff}` : ''}).`;
        }
      }
    }
  }

  // ==========================================
  // B. Debt & EMI Matching (Section 15, 52 / Test 9, 10)
  // ==========================================
  if (debts && debts.length > 0 && (candidate.transactionType === 'DEBT_PAYMENT' || lowerText.includes('emi') || lowerText.includes('loan'))) {
    for (const debt of debts) {
      const emi = debt.emiAmount || 0;
      const amtDiff = Math.abs(emi - candidateAmt);
      const isExactEmi = amtDiff === 0 && emi > 0;
      const isCloseEmi = amtDiff > 0 && amtDiff <= 50;

      let score = 0;
      if (isExactEmi) {
        score += 50;
      } else if (isCloseEmi) {
        score += 30;
      }

      // Check debt name / lender match
      const debtNameLower = debt.name.toLowerCase();
      const lenderLower = (debt.lenderName || '').toLowerCase();
      if (
        debtNameLower.split(' ').some((word) => word.length > 3 && lowerText.includes(word)) ||
        (lenderLower && lowerText.includes(lenderLower))
      ) {
        score += 25;
      }

      // Due date match
      if (debt.nextDueDate) {
        const dayDiff = Math.abs(
          Math.round((new Date(debt.nextDueDate).getTime() - new Date(candidateDate).getTime()) / (1000 * 60 * 60 * 24))
        );
        if (dayDiff <= 3) score += 20;
      }

      if (score > bestMatchScore) {
        bestMatchScore = score;
        matchedDebtId = debt.id;
        if (score >= 70) {
          bestMatchConfidence = 'STRONG_MATCH';
          bestExplanation = `Strong match found with ${debt.name} (EMI ₹${debt.emiAmount || candidateAmt}).`;
        } else if (score >= 40) {
          bestMatchConfidence = 'POSSIBLE_MATCH';
          bestExplanation = `Possible match with ${debt.name} (EMI ₹${debt.emiAmount}${amtDiff > 0 ? `, diff ₹${amtDiff}` : ''}).`;
        }
      }
    }
  }

  // ==========================================
  // C. Recurring Payment Commitments Matching
  // ==========================================
  if (recurringCommitments && recurringCommitments.length > 0 && bestMatchScore < 75) {
    for (const comm of recurringCommitments) {
      const amtDiff = Math.abs(comm.amount - candidateAmt);
      if (amtDiff <= 20) {
        const commScore = amtDiff === 0 ? 70 : 50;
        if (commScore > bestMatchScore) {
          bestMatchScore = commScore;
          matchedCommitmentId = comm.id;
          bestMatchConfidence = commScore >= 70 ? 'STRONG_MATCH' : 'POSSIBLE_MATCH';
          bestExplanation = `${bestMatchConfidence === 'STRONG_MATCH' ? 'Strong' : 'Possible'} match with commitment "${comm.name}" (₹${comm.amount}).`;
        }
      }
    }
  }

  // ==========================================
  // D. Existing Ledger Transaction Matching (Section 26, 27, 28 / Test 9, 10)
  // ==========================================
  for (const tx of transactions) {
    let score = 0;
    const amtDiff = Math.abs(tx.amount - candidateAmt);
    const isExactAmt = amtDiff === 0;
    const isCloseAmt = amtDiff <= 50;

    // 1. Amount Score (Max 40)
    if (isExactAmt) score += 40;
    else if (isCloseAmt) score += 25;
    else continue;

    // 2. Date Score (Max 25)
    const txTime = new Date(tx.date).getTime();
    const candTime = new Date(candidateDate).getTime();
    const dayDiff = Math.abs(Math.round((txTime - candTime) / (1000 * 60 * 60 * 24)));

    if (dayDiff === 0) score += 25;
    else if (dayDiff === 1) score += 20;
    else if (dayDiff <= 3) score += 10;

    // 3. Type Match (Max 15)
    if (
      (tx.type === 'EXPENSE' && candidate.transactionType === 'EXPENSE') ||
      (tx.type === 'INCOME' && candidate.transactionType === 'INCOME') ||
      (tx.type === 'DEBT_PAYMENT' && candidate.transactionType === 'DEBT_PAYMENT') ||
      (tx.type === 'TRANSFER' && candidate.transactionType === 'TRANSFER')
    ) {
      score += 15;
    }

    // 4. Description / Keyword match (Max 15)
    const descLower = (tx.description || '').toLowerCase();
    if (
      (candidate.detectedMerchant && descLower.includes(candidate.detectedMerchant.toLowerCase())) ||
      (candidate.detectedCategory && tx.categoryId === candidate.detectedCategory)
    ) {
      score += 15;
    }

    if (score > bestMatchScore) {
      bestMatchScore = score;
      matchedTxId = tx.id;
      if (score >= 75) {
        bestMatchConfidence = 'STRONG_MATCH';
        bestExplanation = `Strong match found with existing transaction ${tx.id} (₹${tx.amount} on ${tx.date}, ${tx.description || tx.type}).`;
      } else if (score >= 45) {
        bestMatchConfidence = 'POSSIBLE_MATCH';
        bestExplanation = `Possible match with existing transaction ${tx.id} (₹${tx.amount} on ${tx.date}${amtDiff > 0 ? `, diff: ₹${amtDiff}` : ''}).`;
      }
    }
  }

  return {
    candidateId: candidate.id,
    duplicateStatus: dupCheck.status,
    duplicateTransactionId: dupCheck.duplicateTransactionId,
    duplicateExplanation: dupCheck.explanation,
    matchConfidence: bestMatchConfidence,
    matchedTransactionId: matchedTxId,
    matchedDebtId,
    matchedCommitmentId,
    matchedSwiggyShiftId: matchedShiftId,
    matchedAccountId: matchedAccId,
    matchScore: Math.min(100, bestMatchScore),
    matchExplanation: bestExplanation,
  };
}
