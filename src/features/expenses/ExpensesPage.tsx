import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/currency';
import { EssentialExpenseItem } from '../../types/finance';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Home,
  Zap,
  Flame,
  Droplet,
  Car,
  Phone,
  HeartPulse,
  Wrench,
  HelpCircle,
  X,
  Save,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SUGGESTED_EXPENSE_TYPES = [
  { name: 'Rent', icon: Home, defaultCategory: 'Rent' },
  { name: 'Groceries', icon: ShoppingBag, defaultCategory: 'Groceries' },
  { name: 'Vegetables', icon: ShoppingBag, defaultCategory: 'Vegetables' },
  { name: 'Fuel', icon: Car, defaultCategory: 'Fuel' },
  { name: 'Electricity', icon: Zap, defaultCategory: 'Electricity' },
  { name: 'Gas', icon: Flame, defaultCategory: 'Gas' },
  { name: 'Water', icon: Droplet, defaultCategory: 'Water' },
  { name: 'Phone & Internet', icon: Phone, defaultCategory: 'Phone' },
  { name: 'Medical', icon: HeartPulse, defaultCategory: 'Medical' },
  { name: 'Vehicle Maintenance', icon: Wrench, defaultCategory: 'Vehicle maintenance' },
  { name: 'Other', icon: HelpCircle, defaultCategory: 'Other' },
];

export const ExpensesPage: React.FC = () => {
  const { essentialExpenses, addEssentialExpense, updateEssentialExpense, deleteEssentialExpense, centralPosition } = useFinance();
  const { showToast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<EssentialExpenseItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Rent');
  const [notes, setNotes] = useState('');

  const handleOpenAdd = (suggestedName?: string) => {
    setName(suggestedName || '');
    setCategory(suggestedName || 'Other');
    setAmount('');
    setNotes('');
    setEditingItem(null);
    setIsAdding(true);
  };

  const handleOpenEdit = (item: EssentialExpenseItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category || 'Other');
    setAmount(String(item.amount));
    setNotes(item.notes || '');
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(amount);
    if (!name.trim()) {
      showToast('Please enter an expense name', 'error');
      return;
    }
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      showToast('Please enter a valid expense amount', 'error');
      return;
    }

    if (editingItem) {
      updateEssentialExpense({
        ...editingItem,
        name: name.trim(),
        category,
        amount: parsedAmt,
        notes: notes.trim() || undefined,
      });
      showToast(`✓ Updated "${name.trim()}" to ${formatINR(parsedAmt)}`);
    } else {
      addEssentialExpense({
        name: name.trim(),
        category,
        amount: parsedAmt,
        notes: notes.trim() || undefined,
      });
      showToast(`✓ Added "${name.trim()}" for ${formatINR(parsedAmt)}/month`);
    }

    setIsAdding(false);
    setEditingItem(null);
  };

  const handleDelete = (id: string, expName: string) => {
    deleteEssentialExpense(id);
    showToast(`✓ Removed "${expName}"`);
  };

  const totalExpenses = centralPosition.totalEssentialExpenses;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Essential Living Expenses
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fixed monthly living costs (Rent, Groceries, Electricity, Fuel, etc.) separate from loan EMIs
          </p>
        </div>

        <button
          onClick={() => handleOpenAdd()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Summary Banner */}
      <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Monthly Essential Expenses
          </span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
            {formatINR(totalExpenses)}
            <span className="text-xs font-normal text-slate-400 ml-1.5">/ month</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Across {essentialExpenses.length} tracked monthly essentials
          </p>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-300 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
          <div>
            Total EMIs: <strong>{formatINR(centralPosition.totalMonthlyEMI)}</strong>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Combined Monthly Outgoing: <strong>{formatINR(centralPosition.totalMonthlyOutgoing)}</strong>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-2xl bg-white dark:bg-[#131926] border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingItem ? 'Edit Essential Expense' : 'Add Monthly Essential Expense'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingItem(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expense Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. House Rent, Groceries, Electricity"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Monthly Amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="8000"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden"
              >
                {SUGGESTED_EXPENSE_TYPES.map((t) => (
                  <option key={t.name} value={t.defaultCategory}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid to landlord on 1st"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingItem(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{editingItem ? 'Save Changes' : 'Add Expense'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Quick Add Suggestions if empty or few */}
      <div className="p-4 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
          Quick Add Common Essentials
        </span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_EXPENSE_TYPES.map((t) => {
            const Icon = t.icon;
            const alreadyAdded = essentialExpenses.some(
              (e) => (e.name || '').toLowerCase() === t.name.toLowerCase()
            );
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => handleOpenAdd(t.name)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  alreadyAdded
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    : 'bg-white dark:bg-[#131926] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.name}</span>
                {alreadyAdded && <span className="text-[10px] text-emerald-600 font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Tracked Essential Expenses ({essentialExpenses.length})
          </h2>
          <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
            Total: {formatINR(totalExpenses)}
          </span>
        </div>

        {essentialExpenses.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-2 stroke-1 opacity-50" />
            <p className="text-sm">No essential expenses added yet.</p>
            <button
              onClick={() => handleOpenAdd()}
              className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add your first essential expense (e.g. Rent)
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {essentialExpenses.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
              >
                <div className="min-w-0 pr-4">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <span>{item.name}</span>
                    {item.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        {item.category}
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {item.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-extrabold text-slate-900 dark:text-white tabular-nums text-base">
                      {formatINR(item.amount)}
                    </div>
                    <span className="text-[10px] text-slate-400">per month</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      title="Edit expense"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      title="Delete expense"
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div className="flex justify-between items-center pt-2">
        <Link
          to="/loans"
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          ← Review Loan EMIs
        </Link>
        <Link
          to="/cash-flow"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          <span>Calculate Monthly Cash Flow</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
