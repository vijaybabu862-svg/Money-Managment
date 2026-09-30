import {
  Account,
  Budget,
  Category,
  Debt,
  DebtPayment,
  Payment,
  Transaction,
  FinancialSummary,
  CashFlowForecast,
  ForecastPoint,
  CashPressurePeriod,
  FinancialInsight,
  MonthlyFinancialSnapshot,
  BudgetForecastItem,
  ConfidenceBasis,
  SwiggyEarning,
} from '../types/finance';
import { AppState } from './storage';
import {
  calculateAccountBalance,
  calculateAvailableCash,
  calculateDebtOutstanding,
} from './calculator';
import { getCurrentDateISO, getCurrentMonthKey } from '../utils/dates';

/**
 * Calculates a forward-looking cash flow forecast for a given horizon.
 * Never displays projections as confirmed financial events.
 * Clearly labels the data quality and forecast basis.
 */
export function calculateCashFlowForecast(
  state: AppState,
  horizonDays: number = 30
): CashFlowForecast {
  const todayStr = getCurrentDateISO();
  const today = new Date(todayStr);
  const currentMonthKey = getCurrentMonthKey();

  const startingCash = calculateAvailableCash(state.accounts, state.transactions);

  const horizonEnd = new Date(today.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  const horizonEndStr = horizonEnd.toISOString().split('T')[0];

  // 1. Projected Income
  let scheduledIncome = 0;
  const salaryTx = state.transactions.find(
    (t: Transaction) => t.type === 'INCOME' && (t.description?.toLowerCase().includes('salary') || t.amount >= 15000)
  );

  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 7).toISOString().split('T')[0];
  const thisMonthSalaryDate = new Date(today.getFullYear(), today.getMonth(), 7).toISOString().split('T')[0];

  const hasSalaryThisMonth = state.transactions.some(
    (t: Transaction) => t.type === 'INCOME' && t.date.startsWith(currentMonthKey) && (t.description?.toLowerCase().includes('salary') || t.amount >= 15000)
  );

  if (!hasSalaryThisMonth && thisMonthSalaryDate >= todayStr && thisMonthSalaryDate <= horizonEndStr) {
    scheduledIncome += salaryTx ? salaryTx.amount : 21000;
  } else if (nextMonthDate <= horizonEndStr) {
    scheduledIncome += salaryTx ? salaryTx.amount : 21000;
  }

  // Estimated daily Swiggy earnings based on active 14-day average
  const recentSwiggy = state.swiggyEarnings.slice(0, 14);
  const avgDailySwiggy = recentSwiggy.length > 0
    ? recentSwiggy.reduce((sum: number, s: SwiggyEarning) => sum + s.amount, 0) / recentSwiggy.length
    : 350;
  const projectedSwiggy = Math.round(avgDailySwiggy * horizonDays);

  const projectedIncome = scheduledIncome + projectedSwiggy;

  // 2. Projected Scheduled Payments & Obligations
  const activeScheduledPayments = state.payments.filter((p: Payment) => {
    if (p.status === 'PAID' || p.status === 'CANCELLED') return false;
    return p.dueDate >= todayStr && p.dueDate <= horizonEndStr;
  });

  const projectedDebtPayments = activeScheduledPayments
    .filter((p: Payment) => p.type === 'EMI' || p.debtId)
    .reduce((sum: number, p: Payment) => sum + p.amount, 0);

  const projectedRecurringCommitments = activeScheduledPayments
    .filter((p: Payment) => p.type !== 'EMI' && !p.debtId)
    .reduce((sum: number, p: Payment) => sum + p.amount, 0);

  // 3. Projected Living Expenses (Essential vs Discretionary)
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysElapsed = Math.max(1, today.getDate());

  const currentMonthExpenses = state.transactions.filter(
    (t: Transaction) => t.type === 'EXPENSE' && t.date.startsWith(currentMonthKey)
  );

  const essentialRecorded = currentMonthExpenses
    .filter((t: Transaction) => {
      const cat = state.categories.find((c: Category) => c.id === t.categoryId);
      return cat?.classification === 'ESSENTIAL';
    })
    .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

  const discretionaryRecorded = currentMonthExpenses
    .filter((t: Transaction) => {
      const cat = state.categories.find((c: Category) => c.id === t.categoryId);
      return cat?.classification === 'DISCRETIONARY';
    })
    .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

  const dailyEssentialRate = essentialRecorded / daysElapsed;
  const dailyDiscretionaryRate = discretionaryRecorded / daysElapsed;

  const daysToProject = Math.min(horizonDays, daysInMonth - daysElapsed + 1);
  const projectedEssentialExpenses = Math.round(dailyEssentialRate * daysToProject);
  const projectedDiscretionaryExpenses = Math.round(dailyDiscretionaryRate * daysToProject);

  const projectedNetCashChange =
    projectedIncome -
    (projectedEssentialExpenses +
      projectedDiscretionaryExpenses +
      projectedDebtPayments +
      projectedRecurringCommitments);

  const projectedEndingCash = startingCash + projectedNetCashChange;

  let dataQuality: 'High' | 'Moderate' | 'Limited' = 'Moderate';
  let confidenceBasis: ConfidenceBasis = 'MIXED';

  if (state.transactions.length > 30 && recentSwiggy.length >= 7) {
    dataQuality = 'High';
    confidenceBasis = 'RECORDED_DATA';
  } else if (state.transactions.length < 5) {
    dataQuality = 'Limited';
    confidenceBasis = 'LIMITED';
  }

  let periodLabel = `Next ${horizonDays} Days`;
  if (horizonDays === 7) periodLabel = 'Next 7 Days';
  else if (horizonDays === 14) periodLabel = 'Next 14 Days';
  else if (horizonDays === 30) periodLabel = 'Next 30 Days';
  else if (horizonDays === 90) periodLabel = 'Next 3 Months';
  else if (horizonDays === 180) periodLabel = 'Next 6 Months';

  const forecastExplanation = `Calculated using ${activeScheduledPayments.length} scheduled commitments, daily run rate of ₹${Math.round(
    dailyEssentialRate + dailyDiscretionaryRate
  )}/day for living expenses, and average Swiggy daily earnings of ₹${Math.round(avgDailySwiggy)}/day.`;

  return {
    period: periodLabel,
    startingCash,
    projectedIncome,
    projectedEssentialExpenses,
    projectedDiscretionaryExpenses,
    projectedDebtPayments,
    projectedRecurringCommitments,
    projectedNetCashChange,
    projectedEndingCash,
    confidenceBasis,
    dataQuality,
    forecastExplanation,
    generatedAt: todayStr,
  };
}

