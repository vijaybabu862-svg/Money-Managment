/**
 * CASH FLOW — Stage 7 Master Service
 * Advanced Financial Intelligence & Command Center Engine
 *
 * Pure, read-only analytics and intelligence layer.
 * Strictly consumes calculator.ts, financialIntelligence.ts, and Swiggy Operational Engine.
 * Never mutates financial state or ledger records.
 */

import {
  Account,
  Transaction,
  Debt,
  Payment,
  Budget,
  Goal,
  Category,
  AdvancedFinancialSummary,
  DataQualityReport,
  DataQualityItem,
  DataQualityStatus,
  IncomeCompositionItem,
  ExpenseCompositionItem,
  MonthlySurplusTrend,
  FinancialMilestone,
} from '../types/finance';
import { AppState } from './storage';
import {
  calculateAvailableCash,
  calculateDebtOutstanding,
  calculateNetWorth,
} from './calculator';
import {
  calculateCashFlowForecast,
  calculateCashPressureAnalysis,
} from './financialIntelligence';
import { getCurrentDateISO, getCurrentMonthKey, getPreviousMonthKey } from '../utils/dates';
import { formatINR } from '../utils/currency';

/**
 * Calculates the comprehensive Advanced Financial Summary Snapshot (Section 5, 6, 7, 8, 9)
 */
