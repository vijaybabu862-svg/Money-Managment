/**
 * CASH FLOW — Stage 7 Master Service
 * Debt Projection & Debt-Free Planning Engine
 *
 * Read-only scenario modeling for debt freedom, payoff order, and prepayment impacts.
 * Never modifies actual debt records or creates financial transactions.
 */

import {
  Debt,
  DebtPayment,
  DebtProjectionPoint,
  DebtPayoffDetails,
  DebtProjectionResult,
} from '../types/finance';
import { calculateDebtOutstanding } from './calculator';
import { formatINR } from '../utils/currency';

/**
 * Calculates deterministic debt payoff projections (Section 19, 20, 21, 22, 23, 24, 25)
 */
export function calculateDebtProjections(
  debts: Debt[],
  debtPayments: DebtPayment[] = [],
  monthlyExtraPayment: number = 0,
  strategy: 'STANDARD' | 'SNOWBALL' | 'AVALANCHE' = 'STANDARD'
): DebtProjectionResult {
  const activeDebts = debts.filter((d) => d.status === 'ACTIVE');
  const openingDebt = calculateDebtOutstanding(debts, debtPayments).totalOutstanding;

  if (activeDebts.length === 0 || openingDebt <= 0) {
    return {
      openingDebt: 0,
      closingDebt: 0,
      projectedPrincipal: 0,
      projectedInterest: 0,
      projectedMonths: 0,
      isInterestFullyModeled: true,
      interestExplanation: 'No active debts remaining.',
      debts: [],
      monthlyTimeline: [],
      extraPaymentScenarios: [],
    };
  }

  // Check interest rate completeness
  const missingRates = activeDebts.filter(
    (d) => d.interestRate === undefined || d.interestRate === null || d.interestRate === 0
  );
  const isInterestFullyModeled = missingRates.length === 0;

  const interestExplanation = isInterestFullyModeled
    ? 'Projections incorporate contractual interest rates calculated on diminishing balances.'
    : 'Debt-free projection is based on principal and payment amounts; interest impact is not fully modeled because interest-rate data is unavailable on some debts.';

  // Calculate individual debt details
  const debtDetails: DebtPayoffDetails[] = activeDebts.map((d) => {
    // Current outstanding balance for this debt
    const originalPrincipal =
      d.originalPrincipal !== undefined
        ? d.originalPrincipal
        : ((d as any).principalAmount || d.outstandingPrincipal || 0);
    const paymentsForDebt = debtPayments.filter((dp) => dp.debtId === d.id);
    const principalPaid = paymentsForDebt.reduce((sum, dp) => sum + (dp.principalAmount || dp.amount), 0);
    const currentBalance = Math.max(0, originalPrincipal - principalPaid);
    const emi = d.emiAmount || Math.round(currentBalance / Math.max(1, d.remainingMonths || 12));

    let remainingMonths = 0;
    if (emi > 0 && currentBalance > 0) {
      if (d.interestRate && d.interestRate > 0) {
        const monthlyRate = d.interestRate / 100 / 12;
        if (emi > currentBalance * monthlyRate) {
          // n = -ln(1 - (P * r) / EMI) / ln(1 + r)
          remainingMonths = Math.ceil(
            -Math.log(1 - (currentBalance * monthlyRate) / emi) / Math.log(1 + monthlyRate)
          );
        } else {
          // Payment is smaller than interest, fallback to principal / emi
          remainingMonths = Math.ceil(currentBalance / emi);
        }
      } else {
        remainingMonths = Math.ceil(currentBalance / emi);
      }
    }

    const safeMonths =
      !isNaN(remainingMonths) && isFinite(remainingMonths) && remainingMonths > 0
        ? Math.min(360, remainingMonths)
        : currentBalance <= 0
        ? 0
        : 1;

    const estimatedDate = new Date();
    estimatedDate.setMonth(estimatedDate.getMonth() + safeMonths);
    const estimatedCompletionDate = estimatedDate.toISOString().split('T')[0];

    return {
      debtId: d.id,
      debtName: d.name,
      currentBalance,
      emiAmount: emi,
      interestRate: d.interestRate,
      remainingMonths: safeMonths,
      estimatedCompletionDate,
      isInterestModeled: !!(d.interestRate && d.interestRate > 0),
    };
  });

  // Simulate monthly timeline under specified strategy
  const simulateTimeline = (
    extraMonthly: number,
    chosenStrategy: 'STANDARD' | 'SNOWBALL' | 'AVALANCHE'
  ): { timeline: DebtProjectionPoint[]; totalMonths: number; totalInterest: number } => {
    // Clone debt balances
    let items = debtDetails.map((d) => ({
      id: d.debtId,
      name: d.debtName,
      balance: d.currentBalance,
      emi: d.emiAmount,
      rate: d.interestRate || 0,
    }));

    const timeline: DebtProjectionPoint[] = [];
    let currentMonth = new Date();
    let totalInterest = 0;
    let monthsElapsed = 0;
    const maxMonths = 120; // 10 years safety cap

    while (items.some((d) => d.balance > 0) && monthsElapsed < maxMonths) {
      monthsElapsed++;
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = currentMonth.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      const startingBal = items.reduce((sum, d) => sum + d.balance, 0);
      let monthPrincipal = 0;
      let monthInterest = 0;

      // 1. Pay scheduled minimum EMI on each active debt
      for (const item of items) {
        if (item.balance <= 0) continue;

        let interest = 0;
        if (item.rate > 0) {
          interest = Math.round((item.balance * (item.rate / 100)) / 12);
        }
        monthInterest += interest;
        totalInterest += interest;

        const effectivePayment = Math.min(item.balance + interest, item.emi);
        const principal = Math.max(0, effectivePayment - interest);
        item.balance = Math.max(0, item.balance - principal);
        monthPrincipal += principal;
      }

      // 2. Allocate extra payment based on strategy
      let remainingExtra = extraMonthly;
      if (remainingExtra > 0 && items.some((d) => d.balance > 0)) {
        let prioritizedItems = [...items].filter((d) => d.balance > 0);

        if (chosenStrategy === 'SNOWBALL') {
          // Smallest balance first
          prioritizedItems.sort((a, b) => a.balance - b.balance);
        } else if (chosenStrategy === 'AVALANCHE') {
          // Highest interest rate first
          prioritizedItems.sort((a, b) => b.rate - a.rate);
        }

        for (const item of prioritizedItems) {
          if (remainingExtra <= 0) break;
          const extraToApply = Math.min(item.balance, remainingExtra);
          item.balance -= extraToApply;
          remainingExtra -= extraToApply;
          monthPrincipal += extraToApply;
        }
      }

      const closingBal = items.reduce((sum, d) => sum + d.balance, 0);

      timeline.push({
        monthKey,
        monthLabel,
        startingBalance: startingBal,
        principalPaid: monthPrincipal,
        interestPaid: monthInterest,
        closingBalance: closingBal,
        isProjected: true,
      });

      if (closingBal <= 0) break;
    }

    return { timeline, totalMonths: monthsElapsed, totalInterest };
  };

  const standardSim = simulateTimeline(monthlyExtraPayment, strategy);
  const snowballSim = simulateTimeline(monthlyExtraPayment, 'SNOWBALL');
  const avalancheSim = simulateTimeline(monthlyExtraPayment, 'AVALANCHE');

  const projectedMonths = standardSim.totalMonths;
  const estimatedDate = new Date();
  estimatedDate.setMonth(estimatedDate.getMonth() + projectedMonths);
  const estimatedDebtFreeDate = estimatedDate.toISOString().split('T')[0];

  // Extra payment scenarios (+500, +1000, +2000, +5000)
  const extraAmounts = [500, 1000, 2000, 5000];
  const baselineSim = simulateTimeline(0, 'STANDARD');

  const extraPaymentScenarios = extraAmounts.map((amt) => {
    const sim = simulateTimeline(amt, 'STANDARD');
    const monthsSaved = Math.max(0, baselineSim.totalMonths - sim.totalMonths);
    const scenarioDate = new Date();
    scenarioDate.setMonth(scenarioDate.getMonth() + sim.totalMonths);

    return {
      extraAmount: amt,
      projectedMonths: sim.totalMonths,
      monthsSaved,
      estimatedDebtFreeDate: scenarioDate.toISOString().split('T')[0],
    };
  });

  return {
    openingDebt,
    closingDebt: 0,
    projectedPrincipal: openingDebt,
    projectedInterest: standardSim.totalInterest,
    projectedMonths,
    estimatedDebtFreeDate,
    isInterestFullyModeled,
    interestExplanation,
    debts: debtDetails,
    monthlyTimeline: standardSim.timeline,
    snowballTimeline: snowballSim.timeline,
    avalancheTimeline: avalancheSim.timeline,
    extraPaymentScenarios,
  };
}
