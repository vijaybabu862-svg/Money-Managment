import React from 'react';
import { SmsTransactionCandidate, CandidateMatchResult } from '../../../types/finance';
import { formatINR } from '../../../utils/currency';
import { useFinance } from '../../../context/FinanceContext';
import { CheckCircle2, X, AlertTriangle, ShieldCheck, Bike, ArrowRight } from 'lucide-react';

interface SmsConfirmModalProps {
  candidate: SmsTransactionCandidate;
  matchResult?: CandidateMatchResult;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SmsConfirmModal: React.FC<SmsConfirmModalProps> = ({
  candidate,
  matchResult,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { state } = useFinance();

  if (!isOpen) return null;

  // Resolve matching account & category name for crystal clear display
  const account =
    (candidate.matchedAccountId && state.accounts.find((a) => a.id === candidate.matchedAccountId)) ||
    (candidate.detectedCardReference && state.accounts.find((a) => a.type === 'CREDIT_CARD')) ||
    (candidate.transactionType === 'INCOME'
      ? state.accounts.find((a) => a.type === 'BANK')
      : state.accounts[0]);

  const category =
    (candidate.detectedCategory && state.categories.find((c) => c.id === candidate.detectedCategory)) ||
    (candidate.transactionType === 'INCOME'
      ? state.categories.find((c) => c.type === 'INCOME')
      : state.categories.find((c) => c.type === 'EXPENSE'));

  const debt = candidate.matchedDebtPaymentId
    ? state.debts.find((d) => d.id === candidate.matchedDebtPaymentId)
    : undefined;

  const swiggyShift = candidate.matchedSwiggyShiftId
    ? state.swiggyShifts.find((s) => s.id === candidate.matchedSwiggyShiftId)
    : undefined;

  const isDuplicate = matchResult?.duplicateStatus === 'DUPLICATE';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Confirm Transaction
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Stage 5 Review Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Main Amount Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-center">
            <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Transaction Amount
            </span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
              {candidate.detectedAmount ? formatINR(candidate.detectedAmount) : '₹0'}
            </div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mt-0.5 tracking-wide">
              {candidate.transactionType.replace('_', ' ')}
            </div>
          </div>

          {/* Duplicate Warning if applicable */}
          {isDuplicate && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Duplicate Notice:</span> {matchResult?.duplicateExplanation || 'Matches an existing transaction.'}
              </div>
            </div>
          )}

          {/* Transaction Metadata Grid */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Date</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {candidate.detectedTransactionDate || candidate.receivedAt?.split('T')[0] || 'Today'}
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Account</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {account?.name || candidate.detectedAccountReference || 'Primary Bank Account'}
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Category</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {category?.name || 'General Expense'}
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Source</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                SMS ({candidate.sender || 'Bank Alert'})
              </span>
            </div>

            {debt && (
              <div className="py-2.5 flex justify-between items-center text-amber-700 dark:text-amber-300">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Linked Debt
                </span>
                <span className="font-bold">{debt.name} (EMI ₹{debt.emiAmount})</span>
              </div>
            )}

            {swiggyShift && (
              <div className="py-2.5 flex justify-between items-center text-orange-700 dark:text-orange-300">
                <span className="flex items-center gap-1 font-medium">
                  <Bike className="w-3.5 h-3.5" />
                  Swiggy Operational Link
                </span>
                <span className="font-bold">Shift on {swiggyShift.date} ({swiggyShift.slot})</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
            Confirming will post exactly one verified financial transaction to your ledger.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs active:scale-95 transition"
          >
            <span>Confirm Transaction</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
