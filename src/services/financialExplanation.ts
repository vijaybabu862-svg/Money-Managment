/**
 * CASH FLOW — Stage 7 Master Service
 * Financial Explainability Engine
 *
 * Provides granular mathematical breakdowns, formula disclosures,
 * and data-source provenance for every major calculated metric.
 * "How is this calculated?" transparency layer.
 */

import { AppState } from './storage';
import { FinancialExplanation } from '../types/finance';
import { calculateAvailableCash, calculateDebtOutstanding } from './calculator';
import { calculateCashFlowForecast } from './financialIntelligence';
import { formatINR } from '../utils/currency';
import { getCurrentMonthKey } from '../utils/dates';

/**
 * Generates transparent explanation breakdown for any major financial metric (Section 47, 48, 50)
 */
export function explainMetric(metricKey: string, state: AppState): FinancialExplanation {
  const currentMonthKey = getCurrentMonthKey();

  switch (metricKey) {
    case 'AVAILABLE_CASH': {
      let bankTotal = 0;
      let cashTotal = 0;
      let walletTotal = 0;

      for (const a of state.accounts) {
        const accTxs = state.transactions.filter((t) => t.accountId === a.id || t.toAccountId === a.id);
        let bal = a.openingBalance;
        for (const t of accTxs) {
          if (t.accountId === a.id) {
            if (t.type === 'INCOME') bal += t.amount;
            else if (t.type === 'EXPENSE' || t.type === 'DEBT_PAYMENT' || t.type === 'TRANSFER') bal -= t.amount;
          }
          if (t.toAccountId === a.id && t.type === 'TRANSFER') {
            bal += t.amount;
          }
        }

        if (a.type === 'BANK') bankTotal += Math.max(0, bal);
        else if (a.type === 'CASH') cashTotal += Math.max(0, bal);
        else if (a.type === 'WALLET') walletTotal += Math.max(0, bal);
      }

      const totalCash = bankTotal + cashTotal + walletTotal;

      return {
        metricKey,
        title: 'Available Liquid Cash',
        valueDisplay: formatINR(totalCash),
        formula: 'Bank Accounts + Cash in Hand + Digital Wallets',
        basis: 'ACTUAL',
        dataQuality: 'COMPLETE',
        breakdownItems: [
          { label: 'Bank Accounts (Checking/Savings)', amount: bankTotal },
          { label: 'Physical Cash in Hand', amount: cashTotal },
          { label: 'Digital Wallets (Paytm, etc.)', amount: walletTotal },
          {
            label: 'Unused Credit Limits',
            note: 'Strictly ₹0 (Per accounting rules, unused credit lines are borrowing capacity, not cash assets)',
          },
        ],
        explanation:
          'Available cash represents actual liquid funds across confirmed bank accounts, physical cash, and wallets. Credit limits are intentionally excluded to ensure your solvency calculations reflect true owned liquidity.',
      };
    }

    case 'MONTHLY_SURPLUS': {
      const monthTxs = state.transactions.filter(
        (t) => t.date.startsWith(currentMonthKey) && t.verificationStatus !== 'NEEDS_VERIFICATION'
      );
      const inc = monthTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const exp = monthTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      const debtPayments = monthTxs.filter((t) => t.type === 'DEBT_PAYMENT').reduce((s, t) => s + t.amount, 0);
      const scheduledDebt = state.payments
        .filter((p) => p.dueDate.startsWith(currentMonthKey) && (p.type === 'EMI' || p.debtId))
        .reduce((sum, p) => sum + p.amount, 0);
      const effectiveDebt = debtPayments > 0 ? debtPayments : scheduledDebt;
      const surplus = inc - exp - effectiveDebt;

      return {
        metricKey,
        title: 'Monthly Operating Surplus',
        valueDisplay: formatINR(surplus),
        formula: 'Recorded Monthly Income - Recorded Monthly Expenses - Recorded Debt Obligations',
        basis: 'ACTUAL',
        dataQuality: inc > 0 ? 'COMPLETE' : 'PARTIAL',
        breakdownItems: [
          { label: 'Recorded Monthly Income', amount: inc },
          { label: 'Recorded Monthly Expenses', amount: exp, isDeduction: true },
          {
            label: debtPayments > 0 ? 'Recorded Debt Payments' : 'Scheduled Debt Obligations',
            amount: effectiveDebt,
            isDeduction: true,
          },
        ],
        explanation:
          'Monthly surplus is the net cash remaining after covering living expenses and scheduled debt servicing obligations. A positive surplus indicates excess cash available for emergency savings or debt prepayment.',
      };
    }

    case 'TOTAL_DEBT': {
      const debtTotal = calculateDebtOutstanding(state.debts, state.debtPayments, state.transactions).totalOutstanding;
      const items = (state.debts || [])
        .filter((d) => d.status === 'ACTIVE')
        .map((d) => {
          const paid = (state.debtPayments || [])
            .filter((dp) => dp.debtId === d.id)
            .reduce((s, dp) => s + (dp.principalAmount || dp.amount), 0);
          const principal = d.originalPrincipal ?? d.principalAmount ?? d.outstandingPrincipal ?? 0;
          return {
            label: `${d.name} (${d.type})`,
            amount: Math.max(0, principal - paid),
          };
        });

      return {
        metricKey,
        title: 'Total Outstanding Debt',
        valueDisplay: formatINR(debtTotal),
        formula: 'Sum of Active Loan Principal Balances - Principal Payments Recorded',
        basis: 'ACTUAL',
        dataQuality: 'COMPLETE',
        breakdownItems: items,
        explanation:
          'Total principal remaining across all active loans, bike finances, personal debts, and credit lines. Interest is modeled separately in monthly amortization schedules.',
      };
    }

    case 'NET_WORTH': {
      const cash = calculateAvailableCash(state.accounts, state.transactions);
      const debt = calculateDebtOutstanding(state.debts, state.debtPayments, state.transactions).totalOutstanding;

      let ccDebt = 0;
      for (const a of state.accounts) {
        if (a.type === 'CREDIT_CARD') {
          const accTxs = state.transactions.filter((t) => t.accountId === a.id);
          let bal = a.openingBalance;
          for (const t of accTxs) {
            if (t.type === 'EXPENSE') bal -= t.amount;
            else if (t.type === 'DEBT_PAYMENT') bal += t.amount;
          }
          if (bal < 0) ccDebt += Math.abs(bal);
        }
      }

      const totalLiabilities = debt + ccDebt;
      const netWorth = cash - totalLiabilities;

      return {
        metricKey,
        title: 'Net Worth',
        valueDisplay: formatINR(netWorth),
        formula: 'Total Owned Assets - Total Debt Liabilities',
        basis: 'ACTUAL',
        dataQuality: 'COMPLETE',
        breakdownItems: [
          { label: 'Total Liquid Assets (Bank, Cash, Wallets)', amount: cash },
          { label: 'Total Loan Liabilities', amount: debt, isDeduction: true },
          ...(ccDebt > 0
            ? [{ label: 'Credit Card Outstanding Balances', amount: ccDebt, isDeduction: true }]
            : []),
        ],
        explanation:
          'Net worth represents your net financial equity. Assets consist solely of verified liquid cash and accounts; liabilities include active loans and credit card balances. As loans are amortized, net worth increases.',
      };
    }

    case 'PROJECTED_CASH': {
      const forecast = calculateCashFlowForecast(state, 30);
      return {
        metricKey,
        title: '30-Day Projected Ending Cash',
        valueDisplay: formatINR(forecast.projectedEndingCash),
        formula: 'Starting Cash + Projected Income - Projected Living Expenses - Scheduled Commitments',
        basis: 'FORECAST',
        dataQuality: forecast.dataQuality.toUpperCase() as any,
        breakdownItems: [
          { label: 'Current Starting Cash', amount: forecast.startingCash },
          { label: 'Projected Income (Salary + Swiggy)', amount: forecast.projectedIncome },
          { label: 'Projected Essential Expenses', amount: forecast.projectedEssentialExpenses, isDeduction: true },
          { label: 'Projected Discretionary Expenses', amount: forecast.projectedDiscretionaryExpenses, isDeduction: true },
          { label: 'Scheduled Debt & Loan EMIs', amount: forecast.projectedDebtPayments, isDeduction: true },
        ],
        explanation: forecast.forecastExplanation,
      };
    }

    case 'DTI_RATIO': {
      const monthTxs = state.transactions.filter(
        (t) => t.date.startsWith(currentMonthKey) && t.verificationStatus !== 'NEEDS_VERIFICATION'
      );
      const inc = monthTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const emiTotal = state.debts
        .filter((d) => d.status === 'ACTIVE' && d.emiAmount)
        .reduce((sum, d) => sum + (d.emiAmount || 0), 0);
      const ratio = inc > 0 ? Math.round((emiTotal / inc) * 100) : 0;

      return {
        metricKey,
        title: 'Debt Obligation Ratio (DTI)',
        valueDisplay: `${ratio}%`,
        formula: 'Total Scheduled Monthly EMIs ÷ Recorded Monthly Income × 100',
        basis: 'ACTUAL',
        dataQuality: inc > 0 ? 'COMPLETE' : 'LIMITED',
        breakdownItems: [
          { label: 'Monthly Scheduled Loan EMIs', amount: emiTotal },
          { label: 'Recorded Monthly Income', amount: inc },
        ],
        explanation:
          'Informational ratio indicating what proportion of your recorded monthly income is committed to servicing loan obligations. A ratio under 40% is generally considered sustainable.',
      };
    }

    default:
      return {
        metricKey,
        title: 'Financial Calculation Explanation',
        valueDisplay: '—',
        formula: 'Calculated from recorded ledger entries and scheduled commitments.',
        basis: 'ACTUAL',
        dataQuality: 'COMPLETE',
        breakdownItems: [],
        explanation: 'Detailed mathematical breakdown of calculated financial indicators.',
      };
  }
}