/**
 * Calculates a daily projected cash balance curve for the upcoming N days
 */
export function calculateDailyCashForecast(
  state: AppState,
  daysAhead: number = 30
): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  const todayStr = getCurrentDateISO();
  const today = new Date(todayStr);

  const startingCash = calculateAvailableCash(state.accounts, state.transactions);

  // Past 7 days of actual balance
  for (let i = 7; i >= 1; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    const dayTxs = state.transactions.filter((t: Transaction) => t.date === dateStr);
    const dayIncome = dayTxs.filter((t: Transaction) => t.type === 'INCOME').reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const dayExpenses = dayTxs.filter((t: Transaction) => t.type === 'EXPENSE' || t.type === 'DEBT_PAYMENT').reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    points.push({
      date: dateStr,
      label,
      actualCash: startingCash - dayIncome + dayExpenses,
      confirmedIncome: dayIncome > 0 ? dayIncome : undefined,
      confirmedExpenses: dayExpenses > 0 ? dayExpenses : undefined,
      isHistorical: true,
    });
  }

  // Today point (bridge)
  points.push({
    date: todayStr,
    label: today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' (Today)',
    actualCash: startingCash,
    projectedCash: startingCash,
    isHistorical: true,
  });

  let runningCash = startingCash;

  const currentMonthExpenses = state.transactions.filter(
    (t: Transaction) => t.type === 'EXPENSE' && t.date.startsWith(getCurrentMonthKey())
  );
  const daysElapsed = Math.max(1, today.getDate());
  const dailyVariableBurn = Math.round(
    currentMonthExpenses.reduce((sum: number, t: Transaction) => sum + t.amount, 0) / daysElapsed
  );

  const avgDailySwiggy = state.swiggyEarnings.length > 0
    ? Math.round(state.swiggyEarnings.slice(0, 7).reduce((s: number, e: SwiggyEarning) => s + e.amount, 0) / Math.min(7, state.swiggyEarnings.length))
    : 400;

  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    const dayPayments = state.payments.filter(
      (p: Payment) => p.dueDate === dateStr && p.status !== 'PAID' && p.status !== 'CANCELLED'
    );
    const scheduledPayTotal = dayPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0);

    const isSalaryDay = d.getDate() === 7;
    const projectedIncome = (isSalaryDay ? 21000 : 0) + avgDailySwiggy;
    const projectedLivingExpense = dailyVariableBurn;

    runningCash = runningCash + projectedIncome - projectedLivingExpense - scheduledPayTotal;

    let eventDescription: string | undefined;
    let eventType: ForecastPoint['eventType'];

    if (dayPayments.length > 0) {
      eventDescription = dayPayments.map((p: Payment) => p.title).join(', ');
      eventType = dayPayments[0].type === 'EMI' ? 'EMI' : 'BILL';
    } else if (isSalaryDay) {
      eventDescription = 'Projected Salary Deposit';
      eventType = 'INCOME';
    }

    points.push({
      date: dateStr,
      label,
      projectedCash: Math.round(runningCash),
      projectedIncome: projectedIncome > 0 ? projectedIncome : undefined,
      projectedExpenses: projectedLivingExpense > 0 ? projectedLivingExpense : undefined,
      scheduledPayments: scheduledPayTotal > 0 ? scheduledPayTotal : undefined,
      eventDescription,
      eventType,
      isHistorical: false,
    });
  }

  return points;
}

