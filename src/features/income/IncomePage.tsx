import React, { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, Plus, Briefcase, Bike, Wallet } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { MoneyCard } from '../../components/ui/MoneyCard';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { formatINR } from '../../utils/currency';
import { formatIndianDate, getCurrentMonthKey } from '../../utils/dates';
import { EmptyState } from '../../components/ui/EmptyState';

export const IncomePage: React.FC = () => {
  const { state, summary } = useFinance();
  const { openAddModal } = useOutletContext<{ openAddModal: () => void }>() || {};

  const currentMonth = getCurrentMonthKey();

  // Filter income transactions for current month
  const monthlyIncomes = useMemo(() => {
    return state.transactions
      .filter((tx) => tx.type === 'INCOME' && tx.date.startsWith(currentMonth))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, currentMonth]);

  // Breakdown by sources
  const salaryTotal = monthlyIncomes
    .filter((tx) => (tx.description || '').toLowerCase().includes('salary') || tx.categoryId === 'cat_salary')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const swiggyTotal = monthlyIncomes
    .filter((tx) => (tx.description || '').toLowerCase().includes('swiggy') || tx.categoryId === 'cat_swiggy_inc')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const otherTotal = monthlyIncomes
    .filter(
      (tx) =>
        !(tx.description || '').toLowerCase().includes('salary') &&
        !(tx.description || '').toLowerCase().includes('swiggy') &&
        tx.categoryId !== 'cat_salary' &&
        tx.categoryId !== 'cat_swiggy_inc'
    )
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
            Income
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Tracking primary salary, Swiggy daily delivery earnings, and side revenues
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Income</span>
        </button>
      </div>

      {/* Prominent Money Card */}
      <MoneyCard
        label="TOTAL INCOME THIS MONTH"
        amount={summary.totalIncome}
        subtext="Combined earned income from all active revenue channels"
        semanticColor="income"
      />

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Company Salary"
          amount={salaryTotal}
          subtitle="Fixed monthly direct credit"
          icon={<Briefcase className="w-4 h-4 text-[#16A34A]" />}
          variant="income"
        />
        <SummaryCard
          title="Swiggy Earnings"
          amount={swiggyTotal}
          subtitle="Shift deliveries & rain surges"
          icon={<Bike className="w-4 h-4 text-amber-600" />}
          variant="income"
        />
        <SummaryCard
          title="Other Income"
          amount={otherTotal}
          subtitle="Freelance / bonuses / gifts"
          icon={<Wallet className="w-4 h-4 text-blue-600" />}
          variant="income"
        />
      </div>

      {/* Income Records List */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs">
        <h3 className="text-base font-semibold text-[#111827] dark:text-[#F3F4F6] mb-4">
          Income Ledger ({monthlyIncomes.length} records)
        </h3>

        {monthlyIncomes.length === 0 ? (
          <EmptyState
            title="No income recorded this month"
            description="Log your salary or Swiggy payouts to keep your available cash and reports accurate."
            actionText="Record Income"
            onAction={openAddModal}
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthlyIncomes.map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl px-2 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
                      {tx.description || 'Income Credit'}
                    </div>
                    <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF] flex items-center gap-2">
                      <span>{formatIndianDate(tx.date)}</span>
                      {tx.notes && (
                        <>
                          <span>·</span>
                          <span>{tx.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-[#16A34A] tabular-nums">
                    +{formatINR(tx.amount)}
                  </div>
                  <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                    {state.accounts.find((a) => a.id === tx.accountId)?.name || 'Bank'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
