import {
  Account,
  Category,
  Debt,
  IntegrityIssue,
  IntegritySeverity,
  Transaction,
} from '../types/finance';
import { AppState } from './storage';


/**
 * CASH FLOW — Stage 8 Data Integrity Service
 * Performs deep structural and financial invariant checks across all ledger entities.
 * Strictly adheres to non-destructive principles:
 * Never silently modifies financial values, amounts, or dates.
 */

export function runDataIntegrityCheck(state: AppState): {
  issues: IntegrityIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
  status: 'Healthy' | 'Needs Review' | 'Recovery Available';
} {
  const issues: IntegrityIssue[] = [];

  const addIssue = (
    severity: IntegritySeverity,
    entityType: string,
    entityId: string | undefined,
    title: string,
    description: string,
    repairable: boolean = false,
    field?: string
  ) => {
    issues.push({
      id: `issue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      severity,
      entityType,
      entityId,
      title,
      description,
      repairable,
      field,
    });
  };

  // 1. Account checks & ID uniqueness
  const accountIds = new Set<string>();
  const accountsMap = new Map<string, Account>();

  for (const acc of state.accounts || []) {
    if (!acc.id) {
      addIssue('ERROR', 'Account', undefined, 'Missing Account ID', 'Account found with no unique identifier.');
      continue;
    }
    if (accountIds.has(acc.id)) {
      addIssue('ERROR', 'Account', acc.id, 'Duplicate Account ID', `Multiple accounts share the identifier ${acc.id}.`);
    } else {
      accountIds.add(acc.id);
      accountsMap.set(acc.id, acc);
    }

    if (isNaN(acc.openingBalance) || !isFinite(acc.openingBalance)) {
      addIssue('ERROR', 'Account', acc.id, 'Invalid Opening Balance', `Account ${acc.name} has non-numeric opening balance.`, false, 'openingBalance');
    }
    if (isNaN(acc.currentBalance) || !isFinite(acc.currentBalance)) {
      addIssue('WARNING', 'Account', acc.id, 'Invalid Current Balance', `Account ${acc.name} has non-numeric current balance.`, true, 'currentBalance');
    }
  }

  // 2. Debt checks & ID uniqueness & balance sanity
  const debtIds = new Set<string>();
  const debtsMap = new Map<string, Debt>();

  for (const debt of state.debts || []) {
    if (!debt.id) {
      addIssue('ERROR', 'Debt', undefined, 'Missing Debt ID', 'Debt entry found without an ID.');
      continue;
    }
    if (debtIds.has(debt.id)) {
      addIssue('ERROR', 'Debt', debt.id, 'Duplicate Debt ID', `Multiple debts share ID ${debt.id}.`);
    } else {
      debtIds.add(debt.id);
      debtsMap.set(debt.id, debt);
    }

    const origPrincipal = debt.originalPrincipal ?? debt.principalAmount ?? 0;
    const outPrincipal = debt.outstandingPrincipal ?? 0;

    if (isNaN(origPrincipal) || origPrincipal < 0) {
      addIssue('ERROR', 'Debt', debt.id, 'Invalid Original Principal', `Debt ${debt.name} has invalid original principal: ${origPrincipal}`);
    }
    if (isNaN(outPrincipal)) {
      addIssue('ERROR', 'Debt', debt.id, 'Invalid Outstanding Principal', `Debt ${debt.name} has NaN outstanding principal.`);
    } else if (outPrincipal < 0) {
      addIssue('WARNING', 'Debt', debt.id, 'Negative Debt Balance', `Debt ${debt.name} has negative outstanding principal (₹${outPrincipal}).`);
    } else if (origPrincipal > 0 && outPrincipal > origPrincipal * 1.5) {
      addIssue(
        'WARNING',
        'Debt',
        debt.id,
        'Impossible Debt Balance',
        `Debt ${debt.name} outstanding balance (₹${outPrincipal}) exceeds original loan principal (₹${origPrincipal}) significantly.`
      );
    }

    if (debt.associatedAccountId && !accountIds.has(debt.associatedAccountId)) {
      addIssue(
        'WARNING',
        'Debt',
        debt.id,
        'Broken Account Reference',
        `Debt ${debt.name} references non-existent account ID ${debt.associatedAccountId}.`
      );
    }
  }

  // 3. Category checks
  const categoryIds = new Set((state.categories || []).map((c: Category) => c.id));

  // 4. Transaction checks & broken reference detection
  const txIds = new Set<string>();

  for (const tx of state.transactions || []) {
    if (!tx.id) {
      addIssue('ERROR', 'Transaction', undefined, 'Missing Transaction ID', 'Transaction found with no identifier.');
      continue;
    }
    if (txIds.has(tx.id)) {
      addIssue('ERROR', 'Transaction', tx.id, 'Duplicate Transaction ID', `Duplicate transaction detected with ID ${tx.id}.`);
    } else {
      txIds.add(tx.id);
    }

    // Amount validation
    if (isNaN(tx.amount) || !isFinite(tx.amount)) {
      addIssue('ERROR', 'Transaction', tx.id, 'Invalid Transaction Amount', `Transaction has NaN or non-finite amount.`, false, 'amount');
    } else if (tx.amount < 0 && tx.type !== 'REFUND' && tx.type !== 'ADJUSTMENT') {
      addIssue(
        'WARNING',
        'Transaction',
        tx.id,
        'Negative Amount',
        `Transaction has negative amount (₹${tx.amount}) without being a refund or adjustment.`,
        false,
        'amount'
      );
    }

    // Date validation
    if (!tx.date || isNaN(Date.parse(tx.date))) {
      addIssue('ERROR', 'Transaction', tx.id, 'Invalid Transaction Date', `Transaction has unparseable date "${tx.date}".`, false, 'date');
    } else {
      const year = new Date(tx.date).getFullYear();
      if (year < 2000 || year > 2100) {
        addIssue('WARNING', 'Transaction', tx.id, 'Out of Range Date', `Transaction date "${tx.date}" year ${year} is out of realistic range.`);
      }
    }

    // Account references
    if (!tx.accountId) {
      addIssue('ERROR', 'Transaction', tx.id, 'Missing Account Reference', 'Transaction has no associated account reference.');
    } else if (!accountIds.has(tx.accountId)) {
      addIssue(
        'ERROR',
        'Transaction',
        tx.id,
        'Broken Account Reference',
        `Transaction references account ID ${tx.accountId} which does not exist in accounts list.`
      );
    }

    if (tx.type === 'TRANSFER') {
      if (!tx.toAccountId) {
        addIssue('ERROR', 'Transaction', tx.id, 'Missing Destination Account', 'Transfer transaction has no destination account.');
      } else if (!accountIds.has(tx.toAccountId)) {
        addIssue(
          'ERROR',
          'Transaction',
          tx.id,
          'Broken Destination Account Reference',
          `Transfer references destination account ${tx.toAccountId} which does not exist.`
        );
      }
    }

    // Category reference
    if (tx.categoryId && !categoryIds.has(tx.categoryId)) {
      addIssue(
        'INFO',
        'Transaction',
        tx.id,
        'Unknown Category Reference',
        `Transaction references category ID ${tx.categoryId} which is not currently active.`,
        true,
        'categoryId'
      );
    }

    // Debt reference for DEBT_PAYMENT
    if (tx.type === 'DEBT_PAYMENT' && tx.debtId && !debtIds.has(tx.debtId)) {
      addIssue(
        'WARNING',
        'Transaction',
        tx.id,
        'Broken Debt Reference',
        `Debt payment references non-existent debt ID ${tx.debtId}.`
      );
    }
  }

  // 5. Debt payment records reference check
  for (const dp of state.debtPayments || []) {
    if (dp.debtId && !debtIds.has(dp.debtId)) {
      addIssue('WARNING', 'DebtPayment', dp.id, 'Broken Debt Payment Reference', `Payment records debt ID ${dp.debtId} which does not exist.`);
    }
    if (dp.transactionId && !txIds.has(dp.transactionId)) {
      addIssue('WARNING', 'DebtPayment', dp.id, 'Broken Transaction Reference', `Payment records transaction ID ${dp.transactionId} which does not exist.`);
    }
  }

  // 6. SMS candidate linkages
  for (const sms of state.smsCandidates || []) {
    if (sms.matchedTransactionId && !txIds.has(sms.matchedTransactionId)) {
      addIssue('WARNING', 'SmsCandidate', sms.id, 'Broken SMS Transaction Link', `Candidate links to transaction ${sms.matchedTransactionId} which is missing.`);
    }
    if (sms.matchedAccountId && !accountIds.has(sms.matchedAccountId)) {
      addIssue('INFO', 'SmsCandidate', sms.id, 'Broken SMS Account Link', `Candidate links to account ${sms.matchedAccountId} which is missing.`);
    }
  }


  // 7. Swiggy shifts linkages
  for (const shift of state.swiggyShifts || []) {
    if (shift.linkedIncomeTxId && !txIds.has(shift.linkedIncomeTxId)) {
      addIssue('WARNING', 'SwiggyShift', shift.id, 'Broken Shift Payout Link', `Shift links to payout transaction ${shift.linkedIncomeTxId} which is missing.`);
    }
    if (shift.linkedFuelTxId && !txIds.has(shift.linkedFuelTxId)) {
      addIssue('INFO', 'SwiggyShift', shift.id, 'Broken Shift Fuel Link', `Shift links to fuel transaction ${shift.linkedFuelTxId} which is missing.`);
    }
  }

  // 8. Goal references
  const goalIds = new Set<string>();
  for (const g of state.goals || []) {
    if (goalIds.has(g.id)) {
      addIssue('ERROR', 'Goal', g.id, 'Duplicate Goal ID', `Multiple goals share ID ${g.id}.`);
    } else {
      goalIds.add(g.id);
    }
    if (isNaN(g.targetAmount) || g.targetAmount <= 0) {
      addIssue('WARNING', 'Goal', g.id, 'Invalid Target Amount', `Goal ${g.name} has non-positive target amount.`);
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'ERROR');
  const hasWarnings = issues.some((i) => i.severity === 'WARNING');
  const recoveryAvailable = Boolean(state.recoverySnapshot);

  let status: 'Healthy' | 'Needs Review' | 'Recovery Available' = 'Healthy';
  if (recoveryAvailable) {
    status = 'Recovery Available';
  } else if (hasErrors || hasWarnings) {
    status = 'Needs Review';
  }

  return {
    issues,
    hasErrors,
    hasWarnings,
    status,
  };
}

/**
 * Financial Invariants Verification
 */

export function verifyTransferInvariant(
  sourceAccountBeforeBal: number,
  destAccountBeforeBal: number,
  sourceAccountAfterBal: number,
  destAccountAfterBal: number,
  transferAmount: number
): boolean {
  // Source decreases by transferAmount
  const sourceDecreased = sourceAccountAfterBal === sourceAccountBeforeBal - transferAmount;
  // Destination increases by transferAmount
  const destIncreased = destAccountAfterBal === destAccountBeforeBal + transferAmount;
  // Total liquid cash remains unchanged
  const totalBefore = sourceAccountBeforeBal + destAccountBeforeBal;
  const totalAfter = sourceAccountAfterBal + destAccountAfterBal;
  const totalUnchanged = totalBefore === totalAfter;

  return sourceDecreased && destIncreased && totalUnchanged;
}

export function verifyCreditCardPurchaseInvariant(
  cardLiabilityBefore: number,
  cardLiabilityAfter: number,
  bankCashBefore: number,
  bankCashAfter: number,
  purchaseAmount: number
): boolean {
  // Card liability increases
  const liabilityIncreased = cardLiabilityAfter === cardLiabilityBefore + purchaseAmount;
  // Bank cash does NOT decrease
  const bankCashUnchanged = bankCashAfter === bankCashBefore;

  return liabilityIncreased && bankCashUnchanged;
}

export function verifyCreditCardSettlementInvariant(
  bankCashBefore: number,
  bankCashAfter: number,
  cardLiabilityBefore: number,
  cardLiabilityAfter: number,
  settlementAmount: number
): boolean {
  // Bank cash decreases
  const bankDecreased = bankCashAfter === bankCashBefore - settlementAmount;
  // Card liability decreases
  const liabilityDecreased = cardLiabilityAfter === cardLiabilityBefore - settlementAmount;

  return bankDecreased && liabilityDecreased;
}

export function verifyDebtPaymentInvariant(
  debtOutstandingBefore: number,
  debtOutstandingAfter: number,
  principalComponent: number
): boolean {
  // Debt principal decreases strictly by the principal component
  return debtOutstandingAfter === debtOutstandingBefore - principalComponent;
}

export function verifySmsConfirmationInvariant(
  candidateConfirmedCount: number,
  createdFinancialTransactionsCount: number
): boolean {
  // Exactly one candidate -> exactly one confirmed financial transaction event
  return candidateConfirmedCount === 1 && createdFinancialTransactionsCount === 1;
}

/**
 * Safe Auto-Repair Policy
 * Automatically repairs ONLY non-financial structural issues (missing arrays, trimming strings,
 * normalizing whitespace).
 * NEVER alters monetary amounts, transaction dates, balances, or deletes financial records.
 */
export function repairSafeStructuralIssues(state: AppState): {
  repairedState: AppState;
  repairedCount: number;
  repairedDescriptions: string[];
} {
  let count = 0;
  const descriptions: string[] = [];

  const repaired: AppState = {
    ...state,
    accounts: (state.accounts || []).map((acc: Account) => {
      const trimmedName = acc.name?.trim() || 'Unnamed Account';
      if (trimmedName !== acc.name) {
        count++;
        descriptions.push(`Trimmed account name: "${acc.name}" -> "${trimmedName}"`);
      }
      return {
        ...acc,
        name: trimmedName,
      };
    }),
    transactions: (state.transactions || []).map((tx: Transaction) => {
      const trimmedDesc = tx.description ? tx.description.trim() : '';
      if (tx.description && trimmedDesc !== tx.description) {
        count++;
        descriptions.push(`Normalized whitespace on transaction: ${tx.id}`);
      }
      return {
        ...tx,
        description: trimmedDesc || undefined,
      };
    }),
    categories: (state.categories || []).map((c: Category) => ({
      ...c,
      name: c.name?.trim() || 'Uncategorized',
    })),

    backupSnapshots: state.backupSnapshots || [],
    auditEvents: state.auditEvents || [],
    errorLogs: state.errorLogs || [],
  };

  return {
    repairedState: repaired,
    repairedCount: count,
    repairedDescriptions: descriptions,
  };
}

export const safeAutoRepairState = repairSafeStructuralIssues;
