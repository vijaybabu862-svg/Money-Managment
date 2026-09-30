import {
  Account,
  Budget,
  Category,
  CategorySpendingSummary,
  CreditCard,
  Debt,
  DebtPayment,
  FinancialSummary,
  Payment,
  Transaction,
  CashFlowMonthPoint,
  DebtObligationSummary,
  CashFlowPlan,
  PayoffStrategyResult,
  SwiggyShift,
  FuelLog,
  SwiggyOperationalTargets,
  SwiggyOperationalSummary,
  SwiggyEarning,
} from '../types/finance';
import { getCurrentDateISO, getCurrentMonthKey } from '../utils/dates';

export interface FinancialStateData {
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  creditCards: CreditCard[];
  payments: Payment[];
  budgets: Budget[];
  categories: Category[];
}

/**
 * Calculates current balance for a single account based on opening balance
 * and all confirmed/recorded transactions affecting it.
 */
export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[]
): number {
  let balance = account.openingBalance || 0;

  for (const tx of transactions) {
    if (account.type === 'CREDIT_CARD') {
      // For credit cards:
      // An expense or debt draw charged to this card INCREASES used credit (liability).
      // A payment or transfer to this card DECREASES used credit.
      if (tx.accountId === account.id) {
        if (tx.type === 'EXPENSE' || tx.type === 'DEBT_DRAW') {
          balance += tx.amount; // more credit used
        } else if (tx.type === 'REFUND') {
          balance -= tx.amount;
        } else if (tx.type === 'DEBT_PAYMENT') {
          balance -= tx.amount;
        }
      }
      // If payment transferred to credit card
      if (tx.toAccountId === account.id && tx.type === 'TRANSFER') {
        balance -= tx.amount;
      }
    } else {
      // Regular liquid accounts (BANK, CASH, WALLET, OTHER)
      if (tx.accountId === account.id) {
        if (tx.type === 'INCOME') {
          balance += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          balance -= tx.amount;
        } else if (tx.type === 'TRANSFER') {
          balance -= tx.amount; // Outgoing transfer
        } else if (tx.type === 'DEBT_PAYMENT') {
          // Cash leaves account to pay debt (both principal + interest)
          balance -= tx.amount;
        } else if (tx.type === 'REFUND') {
          balance += tx.amount;
        } else if (tx.type === 'ADJUSTMENT') {
          balance += tx.amount; // can be positive or negative
        }
      }

      // Incoming transfer to this account
      if (tx.toAccountId === account.id && tx.type === 'TRANSFER') {
        balance += tx.amount;
      }
    }
  }

  return balance;
}

/**
 * Calculates Available Cash:
 * Liquid money in BANK, CASH, and WALLET accounts that is immediately spendable.
 * (Credit card liabilities are excluded from cash position).
 */
export function calculateAvailableCash(
  accounts: Account[],
  transactions: Transaction[]
): number {
  return accounts
    .filter((acc) => acc.isActive && (acc.type === 'BANK' || acc.type === 'CASH' || acc.type === 'WALLET'))
    .reduce((sum, acc) => sum + calculateAccountBalance(acc, transactions), 0);
}

/**
 * Calculates Monthly Income for a given monthKey (YYYY-MM).
 * Only genuine income movements (salary, Swiggy, freelancing, other income).
 * Excludes transfers, debt draws, adjustments.
 */
