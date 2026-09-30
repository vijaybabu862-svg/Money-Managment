import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/currency';
import { resolveLoanPurpose } from '../../services/centralFinanceCalculations';
import {
  TrendingUp,
  CreditCard,
  Bike,
  ShoppingBag,
  Wallet,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { centralPosition, debtsWithDetails, essentialExpenses } = useFinance();

  const {
    monthlySalary,
    swiggyNetIncome,
    swiggyGrossIncome,
    swiggyExpenses,
    swiggyDaysWorked,
    totalMonthlyIncome,
    totalActiveLoans,
    totalOutstandingDebt,
    totalMonthlyEMI,
    emiPercentage,
    totalEssentialExpenses,
    totalMonthlyOutgoing,
    netCashFlow,
    isShortfall,
    shortfallOrSurplusAmount,
  } = centralPosition;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Brand Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          CASH FLOW
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
          Know your money. Control your debt.
        </p>
      </div>

      {/* 3 Core Overview Blocks: Income, Debt, Monthly Position */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* BLOCK 1: INCOME */}
        <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Monthly Income
              </span>
              <Link
                to="/salary"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>Details</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Monthly Salary</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                  {formatINR(monthlySalary)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Swiggy Net Income</span>
                <span className="font-bold text-orange-600 dark:text-orange-400 tabular-nums text-sm">
                  +{formatINR(swiggyNetIncome)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Total Income
                </span>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatINR(totalMonthlyIncome)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            Combined monthly cash inflows
          </p>
        </div>

        {/* BLOCK 2: DEBT */}
        <div className="bg-white dark:bg-[#131926] border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
                Debt & Loans
              </span>
              <Link
                to="/loans"
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
              >
                <span>View Loans</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Total Active Loans</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                  {totalActiveLoans} Loans
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Total Outstanding Debt</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                  {formatINR(totalOutstandingDebt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Total Monthly EMI</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums text-sm">
                  {formatINR(totalMonthlyEMI)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  EMI as % of Salary
                </span>
                <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                  {emiPercentage}%
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            Deducted automatically from your monthly salary
          </p>
        </div>

        {/* BLOCK 3: MONTHLY POSITION */}
        <div
          className={`border rounded-2xl p-5 shadow-xs flex flex-col justify-between ${
            isShortfall
              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
              : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isShortfall ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                Monthly Cash Position
              </span>
              <Link
                to="/cash-flow"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>Full Ledger</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Salary</span>
                <span className="font-semibold">{formatINR(monthlySalary)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>+ Swiggy Net</span>
                <span className="font-semibold">+{formatINR(swiggyNetIncome)}</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>− Total EMI</span>
                <span className="font-semibold">−{formatINR(totalMonthlyEMI)}</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>− Essential Expenses</span>
                <span className="font-semibold">−{formatINR(totalEssentialExpenses)}</span>
              </div>

              <div className="pt-2 border-t border-slate-300 dark:border-slate-700">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  {isShortfall ? 'Monthly Shortfall' : 'Monthly Money Left'}
                </span>
                <div
                  className={`text-2xl font-black tabular-nums tracking-tight mt-0.5 ${
                    isShortfall ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isShortfall
                    ? `Shortfall: ${formatINR(shortfallOrSurplusAmount)}`
                    : `Money Left: ${formatINR(shortfallOrSurplusAmount)}`}
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
            {isShortfall
              ? 'Deficit compensated by Swiggy shifts or cash buffer'
              : 'Available for savings or prepayment'}
          </p>
        </div>
      </div>

      {/* SECTION: MY LOANS TABLE */}
      <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              My Loans
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {totalActiveLoans} active borrowings • Total monthly EMI: <strong>{formatINR(totalMonthlyEMI)}</strong>
            </p>
          </div>

          <Link
            to="/loans"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Manage All Loans</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 sm:px-6">Loan Name</th>
                <th className="py-3 px-4 sm:px-6">Purpose</th>
                <th className="py-3 px-4 sm:px-6 text-right">Monthly EMI</th>
                <th className="py-3 px-4 sm:px-6 text-right">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {debtsWithDetails.map((loan) => {
                const loanPurpose = resolveLoanPurpose(loan);
                return (
                  <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {loan.name}
                      </div>
                      {loan.lenderName && (
                        <div className="text-[11px] text-slate-400">{loan.lenderName}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <Tag className="w-3 h-3" />
                        <span>{loanPurpose}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatINR(loan.emiAmount || 0)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {formatINR(loan.outstandingPrincipal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION: SWIGGY SUMMARY */}
      <div className="bg-white dark:bg-[#131926] border border-orange-200 dark:border-orange-900/60 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bike className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Swiggy Delivery
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-300 mt-2">
            <div>
              Days Worked: <strong>{swiggyDaysWorked}</strong>
            </div>
            <div>
              Gross Earnings: <strong>{formatINR(swiggyGrossIncome)}</strong>
            </div>
            <div>
              Fuel/Expenses: <strong className="text-rose-600 dark:text-rose-400">-{formatINR(swiggyExpenses)}</strong>
            </div>
            <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              Net: {formatINR(swiggyNetIncome)}
            </div>
          </div>
        </div>

        <Link
          to="/swiggy"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition self-start sm:self-auto cursor-pointer"
        >
          <span>Open Swiggy Hub</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
