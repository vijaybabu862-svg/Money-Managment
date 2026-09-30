import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Plus,
  X,
  Edit3,
  Table,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/currency';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Budget } from '../../types/finance';
import { getCurrentMonthKey } from '../../utils/dates';

export const BudgetPage: React.FC = () => {
  const { categorySpending, state, addBudget, updateBudget, deleteBudget } = useFinance();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('TABLE');
  const [filterType, setFilterType] = useState<'ALL' | 'ESSENTIAL' | 'DISCRETIONARY' | 'OVER_BUDGET'>('ALL');
  const [editingBudget, setEditingBudget] = useState<{ categoryId: string; limit: number; budgetId?: string; name: string } | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [deleteBudgetId, setDeleteBudgetId] = useState<{ id: string; name: string } | null>(null);

  const currentMonth = getCurrentMonthKey();

  const handleEditClick = (categoryId: string, categoryName: string, currentLimit?: number) => {
    const existing = state.budgets.find((b) => b.categoryId === categoryId && b.month === currentMonth);
    setEditingBudget({
      categoryId,
      name: categoryName,
      limit: currentLimit || 3000,
      budgetId: existing?.id,
    });
    setLimitInput(String(currentLimit || 3000));
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;

    const limit = parseFloat(limitInput);
    if (isNaN(limit) || limit <= 0) return;

    if (editingBudget.budgetId) {
      updateBudget({
        id: editingBudget.budgetId,
        categoryId: editingBudget.categoryId,
        month: currentMonth,
        limit,
      });
      showToast(`✓ Budget limit for "${editingBudget.name}" updated to ₹${limit.toLocaleString('en-IN')}`);
    } else {
      addBudget({
        categoryId: editingBudget.categoryId,
        month: currentMonth,
        limit,
      });
      showToast(`✓ Budget limit for "${editingBudget.name}" set to ₹${limit.toLocaleString('en-IN')}`);
    }

    setEditingBudget(null);
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categorySpending.filter((c) => {
      if (filterType === 'ESSENTIAL') return c.classification === 'ESSENTIAL';
      if (filterType === 'DISCRETIONARY') return c.classification === 'DISCRETIONARY';
      if (filterType === 'OVER_BUDGET') {
        return c.budgetLimit !== undefined && c.totalSpent > c.budgetLimit;
      }
      return true;
    });
  }, [categorySpending, filterType]);

  const totalBudgeted = categorySpending
    .filter((c) => c.budgetLimit)
    .reduce((sum, c) => sum + (c.budgetLimit || 0), 0);

  const totalSpentInBudgeted = categorySpending
    .filter((c) => c.budgetLimit)
    .reduce((sum, c) => sum + c.totalSpent, 0);

  const totalOverspent = categorySpending
    .filter((c) => c.budgetLimit && c.totalSpent > c.budgetLimit)
    .reduce((sum, c) => sum + (c.totalSpent - c.budgetLimit!), 0);

  const totalRemaining = Math.max(0, totalBudgeted - totalSpentInBudgeted);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
            Budgets & Spending Caps
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Category allocation limits, actual spend vs budget variances, and over-budget warnings
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('TABLE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'TABLE'
                ? 'bg-white dark:bg-[#131926] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Budget vs Actual Table</span>
          </button>
          <button
            onClick={() => setViewMode('CARDS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'CARDS'
                ? 'bg-white dark:bg-[#131926] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Card Grid</span>
          </button>
        </div>
      </div>

      {/* Top Banner KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
              Overall Budget Consumed
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
              {formatINR(totalSpentInBudgeted)}{' '}
              <span className="text-sm font-normal text-slate-500">
                / {formatINR(totalBudgeted)}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar
              current={totalSpentInBudgeted}
              total={totalBudgeted}
              variant={totalSpentInBudgeted > totalBudgeted ? 'expense' : 'income'}
            />
            <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-1 tabular-nums">
              {totalBudgeted > 0 ? Math.round((totalSpentInBudgeted / totalBudgeted) * 100) : 0}% of allocated budget consumed
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Available Remaining Budget
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
            {formatINR(totalRemaining)}
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1.5">
            Safe spending buffer remaining across all set categories
          </p>
        </div>

        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Over-Budget Variance
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-1">
            {totalOverspent > 0 ? `+${formatINR(totalOverspent)}` : '₹0'}
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1.5">
            {totalOverspent > 0 ? 'Exceeded across over-limit categories' : 'All categories currently within allocated limits'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'ALL', label: 'All Categories' },
          { id: 'ESSENTIAL', label: 'Essential' },
          { id: 'DISCRETIONARY', label: 'Discretionary' },
          { id: 'OVER_BUDGET', label: 'Over Budget Only' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as typeof filterType)}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
              filterType === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Detailed Budget vs Actual Table View */}
      {viewMode === 'TABLE' ? (
        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-[#1F2937] bg-slate-50/50 dark:bg-slate-900/30 text-[11px] font-bold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-4 text-right">Budget (₹)</th>
                  <th className="py-3.5 px-4 text-right">Actual Spent (₹)</th>
                  <th className="py-3.5 px-4 text-right">Variance (₹)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 w-40">Utilization</th>
                  <th className="py-3.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1F2937] text-xs">
                {filteredCategories.map((cat) => {
                  const hasBudget = cat.budgetLimit !== undefined && cat.budgetLimit > 0;
                  const limit = cat.budgetLimit || 0;
                  const spent = cat.totalSpent;
                  const diff = hasBudget ? limit - spent : 0;
                  const pct = cat.percentageUsed || 0;

                  const isOver = hasBudget && spent > limit;
                  const isCaution = hasBudget && !isOver && pct >= 80;

                  return (
                    <tr
                      key={cat.categoryId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Category */}
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                            <CategoryIcon name={cat.icon} />
                          </div>
                          <span>{cat.categoryName}</span>
                        </div>
                      </td>

                      {/* Classification */}
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {cat.classification}
                        </span>
                      </td>

                      {/* Budget */}
                      <td className="py-3 px-4 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                        {hasBudget ? formatINR(limit) : <span className="text-slate-400">Not set</span>}
                      </td>

                      {/* Actual */}
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatINR(spent)}
                      </td>

                      {/* Variance */}
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
                        {hasBudget ? (
                          isOver ? (
                            <span className="text-rose-600 dark:text-rose-400">
                              +{formatINR(Math.abs(diff))} over
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {formatINR(diff)} left
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {hasBudget ? (
                          isOver ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              <AlertCircle className="w-3 h-3" />
                              Exceeded
                            </span>
                          ) : isCaution ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <AlertTriangle className="w-3 h-3" />
                              Caution
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              On Track
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Uncapped</span>
                        )}
                      </td>

                      {/* Utilization Bar */}
                      <td className="py-3 px-4">
                        {hasBudget ? (
                          <div className="w-full">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1 tabular-nums">
                              <span>{pct}%</span>
                            </div>
                            <ProgressBar
                              current={spent}
                              total={limit}
                              variant={isOver ? 'expense' : isCaution ? 'warning' : 'income'}
                              heightClass="h-2"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(cat.categoryId, cat.categoryName, cat.budgetLimit)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                          >
                            {hasBudget ? 'Edit' : 'Set Cap'}
                          </button>
                          {hasBudget && (
                            <button
                              onClick={() => {
                                const b = state.budgets.find((bg) => bg.categoryId === cat.categoryId && bg.month === currentMonth);
                                if (b) setDeleteBudgetId({ id: b.id, name: cat.categoryName });
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                              title="Delete budget cap"
                              aria-label="Delete budget cap"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCategories.map((cat) => {
            const hasBudget = cat.budgetLimit !== undefined && cat.budgetLimit > 0;
            const remaining = hasBudget ? cat.budgetLimit! - cat.totalSpent : 0;
            const pct = cat.percentageUsed || 0;

            return (
              <div
                key={cat.categoryId}
                className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center flex-shrink-0">
                        <CategoryIcon name={cat.icon} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
                          {cat.categoryName}
                        </h3>
                        <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] uppercase font-semibold">
                          {cat.classification}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(cat.categoryId, cat.categoryName, cat.budgetLimit)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Set or update budget limit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {hasBudget && (
                        <button
                          onClick={() => {
                            const b = state.budgets.find((bg) => bg.categoryId === cat.categoryId && bg.month === currentMonth);
                            if (b) setDeleteBudgetId({ id: b.id, name: cat.categoryName });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          title="Delete budget cap"
                          aria-label="Delete budget cap"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Actual</span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                        {formatINR(cat.totalSpent)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Budget</span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                        {hasBudget ? formatINR(cat.budgetLimit!) : 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Remaining</span>
                      <span
                        className={`font-bold tabular-nums text-sm ${
                          remaining < 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'
                        }`}
                      >
                        {hasBudget ? (remaining < 0 ? `-${formatINR(Math.abs(remaining))}` : formatINR(remaining)) : '-'}
                      </span>
                    </div>
                  </div>

                  {hasBudget ? (
                    <div className="mt-4">
                      <ProgressBar
                        current={cat.totalSpent}
                        total={cat.budgetLimit!}
                        variant={pct >= 100 ? 'expense' : pct >= 80 ? 'warning' : 'income'}
                      />
                      <div className="flex justify-between text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-1.5 tabular-nums font-medium">
                        <span>{pct}% used</span>
                        <span className={remaining < 0 ? 'text-rose-600 font-bold' : ''}>
                          {remaining >= 0 ? `${formatINR(remaining)} left` : 'Over budget'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 italic">
                      No budget cap configured for this category.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Budget Limit Modal */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#131926] p-6 shadow-2xl border border-[#E5E7EB] dark:border-[#1F2937]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                Set Budget Limit
              </h3>
              <button
                onClick={() => setEditingBudget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  CATEGORY
                </label>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {editingBudget.name}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  MONTHLY LIMIT (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  step="100"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  className="w-full px-3 py-2 text-lg font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white tabular-nums"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {editingBudget.budgetId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const id = editingBudget.budgetId!;
                      const name = editingBudget.name;
                      setEditingBudget(null);
                      setDeleteBudgetId({ id, name });
                    }}
                    className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
                  >
                    Remove Cap
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingBudget(null)}
                    className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
                  >
                    Save Limit
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Budget Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteBudgetId}
        title="Remove Budget Cap"
        message={`Are you sure you want to remove the monthly budget cap for "${deleteBudgetId?.name || ''}"? Over-budget warnings for this category will be deactivated.`}
        confirmText="Remove Cap"
        isDestructive={true}
        onConfirm={() => {
          if (deleteBudgetId) {
            deleteBudget(deleteBudgetId.id);
            showToast(`✓ Budget cap for "${deleteBudgetId.name}" removed`);
            setDeleteBudgetId(null);
          }
        }}
        onCancel={() => setDeleteBudgetId(null)}
      />
    </div>
  );
};