export function calculateMonthlyIncome(
  transactions: Transaction[],
  monthKey: string = getCurrentMonthKey()
): number {
  return transactions
    .filter((tx) => tx.type === 'INCOME' && tx.date.startsWith(monthKey))
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Calculates Monthly Expenses breakdown:
 * - Essential expenses (Rent, Food, Fuel, Utilities, Medical, etc.)
 * - Discretionary expenses (Shopping, Dining Out, Subscriptions, etc.)
 * - Interest & fees paid (from debt payments or charges)
 * 
 * Crucial accounting rule:
 * Loan principal repayments are DEBT REDUCTIONS, not expenses.
 * Credit card payments are debt settlements, not expenses (the expense was recorded at purchase).
 */
export function calculateMonthlyExpenses(
  transactions: Transaction[],
  categories: Category[],
  monthKey: string = getCurrentMonthKey()
): {
  essentialExpenses: number;
  discretionaryExpenses: number;
  interestPaid: number;
  totalExpenses: number;
} {
  const categoryMap = new Map<string, Category>();
  categories.forEach((cat) => categoryMap.set(cat.id, cat));

  let essentialExpenses = 0;
  let discretionaryExpenses = 0;
  let interestPaid = 0;

  for (const tx of transactions) {
    if (!tx.date.startsWith(monthKey)) continue;

    if (tx.type === 'EXPENSE') {
      const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
      const classification = cat?.classification || 'DISCRETIONARY';

      if (classification === 'ESSENTIAL') {
        essentialExpenses += tx.amount;
      } else if (classification === 'DEBT_COST') {
        interestPaid += tx.amount;
      } else {
        discretionaryExpenses += tx.amount;
      }
    } else if (tx.type === 'DEBT_PAYMENT') {
      // If a debt payment has an interest or fee component, that portion is an expense
      if (tx.interestAmount && tx.interestAmount > 0) {
        interestPaid += tx.interestAmount;
      }
      if (tx.feesAmount && tx.feesAmount > 0) {
        interestPaid += tx.feesAmount;
      }
    }
  }

  const totalExpenses = essentialExpenses + discretionaryExpenses + interestPaid;

  return {
    essentialExpenses,
    discretionaryExpenses,
    interestPaid,
    totalExpenses,
  };
}

/**
 * Calculates debt outstanding for each debt:
 * originalPrincipal - total principal repayments made + draws
 */
export function calculateDebtOutstanding(
  debts: Debt[],
  debtPayments: DebtPayment[] = [],
  transactions: Transaction[] = []
): { totalOutstanding: number; debtsWithOutstanding: Array<Debt & { currentOutstanding: number; percentPaid: number }> } {
  let totalOutstanding = 0;

  const debtsWithOutstanding = debts.map((debt) => {
    const originalPrincipal = debt.originalPrincipal !== undefined ? debt.originalPrincipal : ((debt as any).principalAmount || 0);

    // Principal paid via debt payment records
    const principalPaidFromRecords = (debtPayments || [])
      .filter((dp) => dp.debtId === debt.id)
      .reduce((sum, dp) => sum + (dp.principalAmount || dp.amount), 0);

    // Or via transactions of type DEBT_PAYMENT directly linked to debtId
    const principalPaidFromTx = (transactions || [])
      .filter((tx) => tx.debtId === debt.id && tx.type === 'DEBT_PAYMENT')
      .reduce((sum, tx) => {
        // If transaction has explicit principalAmount, use that; otherwise fall back to amount
        const principal = tx.principalAmount !== undefined ? tx.principalAmount : tx.amount;
        return sum + principal;
      }, 0);

    const totalPrincipalPaid = Math.max(principalPaidFromRecords, principalPaidFromTx);

    // Current outstanding principal cannot be negative
    const currentOutstanding = Math.max(0, originalPrincipal - totalPrincipalPaid);

    const percentPaid = originalPrincipal > 0
      ? Math.min(100, Math.round((totalPrincipalPaid / originalPrincipal) * 100))
      : 100;

    if (debt.status === 'ACTIVE') {
      totalOutstanding += currentOutstanding;
    }

    return {
      ...debt,
      currentOutstanding,
      percentPaid,
    };
  });

  return {
    totalOutstanding,
    debtsWithOutstanding,
  };
}

/**
 * Calculates Debt Principal Paid in a specific month
 */
export function calculateMonthlyDebtPrincipalPaid(
  transactions: Transaction[],
  monthKey: string = getCurrentMonthKey()
): number {
  return transactions
    .filter((tx) => tx.type === 'DEBT_PAYMENT' && tx.date.startsWith(monthKey))
    .reduce((sum, tx) => {
      const principal = tx.principalAmount !== undefined ? tx.principalAmount : tx.amount;
      return sum + principal;
    }, 0);
}

/**
 * Calculates Upcoming commitments & payments:
 * Sum of payments due that are in 'UPCOMING' or 'OVERDUE' status.
 */
export function calculateUpcomingPayments(payments: Payment[]): {
  totalUpcoming: number;
  upcomingList: Payment[];
  overdueList: Payment[];
} {
  const activePayments = payments.filter(
    (p) => p.status === 'UPCOMING' || p.status === 'OVERDUE'
  );

  const totalUpcoming = activePayments.reduce((sum, p) => sum + p.amount, 0);
  const upcomingList = activePayments.filter((p) => p.status === 'UPCOMING');
  const overdueList = activePayments.filter((p) => p.status === 'OVERDUE');

  return {
    totalUpcoming,
    upcomingList,
    overdueList,
  };
}

/**
 * Calculates Net Worth:
 * Total Assets (Liquid bank, cash, wallet, investments)
 * MINUS
 * Total Liabilities (Active loans outstanding + Credit Card used balances)
 */
export function calculateNetWorth(
  accounts: Account[],
  debts: Debt[],
  debtPayments: DebtPayment[],
  transactions: Transaction[]
): {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
} {
  // Assets = sum of all non-credit card positive accounts
  let totalAssets = 0;
  let creditCardLiabilities = 0;

  for (const acc of accounts) {
    if (!acc.isActive) continue;
    const balance = calculateAccountBalance(acc, transactions);

    if (acc.type === 'CREDIT_CARD') {
      // Credit card balance is used credit (liability)
      creditCardLiabilities += Math.max(0, balance);
    } else {
      totalAssets += Math.max(0, balance);
    }
  }

  // Loan Debts outstanding
  const { totalOutstanding: loanDebtsOutstanding } = calculateDebtOutstanding(
    debts,
    debtPayments,
    transactions
  );

  const totalLiabilities = loanDebtsOutstanding + creditCardLiabilities;
  const netWorth = totalAssets - totalLiabilities;

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
  };
}

