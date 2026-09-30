import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Scale,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Bike,
  CheckCircle2,
  Clock,
  Sparkles,
  PieChart as PieChartIcon,
  Compass,
  FileCheck,
  Zap,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CalculationExplanationModal } from '../../components/ui/CalculationExplanationModal';
import { FinancialExplanation } from '../../types/finance';
import { formatINR } from '../../utils/currency';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';

export const CommandCenterPage: React.FC = () => {
  const {
    state,
    advancedSummary,
    debtProjections,
    goalProjections,
    dataQualityReport,
    financialMilestones,
    notifications,
    unreadNotificationCount,
    urgentNotificationCount,
    swiggyOperations,
    explainFinancialMetric,
  } = useFinance();

  const [activeHorizon, setActiveHorizon] = useState<'3M' | '6M' | '12M'>('3M');
  const [selectedExplanation, setSelectedExplanation] = useState<FinancialExplanation | null>(null);
  const navigate = useNavigate();

  const handleOpenExplanation = (metricKey: string) => {
    const exp = explainFinancialMetric(metricKey);
    setSelectedExplanation(exp);
  };

  // Top unread notification for Daily Briefing
  const topNotification = (notifications || []).find(
    (n) => n.status === 'UNREAD' && (n.priority === 'URGENT' || n.priority === 'HIGH')
  ) || (notifications || []).find((n) => n.status === 'UNREAD');

  // Chart data for Cash Flow & Surplus
  const horizonCash =
    activeHorizon === '3M'
      ? advancedSummary.projected3MonthCash
      : activeHorizon === '6M'
      ? advancedSummary.projected6MonthCash
      : advancedSummary.projected12MonthCash;

  const horizonDebt =
    activeHorizon === '3M'
      ? advancedSummary.projected3MonthDebt
      : activeHorizon === '6M'
      ? advancedSummary.projected6MonthDebt
      : advancedSummary.projected12MonthDebt;

  // Monthly operating cash flow chart
  const cashFlowChartData = [
    {
      name: 'Current Month',
      Income: advancedSummary.monthlyIncome,
      Expenses: advancedSummary.monthlyExpenses,
      Debt: advancedSummary.monthlyDebtObligations,
      Surplus: advancedSummary.monthlySurplus,
    },
    {
      name: 'Projected (+1M)',
      Income: advancedSummary.monthlyIncome,
      Expenses: advancedSummary.monthlyExpenses,
      Debt: advancedSummary.monthlyDebtObligations,
      Surplus: advancedSummary.monthlySurplus,
    },
    {
      name: 'Projected (+2M)',
      Income: advancedSummary.monthlyIncome,
      Expenses: advancedSummary.monthlyExpenses,
      Debt: advancedSummary.monthlyDebtObligations,
      Surplus: advancedSummary.monthlySurplus,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Personal Finance Command Center
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
              Stage 7
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive financial snapshot, multi-horizon outlook, debt-free planning, and explainability.
          </p>
        </div>

        {/* Quick Route Switches */}
        <div className="flex items-center gap-2">
          <Link
            to="/timeline"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </Link>
          <Link
            to="/data-quality"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Data Quality</span>
          </Link>
          <Link
            to="/planning"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold transition shadow-xs"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Scenario Lab</span>
          </Link>
        </div>
      </div>

      {/* Row 1: Core Financial Position (4 Metric Cards with Explanation Triggers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Cash */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Available Liquid Cash
            </span>
            <button
              onClick={() => handleOpenExplanation('AVAILABLE_CASH')}
              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="How is this calculated?"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatINR(advancedSummary.currentCash)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Bank: {formatINR(advancedSummary.bankBalances)} • Cash: {formatINR(advancedSummary.cashBalances)}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Unused CC Limit</span>
            <span className="font-semibold text-slate-400">₹0 (Not asset)</span>
          </div>
        </div>

        {/* Card 2: Monthly Surplus */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Monthly Operating Surplus
            </span>
            <button
              onClick={() => handleOpenExplanation('MONTHLY_SURPLUS')}
              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="How is this calculated?"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="my-2">
            <div
              className={`text-2xl font-black tracking-tight tabular-nums ${
                advancedSummary.monthlySurplus >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatINR(advancedSummary.monthlySurplus)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {advancedSummary.surplusTrend.trendDescription}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">3-Mo Average</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {formatINR(advancedSummary.surplusTrend.threeMonthAverage)}
            </span>
          </div>
        </div>

        {/* Card 3: Total Debt */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Total Outstanding Debt
            </span>
            <button
              onClick={() => handleOpenExplanation('TOTAL_DEBT')}
              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="How is this calculated?"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400 tracking-tight tabular-nums">
              {formatINR(advancedSummary.totalDebt)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Scheduled EMIs: {formatINR(advancedSummary.monthlyDebtObligations)}/mo
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Debt Ratio (DTI)</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {advancedSummary.debtObligationRatioPct}%
            </span>
          </div>
        </div>

        {/* Card 4: Net Worth */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Net Worth (Equity)
            </span>
            <button
              onClick={() => handleOpenExplanation('NET_WORTH')}
              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="How is this calculated?"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="my-2">
            <div
              className={`text-2xl font-black tracking-tight tabular-nums ${
                advancedSummary.netWorth >= 0
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {formatINR(advancedSummary.netWorth)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Assets {formatINR(advancedSummary.currentCash)} − Liabilities {formatINR(advancedSummary.totalDebt)}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Emergency Buffer</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {advancedSummary.emergencyBufferMonths} months
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Today's Financial Briefing Banner */}
      {topNotification && (
        <div
          className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#131926] border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
            topNotification.priority === 'URGENT'
              ? 'border-red-300 dark:border-red-900/60 ring-1 ring-red-500/20'
              : 'border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-500/20'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                topNotification.priority === 'URGENT'
                  ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {topNotification.priority} ACTION REQUIRED
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {topNotification.title}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                {topNotification.message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Link
              to={topNotification.actionRoute || '/notifications'}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:opacity-90 transition"
            >
              <span>{topNotification.actionLabel || 'View Action'}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Row 3: Multi-Horizon Outlook & Projections (3M / 6M / 12M) */}
      <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Multi-Horizon Financial Outlook
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deterministic forward projections based on recorded income, living run rates, and loan amortization.
            </p>
          </div>

          {/* Horizon Selector */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-center">
            {(['3M', '6M', '12M'] as const).map((h) => (
              <button
                key={h}
                onClick={() => setActiveHorizon(h)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeHorizon === h
                    ? 'bg-white dark:bg-[#131926] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {h === '3M' ? '3 Months' : h === '6M' ? '6 Months' : '12 Months'}
              </button>
            ))}
          </div>
        </div>

        {/* Outlook Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-medium">Projected Ending Cash</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
              {formatINR(horizonCash)}
            </div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
              Deterministic Projection
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-medium">Projected Remaining Debt</span>
            <div className="text-xl font-black text-orange-600 dark:text-orange-400 mt-1 tabular-nums">
              {formatINR(horizonDebt)}
            </div>
            <span className="text-[10px] text-slate-400">
              Reduction: {formatINR(Math.max(0, advancedSummary.totalDebt - horizonDebt))}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-medium">Estimated Debt-Free Horizon</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {debtProjections.projectedMonths} Months
            </div>
            <span className="text-[10px] text-slate-400">
              Est. Date: {debtProjections.estimatedDebtFreeDate || '—'}
            </span>
          </div>
        </div>

        {/* Explanatory note on interest modeling */}
        <p className="text-[11px] text-slate-400 italic">
          * {debtProjections.interestExplanation}
        </p>
      </div>

      {/* Row 4: Debt-Free Engine & Goal Progress Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Debt Payoff Timeline & Scenarios */}
        <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Debt-Free Projection Engine
                </h3>
                <p className="text-xs text-slate-400">Amortization schedules and prepayment impact</p>
              </div>
            </div>
            <Link
              to="/debts"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Debts →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {debtProjections.debts.map((d) => (
              <div key={d.debtId} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">{d.debtName}</h4>
                  <span className="text-slate-400 text-[11px]">
                    EMI: {formatINR(d.emiAmount)}/mo • Est. {d.remainingMonths} mos
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatINR(d.currentBalance)}
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Done: {d.estimatedCompletionDate || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Prepayment impact teaser */}
          {debtProjections.extraPaymentScenarios.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 text-xs">
              <span className="font-bold text-orange-800 dark:text-orange-300">
                Prepayment Acceleration Scenario:
              </span>
              <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Paying an extra <strong>{formatINR(debtProjections.extraPaymentScenarios[0].extraAmount)}/mo</strong> reduces your debt freedom horizon by <strong>{debtProjections.extraPaymentScenarios[0].monthsSaved} months</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Goal Planning Engine */}
        <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Goal Planning Engine
                </h3>
                <p className="text-xs text-slate-400">Deterministic savings progress and completion horizons</p>
              </div>
            </div>
            <Link
              to="/goals"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage Goals →
            </Link>
          </div>

          <div className="space-y-3.5">
            {goalProjections.slice(0, 3).map((g) => (
              <div
                key={g.goalId}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{g.name}</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatINR(g.currentAmount)} / {formatINR(g.targetAmount)} ({g.percentComplete}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${g.percentComplete}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{g.statusText}</span>
                  {g.monthlyContribution && (
                    <span>{formatINR(g.monthlyContribution)}/mo contribution</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Data Quality Summary & Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Quality Report */}
        <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Financial Data Quality
                </h3>
                <p className="text-xs text-slate-400">{dataQualityReport.summaryMessage}</p>
              </div>
            </div>
            <Link
              to="/data-quality"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Review All →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">Uncategorized Txs</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {dataQualityReport.uncategorizedCount}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">Missing Interest Rates</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {dataQualityReport.missingInterestRateCount}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">Pending Bank SMS</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {dataQualityReport.pendingSmsCount}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">Overall Quality</span>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                {dataQualityReport.overallQuality}
              </div>
            </div>
          </div>
        </div>

        {/* Recent & Projected Milestones */}
        <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Financial Milestones
                </h3>
                <p className="text-xs text-slate-400">Key historical accomplishments and upcoming goals</p>
              </div>
            </div>
            <Link
              to="/timeline"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Full Timeline →
            </Link>
          </div>

          <div className="space-y-3">
            {financialMilestones.slice(0, 3).map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{m.title}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase ${
                        m.status === 'ACHIEVED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{m.description}</p>
                </div>
                <span className="text-[11px] text-slate-400 flex-shrink-0">{m.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explanation Modal */}
      <CalculationExplanationModal
        explanation={selectedExplanation}
        onClose={() => setSelectedExplanation(null)}
      />
    </div>
  );
};