/**
 * Calculates upcoming cash pressure before the next expected income.
 */
export function calculateCashPressureAnalysis(
  state: AppState,
  minimumBuffer: number = 0
): CashPressurePeriod {
  const todayStr = getCurrentDateISO();
  const startingCash = calculateAvailableCash(state.accounts, state.transactions);

  const nextIncome = calculateNextExpectedIncome(state);
  const nextIncomeDate = nextIncome?.date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
  const daysUntilNextIncome = nextIncome?.daysUntil || 15;

  const dueBeforeIncome = state.payments.filter((p: Payment) => {
    if (p.status === 'PAID' || p.status === 'CANCELLED') return false;
    return p.dueDate >= todayStr && p.dueDate <= nextIncomeDate;
  });

  const requiredPayments = dueBeforeIncome.reduce((sum: number, p: Payment) => sum + p.amount, 0);

  const recentSwiggy = state.swiggyEarnings.slice(0, 7);
  const avgDailySwiggy = recentSwiggy.length > 0
    ? recentSwiggy.reduce((sum: number, s: SwiggyEarning) => sum + s.amount, 0) / recentSwiggy.length
    : 350;
  const projectedIntermediateIncome = Math.round(avgDailySwiggy * daysUntilNextIncome);

  const cashBeforeNextIncome = startingCash - requiredPayments;
  const projectedEndingCash = startingCash + projectedIntermediateIncome - requiredPayments;

  let pressureLevel: 'NORMAL' | 'TIGHT' | 'NEGATIVE' = 'NORMAL';
  let reason = 'Cash is sufficient to cover obligations with comfortable margin.';

  if (projectedEndingCash < 0) {
    pressureLevel = 'NEGATIVE';
    reason = `Projected deficit of ₹${Math.abs(projectedEndingCash).toLocaleString('en-IN')} before next income arrives on ${nextIncomeDate}.`;
  } else if (projectedEndingCash < minimumBuffer || projectedEndingCash < 3000) {
    pressureLevel = 'TIGHT';
    reason = `Cash falls to ₹${projectedEndingCash.toLocaleString('en-IN')} before next income, near your buffer threshold.`;
  }

  const bufferDeficit = minimumBuffer > 0 && projectedEndingCash < minimumBuffer
    ? minimumBuffer - projectedEndingCash
    : undefined;

  return {
    startDate: todayStr,
    endDate: nextIncomeDate,
    startingCash,
    requiredPayments,
    projectedIncome: projectedIntermediateIncome,
    projectedEndingCash,
    pressureLevel,
    reason,
    daysUntilNextIncome,
    nextIncomeDate: nextIncome?.date,
    nextIncomeAmount: nextIncome?.amount,
    nextIncomeSource: nextIncome?.source,
    cashBeforeNextIncome,
    bufferDeficit,
  };
}

