import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, ArrowRightLeft, CreditCard, Bike } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { TransactionType } from '../../types/finance';
import { getCurrentDateISO } from '../../utils/dates';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransactionType | 'SWIGGY';
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'EXPENSE',
}) => {
  const { state, addTransaction, recordDebtPayment, addSwiggyEarning } = useFinance();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TransactionType | 'SWIGGY'>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getCurrentDateISO());
  const [accountId, setAccountId] = useState<string>(state.accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState<string>(state.accounts[1]?.id || '');
  const [categoryId, setCategoryId] = useState<string>('');
  const [debtId, setDebtId] = useState<string>(state.debts[0]?.id || '');
  const [principalAmount, setPrincipalAmount] = useState<string>('');
  const [interestAmount, setInterestAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [swiggyOrders, setSwiggyOrders] = useState<string>('');
  const [swiggyHours, setSwiggyHours] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  // Filter categories by type
  const availableCategories = state.categories.filter((cat) => {
    if (activeTab === 'INCOME') return cat.type === 'INCOME' && cat.active;
    if (activeTab === 'EXPENSE') return cat.type === 'EXPENSE' && cat.active;
    return false;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }

    if (!accountId) {
      setError('Please select an account');
      return;
    }

    if (activeTab === 'TRANSFER') {
      if (!toAccountId) {
        setError('Please select a destination account');
        return;
      }
      if (accountId === toAccountId) {
        setError('Source and destination accounts must be different');
        return;
      }

      addTransaction({
        date,
        amount: parsedAmount,
        type: 'TRANSFER',
        accountId,
        toAccountId,
        description: description.trim() || 'Account Transfer',
        notes: notes.trim(),
        source: 'MANUAL',
        verificationStatus: 'CONFIRMED',
      });

      showToast(`✓ Transferred ₹${parsedAmount.toLocaleString('en-IN')}`);
      resetAndClose();
      return;
    }

    if (activeTab === 'SWIGGY') {
      const orders = parseInt(swiggyOrders, 10) || 0;
      const hours = parseFloat(swiggyHours) || 0;

      addSwiggyEarning({
        date,
        amount: parsedAmount,
        orders,
        hoursWorked: hours,
        source: 'MANUAL',
        notes: notes.trim() || description.trim(),
      });

      showToast(`✓ Swiggy earning of ₹${parsedAmount.toLocaleString('en-IN')} added`);
      resetAndClose();
      return;
    }

    if (activeTab === 'DEBT_PAYMENT') {
      if (!debtId) {
        setError('Please select a loan or credit card debt to pay');
        return;
      }

      const pAmount = parseFloat(principalAmount) || 0;
      const iAmount = parseFloat(interestAmount) || 0;

      if (pAmount + iAmount <= 0) {
        setError('Please specify principal and/or interest portions of EMI');
        return;
      }

      recordDebtPayment({
        debtId,
        accountId,
        amount: parsedAmount,
        principalAmount: pAmount,
        interestAmount: iAmount,
        date,
        notes: notes.trim() || description.trim(),
      });

      showToast(`✓ Recorded debt payment of ₹${parsedAmount.toLocaleString('en-IN')}`);
      resetAndClose();
      return;
    }

    // Standard INCOME or EXPENSE
    const selectedCat = categoryId || availableCategories[0]?.id;

    addTransaction({
      date,
      amount: parsedAmount,
      type: activeTab,
      accountId,
      categoryId: selectedCat,
      description: description.trim() || (activeTab === 'INCOME' ? 'Income' : 'Expense'),
      notes: notes.trim(),
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
    });

    showToast(`✓ ${activeTab === 'INCOME' ? 'Income' : 'Expense'} added: ₹${parsedAmount.toLocaleString('en-IN')}`);
    resetAndClose();
  };

  const resetAndClose = () => {
    setAmount('');
    setDescription('');
    setNotes('');
    setPrincipalAmount('');
    setInterestAmount('');
    setSwiggyOrders('');
    setSwiggyHours('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#131926] shadow-2xl border border-[#E5E7EB] dark:border-[#1F2937] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#1F2937]">
          <h2 className="text-lg font-bold text-[#111827] dark:text-[#F3F4F6]">
            Add Transaction
          </h2>
          <button
            onClick={resetAndClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Type Segmented Control */}
        <div className="p-4 bg-slate-50 dark:bg-[#0B0F17] border-b border-[#E5E7EB] dark:border-[#1F2937]">
          <div className="grid grid-cols-5 gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setActiveTab('EXPENSE'); setError(''); }}
              className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg transition ${
                activeTab === 'EXPENSE'
                  ? 'bg-white dark:bg-[#131926] text-[#DC2626] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('INCOME'); setError(''); }}
              className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg transition ${
                activeTab === 'INCOME'
                  ? 'bg-white dark:bg-[#131926] text-[#16A34A] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Income</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('TRANSFER'); setError(''); }}
              className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg transition ${
                activeTab === 'TRANSFER'
                  ? 'bg-white dark:bg-[#131926] text-blue-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('DEBT_PAYMENT'); setError(''); }}
              className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg transition ${
                activeTab === 'DEBT_PAYMENT'
                  ? 'bg-white dark:bg-[#131926] text-[#EA580C] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>EMI</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('SWIGGY'); setError(''); }}
              className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg transition ${
                activeTab === 'SWIGGY'
                  ? 'bg-white dark:bg-[#131926] text-amber-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Swiggy</span>
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
              AMOUNT (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="any"
                required
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  // Auto fill principal/interest for debt payment if EMI matches
                  if (activeTab === 'DEBT_PAYMENT' && !principalAmount) {
                    const val = parseFloat(e.target.value) || 0;
                    const estInterest = Math.round(val * 0.15);
                    setInterestAmount(String(estInterest));
                    setPrincipalAmount(String(Math.max(0, val - estInterest)));
                  }
                }}
                className="w-full pl-11 pr-4 py-3 text-2xl font-bold rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#0B0F17] text-[#111827] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white tabular-nums"
              />
            </div>
          </div>

          {/* Debt Split Fields for DEBT_PAYMENT */}
          {activeTab === 'DEBT_PAYMENT' && (
            <div className="p-4 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 space-y-3">
              <div className="text-xs font-semibold text-orange-900 dark:text-orange-300 flex items-center justify-between">
                <span>Principal & Interest Split</span>
                <span className="font-normal text-orange-700 dark:text-orange-400">No double counting</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Principal (Debt reduction)
                  </label>
                  <input
                    type="number"
                    placeholder="₹0"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Interest (Cost expense)
                  </label>
                  <input
                    type="number"
                    placeholder="₹0"
                    value={interestAmount}
                    onChange={(e) => setInterestAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Select Loan Account
                </label>
                <select
                  value={debtId}
                  onChange={(e) => setDebtId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {state.debts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (Outstanding: ₹{d.outstandingPrincipal.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Swiggy Fields */}
          {activeTab === 'SWIGGY' && (
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Orders Delivered
                </label>
                <input
                  type="number"
                  placeholder="e.g. 14"
                  value={swiggyOrders}
                  onChange={(e) => setSwiggyOrders(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Hours Worked
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 5"
                  value={swiggyHours}
                  onChange={(e) => setSwiggyHours(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white tabular-nums"
                />
              </div>
            </div>
          )}

          {/* Account & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
                {activeTab === 'TRANSFER' ? 'FROM ACCOUNT' : 'ACCOUNT'} <span className="text-rose-500">*</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#0B0F17] text-[#111827] dark:text-[#F3F4F6]"
              >
                {state.accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>

            {activeTab === 'TRANSFER' ? (
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
                  TO ACCOUNT <span className="text-rose-500">*</span>
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#0B0F17] text-[#111827] dark:text-[#F3F4F6]"
                >
                  {state.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === accountId}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>
            ) : activeTab === 'INCOME' || activeTab === 'EXPENSE' ? (
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
                  CATEGORY <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#0B0F17] text-[#111827] dark:text-[#F3F4F6]"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.classification})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {/* Date & Description Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
                DATE <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#0B0F17] text-[#111827] dark:text-[#F3F4F6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
                DESCRIPTION
              </label>
              <input
                type="text"
                placeholder="e.g. Grocery store, Bike fuel..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#0B0F17] text-[#111827] dark:text-[#F3F4F6]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
              NOTES (OPTIONAL)
            </label>
            <input
              type="text"
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#0B0F17] text-[#111827] dark:text-[#F3F4F6]"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB] dark:border-[#1F2937]">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition shadow-xs"
            >
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
