import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  debtName: string;
  accountName: string;
  paymentAmount: number;
  principalAmount: number;
  interestAmount: number;
  feesAmount: number;
  currentOutstanding: number;
  resultingBalance: number;
  onConfirm: () => Promise<void> | void;
}

export const PaymentConfirmationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  debtName,
  accountName,
  paymentAmount,
  principalAmount,
  interestAmount,
  feesAmount,
  currentOutstanding,
  resultingBalance,
  onConfirm,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (isProcessing) return; // double-submission protection
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131926] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Confirm Payment & Settle</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Review debt principal and fee distribution before ledger execution.</p>
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500">Target Debt:</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{debtName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500">Debited Account:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{accountName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500">Total Settle Amount:</span>
            <span className="font-mono font-bold text-base text-gray-900 dark:text-gray-100">
              ₹{paymentAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between py-1 text-gray-600 dark:text-gray-300">
            <span>• Principal Component:</span>
            <span className="font-mono font-medium">₹{principalAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-1 text-gray-600 dark:text-gray-300">
            <span>• Interest Component:</span>
            <span className="font-mono font-medium">₹{interestAmount.toLocaleString('en-IN')}</span>
          </div>
          {feesAmount > 0 && (
            <div className="flex justify-between py-1 text-gray-600 dark:text-gray-300">
              <span>• Processing Fees / Charges:</span>
              <span className="font-mono font-medium">₹{feesAmount.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700 font-semibold">
            <span className="text-gray-700 dark:text-gray-300">Resulting Debt Balance:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              ₹{Math.max(0, resultingBalance).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Double-submission protected buttons */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleExecute}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Confirm & Settle Once
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