/**
 * Calculates next expected income date and amount based on recorded salary and recurring commitments.
 */
export function calculateNextExpectedIncome(
  state: AppState
): { date: string; amount: number; source: string; daysUntil: number } | null {
  const todayStr = getCurrentDateISO();
  const today = new Date(todayStr);

  const salaryTx = state.transactions.find(
    (t: Transaction) => t.type === 'INCOME' && (t.description?.toLowerCase().includes('salary') || t.amount >= 15000)
  );

  const defaultSalaryAmount = salaryTx ? salaryTx.amount : 21000;

  let nextSalaryDate: Date;
  if (today.getDate() < 7) {
    nextSalaryDate = new Date(today.getFullYear(), today.getMonth(), 7);
  } else {
    nextSalaryDate = new Date(today.getFullYear(), today.getMonth() + 1, 7);
  }

  const nextIncomeDateStr = nextSalaryDate.toISOString().split('T')[0];
  const diffDays = Math.max(1, Math.round((nextSalaryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    date: nextIncomeDateStr,
    amount: defaultSalaryAmount,
    source: 'Monthly Salary (Standard Cycle)',
    daysUntil: diffDays,
  };
}

/**
 * Calculates forward-looking Budget Forecasts for all active expense categories.
 */
export function calculateBudgetForecasts(state: AppState): BudgetForecastItem[] {
  const currentMonthKey = getCurrentMonthKey();
  const today = new Date();
  const currentDay = today.getDate();
  const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);

  const spendMap = new Map<string, number>();
  for (const tx of state.transactions) {
    if (tx.type === 'EXPENSE' && tx.date.startsWith(currentMonthKey) && tx.categoryId) {
      spendMap.set(tx.categoryId, (spendMap.get(tx.categoryId) || 0) + tx.amount);
    }
  }

  const budgetMap = new Map<string, number>();
  for (const b of state.budgets) {
    if (b.month === currentMonthKey) {
      budgetMap.set(b.categoryId, b.limit);
    }
  }

  const results: BudgetForecastItem[] = [];

  for (const cat of state.categories) {
    if (cat.type !== 'EXPENSE' || !cat.active) continue;

    const actualSpent = spendMap.get(cat.id) || 0;
    const budgetLimit = budgetMap.get(cat.id) || (cat.classification === 'ESSENTIAL' ? 4000 : 2500);
    const remainingBudget = budgetLimit - actualSpent;

    const dailySpendRate = Math.round(actualSpent / Math.max(1, currentDay));
    const projectedMonthEndSpend = Math.round(dailySpendRate * totalDaysInMonth);
    const projectedVariance = projectedMonthEndSpend - budgetLimit;

    let status: BudgetForecastItem['status'] = 'ON_TRACK';
    if (actualSpent > budgetLimit) {
      status = 'OVER_BUDGET';
    } else if (projectedMonthEndSpend > budgetLimit) {
      status = 'PROJECTED_OVER';
    } else if (actualSpent / budgetLimit >= 0.8) {
      status = 'CAUTION';
    }

    const forecastBasis = currentDay >= 5
      ? `Based on ₹${dailySpendRate}/day average over ${currentDay} elapsed days.`
      : `Early in month; projection will stabilize with more data.`;

    results.push({
      categoryId: cat.id,
      categoryName: cat.name,
      classification: cat.classification,
      budgetLimit,
      actualSpent,
      remainingBudget,
      daysElapsed: currentDay,
      daysRemaining,
      dailySpendRate,
      projectedMonthEndSpend,
      projectedVariance,
      forecastBasis,
      status,
    });
  }

  return results.sort((a, b) => b.actualSpent - a.actualSpent);
}

/**
 * Calculates multi-month income trend and channel breakdown.
 */
export function calculateIncomeTrends(
  transactions: Transaction[],
  monthsCount: number = 6
): {
  monthlyTotals: Array<{
    monthKey: string;
    monthLabel: string;
    salary: number;
    swiggy: number;
    other: number;
    total: number;
  }>;
  momChange: number;
  rolling3MonthAvg: number;
} {
  const monthlyTotals: Array<{
    monthKey: string;
    monthLabel: string;
    salary: number;
    swiggy: number;
    other: number;
    total: number;
  }> = [];

  const now = new Date();

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    const monthLabel = d.toLocaleString('en-IN', { month: 'short' });

    let salary = 0;
    let swiggy = 0;
    let other = 0;

    for (const tx of transactions) {
      if (tx.type === 'INCOME' && tx.date.startsWith(monthKey)) {
        const desc = (tx.description || '').toLowerCase();
        if (desc.includes('salary') || tx.amount >= 15000) {
          salary += tx.amount;
        } else if (desc.includes('swiggy') || desc.includes('delivery')) {
          swiggy += tx.amount;
        } else {
          other += tx.amount;
        }
      }
    }

    monthlyTotals.push({
      monthKey,
      monthLabel,
      salary,
      swiggy,
      other,
      total: salary + swiggy + other,
    });
  }

  const currentMonthTotal = monthlyTotals[monthlyTotals.length - 1]?.total || 0;
  const previousMonthTotal = monthlyTotals[monthlyTotals.length - 2]?.total || 0;
  const momChange = currentMonthTotal - previousMonthTotal;

  const last3 = monthlyTotals.slice(-3);
  const rolling3MonthAvg = last3.length > 0
    ? Math.round(last3.reduce((sum: number, m: { total: number }) => sum + m.total, 0) / last3.length)
    : 0;

  return { monthlyTotals, momChange, rolling3MonthAvg };
}

