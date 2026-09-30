import { Debt, SwiggyShift, SwiggyEarning } from '../types/finance';
import { getCurrentMonthKey } from '../utils/dates';

export interface EssentialExpenseItem {
  id: string;
  name: string;
  category?: string;
  amount: number;
  notes?: string;
  isDemo?: boolean;
}

export interface CentralFinancialPosition {
  // Salary
  monthlySalary: number;

  // Debt & Loans
  totalActiveLoans: number;
  totalOutstandingDebt: number;
  totalMonthlyEMI: number;
  emiPercentage: number; // (Total EMI / Salary) * 100
  salaryRemainingAfterEMI: number; // Salary - Total EMI

  // Swiggy Delivery
  swiggyDaysWorked: number;
  swiggyGrossIncome: number;
  swiggyExpenses: number;
  swiggyNetIncome: number;
  swiggyAvgDailyNet: number;

  // Essential Expenses
  totalEssentialExpenses: number;

  // Monthly Cash Flow
  totalMonthlyIncome: number; // Salary + Swiggy Net Income
  totalMonthlyOutgoing: number; // Total EMI + Essential Expenses
  netCashFlow: number; // Total Income - Total Monthly Outgoing
  isShortfall: boolean;
  shortfallOrSurplusAmount: number;
}

/**
 * Single source of truth calculation for Cash Flow financial positions.
 * Ensures consistent formulas across Dashboard, Loans, Salary, Swiggy, Expenses, and Cash Flow pages.
 */
export function calculateCentralFinancialPosition(params: {
  debts: Debt[];
  monthlySalary?: number;
  swiggyShifts?: SwiggyShift[];
  swiggyEarnings?: SwiggyEarning[];
  essentialExpenses?: EssentialExpenseItem[];
  monthKey?: string;
}): CentralFinancialPosition {
  const {
    debts = [],
    monthlySalary = 21000,
    swiggyShifts = [],
    swiggyEarnings = [],
    essentialExpenses = [],
    monthKey = getCurrentMonthKey(),
  } = params;

  // 1. Debt & Loans
  const activeDebts = debts.filter((d) => d.status === 'ACTIVE');
  const totalActiveLoans = activeDebts.length;
  const totalOutstandingDebt = activeDebts.reduce(
    (sum, d) => sum + (Number(d.outstandingPrincipal) || 0),
    0
  );
  const totalMonthlyEMI = activeDebts.reduce(
    (sum, d) => sum + (Number(d.emiAmount) || 0),
    0
  );

  const salaryNum = Math.max(0, Number(monthlySalary) || 0);
  const emiPercentage =
    salaryNum > 0 ? Math.round((totalMonthlyEMI / salaryNum) * 100) : 0;
  const salaryRemainingAfterEMI = salaryNum - totalMonthlyEMI;

  // 2. Swiggy Income (Current Month)
  // Merge shifts or earnings for the month
  let swiggyGross = 0;
  let swiggyExp = 0;
  const datesWorked = new Set<string>();

  if (swiggyShifts && swiggyShifts.length > 0) {
    const monthShifts = swiggyShifts.filter((s) => s.date && s.date.startsWith(monthKey));
    monthShifts.forEach((s) => {
      datesWorked.add(s.date);
      const gross =
        s.grossEarnings !== undefined
          ? s.grossEarnings
          : (s.basePay || 0) + (s.surgeIncentives || 0) + (s.tips || 0);
      const fuel = s.fuelExpense || 0;
      const other = s.otherExpenses || 0;
      swiggyGross += gross;
      swiggyExp += fuel + other;
    });
  } else if (swiggyEarnings && swiggyEarnings.length > 0) {
    const monthEarnings = swiggyEarnings.filter((e) => e.date && e.date.startsWith(monthKey));
    monthEarnings.forEach((e) => {
      datesWorked.add(e.date);
      const gross = e.grossEarnings || e.amount || 0;
      const exp = (e.fuelExpense || 0) + (e.otherExpenses || 0);
      swiggyGross += gross;
      swiggyExp += exp;
    });
  }

  const swiggyNet = swiggyGross - swiggyExp;
  const swiggyDays = datesWorked.size;
  const swiggyAvgDaily = swiggyDays > 0 ? Math.round(swiggyNet / swiggyDays) : 0;

  // 3. Essential Expenses
  const totalEssentialExpenses = (essentialExpenses || []).reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  // 4. Monthly Cash Flow Summary
  const totalMonthlyIncome = salaryNum + swiggyNet;
  const totalMonthlyOutgoing = totalMonthlyEMI + totalEssentialExpenses;
  const netCashFlow = totalMonthlyIncome - totalMonthlyOutgoing;
  const isShortfall = netCashFlow < 0;
  const shortfallOrSurplusAmount = Math.abs(netCashFlow);

  return {
    monthlySalary: salaryNum,
    totalActiveLoans,
    totalOutstandingDebt,
    totalMonthlyEMI,
    emiPercentage,
    salaryRemainingAfterEMI,
    swiggyDaysWorked: swiggyDays,
    swiggyGrossIncome: swiggyGross,
    swiggyExpenses: swiggyExp,
    swiggyNetIncome: swiggyNet,
    swiggyAvgDailyNet: swiggyAvgDaily,
    totalEssentialExpenses,
    totalMonthlyIncome,
    totalMonthlyOutgoing,
    netCashFlow,
    isShortfall,
    shortfallOrSurplusAmount,
  };
}

/**
 * Standard default loan purpose choices for selection
 */
export const STANDARD_LOAN_PURPOSES = [
  'Household expense',
  'Medical expense',
  'Vehicle',
  'Personal expense',
  'Credit card',
  'Emergency',
  'Gold loan',
  'Existing debt repayment',
  'Other',
] as const;

export function resolveLoanPurpose(loan: Debt): string {
  if (loan.purpose && loan.purpose.trim()) {
    return loan.purpose.trim();
  }
  // Fallbacks based on lender/name/type
  const nameLower = (loan.name || '').toLowerCase();
  const lenderLower = (loan.lenderName || '').toLowerCase();

  if (nameLower.includes('bike') || nameLower.includes('two-wheeler') || loan.type === 'TWO_WHEELER_LOAN' || loan.type === 'TWO_WHEELER') {
    return 'Vehicle';
  }
  if (nameLower.includes('card') || loan.type === 'CREDIT_CARD' || lenderLower.includes('sbi card')) {
    return 'Credit card';
  }
  if (nameLower.includes('phonepe') || nameLower.includes('cred') || loan.type === 'PERSONAL_LOAN') {
    return 'Personal expense';
  }
  if (loan.type === 'BNPL' || nameLower.includes('lazypay')) {
    return 'Household expense';
  }
  if (loan.type === 'GOLD_LOAN') {
    return 'Gold loan';
  }
  return 'Personal expense';
}
