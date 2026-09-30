/**
 * CASH FLOW — Stage 7 Master Service
 * Goal Planning & Emergency Fund Engine
 *
 * Read-only planning layer for financial goals and emergency fund coverage.
 * Never mutates account balances, transfers funds, or creates financial transactions.
 */

import { Goal, GoalProjectionResult } from '../types/finance';
import { formatINR } from '../utils/currency';

/**
 * Calculates deterministic goal completion projections (Section 26, 27, 28, 29, 30)
 */
export function calculateGoalProjections(
  goals: Goal[] = [],
  monthlySurplus: number = 0,
  essentialMonthlyBurn: number = 0
): GoalProjectionResult[] {
  return goals.map((g) => {
    const targetAmount = Math.max(0, g.targetAmount);
    const currentAmount = Math.max(0, g.currentAmount);
    const remainingAmount = Math.max(0, targetAmount - currentAmount);
    const percentComplete = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 100;

    let projectedMonthsRemaining: number | undefined;
    let projectedCompletionDate: string | undefined;
    let isOnTrack: boolean | undefined;
    let requiredMonthlyForTargetDate: number | undefined;
    let statusText = '';

    if (currentAmount >= targetAmount) {
      statusText = 'Goal completed!';
    } else if (g.monthlyContribution && g.monthlyContribution > 0) {
      projectedMonthsRemaining = Math.ceil(remainingAmount / g.monthlyContribution);
      const completionDate = new Date();
      completionDate.setMonth(completionDate.getMonth() + projectedMonthsRemaining);
      projectedCompletionDate = completionDate.toISOString().split('T')[0];

      if (g.targetDate) {
        const targetD = new Date(g.targetDate);
        const now = new Date();
        const monthsUntilTarget = Math.max(
          1,
          (targetD.getFullYear() - now.getFullYear()) * 12 + (targetD.getMonth() - now.getMonth())
        );
        requiredMonthlyForTargetDate = Math.ceil(remainingAmount / monthsUntilTarget);
        isOnTrack = projectedMonthsRemaining <= monthsUntilTarget;
        statusText = isOnTrack
          ? `On track to complete by ${completionDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}.`
          : `Projected completion in ${projectedMonthsRemaining} months (target requires ${formatINR(requiredMonthlyForTargetDate)}/mo).`;
      } else {
        statusText = `Projected completion in ${projectedMonthsRemaining} months (${completionDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}).`;
      }
    } else {
      // Missing contribution rate (Section 29: Do not invent one)
      statusText = 'Add a monthly contribution amount to estimate completion.';

      if (g.targetDate) {
        const targetD = new Date(g.targetDate);
        const now = new Date();
        const monthsUntilTarget = Math.max(
          1,
          (targetD.getFullYear() - now.getFullYear()) * 12 + (targetD.getMonth() - now.getMonth())
        );
        requiredMonthlyForTargetDate = Math.ceil(remainingAmount / monthsUntilTarget);
      }
    }

    return {
      goalId: g.id,
      name: g.name,
      targetAmount,
      currentAmount,
      remainingAmount,
      percentComplete,
      monthlyContribution: g.monthlyContribution,
      projectedMonthsRemaining,
      projectedCompletionDate,
      targetDate: g.targetDate,
      isOnTrack,
      requiredMonthlyForTargetDate,
      statusText,
    };
  });
}

/**
 * Calculates Emergency Fund metrics and months of coverage (Section 30)
 */
export function calculateEmergencyFundMetrics(
  currentEmergencyCash: number,
  essentialMonthlyBurnRate: number,
  configuredTargetAmount?: number
): {
  currentAmount: number;
  essentialMonthlyBurn: number;
  monthsCovered: number;
  targetAmount: number;
  targetMonthsCovered: number;
  coverageStatus: 'LOW' | 'MODERATE' | 'ADEQUATE' | 'STRONG';
  statusDescription: string;
} {
  const burn = Math.max(1, essentialMonthlyBurnRate);
  const monthsCovered = parseFloat((currentEmergencyCash / burn).toFixed(1));
  const target = configuredTargetAmount && configuredTargetAmount > 0
    ? configuredTargetAmount
    : burn * 3; // Default reference 3 months
  const targetMonthsCovered = parseFloat((target / burn).toFixed(1));

  let coverageStatus: 'LOW' | 'MODERATE' | 'ADEQUATE' | 'STRONG' = 'MODERATE';
  if (monthsCovered < 1.0) coverageStatus = 'LOW';
  else if (monthsCovered < 3.0) coverageStatus = 'MODERATE';
  else if (monthsCovered < 6.0) coverageStatus = 'ADEQUATE';
  else coverageStatus = 'STRONG';

  const statusDescription = `${monthsCovered} months of essential living expenses and debt payments covered (${formatINR(currentEmergencyCash)} of ${formatINR(target)} target).`;

  return {
    currentAmount: currentEmergencyCash,
    essentialMonthlyBurn: burn,
    monthsCovered,
    targetAmount: target,
    targetMonthsCovered,
    coverageStatus,
    statusDescription,
  };
}