/**
 * Calculates multi-month expense trends and category changes.
 */
export function calculateExpenseTrends(
  transactions: Transaction[],
  categories: Category[],
  monthsCount: number = 6
): {
  monthlyTotals: Array<{
    monthKey: string;
    monthLabel: string;
    essential: number;
    discretionary: number;
    debtCost: number;
    total: number;
  }>;
  momChange: number;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    currentMonth: number;
    previousMonth: number;
    change: number;
    percentageChange: number | null;
  }>;
} {
  const catMap = new Map(categories.map((c: Category) => [c.id, c]));
  const monthlyTotals: Array<{
    monthKey: string;
    monthLabel: string;
    essential: number;
    discretionary: number;
    debtCost: number;
    total: number;
  }> = [];

  const now = new Date();

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    const monthLabel = d.toLocaleString('en-IN', { month: 'short' });

    let essential = 0;
    let discretionary = 0;
    let debtCost = 0;

    for (const tx of transactions) {
      if (tx.date.startsWith(monthKey)) {
        if (tx.type === 'EXPENSE') {
          const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
          const classification = cat?.classification || 'DISCRETIONARY';
          if (classification === 'ESSENTIAL') essential += tx.amount;
          else if (classification === 'DEBT_COST') debtCost += tx.amount;
          else discretionary += tx.amount;
        } else if (tx.type === 'DEBT_PAYMENT' && tx.interestAmount) {
          debtCost += tx.interestAmount;
        }
      }
    }

    monthlyTotals.push({
      monthKey,
      monthLabel,
      essential,
      discretionary,
      debtCost,
      total: essential + discretionary + debtCost,
    });
  }

  const currentTotal = monthlyTotals[monthlyTotals.length - 1]?.total || 0;
  const prevTotal = monthlyTotals[monthlyTotals.length - 2]?.total || 0;
  const momChange = currentTotal - prevTotal;

  const curKey = monthlyTotals[monthlyTotals.length - 1]?.monthKey || '';
  const prevKey = monthlyTotals[monthlyTotals.length - 2]?.monthKey || '';

  const curCatSpend = new Map<string, number>();
  const prevCatSpend = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type === 'EXPENSE' && tx.categoryId) {
      if (tx.date.startsWith(curKey)) {
        curCatSpend.set(tx.categoryId, (curCatSpend.get(tx.categoryId) || 0) + tx.amount);
      } else if (tx.date.startsWith(prevKey)) {
        prevCatSpend.set(tx.categoryId, (prevCatSpend.get(tx.categoryId) || 0) + tx.amount);
      }
    }
  }

  const categoryBreakdown = categories
    .filter((c: Category) => c.type === 'EXPENSE' && c.active)
    .map((c: Category) => {
      const cur = curCatSpend.get(c.id) || 0;
      const prev = prevCatSpend.get(c.id) || 0;
      const change = cur - prev;
      const percentageChange = prev > 0 ? Math.round((change / prev) * 1000) / 10 : null;

      return {
        categoryId: c.id,
        categoryName: c.name,
        currentMonth: cur,
        previousMonth: prev,
        change,
        percentageChange,
      };
    })
    .sort((a, b) => b.currentMonth - a.currentMonth);

  return { monthlyTotals, momChange, categoryBreakdown };
}

