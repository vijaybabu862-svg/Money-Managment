import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Layers,
  ArrowRight,
  Calendar,
  Compass,
  Clock,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/currency';
import { formatIndianDate } from '../../utils/dates';
import {
  calculateIncomeTrends,
  calculateExpenseTrends,
  calculateDebtTrends,
  calculateNetWorthTrends,
  generateMonthlySnapshots,
} from '../../services/financialIntelligence';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const { summary, state, accountsWithBalances, debtsWithDetails, cashPressure, forecast30Days } = useFinance();

  const [activeReport, setActiveReport] = useState<
    | 'CASH_FLOW'
    | 'INCOME_TREND'
    | 'EXPENSE_TREND'
    | 'DEBT_TREND'
    | 'NET_WORTH_TREND'
    | 'MONTH_COMPARISON'
    | 'CASH_PRESSURE'
  >('CASH_FLOW');

  // Compute multi-month analytics
  const incomeTrends = useMemo(() => {
    return calculateIncomeTrends(state.transactions, 6);
  }, [state.transactions]);

  const expenseTrends = useMemo(() => {
    return calculateExpenseTrends(state.transactions, state.categories, 6);
  }, [state.transactions, state.categories]);

  const debtTrends = useMemo(() => {
    return calculateDebtTrends(state.debts, state.debtPayments, state.transactions, 6);
  }, [state.debts, state.debtPayments, state.transactions]);

  const netWorthTrends = useMemo(() => {
    return calculateNetWorthTrends(state.accounts, state.debts, state.debtPayments, state.transactions, 6);
  }, [state.accounts, state.debts, state.debtPayments, state.transactions]);

  const monthlySnapshots = useMemo(() => {
    return generateMonthlySnapshots(state.transactions, state.debts, state.debtPayments, state.accounts, 6);
  }, [state.transactions, state.debts, state.debtPayments, state.accounts]);

  // Selected comparison months
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(0);
  const currentSnapshot = monthlySnapshots[selectedMonthIdx] || monthlySnapshots[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
          Financial Reports & Trends
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
          Objective multi-month historical trends, cash pressure analysis, and month-to-month performance
        </p>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'CASH_FLOW', label: 'Cash Flow', icon: BarChart3 },
          { id: 'INCOME_TREND', label: 'Income Trends', icon: TrendingUp },
          { id: 'EXPENSE_TREND', label: 'Expense Trends', icon: TrendingDown },
          { id: 'DEBT_TREND', label: 'Debt Trends', icon: CreditCard },
          { id: 'NET_WORTH_TREND', label: 'Net Worth', icon: Layers },
          { id: 'MONTH_COMPARISON', label: 'Monthly Comparison', icon: Scale },
          { id: 'CASH_PRESSURE', label: 'Cash Pressure', icon: Compass },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as typeof activeReport)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition whitespace-nowrap ${
                activeReport === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-[#131926] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. CASH FLOW VIEW */}
      {activeReport === 'CASH_FLOW' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6] mb-1">
              Monthly Inflows vs Outflows
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-4">
              Historical income and expense distribution with net cash flow change
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseTrends.monthlyTotals} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`]}
                    contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', color: '#FFF' }}
                  />
                  <Bar dataKey="total" name="Total Expenses" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="essential" name="Essential" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="discretionary" name="Discretionary" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 2. INCOME TREND VIEW */}
      {activeReport === 'INCOME_TREND' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                  Income Channel Distribution Over Time
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Primary Salary vs. Daily Swiggy Shift Earnings vs. Other Inflows
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">3-Month Average</span>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatINR(incomeTrends.rolling3MonthAvg)}
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeTrends.monthlyTotals} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`]}
                    contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', color: '#FFF' }}
                  />
                  <Bar dataKey="salary" name="Salary" stackId="a" fill="#16A34A" />
                  <Bar dataKey="swiggy" name="Swiggy Earnings" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="other" name="Other Income" stackId="a" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 3. EXPENSE TREND VIEW */}
      {activeReport === 'EXPENSE_TREND' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6] mb-1">
              Category Month-over-Month Changes
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-4">
              Comparing current month against prior month spending
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[11px]">
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Current Month</th>
                    <th className="py-2.5 px-3 text-right">Prior Month</th>
                    <th className="py-2.5 px-3 text-right">Change (₹)</th>
                    <th className="py-2.5 px-3 text-right">Change (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenseTrends.categoryBreakdown.map((c) => (
                    <tr key={c.categoryId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {c.categoryName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                        {formatINR(c.currentMonth)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">
                        {formatINR(c.previousMonth)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                          c.change > 0 ? 'text-rose-600' : c.change < 0 ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {c.change > 0 ? `+${formatINR(c.change)}` : formatINR(c.change)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">
                        {c.percentageChange !== null ? `${c.percentageChange > 0 ? '+' : ''}${c.percentageChange}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. DEBT TREND VIEW */}
      {activeReport === 'DEBT_TREND' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6] mb-1">
              Debt Principal Reduction History
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-4">
              Tracking total debt outstanding reduction and financing interest paid
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={debtTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`]}
                    contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', color: '#FFF' }}
                  />
                  <Line type="monotone" dataKey="closingDebt" name="Total Debt" stroke="#EA580C" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="principalPaid" name="Principal Repaid" stroke="#16A34A" strokeWidth={2} />
                  <Line type="monotone" dataKey="interestPaid" name="Interest Cost" stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 5. NET WORTH TREND */}
      {activeReport === 'NET_WORTH_TREND' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6] mb-1">
              Net Worth Trajectory (Assets − Liabilities)
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-4">
              Total liquid assets minus total outstanding borrowing liabilities
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netWorthTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`]}
                    contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', color: '#FFF' }}
                  />
                  <Line type="monotone" dataKey="netWorth" name="Net Worth" stroke="#2563EB" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="assets" name="Liquid Assets" stroke="#16A34A" strokeWidth={2} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="liabilities" name="Liabilities" stroke="#DC2626" strokeWidth={2} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 6. MONTHLY COMPARISON */}
      {activeReport === 'MONTH_COMPARISON' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                  Monthly Performance Snapshot
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Select a month to inspect detailed balance and vs-previous deltas
                </p>
              </div>

              <select
                value={selectedMonthIdx}
                onChange={(e) => setSelectedMonthIdx(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white font-semibold"
              >
                {monthlySnapshots.map((snap, i) => (
                  <option key={snap.monthKey} value={i}>
                    {snap.monthLabel}
                  </option>
                ))}
              </select>
            </div>

            {currentSnapshot && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Income</span>
                  <div className="text-xl font-bold text-[#16A34A] tabular-nums mt-1">
                    {formatINR(currentSnapshot.income)}
                  </div>
                  {currentSnapshot.vsPrevious && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      {currentSnapshot.vsPrevious.incomeDiff >= 0 ? '+' : ''}
                      {formatINR(currentSnapshot.vsPrevious.incomeDiff)} vs prev
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Expenses</span>
                  <div className="text-xl font-bold text-[#DC2626] tabular-nums mt-1">
                    {formatINR(currentSnapshot.expenses)}
                  </div>
                  {currentSnapshot.vsPrevious && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      {currentSnapshot.vsPrevious.expensesDiff >= 0 ? '+' : ''}
                      {formatINR(currentSnapshot.vsPrevious.expensesDiff)} vs prev
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Principal Repaid</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
                    {formatINR(currentSnapshot.debtPrincipal)}
                  </div>
                  {currentSnapshot.vsPrevious && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      {currentSnapshot.vsPrevious.debtPrincipalDiff >= 0 ? '+' : ''}
                      {formatINR(currentSnapshot.vsPrevious.debtPrincipalDiff)} vs prev
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Net Cash Change</span>
                  <div className={`text-xl font-bold tabular-nums mt-1 ${currentSnapshot.netCashChange >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                    {currentSnapshot.netCashChange >= 0 ? '+' : ''}
                    {formatINR(currentSnapshot.netCashChange)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Ending Cash: {formatINR(currentSnapshot.endingCash)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. CASH PRESSURE VIEW */}
      {activeReport === 'CASH_PRESSURE' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
              Pre-Income Liquidity Pressure Analysis
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Factual evaluation of required obligations before next anticipated inflow
            </p>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Starting Liquid Cash:</span>
                <span className="font-bold tabular-nums">{formatINR(cashPressure.startingCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Required Obligations Before Inflow:</span>
                <span className="font-bold tabular-nums text-rose-600">-{formatINR(cashPressure.requiredPayments)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cash Remaining Before Next Inflow:</span>
                <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatINR(cashPressure.cashBeforeNextIncome)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-bold">
                <span>Pressure Assessment:</span>
                <span className={cashPressure.pressureLevel === 'NEGATIVE' ? 'text-rose-600' : cashPressure.pressureLevel === 'TIGHT' ? 'text-amber-600' : 'text-emerald-600'}>
                  {cashPressure.pressureLevel} ({cashPressure.reason})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
