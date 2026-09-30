import React, { useState, useMemo } from 'react';
import {
  Compass,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Layers,
  Scale,
  DollarSign,
  Clock,
  Sliders,
  X,
  Bike,
  Fuel,
  Package,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/currency';
import { formatIndianDate } from '../../utils/dates';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { simulateScenario, createDefaultScenario } from '../../services/scenarioEngine';
import { ScenarioChange } from '../../types/finance';

export const PlanningPage: React.FC = () => {
  const {
    summary,
    state,
    forecast30Days,
    cashPressure,
    budgetForecasts,
    nextExpectedIncome,
    upcomingCommitments,
    updateCashBufferSetting,
    swiggyOperations,
    planSwiggyShift,
  } = useFinance();
  const { showToast } = useToast();

  // Cash buffer setting input
  const [bufferInput, setBufferInput] = useState(
    String(state.cashBufferSetting?.minimumCashBuffer ?? 0)
  );
  const [isEditingBuffer, setIsEditingBuffer] = useState(false);

  // Scenario Sandbox State
  const [scenarioName, setScenarioName] = useState('My Financial Scenario');
  const [scenarioChanges, setScenarioChanges] = useState<ScenarioChange[]>([
    {
      id: 'c1',
      type: 'INCOME_CHANGE',
      amount: 4000,
      description: 'Freelance / Extra Shift Income',
    },
    {
      id: 'c2',
      type: 'DEBT_PAYMENT_CHANGE',
      amount: 2000,
      description: 'Extra PhonePe Loan Principal Prepayment',
    },
  ]);

  // New Change Form Modal / Drawer
  const [changeType, setChangeType] = useState<ScenarioChange['type']>('INCOME_CHANGE');
  const [changeAmount, setChangeAmount] = useState('');
  const [changeDesc, setChangeDesc] = useState('');
  const [showAddChange, setShowAddChange] = useState(false);

  // Run Scenario simulation
  const scenarioResult = useMemo(() => {
    return simulateScenario(state, summary, scenarioChanges, 'scen_current', scenarioName);
  }, [state, summary, scenarioChanges, scenarioName]);

  const handleSaveBuffer = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(bufferInput);
    if (isNaN(val) || val < 0) {
      showToast('Please enter a valid buffer amount (₹0 or higher)', 'error');
      return;
    }
    updateCashBufferSetting({
      minimumCashBuffer: val,
      enabled: true,
    });
    showToast(`✓ Minimum cash buffer set to ₹${val.toLocaleString('en-IN')}`);
    setIsEditingBuffer(false);
  };

  const handleAddChange = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(changeAmount);
    if (isNaN(amt) || amt === 0) return;

    const newChange: ScenarioChange = {
      id: `change_${Date.now()}`,
      type: changeType,
      amount: amt,
      description: changeDesc.trim() || undefined,
    };

    setScenarioChanges([...scenarioChanges, newChange]);
    setChangeAmount('');
    setChangeDesc('');
    setShowAddChange(false);
    showToast('✓ Hypothetical change added to scenario');
  };

  const handleRemoveChange = (id: string) => {
    setScenarioChanges(scenarioChanges.filter((c) => c.id !== id));
  };

  const handleResetScenario = () => {
    setScenarioChanges([]);
    showToast('✓ Scenario reset to baseline financial state');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
            <Compass className="w-3.5 h-3.5" />
            <span>Financial Planning & Strategy Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
            Planning & Scenario Lab
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Cash-flow forecasting, pre-income liquidity pressure, and isolated what-if scenario simulations
          </p>
        </div>
      </div>

      {/* Top 3 Core Planning Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Month-End Cash Projection */}
        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
                Projected Month-End Cash
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold uppercase">
                ESTIMATE
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
              {formatINR(forecast30Days.projectedEndingCash)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Net projected change:{' '}
              <strong
                className={
                  forecast30Days.projectedNetCashChange >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                {forecast30Days.projectedNetCashChange >= 0 ? '+' : ''}
                {formatINR(forecast30Days.projectedNetCashChange)}
              </strong>
            </p>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
            Starting: {formatINR(forecast30Days.startingCash)} • {forecast30Days.confidenceBasis} basis
          </div>
        </div>

        {/* 2. Cash Pressure Before Next Inflow */}
        <div
          className={`border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3 ${
            cashPressure.pressureLevel === 'NEGATIVE'
              ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
              : cashPressure.pressureLevel === 'TIGHT'
              ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60'
              : 'bg-white dark:bg-[#131926] border-[#E5E7EB] dark:border-[#1F2937]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Liquidity Pressure Before Inflow
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  cashPressure.pressureLevel === 'NEGATIVE'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : cashPressure.pressureLevel === 'TIGHT'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {cashPressure.pressureLevel}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
              {formatINR(cashPressure.cashBeforeNextIncome)}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {formatINR(cashPressure.requiredPayments)} payments scheduled before next income ({cashPressure.daysUntilNextIncome} days).
            </p>
          </div>
          <div className="text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-2 flex items-center justify-between">
            <span>Next Inflow: {cashPressure.nextIncomeDate ? formatIndianDate(cashPressure.nextIncomeDate) : 'Pending'}</span>
            <span>+{formatINR(cashPressure.nextIncomeAmount || 21000)}</span>
          </div>
        </div>

        {/* 3. Configurable Minimum Cash Buffer */}
        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
                Minimum Cash Buffer Rule
              </span>
              <button
                onClick={() => setIsEditingBuffer(!isEditingBuffer)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {isEditingBuffer ? 'Close' : 'Configure'}
              </button>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
              {formatINR(state.cashBufferSetting?.minimumCashBuffer ?? 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {summary.availableCash >= (state.cashBufferSetting?.minimumCashBuffer ?? 0) ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Safe: Available cash exceeds buffer by{' '}
                  {formatINR(summary.availableCash - (state.cashBufferSetting?.minimumCashBuffer ?? 0))}
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  ⚠ Deficit: Available cash is{' '}
                  {formatINR((state.cashBufferSetting?.minimumCashBuffer ?? 0) - summary.availableCash)}{' '}
                  below buffer
                </span>
              )}
            </p>
          </div>

          {isEditingBuffer ? (
            <form onSubmit={handleSaveBuffer} className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="number"
                min="0"
                step="500"
                value={bufferInput}
                onChange={(e) => setBufferInput(e.target.value)}
                className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white tabular-nums"
                placeholder="e.g. 5000"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg whitespace-nowrap"
              >
                Save
              </button>
            </form>
          ) : (
            <div className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
              Triggers informational alert if projected balance breaches threshold.
            </div>
          )}
        </div>
      </div>

      {/* Swiggy Operational Shift Bridge & Cash Pressure Solver */}
      <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/40 dark:from-[#1D160E] dark:via-[#201810] dark:to-[#17130F] border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Swiggy Operational Engine • Cash Pressure Solver
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-950 text-amber-900 dark:text-amber-300">
                  {swiggyOperations.monthPlannedShifts} Planned Shifts
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                How upcoming scheduled delivery shifts generate real take-home cash to cover upcoming debt EMIs and living costs
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              planSwiggyShift(
                tomorrow.toISOString().split('T')[0],
                'DINNER',
                16,
                'Planned to bridge cash pressure before next salary'
              );
              showToast('✓ Planned upcoming delivery shift added to bridge liquidity');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition shadow-xs flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Shift to Bridge Gap</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-900/30 text-xs space-y-1">
            <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              Planned Shifts Before Salary
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {swiggyOperations.monthPlannedShifts} Shifts Scheduled
            </div>
            <p className="text-[11px] text-slate-500">
              Anticipated net delivery inflow: <strong className="text-emerald-600">~{formatINR(swiggyOperations.monthPlannedShifts * (swiggyOperations.todayDailyTarget || 700))}</strong>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-900/30 text-xs space-y-1">
            <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              Required Payments Before Inflow
            </span>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {formatINR(cashPressure.requiredPayments)}
            </div>
            <p className="text-[11px] text-slate-500">
              Across {upcomingCommitments.next7Days.length + upcomingCommitments.next14Days.length} scheduled obligations
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-900/30 text-xs space-y-1">
            <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              Delivery Net Coverage
            </span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {cashPressure.requiredPayments > 0
                ? `${Math.min(100, Math.round(((swiggyOperations.monthPlannedShifts * 700 + summary.availableCash) / cashPressure.requiredPayments) * 100))}%`
                : '100%'}
            </div>
            <p className="text-[11px] text-slate-500">
              Available cash + delivery shifts comfortably buffer required outflows
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming Commitments Horizon Breakdown */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
              Upcoming Cash Outflow Horizons
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Required obligations (EMIs, rent, utilities, subscriptions) due over time
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {state.payments.filter((p) => p.status !== 'PAID').length} Active Commitments
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
              <span>Next 7 Days</span>
              <span className="text-rose-600 font-bold">{upcomingCommitments.next7Days.length} due</span>
            </div>
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {formatINR(upcomingCommitments.totalNext7Days)}
            </div>
            <div className="text-[11px] text-slate-500">
              Immediate liquidity required this week.
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
              <span>Next 14 Days</span>
              <span className="font-bold">{upcomingCommitments.next14Days.length} due</span>
            </div>
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {formatINR(upcomingCommitments.totalNext14Days)}
            </div>
            <div className="text-[11px] text-slate-500">
              Cumulative obligations due through mid-month.
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
              <span>Next 30 Days</span>
              <span className="font-bold">{upcomingCommitments.next30Days.length} due</span>
            </div>
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {formatINR(upcomingCommitments.totalNext30Days)}
            </div>
            <div className="text-[11px] text-slate-500">
              Total monthly commitments to service.
            </div>
          </div>
        </div>
      </div>

      {/* Budget Forecasts Summary */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
              Budget Spend Velocity & Month-End Estimates
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Projected month-end spend based on current daily run rates
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetForecasts.slice(0, 6).map((item) => {
            const isOver = item.status === 'PROJECTED_OVER' || item.status === 'OVER_BUDGET';

            return (
              <div
                key={item.categoryId}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.categoryName}
                    </h3>
                    <span className="text-[10px] text-slate-500 uppercase">
                      {item.classification}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isOver
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {isOver ? 'PROJECTED OVER' : 'ON TRACK'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Actual Spent</span>
                    <span className="font-bold tabular-nums">{formatINR(item.actualSpent)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Projected Month-End</span>
                    <span className={`font-bold tabular-nums ${isOver ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                      {formatINR(item.projectedMonthEndSpend)}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Limit: {formatINR(item.budgetLimit)}</span>
                    <span>{item.forecastBasis}</span>
                  </div>
                  <ProgressBar
                    current={item.actualSpent}
                    total={item.budgetLimit}
                    variant={isOver ? 'expense' : 'income'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Scenario Engine & What-If Sandbox */}
      <div className="bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20 dark:from-[#101424] dark:via-[#131926] dark:to-[#171428] border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>What-If Scenario Sandbox</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1.5">
              Hypothetical Financial Simulator
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Simulate changes in income, expenses, or extra loan prepayments without touching your real transactions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetScenario}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Sandbox</span>
            </button>
            <button
              onClick={() => setShowAddChange(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add What-If Change</span>
            </button>
          </div>
        </div>

        {/* Quick Assumptions Presets */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 font-semibold text-[11px]">Quick Scenarios:</span>
          <button
            type="button"
            onClick={() => {
              setScenarioChanges((prev) => [
                ...prev,
                {
                  id: `sw_weekend_${Date.now()}`,
                  type: 'SWIGGY_INCOME',
                  amount: 1400,
                  description: '+2 Weekend Delivery Shifts',
                },
              ]);
              showToast('✓ Added +2 Weekend Delivery Shifts (+₹1,400) to scenario');
            }}
            className="px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 hover:bg-amber-100 transition font-medium flex items-center gap-1"
          >
            <Bike className="w-3 h-3 text-amber-600" />
            <span>+2 Weekend Swiggy Shifts (+₹1,400)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScenarioChanges((prev) => [
                ...prev,
                {
                  id: `sw_dinner_${Date.now()}`,
                  type: 'SWIGGY_INCOME',
                  amount: 2800,
                  description: '+4 Evening Surge Shifts',
                },
              ]);
              showToast('✓ Added +4 Evening Surge Shifts (+₹2,800) to scenario');
            }}
            className="px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 hover:bg-blue-100 transition font-medium flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-blue-600" />
            <span>+4 Evening Shifts (+₹2,800)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScenarioChanges((prev) => [
                ...prev,
                {
                  id: `prepay_${Date.now()}`,
                  type: 'DEBT_PAYMENT_CHANGE',
                  amount: 3000,
                  description: 'Extra Loan Principal Prepayment',
                },
              ]);
              showToast('✓ Added ₹3,000 extra loan prepayment to scenario');
            }}
            className="px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 transition font-medium flex items-center gap-1"
          >
            <TrendingDown className="w-3 h-3 text-emerald-600" />
            <span>+₹3,000 Loan Prepayment</span>
          </button>
        </div>

        {/* Changes List */}
        {scenarioChanges.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Active Scenario Assumptions:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenarioChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        change.type === 'INCOME_CHANGE' || change.type === 'SWIGGY_INCOME'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : change.type === 'DEBT_PAYMENT_CHANGE'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {change.type.replace('_', ' ')}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {change.description || 'Assumption'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                      {change.amount >= 0 ? '+' : ''}
                      {formatINR(change.amount)}
                    </span>
                    <button
                      onClick={() => handleRemoveChange(change.id)}
                      className="text-slate-400 hover:text-rose-600 transition"
                      title="Remove change"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900 text-center text-xs text-slate-500">
            No scenario changes active. Click "Add What-If Change" to model alternative income or spending paths.
          </div>
        )}

        {/* Side-by-Side Comparison: Current Baseline vs. Scenario Result */}
        <div className="pt-4 border-t border-indigo-100 dark:border-indigo-950">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
            Simulated Outcome vs. Baseline:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Projected Ending Cash */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">
                Projected Ending Cash
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {formatINR(scenarioResult.projectedEndingCash)}
              </div>
              <div className="text-xs">
                Variance:{' '}
                <strong
                  className={
                    scenarioResult.differenceFromCurrent.cash >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {scenarioResult.differenceFromCurrent.cash >= 0 ? '+' : ''}
                  {formatINR(scenarioResult.differenceFromCurrent.cash)}
                </strong>
              </div>
            </div>

            {/* Projected Outstanding Debt */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">
                Projected Closing Debt
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {formatINR(scenarioResult.projectedDebt)}
              </div>
              <div className="text-xs">
                Debt Reduction:{' '}
                <strong
                  className={
                    scenarioResult.differenceFromCurrent.debt <= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {formatINR(Math.abs(scenarioResult.differenceFromCurrent.debt))} faster payoff
                </strong>
              </div>
            </div>

            {/* Projected Net Worth */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">
                Projected Net Worth
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {formatINR(scenarioResult.projectedNetWorth)}
              </div>
              <div className="text-xs">
                Net Worth Delta:{' '}
                <strong
                  className={
                    scenarioResult.differenceFromCurrent.netWorth >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {scenarioResult.differenceFromCurrent.netWorth >= 0 ? '+' : ''}
                  {formatINR(scenarioResult.differenceFromCurrent.netWorth)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Change Modal */}
      {showAddChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131926] p-6 shadow-2xl border border-[#E5E7EB] dark:border-[#1F2937]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                Add Hypothetical What-If Change
              </h3>
              <button onClick={() => setShowAddChange(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  CHANGE TYPE
                </label>
                <select
                  value={changeType}
                  onChange={(e) => setChangeType(e.target.value as ScenarioChange['type'])}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                >
                  <option value="INCOME_CHANGE">Income Increase / Decrease (₹)</option>
                  <option value="EXPENSE_CHANGE">Discretionary Expense Reduction / Increase (₹)</option>
                  <option value="DEBT_PAYMENT_CHANGE">Extra Debt Principal Prepayment (₹)</option>
                  <option value="RECURRING_EXPENSE">New Monthly Commitment / Subscription (₹)</option>
                  <option value="SWIGGY_INCOME">Additional Swiggy Shift Earnings (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  AMOUNT (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 3000 (use negative for reduction)"
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white tabular-nums font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  DESCRIPTION (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekend catering gig, Cutting dining out..."
                  value={changeDesc}
                  onChange={(e) => setChangeDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddChange(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Add to Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