/**
 * Calculates historical debt balance trends over time.
 */
export function calculateDebtTrends(
  debts: Debt[],
  debtPayments: DebtPayment[],
  transactions: Transaction[],
  monthsCount: number = 6
): Array<{
  monthKey: string;
  monthLabel: string;
  openingDebt: number;
  principalPaid: number;
  interestPaid: number;
  feesPaid: number;
  closingDebt: number;
}> {
  const points: Array<{
    monthKey: string;
    monthLabel: string;
    openingDebt: number;
    principalPaid: number;
    interestPaid: number;
    feesPaid: number;
    closingDebt: number;
  }> = [];

  const now = new Date();
  const totalOriginalDebt = debts.reduce((sum: number, d: Debt) => sum + d.originalPrincipal, 0);

  let rollingDebt = totalOriginalDebt;

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    const monthLabel = d.toLocaleString('en-IN', { month: 'short' });

    let principalPaid = 0;
    let interestPaid = 0;
    let feesPaid = 0;

    for (const tx of transactions) {
      if (tx.type === 'DEBT_PAYMENT' && tx.date.startsWith(monthKey)) {
        principalPaid += tx.principalAmount || tx.amount;
        interestPaid += tx.interestAmount || 0;
        feesPaid += tx.feesAmount || 0;
      }
    }

    const opening = rollingDebt;
    rollingDebt = Math.max(0, rollingDebt - principalPaid);
    const closing = rollingDebt;

    points.push({
      monthKey,
      monthLabel,
      openingDebt: opening,
      principalPaid,
      interestPaid,
      feesPaid,
      closingDebt: closing,
    });
  }

  return points;
}

/**
 * Calculates Net Worth trends over time.
 */
export function calculateNetWorthTrends(
  accounts: Account[],
  debts: Debt[],
  debtPayments: DebtPayment[],
  transactions: Transaction[],
  monthsCount: number = 6
): Array<{
  monthKey: string;
  monthLabel: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}> {
  const points: Array<{
    monthKey: string;
    monthLabel: string;
    assets: number;
    liabilities: number;
    netWorth: number;
  }> = [];

  const now = new Date();
  const { totalOutstanding: currentLoanDebt } = calculateDebtOutstanding(debts, debtPayments, transactions);

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    const monthLabel = d.toLocaleString('en-IN', { month: 'short' });

    const assets = accounts
      .filter((a: Account) => a.isActive && a.type !== 'CREDIT_CARD')
      .reduce((sum: number, a: Account) => sum + Math.max(0, calculateAccountBalance(a, transactions)), 0);

    const creditLiabilities = accounts
      .filter((a: Account) => a.isActive && a.type === 'CREDIT_CARD')
      .reduce((sum: number, a: Account) => sum + Math.max(0, calculateAccountBalance(a, transactions)), 0);

    const liabilities = currentLoanDebt + creditLiabilities;
    const netWorth = assets - liabilities;

    points.push({
      monthKey,
      monthLabel,
      assets,
      liabilities,
      netWorth,
    });
  }

  return points;
}

/**
 * Generates monthly financial snapshots with month-to-month deltas.
 */
