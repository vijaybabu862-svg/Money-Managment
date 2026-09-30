import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Calendar,
  CreditCard,
  TrendingUp,
  Target,
  Bike,
  Filter,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { FinancialMilestone } from '../../types/finance';
import { formatINR } from '../../utils/currency';

export const FinancialTimelinePage: React.FC = () => {
  const { financialMilestones, debtProjections, goalProjections, state } = useFinance();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // 'ALL' | 'ACHIEVED' | 'PROJECTED'

  // Combine milestones and projected events
  const allEvents: FinancialMilestone[] = [...financialMilestones];

  // Add individual debt completions
  for (const d of debtProjections.debts) {
    if (d.estimatedCompletionDate) {
      allEvents.push({
        id: `event_debt_${d.debtId}`,
        title: `${d.debtName} Debt-Free Horizon`,
        date: d.estimatedCompletionDate,
        type: 'DEBT',
        status: 'PROJECTED',
        amount: d.currentBalance,
        description: `Projected final payoff of ${d.debtName} at ${formatINR(d.emiAmount)}/month scheduled repayment.`,
      });
    }
  }

  // Add goal completions
  for (const g of goalProjections) {
    if (g.projectedCompletionDate) {
      allEvents.push({
        id: `event_goal_${g.goalId}`,
        title: `Goal Horizon: ${g.name}`,
        date: g.projectedCompletionDate,
        type: 'GOAL',
        status: 'PROJECTED',
        amount: g.targetAmount,
        description: `Projected completion date based on ${formatINR(g.monthlyContribution || 0)}/month contribution rate.`,
      });
    }
  }

  // Deduplicate by ID
  const uniqueEvents = Array.from(new Map(allEvents.map((e) => [e.id, e])).values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filteredEvents = uniqueEvents.filter((e) => {
    if (filterStatus !== 'ALL' && e.status !== filterStatus) return false;
    if (filterType !== 'ALL' && e.type !== filterType) return false;
    return true;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'INCOME':
        return <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'DEBT':
        return <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case 'GOAL':
        return <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'SWIGGY':
        return <Bike className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Financial Events & Milestone Timeline
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
              Stage 7
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Historical achievements and forward-looking financial milestone projections with strict state separation.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60">
            {(['ALL', 'ACHIEVED', 'PROJECTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterStatus === s
                    ? 'bg-white dark:bg-[#131926] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {s === 'ALL' ? 'All Events' : s === 'ACHIEVED' ? 'Historical' : 'Projected'}
              </button>
            ))}
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">All Categories</option>
            <option value="INCOME">Income & Salary</option>
            <option value="DEBT">Debt Amortization</option>
            <option value="GOAL">Financial Goals</option>
            <option value="SWIGGY">Swiggy Milestones</option>
          </select>
        </div>
      </div>

      {/* Timeline List */}
      <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 sm:ml-6 space-y-6 py-2">
        {filteredEvents.map((evt) => {
          const isAchieved = evt.status === 'ACHIEVED';
          return (
            <div key={evt.id} className="relative pl-6 sm:pl-8">
              {/* Timeline Node Dot */}
              <div
                className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-[#131926] ${
                  isAchieved ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-blue-500 ring-2 ring-blue-500/20'
                }`}
              />

              <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                      {getEventIcon(evt.type)}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {evt.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        isAchieved
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {evt.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {new Date(evt.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {evt.description}
                </p>

                {evt.amount !== undefined && (
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Associated Value</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatINR(evt.amount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
