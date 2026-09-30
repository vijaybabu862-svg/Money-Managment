import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/currency';
import {
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Bike,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CashFlowPage: React.FC = () => {
  const { centralPosition, debtsWithDetails, essentialExpenses } = useFinance();

  const {
    monthlySalary,
    swiggyNetIncome,
    swiggyGrossIncome,
    swiggyExpenses,
    totalMonthlyIncome,
    totalMonthlyEMI,
    totalEssentialExpenses,
    totalMonthlyOutgoing,
    netCashFlow,
    isShortfall,
    shortfallOrSurplusAmount,
    totalActiveLoans,
  } = centralPosition;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Monthly Cash Flow
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Complete transparent accounting of your income, loan EMIs, living expenses, and net monthly balance
        </p>
      </div>

      {/* FINAL RESULT CARD - PROMINENT & UNAMBIGUOUS */}
      <div
        className={`p-6 rounded-2xl border shadow-sm transition-all hover-lift ${
          isShortfall
            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
            : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isShortfall
                    ? 'bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200'
                    : 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                {isShortfall ? 'Monthly Shortfall' : 'Monthly Money Left (Surplus)'}
              </span>
            </div>
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mt-2">
              {isShortfall ? 'Total Deficit this Month:' : 'Free Cash Available:'}
            </h2>
            <div
              className={`text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight mt-1 ${
                isShortfall
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isShortfall ? `Shortfall: ${formatINR(shortfallOrSurplusAmount)}` : `Money Left: ${formatINR(shortfallOrSurplusAmount)}`}
            </div>
          </div>

          <div className="text-sm space-y-1 text-slate-600 dark:text-slate-300 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-slate-800">
            <div>
              Total Income: <strong className="text-slate-900 dark:text-white">{formatINR(totalMonthlyIncome)}</strong>
            </div>
            <div>
              Total Outgoing: <strong className="text-rose-600 dark:text-rose-400">-{formatINR(totalMonthlyOutgoing)}</strong>
            </div>
            <div className="text-xs text-slate-500 pt-1">
              {isShortfall
                ? `You need ${formatINR(shortfallOrSurplusAmount)} extra from Swiggy shifts to break even.`
                : `You have ${formatINR(shortfallOrSurplusAmount)} buffer for savings or extra loan prepayment.`}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Accounting: Income vs Outgoing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Column 1: Income */}
        <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  +
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Total Monthly Income
                  </h3>
                  <span className="text-xs text-slate-500">Salary + Swiggy Take-Home</span>
                </div>
              </div>
              <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatINR(totalMonthlyIncome)}
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 my-3">
              {/* Salary */}
              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">
                      Company Salary
                    </div>
                    <span className="text-xs text-slate-500">Credited to HDFC Bank</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                    {formatINR(monthlySalary)}
                  </div>
                  <Link
                    to="/salary"
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Edit Salary
                  </Link>
                </div>
              </div>

              {/* Swiggy */}
              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bike className="w-4 h-4 text-orange-500" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">
                      Swiggy Net Income
                    </div>
                    <span className="text-xs text-slate-500">
                      Gross {formatINR(swiggyGrossIncome)} − Fuel {formatINR(swiggyExpenses)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-orange-600 dark:text-orange-400 tabular-nums text-sm">
                    +{formatINR(swiggyNetIncome)}
                  </div>
                  <Link
                    to="/swiggy"
                    className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    Delivery Hub
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            Total Income = Salary ({formatINR(monthlySalary)}) + Swiggy Net ({formatINR(swiggyNetIncome)}) = <strong>{formatINR(totalMonthlyIncome)}</strong>
          </div>
        </div>

        {/* Column 2: Outgoing */}
        <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  −
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Total Monthly Outgoing
                  </h3>
                  <span className="text-xs text-slate-500">Loan EMIs + Living Essentials</span>
                </div>
              </div>
              <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                -{formatINR(totalMonthlyOutgoing)}
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 my-3">
              {/* Total EMI */}
              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-rose-500" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">
                      Total Loan EMIs
                    </div>
                    <span className="text-xs text-slate-500">
                      {totalActiveLoans} active loans
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-rose-600 dark:text-rose-400 tabular-nums text-sm">
                    -{formatINR(totalMonthlyEMI)}
                  </div>
                  <Link
                    to="/loans"
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View Loans
                  </Link>
                </div>
              </div>

              {/* Essential Expenses */}
              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">
                      Essential Living Expenses
                    </div>
                    <span className="text-xs text-slate-500">
                      Rent, Groceries, Electricity, Bills ({essentialExpenses.length} items)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                    -{formatINR(totalEssentialExpenses)}
                  </div>
                  <Link
                    to="/expenses"
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Edit Essentials
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            Total Outgoing = Total EMI ({formatINR(totalMonthlyEMI)}) + Essential Expenses ({formatINR(totalEssentialExpenses)}) = <strong>{formatINR(totalMonthlyOutgoing)}</strong>
          </div>
        </div>
      </div>

      {/* Complete Step-by-Step Flow Chart Box */}
      <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Complete Calculation Breakdown
        </h3>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 font-mono text-xs sm:text-sm space-y-2">
          <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
            <span>Monthly Company Salary</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatINR(monthlySalary)}</span>
          </div>

          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
            <span>+ Swiggy Net Take-Home</span>
            <span className="font-bold">+{formatINR(swiggyNetIncome)}</span>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-1 flex justify-between items-center font-bold text-slate-900 dark:text-white">
            <span>= TOTAL MONTHLY INCOME</span>
            <span>{formatINR(totalMonthlyIncome)}</span>
          </div>

          <div className="pt-2 flex justify-between items-center text-rose-600 dark:text-rose-400">
            <span>− Total Loan EMIs ({totalActiveLoans} loans)</span>
            <span className="font-bold">−{formatINR(totalMonthlyEMI)}</span>
          </div>

          <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
            <span>− Essential Living Expenses (Rent, Food, etc.)</span>
            <span className="font-bold">−{formatINR(totalEssentialExpenses)}</span>
          </div>

          <div className="border-t-2 border-slate-300 dark:border-slate-600 pt-2 flex justify-between items-center text-base sm:text-lg font-extrabold">
            <span className={isShortfall ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
              {isShortfall ? 'FINAL SHORTFALL' : 'FINAL MONEY LEFT'}
            </span>
            <span className={isShortfall ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
              {isShortfall ? `-${formatINR(shortfallOrSurplusAmount)}` : `+${formatINR(shortfallOrSurplusAmount)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