export function generateMonthlySnapshots(
  transactions: Transaction[],
  debts: Debt[],
  debtPayments: DebtPayment[],
  accounts: Account[],
  monthsCount: number = 6
): MonthlyFinancialSnapshot[] {
  const snapshots: MonthlyFinancialSnapshot[] = [];
  const now = new Date();

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    const monthLabel = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });

    let income = 0;
    let expenses = 0;
    let debtPrincipal = 0;
    let interestPaid = 0;

    for (const tx of transactions) {
      if (tx.date.startsWith(monthKey)) {
        if (tx.type === 'INCOME') income += tx.amount;
        else if (tx.type === 'EXPENSE') expenses += tx.amount;
        else if (tx.type === 'DEBT_PAYMENT') {
          debtPrincipal += tx.principalAmount || tx.amount;
          if (tx.interestAmount) interestPaid += tx.interestAmount;
        }
      }
    }

    const netCashChange = income - (expenses + debtPrincipal);

    const endingCash = accounts
      .filter((a: Account) => a.isActive && a.type !== 'CREDIT_CARD')
      .reduce((sum: number, a: Account) => sum + Math.max(0, calculateAccountBalance(a, transactions)), 0);

    const { totalOutstanding } = calculateDebtOutstanding(debts, debtPayments, transactions);
    const netWorth = endingCash - totalOutstanding;

    snapshots.push({
      monthKey,
      monthLabel,
      income,
      expenses,
      debtPrincipal,
      interestPaid,
      netCashChange,
      endingCash,
      netWorth,
    });
  }

  for (let idx = 1; idx < snapshots.length; idx++) {
    const cur = snapshots[idx];
    const prev = snapshots[idx - 1];

    const incomeDiff = cur.income - prev.income;
    const expensesDiff = cur.expenses - prev.expenses;
    const debtPrincipalDiff = cur.debtPrincipal - prev.debtPrincipal;
    const netWorthDiff = cur.netWorth - prev.netWorth;

    cur.vsPrevious = {
      incomeDiff,
      incomePct: prev.income > 0 ? Math.round((incomeDiff / prev.income) * 1000) / 10 : null,
      expensesDiff,
      expensesPct: prev.expenses > 0 ? Math.round((expensesDiff / prev.expenses) * 1000) / 10 : null,
      debtPrincipalDiff,
      debtPrincipalPct: prev.debtPrincipal > 0 ? Math.round((debtPrincipalDiff / prev.debtPrincipal) * 1000) / 10 : null,
      netWorthDiff,
      netWorthPct: prev.netWorth !== 0 ? Math.round((netWorthDiff / Math.abs(prev.netWorth)) * 1000) / 10 : null,
    };
  }

  return snapshots.reverse();
}

/**
 * Generates factual, objective financial insights.
 */
