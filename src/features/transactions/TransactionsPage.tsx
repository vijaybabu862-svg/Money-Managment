import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  X,
  Filter,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/currency';
import { formatIndianDate } from '../../utils/dates';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Transaction, TransactionType } from '../../types/finance';

export const TransactionsPage: React.FC = () => {
  const { state, deleteTransaction, updateTransaction } = useFinance();
  const { showToast } = useToast();
  const { openAddModal } = useOutletContext<{ openAddModal: () => void }>() || {};

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const categoryMap = useMemo(() => new Map(state.categories.map((c) => [c.id, c])), [state.categories]);
  const accountMap = useMemo(() => new Map(state.accounts.map((a) => [a.id, a])), [state.accounts]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return state.transactions.filter((tx) => {
      // Type filter
      if (selectedType !== 'ALL' && tx.type !== selectedType) return false;

      // Account filter
      if (
        selectedAccount !== 'ALL' &&
        tx.accountId !== selectedAccount &&
        tx.toAccountId !== selectedAccount
      ) {
        return false;
      }

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const cat = tx.categoryId ? categoryMap.get(tx.categoryId)?.name.toLowerCase() : '';
        const acc = accountMap.get(tx.accountId)?.name.toLowerCase() || '';
        const desc = (tx.description || '').toLowerCase();
        const notes = (tx.notes || '').toLowerCase();

        return (
          desc.includes(query) ||
          notes.includes(query) ||
          cat?.includes(query) ||
          acc.includes(query) ||
          String(tx.amount).includes(query)
        );
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, selectedType, selectedAccount, search, categoryMap, accountMap]);

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteTransaction(deleteId);
      showToast('✓ Transaction deleted');
      setDeleteId(null);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    updateTransaction(editingTx);
    showToast('✓ Transaction updated');
    setEditingTx(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
            Transactions
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Complete ledger of income, expenses, transfers, and debt payments
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by description, category, notes, amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Account Filter */}
          <div className="w-full sm:w-56">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-white"
            >
              <option value="ALL">All Accounts</option>
              {state.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Transaction Type Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 dark:text-slate-500 mr-2 flex items-center gap-1 flex-shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'EXPENSE', label: 'Expenses' },
            { id: 'INCOME', label: 'Income' },
            { id: 'TRANSFER', label: 'Transfers' },
            { id: 'DEBT_PAYMENT', label: 'Debt Payments' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex-shrink-0 ${
                selectedType === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="Try changing your search keywords or active filter criteria."
            actionText="Add Transaction"
            onAction={openAddModal}
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTransactions.map((tx) => {
              const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
              const sourceAcc = accountMap.get(tx.accountId);
              const destAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : undefined;
              const isIncome = tx.type === 'INCOME';
              const isTransfer = tx.type === 'TRANSFER';
              const isDebt = tx.type === 'DEBT_PAYMENT';

              return (
                <div
                  key={tx.id}
                  className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition group"
                >
                  {/* Left: Icon & Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isIncome
                          ? 'bg-emerald-50 text-[#16A34A] dark:bg-emerald-950/40'
                          : isTransfer
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40'
                          : isDebt
                          ? 'bg-orange-50 text-[#EA580C] dark:bg-orange-950/40'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <CategoryIcon name={cat?.icon || (isTransfer ? 'ArrowRightLeft' : isDebt ? 'CreditCard' : 'Receipt')} />
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6] truncate">
                        {tx.description || cat?.name || tx.type}
                      </div>

                      <div className="flex items-center flex-wrap gap-1.5 text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                        <span>{formatIndianDate(tx.date)}</span>
                        <span>·</span>
                        {isTransfer && destAcc ? (
                          <span>{sourceAcc?.name} → {destAcc.name}</span>
                        ) : (
                          <span>{sourceAcc?.name || 'Account'}</span>
                        )}
                        {cat && (
                          <>
                            <span>·</span>
                            <span>{cat.name}</span>
                          </>
                        )}
                        {tx.principalAmount && tx.interestAmount ? (
                          <>
                            <span>·</span>
                            <span className="text-orange-600 dark:text-orange-400">
                              P: ₹{tx.principalAmount} | I: ₹{tx.interestAmount}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-base font-bold tabular-nums ${
                          isIncome
                            ? 'text-[#16A34A]'
                            : isTransfer
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-[#111827] dark:text-[#F3F4F6]'
                        }`}
                      >
                        {isIncome ? `+${formatINR(tx.amount)}` : isTransfer ? formatINR(tx.amount) : `-${formatINR(tx.amount)}`}
                      </div>
                      <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                        {tx.source}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 transition">
                      <button
                        onClick={() => setEditingTx(tx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit transaction"
                        aria-label="Edit transaction"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(tx.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete transaction"
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This will permanently update account balances and financial reports."
        confirmText="Delete"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

      {/* Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131926] p-6 shadow-2xl border border-[#E5E7EB] dark:border-[#1F2937]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                Edit Transaction
              </h3>
              <button onClick={() => setEditingTx(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  AMOUNT (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editingTx.amount}
                  onChange={(e) =>
                    setEditingTx({ ...editingTx, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 text-lg font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  DESCRIPTION
                </label>
                <input
                  type="text"
                  value={editingTx.description || ''}
                  onChange={(e) =>
                    setEditingTx({ ...editingTx, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  DATE
                </label>
                <input
                  type="date"
                  required
                  value={editingTx.date}
                  onChange={(e) =>
                    setEditingTx({ ...editingTx, date: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  NOTES
                </label>
                <input
                  type="text"
                  value={editingTx.notes || ''}
                  onChange={(e) =>
                    setEditingTx({ ...editingTx, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
