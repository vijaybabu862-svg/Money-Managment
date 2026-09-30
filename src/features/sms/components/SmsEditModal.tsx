import React, { useState } from 'react';
import {
  SmsTransactionCandidate,
  SmsCandidateType,
} from '../../../types/finance';
import { useFinance } from '../../../context/FinanceContext';
import { X, CheckCircle2, ArrowRight } from 'lucide-react';

interface SmsEditModalProps {
  candidate: SmsTransactionCandidate;
  isOpen: boolean;
  onClose: () => void;
  onSaveAndConfirm: (overrides: {
    amount: number;
    date: string;
    type: SmsCandidateType;
    accountId: string;
    categoryId: string;
    debtId?: string;
    description: string;
    notes?: string;
    principalAmount?: number;
    interestAmount?: number;
  }) => void;
}

export const SmsEditModal: React.FC<SmsEditModalProps> = ({
  candidate,
  isOpen,
  onClose,
  onSaveAndConfirm,
}) => {
  const { state } = useFinance();

  const [amount, setAmount] = useState(candidate.detectedAmount ? String(candidate.detectedAmount) : '');
  const [date, setDate] = useState(candidate.detectedTransactionDate || new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<SmsCandidateType>(candidate.transactionType === 'UNKNOWN' ? 'EXPENSE' : candidate.transactionType);

  const initialAccount =
    candidate.matchedAccountId ||
    (candidate.detectedCardReference && state.accounts.find((a) => a.type === 'CREDIT_CARD')?.id) ||
    state.accounts[0]?.id ||
    '';
  const [accountId, setAccountId] = useState(initialAccount);

  const initialCat =
    candidate.detectedCategory ||
    (type === 'INCOME' ? state.categories.find((c) => c.type === 'INCOME')?.id : state.categories.find((c) => c.type === 'EXPENSE')?.id) ||
    state.categories[0]?.id ||
    '';
  const [categoryId, setCategoryId] = useState(initialCat);

  const [debtId, setDebtId] = useState(candidate.matchedDebtPaymentId || '');
  const [description, setDescription] = useState(candidate.detectedMerchant || candidate.detectedDescription || '');
  const [notes, setNotes] = useState(candidate.reviewNotes || '');

  const [principalAmount, setPrincipalAmount] = useState<string>('');
  const [interestAmount, setInterestAmount] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) return;

    onSaveAndConfirm({
      amount: parsedAmt,
      date,
      type,
      accountId,
      categoryId,
      debtId: debtId || undefined,
      description,
      notes,
      principalAmount: principalAmount ? parseFloat(principalAmount) : undefined,
      interestAmount: interestAmount ? parseFloat(interestAmount) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Edit & Confirm Transaction
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Adjust extracted SMS parameters before posting to ledger
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold font-mono focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-hidden"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SmsCandidateType)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-hidden"
              >
                <option value="EXPENSE">EXPENSE</option>
                <option value="INCOME">INCOME</option>
                <option value="DEBT_PAYMENT">DEBT PAYMENT (EMI)</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="REFUND">REFUND</option>
              </select>
            </div>

            {/* Account */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Account *
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-hidden"
              >
                {state.accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-hidden"
            >
              {state.categories
                .filter((c) => (type === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'))
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Optional Debt link */}
          {type === 'DEBT_PAYMENT' && (
            <div className="space-y-3 p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                  Link to Active Debt
                </label>
                <select
                  value={debtId}
                  onChange={(e) => setDebtId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                >
                  <option value="">-- No specific debt (Unallocated) --</option>
                  {state.debts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (EMI ₹{d.emiAmount || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Principal & Interest Breakdown (Section 38, 72) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Principal (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Interest (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional"
                    value={interestAmount}
                    onChange={(e) => setInterestAmount(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description / Merchant
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-hidden"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Audit Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-hidden"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs active:scale-95 transition"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Save & Confirm Transaction</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
