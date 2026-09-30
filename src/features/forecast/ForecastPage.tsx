import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  ShieldCheck,
  Info,
  CalendarClock,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/currency';
import { formatIndianDate } from '../../utils/dates';
import {
  calculateCashFlowForecast,
  calculateDailyCashForecast,
} from '../../services/financialIntelligence';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';

export const ForecastPage: React.FC = () => {
  const { state } = useFinance();

  const [horizonDays, setHorizonDays] = useState<number>(30);

  // Compute dynamic forecast for selected horizon
  const forecast = useMemo(() => {
    return calculateCashFlowForecast(state, horizonDays);
  }, [state, horizonDays]);

  // Compute daily forecast curve
  const dailyPoints = useMemo(() => {
    return calculateDailyCashForecast(state, Math.min(horizonDays, 60));
  }, [state, horizonDays]);

  // Timeline events extracted from the daily points
  const timelineEvents = useMemo(() => {
    return dailyPoints.filter(
      (p) => !p.isHistorical && (p.scheduledPayments || p.projectedIncome || p.eventDescription)
    );
  }, [dailyPoints]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Forward Cash-Flow Projection Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
            Cash Flow Forecast
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Deterministic cash balance projections based on confirmed history, scheduled commitments, and run rates
          </p>
        </div>

        {/* Horizon Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start sm:self-auto text-xs">
          {[
            { days: 7, label: '7 Days' },
            { days: 14, label: '14 Days' },
            { days: 30, label: '30 Days' },
            { days: 90, label: '3 Months' },
            { days: 180, label: '6 Months' },
          ].map((h) => (
            <button
              key={h.days}
              onClick={() => setHorizonDays(h.days)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                horizonDays === h.days
                  ? 'bg-white dark:bg-[#131926] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prominent Projected Ending Cash Card */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                PROJECTED ENDING CASH ({forecast.period.toUpperCase()})
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 uppercase">
                ESTIMATE
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight mt-1">
              {formatINR(forecast.projectedEndingCash)}
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1.5 max-w-xl leading-relaxed">
              Based on starting cash of {formatINR(forecast.startingCash)}, projected inflows of{' '}
              {formatINR(forecast.projectedIncome)}, living expense run rates, and scheduled obligations.
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-slate-100 sm:dark:border-slate-800 sm:pl-6">
            <span className="text-xs font-semibold text-slate-500 uppercase">Projected Net Change</span>
            <div
              className={`text-2xl font-bold tabular-nums mt-0.5 ${
                forecast.projectedNetCashChange >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {forecast.projectedNetCashChange >= 0 ? '+' : ''}
              {formatINR(forecast.projectedNetCashChange)}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Data basis: {forecast.dataQuality}
            </span>
          </div>
        </div>
      </div>

      {/* Forecast Component Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Inflows */}
        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Projected Inflows
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {formatINR(forecast.projectedIncome)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Salary + Swiggy delivery estimates</p>
        </div>

        {/* Essential Living */}
        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Essential Expenses
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {formatINR(forecast.projectedEssentialExpenses)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Food, groceries, fuel & utilities</p>
        </div>

        {/* Debt Obligations */}
        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#EA580C]">
            Scheduled Loan EMIs
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#EA580C] tabular-nums mt-1">
            {formatINR(forecast.projectedDebtPayments)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Active loan repayments scheduled</p>
        </div>

        {/* Recurring Bills */}
        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Recurring Bills & Rent
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {formatINR(forecast.projectedRecurringCommitments)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Rent, subscriptions & cards</p>
        </div>
      </div>

      {/* Actual vs Projected Daily Cash Curve Chart */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
              Daily Cash Trajectory (Actual vs Projected)
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Solid line represents confirmed historical cash; dashed line represents projected cash balance
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-600" />
              <span>Confirmed History</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-emerald-500" />
              <span>Projected</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#9CA3AF"
                tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip
                formatter={(val: any, name: any) => [
                  `₹${Number(val || 0).toLocaleString('en-IN')}`,
                  name === 'actualCash' ? 'Confirmed Cash' : 'Projected Cash',
                ]}
                labelFormatter={(label, payload) => {
                  const pt = payload?.[0]?.payload;
                  return pt?.eventDescription
                    ? `${label} • ${pt.eventDescription}`
                    : label;
                }}
                contentStyle={{
                  backgroundColor: '#1F2937',
                  borderColor: '#374151',
                  borderRadius: '0.75rem',
                  color: '#F9FAFB',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" />
              {state.cashBufferSetting?.minimumCashBuffer ? (
                <ReferenceLine
                  y={state.cashBufferSetting.minimumCashBuffer}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{
                    value: `Min Buffer: ₹${state.cashBufferSetting.minimumCashBuffer}`,
                    fontSize: 10,
                    fill: '#D97706',
                  }}
                />
              ) : null}
              <Line
                type="monotone"
                dataKey="actualCash"
                stroke="#2563EB"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="projectedCash"
                stroke="#10B981"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#10B981' }}
                activeDot={{ r: 6 }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cash Flow Timeline of Scheduled & Estimated Events */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
            Forward Cash-Flow Timeline
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Chronological sequence of scheduled payments, projected income inflows, and running liquidity
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {timelineEvents.map((event, idx) => {
            const isIncome = event.eventType === 'INCOME';
            const isEmi = event.eventType === 'EMI';

            return (
              <div
                key={`${event.date}_${idx}`}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                      isIncome
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : isEmi
                        ? 'bg-orange-100 text-[#EA580C] dark:bg-orange-950 dark:text-orange-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {isIncome ? '↓' : '↑'}
                  </div>

                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {event.eventDescription || (isIncome ? 'Estimated Inflow' : 'Scheduled Commitment')}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formatIndianDate(event.date)} • {isIncome ? 'Income' : isEmi ? 'Loan EMI' : 'Bill'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 sm:text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Amount</span>
                    <span
                      className={`font-bold tabular-nums text-sm ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatINR(event.scheduledPayments || event.projectedIncome || 0)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Projected Cash</span>
                    <span className="font-bold tabular-nums text-sm text-slate-900 dark:text-white">
                      {event.projectedCash ? formatINR(event.projectedCash) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forecast Basis & Method Transparency Panel */}
      <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Forecasting Methodology & Transparency Notice</span>
        </div>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {forecast.forecastExplanation}
        </p>
        <p className="text-slate-500 leading-relaxed text-[11px]">
          Projections represent mathematical forward models and must not be interpreted as guaranteed balances or official bank commitments. All forecasts remain read-only and never mutate your transaction ledger.
        </p>
      </div>
    </div>
  );
};