export function generateFinancialInsights(
  state: AppState,
  summary: FinancialSummary,
  forecast: CashFlowForecast,
  pressure: CashPressurePeriod,
  budgetForecasts: BudgetForecastItem[]
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];
  const todayStr = getCurrentDateISO();

  // 1. Upcoming commitments alert
  const dueWithin3Days = state.payments.filter((p: Payment) => {
    if (p.status === 'PAID' || p.status === 'CANCELLED') return false;
    const diff = Math.round((new Date(p.dueDate).getTime() - new Date(todayStr).getTime()) / 86400000);
    return diff >= 0 && diff <= 3;
  });

  if (dueWithin3Days.length > 0) {
    const total = dueWithin3Days.reduce((sum: number, p: Payment) => sum + p.amount, 0);
    insights.push({
      id: 'ins_due_soon',
      type: 'UPCOMING',
      title: `${dueWithin3Days.length} Payment${dueWithin3Days.length > 1 ? 's' : ''} Due in 3 Days`,
      description: `Total ₹${total.toLocaleString('en-IN')} scheduled (${dueWithin3Days.map((p: Payment) => p.title).join(', ')}).`,
      metric: `₹${total.toLocaleString('en-IN')}`,
      actionText: 'View Payments',
      actionUrl: '/payments',
      severity: 'warning',
    });
  }

  // 2. Overdue payments alert
  const overdueList = state.payments.filter(
    (p: Payment) => p.status === 'OVERDUE' || (new Date(p.dueDate).getTime() < new Date(todayStr).getTime() && p.status !== 'PAID')
  );

  if (overdueList.length > 0) {
    const total = overdueList.reduce((sum: number, p: Payment) => sum + p.amount, 0);
    insights.push({
      id: 'ins_overdue',
      type: 'OVERDUE',
      title: `${overdueList.length} Payment${overdueList.length > 1 ? 's' : ''} Overdue`,
      description: `Total overdue balance of ₹${total.toLocaleString('en-IN')} requires settlement.`,
      metric: `₹${total.toLocaleString('en-IN')}`,
      actionText: 'Review Overdue',
      actionUrl: '/payments',
      severity: 'critical',
    });
  }

  // 3. Cash Pressure analysis
  if (pressure.pressureLevel === 'NEGATIVE') {
    insights.push({
      id: 'ins_cash_negative',
      type: 'FORECAST',
      title: 'Projected Cash Deficit Before Next Income',
      description: pressure.reason,
      metric: `-₹${Math.abs(pressure.projectedEndingCash).toLocaleString('en-IN')}`,
      actionText: 'Review Cash Flow',
      actionUrl: '/planning',
      severity: 'critical',
    });
  } else if (pressure.pressureLevel === 'TIGHT') {
    insights.push({
      id: 'ins_cash_tight',
      type: 'FORECAST',
      title: 'Tight Cash Flow Ahead of Income Date',
      description: `Projected remaining cash is ₹${pressure.projectedEndingCash.toLocaleString('en-IN')} before next income on ${pressure.nextIncomeDate}.`,
      metric: `₹${pressure.projectedEndingCash.toLocaleString('en-IN')}`,
      actionText: 'Open Planning',
      actionUrl: '/planning',
      severity: 'warning',
    });
  }

  // 4. Budget overage projection
  const overBudgetCats = budgetForecasts.filter((b: BudgetForecastItem) => b.status === 'PROJECTED_OVER' || b.status === 'OVER_BUDGET');
  if (overBudgetCats.length > 0) {
    const names = overBudgetCats.map((c: BudgetForecastItem) => c.categoryName).join(', ');
    insights.push({
      id: 'ins_budget_over',
      type: 'BUDGET',
      title: `${overBudgetCats.length} Category Budgets Exceeded or Projected Over`,
      description: `Current daily run rate projects excess spending in: ${names}.`,
      metric: `${overBudgetCats.length} Categories`,
      actionText: 'Adjust Budgets',
      actionUrl: '/budget',
      severity: 'warning',
    });
  }

  // 5. Debt principal reduction
  if (summary.debtPrincipalPaid > 0) {
    insights.push({
      id: 'ins_debt_reduction',
      type: 'TREND',
      title: 'Debt Principal Reduction Recorded',
      description: `₹${summary.debtPrincipalPaid.toLocaleString('en-IN')} principal repaid this month across active loans.`,
      metric: `+₹${summary.debtPrincipalPaid.toLocaleString('en-IN')}`,
      actionText: 'View Debts',
      actionUrl: '/debts',
      severity: 'success',
    });
  }

  // 6. Month-End Cash Projection
  insights.push({
    id: 'ins_month_end_cash',
    type: 'FORECAST',
    title: 'Projected Month-End Cash',
    description: `Based on scheduled payments and recorded daily expenses, projected ending cash is ₹${forecast.projectedEndingCash.toLocaleString('en-IN')}.`,
    metric: `₹${forecast.projectedEndingCash.toLocaleString('en-IN')}`,
    actionText: 'Forecast Details',
    actionUrl: '/forecast',
    severity: forecast.projectedEndingCash >= 0 ? 'info' : 'critical',
  });

  return insights;
}

/**
 * Groups upcoming payments by 7, 14, and 30 day horizons.
 */
export function calculateUpcomingCashCommitments(payments: Payment[]): {
  next7Days: Payment[];
  next14Days: Payment[];
  next30Days: Payment[];
  totalNext7Days: number;
  totalNext14Days: number;
  totalNext30Days: number;
} {
  const todayStr = getCurrentDateISO();
  const todayTime = new Date(todayStr).getTime();

  const next7Days: Payment[] = [];
  const next14Days: Payment[] = [];
  const next30Days: Payment[] = [];

  for (const p of payments) {
    if (p.status === 'PAID' || p.status === 'CANCELLED') continue;

    const pTime = new Date(p.dueDate).getTime();
    const diffDays = Math.round((pTime - todayTime) / 86400000);

    if (diffDays >= 0 && diffDays <= 7) {
      next7Days.push(p);
      next14Days.push(p);
      next30Days.push(p);
    } else if (diffDays > 7 && diffDays <= 14) {
      next14Days.push(p);
      next30Days.push(p);
    } else if (diffDays > 14 && diffDays <= 30) {
      next30Days.push(p);
    }
  }

  return {
    next7Days,
    next14Days,
    next30Days,
    totalNext7Days: next7Days.reduce((sum: number, p: Payment) => sum + p.amount, 0),
    totalNext14Days: next14Days.reduce((sum: number, p: Payment) => sum + p.amount, 0),
    totalNext30Days: next30Days.reduce((sum: number, p: Payment) => sum + p.amount, 0),
  };
}
