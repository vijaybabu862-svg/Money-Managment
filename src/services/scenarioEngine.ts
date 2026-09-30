import {
  FinancialSummary,
  Scenario,
  ScenarioChange,
  ScenarioResult,
} from '../types/finance';
import { AppState } from './storage';
import { calculateDebtOutstanding } from './calculator';

/**
 * Creates a blank ephemeral scenario for hypothetical what-if testing.
 */
export function createDefaultScenario(name: string = 'Scenario 1'): Scenario {
  return {
    id: `scen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    changes: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Evaluates hypothetical scenario changes completely isolated from real financial records.
 * Never mutates or alters persistent state.
 */
export function simulateScenario(
  state: AppState,
  summary: FinancialSummary,
  changes: ScenarioChange[],
  scenarioId: string = 'temp_scenario',
  scenarioName: string = 'Hypothetical Scenario'
): ScenarioResult {
  // Baseline values
  let simulatedIncome = summary.totalIncome;
  let simulatedExpenses = summary.totalExpenses;
  let simulatedDebtPrincipalPaid = summary.debtPrincipalPaid;
  let extraDebtPaymentTotal = 0;

  const { totalOutstanding: currentTotalDebt } = calculateDebtOutstanding(
    state.debts,
    state.debtPayments,
    state.transactions
  );

  let simulatedTotalDebt = currentTotalDebt;

  for (const change of changes) {
    if (change.type === 'INCOME_CHANGE') {
      simulatedIncome += change.amount;
    } else if (change.type === 'EXPENSE_CHANGE') {
      simulatedExpenses += change.amount;
    } else if (change.type === 'RECURRING_EXPENSE') {
      simulatedExpenses += change.amount;
    } else if (change.type === 'SWIGGY_INCOME') {
      // Replaces or adds to Swiggy component
      simulatedIncome += change.amount;
    } else if (change.type === 'DEBT_PAYMENT_CHANGE') {
      extraDebtPaymentTotal += change.amount;
      simulatedDebtPrincipalPaid += change.amount;
      simulatedTotalDebt = Math.max(0, simulatedTotalDebt - change.amount);
    }
  }

  // Calculate ending cash impact
  // Net Cash Change = Income - Expenses - Debt Principal Paid
  const currentNetChange = summary.totalIncome - (summary.totalExpenses + summary.debtPrincipalPaid);
  const simulatedNetChange = simulatedIncome - (simulatedExpenses + simulatedDebtPrincipalPaid);
  const cashDelta = simulatedNetChange - currentNetChange;

  const projectedEndingCash = summary.availableCash + simulatedNetChange;
  const debtDelta = simulatedTotalDebt - currentTotalDebt;

  // Net worth = Assets - Liabilities
  // Assets change by cash delta, Liabilities change by debt delta
  const projectedNetWorth = summary.netWorth + cashDelta - debtDelta;

  // Estimated interest reduction if extra debt payment is applied
  let projectedInterest = summary.interestPaid;
  if (extraDebtPaymentTotal > 0) {
    // Approximate 14% annual interest saved on extra principal prepayment
    const monthlySaved = Math.round(extraDebtPaymentTotal * (0.14 / 12));
    projectedInterest = Math.max(0, summary.interestPaid - monthlySaved);
  }

  return {
    scenarioId,
    scenarioName,
    projectedEndingCash,
    projectedDebt: simulatedTotalDebt,
    projectedNetWorth,
    projectedInterest,
    projectedExpenses: simulatedExpenses,
    projectedIncome: simulatedIncome,
    differenceFromCurrent: {
      cash: cashDelta,
      debt: debtDelta,
      netWorth: projectedNetWorth - summary.netWorth,
      expenses: simulatedExpenses - summary.totalExpenses,
      income: simulatedIncome - summary.totalIncome,
    },
  };
}
