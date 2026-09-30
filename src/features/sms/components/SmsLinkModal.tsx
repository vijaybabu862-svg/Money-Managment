import React, { useState } from 'react';
import { SmsTransactionCandidate, CandidateMatchResult } from '../../../types/finance';
import { formatINR } from '../../../utils/currency';
import { useFinance } from '../../../context/FinanceContext';
import { X, Link2, Check, ShieldCheck, Bike, CreditCard, Receipt } from 'lucide-react';

interface SmsLinkModalProps {
  candidate: SmsTransactionCandidate;
  matchResult?: CandidateMatchResult;
  isOpen: boolean;
  onClose: () => void;
  onLink: (targetTxId?: string, targetShiftId?: string, targetDebtId?: string) => void;
}

export const SmsLinkModal: React.FC<SmsLinkModalProps> = ({
  candidate,
  matchResult,
  isOpen,
  onClose,
  onLink,
}) => {
  const { state } = useFinance();
  const [selectedTxId, setSelectedTxId] = useState<string>(matchResult?.matchedTransactionId || '');
  const [selectedShiftId, setSelectedShiftId] = useState<string>(matchResult?.matchedSwiggyShiftId || '');
  const [selectedDebtId, setSelectedDebtId] = useState<string>(matchResult?.matchedDebtId || '');

  if (!isOpen) return null;

  const candidateAmt = candidate.detectedAmount || 0;

  // Filter candidate transactions (same type or close amount)
  const candidateTransactions = state.transactions
    .filter((tx) => Math.abs(tx.amount - candidateAmt) <= 200 || tx.id === matchResult?.matchedTransactionId)
    .slice(0, 10);

  // Filter candidate Swiggy shifts
  const candidateShifts = state.swiggyShifts.slice(0, 8);

  const handleApplyLink = () => {
    onLink(selectedTxId || undefined, selectedShiftId || undefined, selectedDebtId || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Match & Link Financial Record
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Link this SMS candidate to an existing transaction, shift, or debt
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

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Candidate Summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                SMS Candidate
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {candidate.detectedMerchant || candidate.sender || 'SMS Alert'}
              </span>
              <div className="text-xs text-slate-500">
                {candidate.detectedTransactionDate || 'Today'} · {candidate.transactionType}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {candidate.detectedAmount ? formatINR(candidate.detectedAmount) : '—'}
              </span>
            </div>
          </div>

          {/* 1. Existing Transaction Link */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              <Receipt className="w-3.5 h-3.5 text-blue-500" />
              <span>Link to Existing Ledger Transaction</span>
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              <div
                onClick={() => setSelectedTxId('')}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                  !selectedTxId
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 font-semibold text-blue-900 dark:text-blue-200'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <span>Do not link to an existing transaction (Create new on confirm)</span>
                {!selectedTxId && <Check className="w-4 h-4 text-blue-600" />}
              </div>

              {candidateTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTxId(tx.id)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    selectedTxId === tx.id
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 font-semibold text-blue-900 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {tx.description || tx.type} · {tx.date}
                    </div>
                    <div className="text-[11px] text-slate-500">{tx.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tabular-nums">{formatINR(tx.amount)}</span>
                    {selectedTxId === tx.id && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Swiggy Operational Shift Link (Section 17, 53) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              <Bike className="w-3.5 h-3.5 text-orange-500" />
              <span>Link to Swiggy Operational Shift Record</span>
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              <div
                onClick={() => setSelectedShiftId('')}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                  !selectedShiftId
                    ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 font-semibold text-orange-900 dark:text-orange-200'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <span>No Swiggy shift link</span>
                {!selectedShiftId && <Check className="w-4 h-4 text-orange-600" />}
              </div>

              {candidateShifts.map((shift) => (
                <div
                  key={shift.id}
                  onClick={() => setSelectedShiftId(shift.id)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    selectedShiftId === shift.id
                      ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 font-semibold text-orange-900 dark:text-orange-200'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {shift.date} ({shift.slot})
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {shift.orders} orders · Fuel ₹{shift.fuelExpense}
                      {shift.linkedIncomeTxId ? ' · Already linked' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tabular-nums">{formatINR(shift.grossEarnings)}</span>
                    {selectedShiftId === shift.id && <Check className="w-4 h-4 text-orange-600" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Debt EMI Link */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              <CreditCard className="w-3.5 h-3.5 text-amber-500" />
              <span>Link to Active Loan / Credit Card Debt</span>
            </label>
            <select
              value={selectedDebtId}
              onChange={(e) => setSelectedDebtId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-hidden"
            >
              <option value="">-- No linked debt --</option>
              {state.debts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} (EMI ₹{d.emiAmount || 0}, Outstanding: ₹{d.outstandingPrincipal})
                </option>
              ))}
            </select>
          </div>
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
            onClick={handleApplyLink}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition"
          >
            <Link2 className="w-4 h-4" />
            <span>Apply Record Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};
