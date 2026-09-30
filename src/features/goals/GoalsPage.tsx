import React, { useState } from 'react';
import { Target, Plus, ShieldCheck, Trophy, Sparkles, X, PlusCircle, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/currency';
import { formatIndianDate } from '../../utils/dates';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Goal } from '../../types/finance';

export const GoalsPage: React.FC = () => {
  const { state, addGoal, updateGoal, deleteGoal } = useFinance();
  const { showToast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  // Form states for new goal
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseFloat(targetAmount);
    const c = parseFloat(currentAmount) || 0;
    if (isNaN(t) || t <= 0) return;

    addGoal({
      name: name.trim(),
      targetAmount: t,
      currentAmount: c,
      targetDate: targetDate || undefined,
      status: 'IN_PROGRESS',
    });

    showToast(`✓ Financial Goal "${name}" added`);
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setTargetDate('');
    setIsAddOpen(false);
  };

  const handleContributeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;
    const addVal = parseFloat(contributeAmount);
    if (isNaN(addVal) || addVal <= 0) return;

    const newCurrent = contributeGoal.currentAmount + addVal;
    updateGoal({
      ...contributeGoal,
      currentAmount: newCurrent,
      status: newCurrent >= contributeGoal.targetAmount ? 'ACHIEVED' : 'IN_PROGRESS',
    });

    showToast(`✓ Added ₹${addVal.toLocaleString('en-IN')} to ${contributeGoal.name}`);
    setContributeGoal(null);
    setContributeAmount('');
  };

  const totalGoalTargets = state.goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalGoalCurrent = state.goals.reduce((sum, g) => sum + g.currentAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
            Financial Goals
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Emergency funds, debt-free milestones, reserve funds, and maintenance targets
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Top Banner */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
              Combined Goal Progress
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
              {formatINR(totalGoalCurrent)}{' '}
              <span className="text-lg font-normal text-slate-500">
                / {formatINR(totalGoalTargets)}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
              {totalGoalTargets > 0 ? Math.round((totalGoalCurrent / totalGoalTargets) * 100) : 0}% achieved across {state.goals.length} target milestones
            </p>
          </div>

          <div className="w-full sm:w-64">
            <ProgressBar
              current={totalGoalCurrent}
              total={totalGoalTargets}
              variant="income"
              heightClass="h-3"
            />
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.goals.map((g) => {
          const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
          const remaining = Math.max(0, g.targetAmount - g.currentAmount);

          return (
            <div
              key={g.id}
              className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                        {g.name}
                      </h3>
                      {g.targetDate && (
                        <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                          Target date: {formatIndianDate(g.targetDate)}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-900 dark:text-white px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 tabular-nums">
                    {pct}%
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatINR(g.currentAmount)}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      Goal: {formatINR(g.targetAmount)}
                    </span>
                  </div>
                  <ProgressBar
                    current={g.currentAmount}
                    total={g.targetAmount}
                    variant={pct >= 100 ? 'income' : 'primary'}
                  />
                  <div className="flex justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-2">
                    <span>{remaining > 0 ? `${formatINR(remaining)} remaining` : 'Goal achieved!'}</span>
                    <span>Status: {g.status}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setDeleteGoalId(g.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  title="Delete Goal"
                  aria-label="Delete Goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setContributeGoal(g)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Funds to Goal</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Funds Modal */}
      {contributeGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#131926] p-6 shadow-2xl border border-[#E5E7EB] dark:border-[#1F2937]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                Fund {contributeGoal.name}
              </h3>
              <button onClick={() => setContributeGoal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleContributeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  AMOUNT TO ADD (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xl font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white tabular-nums"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setContributeGoal(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                >
                  Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Goal Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131926] p-6 shadow-2xl border border-[#E5E7EB] dark:border-[#1F2937]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                Create Financial Goal
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  GOAL TITLE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, Bike Tyres..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    TARGET (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="50000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    CURRENT (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  TARGET COMPLETION DATE
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Goal Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteGoalId}
        title="Delete Financial Goal"
        message="Are you sure you want to delete this financial goal? Target progress and savings allocation trackers will be updated."
        confirmText="Delete Goal"
        isDestructive={true}
        onConfirm={() => {
          if (deleteGoalId) {
            const g = state.goals.find((item) => item.id === deleteGoalId);
            deleteGoal(deleteGoalId);
            showToast(`✓ Goal "${g?.name || ''}" deleted`);
            setDeleteGoalId(null);
          }
        }}
        onCancel={() => setDeleteGoalId(null)}
      />
    </div>
  );
};