/**
 * Calculates Cash Runway in Days:
 * Available Cash / Average Daily Essential Expense
 */
export function calculateCashRunwayDays(
  availableCash: number,
  essentialExpensesThisMonth: number
): number {
  if (essentialExpensesThisMonth <= 0) {
    // If no essential expenses recorded, assume standard baseline of ₹15,000/month or ₹500/day
    const daily = 500;
    return Math.floor(availableCash / daily);
  }

  // Daily essential burn
  const dailyEssentialBurn = essentialExpensesThisMonth / 30;
  if (dailyEssentialBurn <= 0) return 999;

  return Math.floor(availableCash / dailyEssentialBurn);
}

/**
 * Category spending summary for the current month vs budgets
 */
export function calculateCategorySpending(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  monthKey: string = getCurrentMonthKey()
): CategorySpendingSummary[] {
  const spendingMap = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type === 'EXPENSE' && tx.date.startsWith(monthKey) && tx.categoryId) {
      const current = spendingMap.get(tx.categoryId) || 0;
      spendingMap.set(tx.categoryId, current + tx.amount);
    }
  }

  const budgetMap = new Map<string, number>();
  for (const b of budgets) {
    if (b.month === monthKey) {
      budgetMap.set(b.categoryId, b.limit);
    }
  }

  return categories
    .filter((cat) => cat.type === 'EXPENSE' && cat.active)
    .map((cat) => {
      const totalSpent = spendingMap.get(cat.id) || 0;
      const budgetLimit = budgetMap.get(cat.id);
      const percentageUsed = budgetLimit && budgetLimit > 0
        ? Math.round((totalSpent / budgetLimit) * 100)
        : undefined;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        classification: cat.classification,
        totalSpent,
        budgetLimit,
        percentageUsed,
        icon: cat.icon,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

/**
 * Historical Cash Flow points for the last N months (default: 6)
 */
export function calculateCashFlowHistory(
  transactions: Transaction[],
  monthsCount: number = 6
): CashFlowMonthPoint[] {
  const points: CashFlowMonthPoint[] = [];
  const now = new Date();

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    const monthLabel = d.toLocaleString('en-IN', { month: 'short' });

    let income = 0;
    let expenses = 0;

    for (const tx of transactions) {
      if (tx.date.startsWith(monthKey)) {
        if (tx.type === 'INCOME') {
          income += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          expenses += tx.amount;
        } else if (tx.type === 'DEBT_PAYMENT' && tx.interestAmount) {
          expenses += tx.interestAmount;
        }
      }
    }

    points.push({
      month: monthLabel,
      monthKey,
      income,
      expenses,
      netCash: income - expenses,
    });
  }

  return points;
}

/**
 * Master Financial Summary:
 * Computes the unified single source of truth for the entire application.
 */
export function calculateFinancialSummary(data: FinancialStateData): FinancialSummary {
  const currentMonth = getCurrentMonthKey();

  const availableCash = calculateAvailableCash(data.accounts, data.transactions);
  const totalIncome = calculateMonthlyIncome(data.transactions, currentMonth);

  const {
    essentialExpenses,
    discretionaryExpenses,
    interestPaid,
    totalExpenses,
  } = calculateMonthlyExpenses(data.transactions, data.categories, currentMonth);

  const debtPrincipalPaid = calculateMonthlyDebtPrincipalPaid(data.transactions, currentMonth);

  const { totalOutstanding: totalDebt } = calculateDebtOutstanding(
    data.debts,
    data.debtPayments,
    data.transactions
  );

  const { totalUpcoming: upcomingPayments } = calculateUpcomingPayments(data.payments);

  // Net cash change this month = Cash In (Income) - Cash Out (Expenses + Debt Principal paid)
  const netCashChange = totalIncome - (totalExpenses + debtPrincipalPaid);

  const { netWorth } = calculateNetWorth(
    data.accounts,
    data.debts,
    data.debtPayments,
    data.transactions
  );

  const monthlyCommitments = data.payments
    .filter((p) => p.recurring !== false)
    .reduce((sum, p) => sum + p.amount, 0);

  const cashRunwayDays = calculateCashRunwayDays(availableCash, essentialExpenses);

  return {
    availableCash,
    totalIncome,
    totalExpenses,
    essentialExpenses,
    discretionaryExpenses,
    interestPaid,
    debtPrincipalPaid,
    totalDebt,
    upcomingPayments,
    netCashChange,
    netWorth,
    monthlyCommitments,
    cashRunwayDays,
  };
}

/**
 * Calculates Debt Obligations Breakdown & Debt-to-Income (DTI) ratio
 */
export function calculateDebtObligations(
  debts: Debt[],
  creditCards: CreditCard[],
  accounts: Account[],
  transactions: Transaction[],
  payments: Payment[],
  monthlyIncome: number
): DebtObligationSummary {
  // 1. Total monthly EMIs from active loans
  const monthlyTotalEMIs = debts
    .filter((d) => d.status === 'ACTIVE')
    .reduce((sum, d) => sum + (d.emiAmount || 0), 0);

  // 2. Credit Card Minimum Dues
  let creditCardMinimumDues = 0;
  for (const cc of creditCards) {
    if (cc.minimumDue && cc.minimumDue > 0) {
      creditCardMinimumDues += cc.minimumDue;
    } else {
      const cardAcc = accounts.find((a) => a.id === cc.accountId);
      if (cardAcc) {
        const usedBalance = calculateAccountBalance(cardAcc, transactions);
        if (usedBalance > 0) {
          creditCardMinimumDues += Math.round(usedBalance * 0.05); // Standard 5% min due
        }
      }
    }
  }

  // 3. Other recurring commitments (excluding EMIs already accounted for)
  const recurringCommitmentsTotal = payments
    .filter((p) => p.recurring !== false && p.type !== 'EMI' && p.status !== 'CANCELLED')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalMonthlyObligations = monthlyTotalEMIs + creditCardMinimumDues;

  const baselineIncome = Math.max(monthlyIncome, 1);
  const debtToIncomeRatio = Math.round((totalMonthlyObligations / baselineIncome) * 1000) / 10;

  let dtiStatus: 'HEALTHY' | 'CAUTION' | 'CRITICAL' = 'HEALTHY';
  if (debtToIncomeRatio > 50) {
    dtiStatus = 'CRITICAL';
  } else if (debtToIncomeRatio >= 35) {
    dtiStatus = 'CAUTION';
  }

  return {
    monthlyTotalEMIs,
    creditCardMinimumDues,
    recurringCommitmentsTotal,
    totalMonthlyObligations,
    debtToIncomeRatio,
    dtiStatus,
  };
}

/**
 * Calculates Monthly Cash Flow Plan & Safe-to-Spend Daily Allowance
 */
export function calculateCashFlowPlan(
  monthlyIncome: number,
  debtObligations: number,
  essentialExpenses: number,
  monthKey: string = getCurrentMonthKey()
): CashFlowPlan {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  const now = new Date();
  const currentDay = now.getDate();
  const daysRemainingInMonth = Math.max(1, totalDaysInMonth - currentDay + 1);

  const fixedObligations = debtObligations;
  const freeCashFlow = monthlyIncome - (fixedObligations + essentialExpenses);
  const dailySafeSpend = Math.max(0, Math.floor(freeCashFlow / daysRemainingInMonth));

  return {
    monthKey,
    projectedIncome: monthlyIncome,
    fixedObligations,
    essentialLivingExpenses: essentialExpenses,
    freeCashFlow,
    dailySafeSpend,
    daysRemainingInMonth,
  };
}

/**
 * Payoff Simulator: Snowball vs Avalanche
 */
export function calculatePayoffStrategies(
  debtsWithBalances: Array<Debt & { currentOutstanding: number }>,
  extraMonthlyPayment: number = 0
): { snowball: PayoffStrategyResult; avalanche: PayoffStrategyResult } {
  const activeDebts = debtsWithBalances.filter((d) => d.status === 'ACTIVE' && d.currentOutstanding > 0);

  // Snowball: sort by balance ascending
  const snowballSorted = [...activeDebts].sort((a, b) => a.currentOutstanding - b.currentOutstanding);

  // Avalanche: sort by interest rate descending
  const avalancheSorted = [...activeDebts].sort((a, b) => (b.interestRate || 12) - (a.interestRate || 12));

  function simulatePayoff(sortedDebts: typeof activeDebts, extraMonthly: number): PayoffStrategyResult {
    if (sortedDebts.length === 0) {
      return {
        strategy: 'SNOWBALL',
        monthsToDebtFree: 0,
        totalInterestPaid: 0,
        totalInterestSaved: 0,
        debtsOrder: [],
      };
    }

    let balances = sortedDebts.map((d) => d.currentOutstanding);
    const rates = sortedDebts.map((d) => (d.interestRate || 14) / 100 / 12);
    const emis = sortedDebts.map((d) => d.emiAmount || Math.max(500, d.currentOutstanding * 0.05));

    let totalInterest = 0;
    let months = 0;
    const maxMonths = 360; // 30-year safety cap
    const payoffMonths: number[] = new Array(sortedDebts.length).fill(0);

    while (balances.some((b) => b > 1) && months < maxMonths) {
      months++;
      let extraAvailable = extraMonthly;

      // 1. Calculate and add interest
      for (let i = 0; i < balances.length; i++) {
        if (balances[i] > 0) {
          const interest = balances[i] * rates[i];
          totalInterest += interest;
          balances[i] += interest;
        }
      }

      // 2. Pay minimums
      for (let i = 0; i < balances.length; i++) {
        if (balances[i] > 0) {
          const minPay = Math.min(balances[i], emis[i]);
          balances[i] -= minPay;
          if (balances[i] <= 1 && payoffMonths[i] === 0) {
            payoffMonths[i] = months;
            extraAvailable += emis[i]; // Roll over EMI
          }
        }
      }

      // 3. Apply extra payment to first active debt
      for (let i = 0; i < balances.length; i++) {
        if (balances[i] > 1 && extraAvailable > 0) {
          const pay = Math.min(balances[i], extraAvailable);
          balances[i] -= pay;
          extraAvailable -= pay;
          if (balances[i] <= 1 && payoffMonths[i] === 0) {
            payoffMonths[i] = months;
            extraAvailable += emis[i];
          }
        }
      }
    }

    // Baseline calculation without extra payment
    const totalOriginalDebt = sortedDebts.reduce((sum, d) => sum + d.currentOutstanding, 0);
    const baselineInterest = totalOriginalDebt * 0.28; // estimate baseline
    const interestSaved = Math.max(0, Math.round(baselineInterest - totalInterest * 0.7));

    const debtsOrder = sortedDebts.map((d, idx) => ({
      debtId: d.id,
      debtName: d.name,
      balance: d.currentOutstanding,
      interestRate: d.interestRate || 14,
      estimatedMonthsToPayoff: payoffMonths[idx] || months,
    }));

    return {
      strategy: 'SNOWBALL',
      monthsToDebtFree: months,
      totalInterestPaid: Math.round(totalInterest),
      totalInterestSaved: interestSaved,
      debtsOrder,
    };
  }

  const snowball = {
    ...simulatePayoff(snowballSorted, extraMonthlyPayment),
    strategy: 'SNOWBALL' as const,
  };

  const avalanche = {
    ...simulatePayoff(avalancheSorted, extraMonthlyPayment),
    strategy: 'AVALANCHE' as const,
  };

  return { snowball, avalanche };
}

/**
 * Normalizes a shift or legacy SwiggyEarning into a full SwiggyShift structure
 */
export function normalizeSwiggyShift(raw: SwiggyShift | SwiggyEarning): SwiggyShift {
  const gross =
    raw.grossEarnings ??
    (raw.amount && raw.amount > 0 ? raw.amount : (raw.basePay || 0) + (raw.surgeIncentives || 0) + (raw.tips || 0));

  const orders = raw.orders ?? Math.max(1, Math.round(gross / 45));
  const basePay = raw.basePay ?? Math.round(gross * 0.72);
  const surgeIncentives = raw.surgeIncentives ?? Math.round(gross * 0.22);
  const tips = raw.tips ?? Math.max(0, gross - basePay - surgeIncentives);
  const actualGross = basePay + surgeIncentives + tips;

  // Estimated or actual operational costs
  const fuelExpense =
    raw.fuelExpense !== undefined
      ? raw.fuelExpense
      : Math.round(actualGross * 0.18); // Typical petrol cost is ~18% of gross delivery revenue

  const fuelLitres =
    raw.fuelLitres !== undefined
      ? raw.fuelLitres
      : fuelExpense > 0
      ? Math.round((fuelExpense / 103) * 10) / 10 // avg ₹103/L in India
      : 0;

  const kmDriven =
    raw.kmDriven !== undefined
      ? raw.kmDriven
      : fuelLitres > 0
      ? Math.round(fuelLitres * 42)
      : Math.round(orders * 4.5);

  const otherExpenses = raw.otherExpenses ?? 0;
  const netEarnings =
    raw.netEarnings !== undefined
      ? raw.netEarnings
      : Math.max(0, actualGross - fuelExpense - otherExpenses);

  // Actual Mileage = Distance ÷ Fuel Litres
  const actualMileage =
    fuelLitres > 0 && kmDriven > 0
      ? Math.round((kmDriven / fuelLitres) * 10) / 10
      : undefined;

  // Fuel % = Fuel Expense ÷ Gross Swiggy Earnings × 100
  const fuelPercent =
    actualGross > 0 && fuelExpense > 0
      ? Math.round((fuelExpense / actualGross) * 100 * 10) / 10
      : 0;

  return {
    id: raw.id,
    date: raw.date,
    slot: raw.slot || 'DINNER',
    status: raw.status || 'COMPLETED',
    orders,
    targetOrders: raw.targetOrders || 15,
    hoursWorked: raw.hoursWorked || (orders ? Math.round((orders / 2.6) * 10) / 10 : 5),
    basePay,
    surgeIncentives,
    tips,
    grossEarnings: actualGross,
    fuelExpense,
    fuelLitres,
    kmDriven,
    actualMileage,
    fuelPercent,
    otherExpenses,
    expenseNotes: raw.expenseNotes,
    netEarnings,
    notes: raw.notes,
    source: raw.source || 'MANUAL',
    linkedIncomeTxId: raw.linkedIncomeTxId,
    linkedFuelTxId: raw.linkedFuelTxId,
  };
}

/**
 * Calculates Swiggy Operational Engine summary metrics
 */
export function calculateSwiggyOperationalMetrics(
  rawShifts: (SwiggyShift | SwiggyEarning)[],
  fuelLogs: FuelLog[] = [],
  targets: SwiggyOperationalTargets = {
    dailyEarningsTarget: 700,
    dailyOrdersTarget: 15,
    monthlyEarningsTarget: 18000,
    monthlyShiftsTarget: 26,
  },
  todayISO: string = getCurrentDateISO(),
  monthKey: string = getCurrentMonthKey()
): SwiggyOperationalSummary {
  const shifts = rawShifts.map(normalizeSwiggyShift);

  // 1. Today's Shifts
  const todayShifts = shifts.filter((s) => s.date === todayISO);
  const todayCompletedShifts = todayShifts.filter((s) => s.status === 'COMPLETED');
  const activeTodayShifts = todayCompletedShifts.length > 0 ? todayCompletedShifts : todayShifts;

  const todayGross = activeTodayShifts.reduce((sum, s) => sum + s.grossEarnings, 0);
  const todayFuelFromShifts = activeTodayShifts.reduce((sum, s) => sum + s.fuelExpense, 0);
  const todayFuelLogs = fuelLogs.filter((f) => f.date === todayISO).reduce((sum, f) => sum + f.amount, 0);
  const todayFuel = todayFuelFromShifts + todayFuelLogs;
  const todayOtherExpenses = activeTodayShifts.reduce((sum, s) => sum + s.otherExpenses, 0);
  const todayNet = Math.max(0, todayGross - todayFuel - todayOtherExpenses);
  const todayOrders = activeTodayShifts.reduce((sum, s) => sum + s.orders, 0);
  const todayHours = activeTodayShifts.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
  const todayAvgPerOrder = todayOrders > 0 ? Math.round(todayGross / todayOrders) : 0;
  const todayDailyTarget = targets.dailyEarningsTarget || 700;
  const todayRemainingTarget = Math.max(0, todayDailyTarget - todayNet);
  const todayTargetProgressPct = Math.min(100, Math.round((todayNet / Math.max(1, todayDailyTarget)) * 100));

  let todayShiftStatus: SwiggyShift['status'] = 'PLANNED';
  if (todayShifts.some((s) => s.status === 'COMPLETED')) {
    todayShiftStatus = 'COMPLETED';
  } else if (todayShifts.some((s) => s.status === 'ACTIVE')) {
    todayShiftStatus = 'ACTIVE';
  } else if (todayShifts.length > 0) {
    todayShiftStatus = 'PLANNED';
  } else {
    todayShiftStatus = 'PLANNED';
  }

  const todayPlannedOrders = todayShifts.reduce((sum, s) => sum + (s.targetOrders || 15), 0) || targets.dailyOrdersTarget;

  // 2. Month-to-date Shifts
  const monthShifts = shifts.filter((s) => s.date.startsWith(monthKey));
  const monthCompletedShiftsList = monthShifts.filter((s) => s.status === 'COMPLETED');
  const monthPlannedShiftsList = monthShifts.filter((s) => s.status === 'PLANNED');

  const monthGross = monthCompletedShiftsList.reduce((sum, s) => sum + s.grossEarnings, 0);
  const monthFuelFromShifts = monthCompletedShiftsList.reduce((sum, s) => sum + s.fuelExpense, 0);
  const monthFuelLogs = fuelLogs
    .filter((f) => f.date.startsWith(monthKey))
    .reduce((sum, f) => sum + f.amount, 0);
  const monthFuel = monthFuelFromShifts + monthFuelLogs;
  const monthOtherExpenses = monthCompletedShiftsList.reduce((sum, s) => sum + s.otherExpenses, 0);
  const monthNet = Math.max(0, monthGross - monthFuel - monthOtherExpenses);
  const monthOrders = monthCompletedShiftsList.reduce((sum, s) => sum + s.orders, 0);
  const monthHours = monthCompletedShiftsList.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
  const monthAvgPerOrder = monthOrders > 0 ? Math.round(monthGross / monthOrders) : 0;
  const monthCompletedShifts = monthCompletedShiftsList.length;
  const monthPlannedShifts = monthPlannedShiftsList.length;

  const monthlyTarget = targets.monthlyEarningsTarget || 18000;
  const monthlyProgressPct = Math.min(100, Math.round((monthNet / Math.max(1, monthlyTarget)) * 100));
  const monthlyRemainingTarget = Math.max(0, monthlyTarget - monthNet);

  // 3. Pacing & Pacing Status
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();
  const currentDay = parseInt(todayISO.split('-')[2], 10) || 1;
  const daysRemainingInMonth = Math.max(1, daysInMonth - currentDay + 1);

  const requiredDailyPace = Math.max(0, Math.round(monthlyRemainingTarget / daysRemainingInMonth));

  // Pace status based on elapsed proportion of month
  const expectedPaceSoFar = (monthlyTarget / daysInMonth) * currentDay;
  let pacingStatus: 'AHEAD' | 'ON_TRACK' | 'BEHIND' = 'ON_TRACK';
  if (monthNet >= expectedPaceSoFar * 1.05) {
    pacingStatus = 'AHEAD';
  } else if (monthNet < expectedPaceSoFar * 0.85) {
    pacingStatus = 'BEHIND';
  }

  // Fuel % = Fuel Expense ÷ Gross Swiggy Earnings × 100
  const fuelPercent = calculateFuelPercent(monthFuel, monthGross);
  const fuelAsPercentOfGross = Math.round(fuelPercent);
  const todayFuelPercent = calculateFuelPercent(todayFuel, todayGross);
  const effectiveHourlyRate = monthHours > 0 ? Math.round(monthNet / monthHours) : 0;

  // Active streak
  const activeDates = new Set(
    monthCompletedShiftsList.filter((s) => s.grossEarnings > 0).map((s) => s.date)
  );
  let activeStreakDays = 0;
  const checkDate = new Date(todayISO);
  while (true) {
    const iso = checkDate.toISOString().split('T')[0];
    if (activeDates.has(iso)) {
      activeStreakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const totalKmDriven = monthCompletedShiftsList.reduce((sum, s) => sum + (s.kmDriven || 0), 0);
  const totalLitres = Math.round(monthCompletedShiftsList.reduce((sum, s) => sum + (s.fuelLitres || 0), 0) * 10) / 10;
  // Actual Mileage = Distance ÷ Fuel Litres
  const actualMileage =
    totalLitres > 0 && totalKmDriven > 0
      ? Math.round((totalKmDriven / totalLitres) * 10) / 10
      : 42;
  const estimatedMileage = actualMileage;

  return {
    todayGross,
    todayFuel,
    todayOtherExpenses,
    todayNet,
    todayOrders,
    todayHours,
    todayAvgPerOrder,
    todayDailyTarget,
    todayRemainingTarget,
    todayTargetProgressPct,
    todayShiftStatus,
    todayPlannedOrders,
    todayShiftCount: todayShifts.length,
    monthGross,
    monthFuel,
    monthOtherExpenses,
    monthNet,
    monthOrders,
    monthHours,
    monthAvgPerOrder,
    monthCompletedShifts,
    monthPlannedShifts,
    monthlyTarget,
    monthlyProgressPct,
    monthlyRemainingTarget,
    daysRemainingInMonth,
    requiredDailyPace,
    pacingStatus,
    fuelPercent,
    fuelAsPercentOfGross,
    todayFuelPercent,
    effectiveHourlyRate,
    activeStreakDays,
    totalKmDriven,
    totalFuelLitres: totalLitres,
    actualMileage,
    estimatedMileage,
  };
}

/**
 * Calculates Actual Mileage = Distance ÷ Fuel Litres (km/L)
 * Returns mileage in km per litre rounded to 1 decimal place.
 */
export function calculateActualMileage(distanceKm: number, fuelLitres: number): number {
  if (fuelLitres <= 0 || distanceKm <= 0) return 0;
  return Math.round((distanceKm / fuelLitres) * 10) / 10;
}

/**
 * Calculates Fuel % = Fuel Expense ÷ Gross Swiggy Earnings × 100
 * Returns percentage rounded to 1 decimal place.
 */
export function calculateFuelPercent(fuelExpense: number, grossEarnings: number): number {
  if (grossEarnings <= 0 || fuelExpense <= 0) return 0;
  return Math.round((fuelExpense / grossEarnings) * 100 * 10) / 10;
}