export function calculateAdvancedFinancialSummary(state: AppState): AdvancedFinancialSummary {
  const currentMonthKey = getCurrentMonthKey();
  const prevMonthKey = getPreviousMonthKey();

  // 1. Current Liquidity & Asset Breakdown (Accounting Rule: Unused credit limit is NEVER an asset)
  const availableCash = calculateAvailableCash(state.accounts, state.transactions);

  let bankBalances = 0;
  let cashBalances = 0;
  let walletBalances = 0;
  let creditCardLiabilities = 0;

  for (const acc of state.accounts) {
    const accTxs = state.transactions.filter((t) => t.accountId === acc.id || t.toAccountId === acc.id);
    let bal = acc.openingBalance;
    for (const t of accTxs) {
      if (t.accountId === acc.id) {
        if (t.type === 'INCOME') bal += t.amount;
        else if (t.type === 'EXPENSE' || t.type === 'DEBT_PAYMENT') bal -= t.amount;
        else if (t.type === 'TRANSFER') bal -= t.amount;
      }
      if (t.toAccountId === acc.id && t.type === 'TRANSFER') {
        bal += t.amount;
      }
    }

    if (acc.type === 'BANK') bankBalances += Math.max(0, bal);
    else if (acc.type === 'CASH') cashBalances += Math.max(0, bal);
    else if (acc.type === 'WALLET') walletBalances += Math.max(0, bal);
    else if (acc.type === 'CREDIT_CARD') {
      // For credit cards, negative balance or card balance is a liability
      // Credit limit is strictly informational, never an asset
      const debtFromAccount = Math.abs(Math.min(0, bal));
      creditCardLiabilities += debtFromAccount;
    }
  }

  // 2. Total Debt & Loan Liabilities
  const totalDebt = calculateDebtOutstanding(state.debts, state.debtPayments, state.transactions).totalOutstanding;
  const loanLiabilities = totalDebt;

  // Net Worth = Liquid Assets + Other Assets - Debt Obligations - Credit Card Liabilities
  const totalAssets = bankBalances + cashBalances + walletBalances;
  const netWorth = totalAssets - totalDebt - creditCardLiabilities;

  // 3. Monthly Recorded Operations for Current Month
  const currentMonthTxs = state.transactions.filter(
    (t) => t.date.startsWith(currentMonthKey)
  );

  const monthlyIncome = currentMonthTxs
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = currentMonthTxs
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyDebtPayments = currentMonthTxs
    .filter((t) => t.type === 'DEBT_PAYMENT')
    .reduce((sum, t) => sum + t.amount, 0);

  // Scheduled Debt Obligations due this month
  const monthlyScheduledDebt = state.payments
    .filter((p) => p.dueDate.startsWith(currentMonthKey) && (p.type === 'EMI' || p.debtId))
    .reduce((sum, p) => sum + p.amount, 0);

  const monthlyDebtObligations = monthlyDebtPayments > 0 ? monthlyDebtPayments : monthlyScheduledDebt;

  // Monthly Surplus = Recorded Income - Recorded Expenses - Recorded Debt Obligations (Section 8)
  const monthlySurplus = monthlyIncome - monthlyExpenses - monthlyDebtObligations;
  const netCashChange = monthlyIncome - monthlyExpenses - monthlyDebtPayments;

  // Principal vs Interest breakdown in debt payments for current month
  let debtPrincipalPaid = 0;
  let debtInterestPaid = 0;
  for (const dp of state.debtPayments || []) {
    if (dp.paymentDate.startsWith(currentMonthKey)) {
      debtPrincipalPaid += dp.principalAmount || 0;
      debtInterestPaid += dp.interestAmount || 0;
    }
  }

  // 4. Surplus Trend (Section 9)
  const surplusTrend = calculateMonthlySurplusTrend(state);

  // 5. Debt Obligation Ratio (DTI) (Section 63: Informational metric)
  const debtObligationRatioPct = monthlyIncome > 0
    ? Math.round((monthlyDebtObligations / monthlyIncome) * 100)
    : 0;

  // 6. Expense Classification & Emergency Buffer (Section 13, 15, 30)
  const essentialExpenses = currentMonthTxs
    .filter((t) => {
      if (t.type !== 'EXPENSE') return false;
      const cat = state.categories.find((c) => c.id === t.categoryId);
      return cat?.classification === 'ESSENTIAL';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const discretionaryExpenses = currentMonthTxs
    .filter((t) => {
      if (t.type !== 'EXPENSE') return false;
      const cat = state.categories.find((c) => c.id === t.categoryId);
      return cat?.classification === 'DISCRETIONARY';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const debtCostExpenses = currentMonthTxs
    .filter((t) => {
      if (t.type !== 'EXPENSE') return false;
      const cat = state.categories.find((c) => c.id === t.categoryId);
      return cat?.classification === 'DEBT_COST';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // Essential monthly burn rate includes essential living expenses + scheduled EMI obligations
  const essentialMonthlyBurnRate = Math.max(1, essentialExpenses + monthlyDebtObligations);
  const emergencyBuffer = availableCash;
  const emergencyBufferMonths = parseFloat((emergencyBuffer / essentialMonthlyBurnRate).toFixed(1));

  // 7. Multi-horizon Outlook: 30-Day, 3-Month, 6-Month, 12-Month Projections (Section 36)
  const forecast30 = calculateCashFlowForecast(state, 30);
  const projected30DayCash = forecast30.projectedEndingCash;

  const outlook = calculateMultiHorizonOutlook(state);

  // 8. Compositions
  const incomeComposition = calculateIncomeComposition(state);
  const expenseComposition = calculateExpenseComposition(state);

  return {
    currentCash: availableCash,
    bankBalances,
    cashBalances,
    walletBalances,
    creditCardLiabilities,
    loanLiabilities,
    totalDebt,
    netWorth,

    monthlyIncome,
    monthlyExpenses,
    monthlyDebtObligations,
    monthlySurplus,
    debtPrincipalPaid,
    debtInterestPaid,
    netCashChange,

    surplusTrend,
    debtObligationRatioPct,

    emergencyBuffer,
    emergencyBufferMonths,
    essentialMonthlyBurnRate,

    projected30DayCash,
    projected3MonthCash: outlook.threeMonth.projectedCash,
    projected6MonthCash: outlook.sixMonth.projectedCash,
    projected12MonthCash: outlook.twelveMonth.projectedCash,

    projected3MonthDebt: outlook.threeMonth.projectedDebt,
    projected6MonthDebt: outlook.sixMonth.projectedDebt,
    projected12MonthDebt: outlook.twelveMonth.projectedDebt,

    projected3MonthSurplus: outlook.threeMonth.projectedSurplus,
    projected6MonthSurplus: outlook.sixMonth.projectedSurplus,
    projected12MonthSurplus: outlook.twelveMonth.projectedSurplus,

    incomeComposition,
    expenseComposition,
  };
}

/**
 * Calculates Monthly Surplus Trend comparing current, previous, and 3-month average (Section 9)
 */
export function calculateMonthlySurplusTrend(state: AppState): MonthlySurplusTrend {
  const currentMonthKey = getCurrentMonthKey();
  const prevMonthKey = getPreviousMonthKey();

  const getSurplusForMonth = (monthKey: string): number => {
    const txs = state.transactions.filter(
      (t) => t.date.startsWith(monthKey)
    );
    const inc = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const debt = txs.filter((t) => t.type === 'DEBT_PAYMENT').reduce((s, t) => s + t.amount, 0);
    return inc - exp - debt;
  };

  const currentMonth = getSurplusForMonth(currentMonthKey);
  const previousMonth = getSurplusForMonth(prevMonthKey);
  const momChange = currentMonth - previousMonth;

  // Calculate 3-month average from recorded data
  const months = [currentMonthKey, prevMonthKey];
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 2);
  const twoMonthsAgoKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  months.push(twoMonthsAgoKey);

  const surpluses = months.map(getSurplusForMonth);
  const threeMonthAverage = Math.round(surpluses.reduce((a, b) => a + b, 0) / surpluses.length);

  let trendDescription = '';
  if (momChange > 0) {
    trendDescription = `Monthly surplus increased by ${formatINR(momChange)} compared with previous month.`;
  } else if (momChange < 0) {
    trendDescription = `Monthly surplus decreased by ${formatINR(Math.abs(momChange))} compared with previous month.`;
  } else {
    trendDescription = 'Monthly surplus is identical compared with previous month.';
  }

  return {
    currentMonth,
    previousMonth,
    momChange,
    threeMonthAverage,
    trendDescription,
  };
}

/**
 * Calculates Income Composition (Salary, Swiggy, Other) (Section 10, 11)
 */
export function calculateIncomeComposition(state: AppState): IncomeCompositionItem[] {
  const currentMonthKey = getCurrentMonthKey();
  const currentMonthIncomeTxs = state.transactions.filter(
    (t) => t.type === 'INCOME' && t.date.startsWith(currentMonthKey)
  );

  const totalIncome = currentMonthIncomeTxs.reduce((sum, t) => sum + t.amount, 0);
  if (totalIncome === 0) {
    return [
      { source: 'Salary', amount: 0, percentage: 0 },
      { source: 'Swiggy Operations', amount: 0, percentage: 0 },
      { source: 'Other Income', amount: 0, percentage: 0 },
    ];
  }

  let salary = 0;
  let swiggy = 0;
  let other = 0;

  for (const t of currentMonthIncomeTxs) {
    const desc = (t.description || '').toLowerCase();
    if (desc.includes('salary') || t.amount >= 15000) {
      salary += t.amount;
    } else if (desc.includes('swiggy') || desc.includes('payout') || t.sourceReference?.sourceType === 'SWIGGY_SHIFT') {
      swiggy += t.amount;
    } else {
      other += t.amount;
    }
  }

  return [
    {
      source: 'Salary',
      amount: salary,
      percentage: Math.round((salary / totalIncome) * 100),
    },
    {
      source: 'Swiggy Operations',
      amount: swiggy,
      percentage: Math.round((swiggy / totalIncome) * 100),
    },
    {
      source: 'Other Income',
      amount: other,
      percentage: Math.round((other / totalIncome) * 100),
    },
  ].filter((item) => item.amount > 0 || item.source === 'Salary');
}

/**
 * Calculates Expense Composition across Essential, Discretionary, Debt Cost (Section 13, 15)
 */
export function calculateExpenseComposition(state: AppState): ExpenseCompositionItem[] {
  const currentMonthKey = getCurrentMonthKey();
  const currentMonthExpenses = state.transactions.filter(
    (t) => t.type === 'EXPENSE' && t.date.startsWith(currentMonthKey)
  );

  const totalExpenses = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  if (totalExpenses === 0) return [];

  const groups: Record<string, { total: number; fixed: number; variable: number }> = {
    ESSENTIAL: { total: 0, fixed: 0, variable: 0 },
    DISCRETIONARY: { total: 0, fixed: 0, variable: 0 },
    DEBT_COST: { total: 0, fixed: 0, variable: 0 },
    OTHER: { total: 0, fixed: 0, variable: 0 },
  };

  for (const t of currentMonthExpenses) {
    const cat = state.categories.find((c) => c.id === t.categoryId);
    const classification = cat?.classification || 'OTHER';
    if (!groups[classification]) {
      groups[classification] = { total: 0, fixed: 0, variable: 0 };
    }
    groups[classification].total += t.amount;

    // Recurring commitments or rent/broadband are classified as fixed; others variable
    const isFixed = (state.recurringCommitments || []).some((rc) => rc.categoryId === t.categoryId);
    if (isFixed || (t.description && /rent|broadband|wifi|insurance/i.test(t.description))) {
      groups[classification].fixed += t.amount;
    } else {
      groups[classification].variable += t.amount;
    }
  }

  return Object.entries(groups)
    .filter(([_, data]) => data.total > 0)
    .map(([classification, data]) => ({
      classification: classification as any,
      amount: data.total,
      percentage: Math.round((data.total / totalExpenses) * 100),
      fixedAmount: data.fixed,
      variableAmount: data.variable,
    }));
}

/**
 * Multi-Horizon Outlook for 3, 6, and 12 months (Section 36)
 */
export function calculateMultiHorizonOutlook(state: AppState): {
  threeMonth: { projectedCash: number; projectedDebt: number; projectedSurplus: number };
  sixMonth: { projectedCash: number; projectedDebt: number; projectedSurplus: number };
  twelveMonth: { projectedCash: number; projectedDebt: number; projectedSurplus: number };
} {
  const currentCash = calculateAvailableCash(state.accounts, state.transactions);
  const currentDebt = calculateDebtOutstanding(state.debts, state.debtPayments, state.transactions).totalOutstanding;

  // Run rates based on recent 30-day recorded data
  const forecast30 = calculateCashFlowForecast(state, 30);
  const monthlyNetRunRate = forecast30.projectedNetCashChange;

  // Monthly debt scheduled reduction
  const monthlyEmiTotal = state.debts
    .filter((d) => d.status === 'ACTIVE' && d.emiAmount)
    .reduce((sum, d) => sum + (d.emiAmount || 0), 0);

  const calcHorizon = (months: number) => {
    const projectedCash = currentCash + monthlyNetRunRate * months;
    const projectedDebt = Math.max(0, currentDebt - monthlyEmiTotal * months);
    const projectedSurplus = monthlyNetRunRate * months;
    return { projectedCash, projectedDebt, projectedSurplus };
  };

  return {
    threeMonth: calcHorizon(3),
    sixMonth: calcHorizon(6),
    twelveMonth: calcHorizon(12),
  };
}

/**
 * Generates Financial Data Quality Report (Section 51, 52, 53, 54)
 */
export function calculateDataQualityReport(state: AppState): DataQualityReport {
  const items: DataQualityItem[] = [];

  // 1. Uncategorized Transactions
  const uncategorizedTxs = state.transactions.filter(
    (t) => !t.categoryId || t.categoryId === 'cat_other' || t.categoryId === ''
  );
  if (uncategorizedTxs.length > 0) {
    items.push({
      id: 'uncategorized_txs',
      title: 'Uncategorized Transactions',
      count: uncategorizedTxs.length,
      status: 'NEEDS_REVIEW',
      description: `${uncategorizedTxs.length} transaction${uncategorizedTxs.length === 1 ? '' : 's'} lack category classification.`,
      actionLabel: 'Categorize Now',
      actionRoute: '/transactions',
    });
  }

  // 2. Debts missing interest rate
  const debtsWithoutRate = (state.debts || []).filter(
    (d) => d.status === 'ACTIVE' && (d.interestRate === undefined || d.interestRate === null || d.interestRate === 0)
  );
  if (debtsWithoutRate.length > 0) {
    items.push({
      id: 'debts_missing_rate',
      title: 'Debts Missing Interest Rate',
      count: debtsWithoutRate.length,
      status: 'PARTIAL',
      description: `${debtsWithoutRate.length} active debt${debtsWithoutRate.length === 1 ? '' : 's'} missing interest rate data (projections use principal-only baseline).`,
      actionLabel: 'Update Debts',
      actionRoute: '/debts',
    });
  }

  // 3. Unreconciled accounts
  const unreconciledAccounts = (state.accounts || []).filter(
    (a) => !a.lastReconciledDate
  );
  if (unreconciledAccounts.length > 0) {
    items.push({
      id: 'unreconciled_accounts',
      title: 'Unreconciled Accounts',
      count: unreconciledAccounts.length,
      status: 'LIMITED',
      description: `${unreconciledAccounts.length} account${unreconciledAccounts.length === 1 ? '' : 's'} have not been reconciled with bank statements.`,
      actionLabel: 'Reconcile',
      actionRoute: '/accounts',
    });
  }

  // 4. Commitments missing due dates
  const paymentsMissingDates = (state.payments || []).filter(
    (p) => !p.dueDate
  );
  if (paymentsMissingDates.length > 0) {
    items.push({
      id: 'payments_missing_dates',
      title: 'Payments Missing Due Dates',
      count: paymentsMissingDates.length,
      status: 'NEEDS_REVIEW',
      description: `${paymentsMissingDates.length} payment commitment${paymentsMissingDates.length === 1 ? '' : 's'} missing due date.`,
      actionLabel: 'Set Due Dates',
      actionRoute: '/payments',
    });
  }

  // 5. Incomplete Goals
  const incompleteGoals = (state.goals || []).filter(
    (g) => g.status === 'IN_PROGRESS' && (!g.targetDate || !g.monthlyContribution)
  );
  if (incompleteGoals.length > 0) {
    items.push({
      id: 'incomplete_goals',
      title: 'Goals Missing Target Date or Contribution',
      count: incompleteGoals.length,
      status: 'PARTIAL',
      description: `${incompleteGoals.length} goal${incompleteGoals.length === 1 ? '' : 's'} need target dates or monthly contributions for completion estimates.`,
      actionLabel: 'Configure Goals',
      actionRoute: '/goals',
    });
  }

  // 6. Pending SMS candidates
  const pendingSms = (state.smsCandidates || []).filter((s) => s.reviewStatus === 'PENDING');
  if (pendingSms.length > 0) {
    items.push({
      id: 'pending_sms_review',
      title: 'Pending SMS Transactions',
      count: pendingSms.length,
      status: 'NEEDS_REVIEW',
      description: `${pendingSms.length} bank SMS transaction candidate${pendingSms.length === 1 ? '' : 's'} awaiting review.`,
      actionLabel: 'Review SMS',
      actionRoute: '/sms',
    });
  }

  // Overall Quality status
  let overallQuality: DataQualityStatus = 'COMPLETE';
  if (items.some((i) => i.status === 'NEEDS_REVIEW')) {
    overallQuality = 'NEEDS_REVIEW';
  } else if (items.some((i) => i.status === 'PARTIAL')) {
    overallQuality = 'PARTIAL';
  } else if (items.length > 0) {
    overallQuality = 'LIMITED';
  }

  const summaryMessage =
    overallQuality === 'COMPLETE'
      ? 'All financial records are verified, categorized, and up-to-date.'
      : `${items.length} data completeness gap${items.length === 1 ? '' : 's'} identified that could improve forecast accuracy.`;

  return {
    overallQuality,
    summaryMessage,
    items,
    uncategorizedCount: uncategorizedTxs.length,
    missingInterestRateCount: debtsWithoutRate.length,
    unreconciledAccountsCount: unreconciledAccounts.length,
    missingDueDatesCount: paymentsMissingDates.length,
    incompleteGoalsCount: incompleteGoals.length,
    pendingSmsCount: pendingSms.length,
  };
}

/**
 * Calculates factual historical & projected financial milestones (Section 43, 44)
 */
export function generateFinancialMilestones(state: AppState): FinancialMilestone[] {
  const milestones: FinancialMilestone[] = [];
  const currentDebt = calculateDebtOutstanding(state.debts, state.debtPayments, state.transactions).totalOutstanding;
  const currentCash = calculateAvailableCash(state.accounts, state.transactions);

  // 1. Historical Salary Milestones
  const salaryTxs = state.transactions.filter(
    (t) => t.type === 'INCOME' && (t.description?.toLowerCase().includes('salary') || t.amount >= 15000)
  );
  if (salaryTxs.length > 0) {
    const latestSalary = salaryTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    milestones.push({
      id: 'm_hist_salary',
      title: `Salary Credited (${formatINR(latestSalary.amount)})`,
      date: latestSalary.date,
      type: 'INCOME',
      status: 'ACHIEVED',
      amount: latestSalary.amount,
      description: 'Monthly salary deposit recorded in transaction ledger.',
    });
  }

  // 2. Historical Swiggy Milestone
  const swiggyNet = state.swiggyEarnings.reduce((s, e) => s + e.amount, 0);
  if (swiggyNet >= 5000) {
    milestones.push({
      id: 'm_swiggy_5k',
      title: 'Swiggy Milestone: Cumulative ₹5k+ Earnings',
      date: getCurrentDateISO(),
      type: 'SWIGGY',
      status: 'ACHIEVED',
      amount: swiggyNet,
      description: `Cumulative Swiggy operational earnings crossed ${formatINR(swiggyNet)}.`,
    });
  }

  // 3. Goal Progress Milestones
  for (const g of state.goals || []) {
    const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
    if (pct >= 100) {
      milestones.push({
        id: `m_goal_achieved_${g.id}`,
        title: `Goal Achieved: ${g.name}`,
        date: getCurrentDateISO(),
        type: 'GOAL',
        status: 'ACHIEVED',
        amount: g.targetAmount,
        description: `Successfully reached 100% target of ${formatINR(g.targetAmount)}.`,
      });
    } else if (pct >= 50) {
      milestones.push({
        id: `m_goal_half_${g.id}`,
        title: `Goal 50% Milestone: ${g.name}`,
        date: getCurrentDateISO(),
        type: 'GOAL',
        status: 'ACHIEVED',
        amount: g.currentAmount,
        description: `Passed halfway mark (${pct}%) toward ${formatINR(g.targetAmount)}.`,
      });
    }
  }

  // 4. Projected Debt Milestones
  if (currentDebt > 0) {
    const monthlyEmi = state.debts
      .filter((d) => d.status === 'ACTIVE' && d.emiAmount)
      .reduce((sum, d) => sum + (d.emiAmount || 0), 0);

    if (monthlyEmi > 0) {
      const monthsToZero = Math.ceil(currentDebt / monthlyEmi);
      const debtFreeDate = new Date();
      debtFreeDate.setMonth(debtFreeDate.getMonth() + monthsToZero);

      milestones.push({
        id: 'm_proj_debt_free',
        title: 'Projected Debt-Free Horizon',
        date: debtFreeDate.toISOString().split('T')[0],
        type: 'DEBT',
        status: 'PROJECTED',
        amount: currentDebt,
        description: `Estimated completion of all active debts based on scheduled ${formatINR(monthlyEmi)}/month principal repayments.`,
      });
    }
  }

  return milestones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
