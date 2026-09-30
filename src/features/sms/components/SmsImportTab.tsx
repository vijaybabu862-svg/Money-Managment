import React, { useState } from 'react';
import { parseBatchSms } from '../../../services/smsTransactionParser';
import { detectDuplicate, matchCandidate } from '../../../services/transactionMatcher';
import { useFinance } from '../../../context/FinanceContext';
import { SmsTransactionCandidate } from '../../../types/finance';
import { formatINR } from '../../../utils/currency';
import {
  Sparkles,
  ClipboardPaste,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';

interface SmsImportTabProps {
  onImportComplete: () => void;
}

const SAMPLE_PRESETS = [
  {
    title: 'HDFC Loan EMI (₹1,704)',
    text: 'Your A/c XX4128 is debited by Rs. 1,704.00 on 26-09-2026 towards EMI. Avail Bal: Rs 14,296.00',
  },
  {
    title: 'SBI Salary Credit (₹21,000)',
    text: 'Salary credit of INR 21,000.00 received in A/c XX4128 on 01-Sep-2026. Available balance INR 35,296.00',
  },
  {
    title: 'Swiggy Delivery Payout (₹640)',
    text: 'HDFC Bank: Rs 640.00 credited to a/c **4128 on 24-09-2026 by VPA swiggy@icici (UPI Ref 426819238129).',
  },
  {
    title: 'Indian Oil Fuel Refill (₹110)',
    text: 'A/c 4128 debited for INR 110.00 on 25-SEP-26 at INDIAN OIL PETROL BUNK UPI/42681924512.',
  },
  {
    title: 'Credit Card Bill (₹5,000 / Min ₹500)',
    text: 'Credit card statement generated for card ending 4921. Total Due Rs 5,000. Minimum Due Rs 500 payable by 05-Oct-2026.',
  },
  {
    title: 'Balance-Only Alert (Non-transactional)',
    text: 'Available balance in your HDFC salary account ending 4128 is Rs 18,450 as of 26-09-2026.',
  },
  {
    title: 'OTP Notification (Ignored)',
    text: 'Your OTP is 738291 for approving UPI payment of Rs 1,704 on HDFC Bank. Do not share with anyone.',
  },
];

export const SmsImportTab: React.FC<SmsImportTabProps> = ({ onImportComplete }) => {
  const { state, addSmsCandidates } = useFinance();
  const [smsInput, setSmsInput] = useState('');
  const [analyzedList, setAnalyzedList] = useState<SmsTransactionCandidate[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = () => {
    if (!smsInput.trim()) return;

    const parsedCandidates = parseBatchSms(smsInput, 'MANUAL_PASTE');
    setAnalyzedList(parsedCandidates);
    setHasAnalyzed(true);
  };

  const handleClear = () => {
    setSmsInput('');
    setAnalyzedList([]);
    setHasAnalyzed(false);
  };

  const handlePastePreset = (text: string) => {
    setSmsInput((prev) => (prev ? `${prev}\n\n---\n\n${text}` : text));
  };

  const handleSaveToReviewInbox = () => {
    if (analyzedList.length === 0) return;

    addSmsCandidates(analyzedList);
    onImportComplete();
  };

  // Analyze duplicates and matches on the fly
  const matchContext = {
    transactions: state.transactions,
    debts: state.debts,
    recurringCommitments: state.recurringCommitments,
    payments: state.payments,
    creditCards: state.creditCards,
    accounts: state.accounts,
    swiggyShifts: state.swiggyShifts,
    existingCandidates: state.smsCandidates,
  };

  const summary = analyzedList.reduce(
    (acc, cand) => {
      const dup = detectDuplicate(cand, matchContext);
      const match = matchCandidate(cand, matchContext);

      if (cand.isNonTransaction || cand.isOtpOrPromotional) {
        acc.nonTransactional += 1;
      } else if (dup.status === 'DUPLICATE') {
        acc.duplicates += 1;
      } else if (match.matchConfidence === 'STRONG_MATCH') {
        acc.strongMatches += 1;
      } else {
        acc.unique += 1;
      }
      return acc;
    },
    { unique: 0, duplicates: 0, strongMatches: 0, nonTransactional: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Manual SMS Paste & Ingestion
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Paste your bank, credit card, or UPI SMS text below. CASH FLOW parses the transaction details entirely on your device with zero cloud uploads or invasive permissions.
        </p>

        {/* Quick Sample Presets */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Try Sample Bank SMS Presets
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handlePastePreset(preset.text)}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition active:scale-95 text-left"
              >
                + {preset.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Bank / Payment SMS Text
          </label>
          <textarea
            rows={5}
            value={smsInput}
            onChange={(e) => {
              setSmsInput(e.target.value);
              setHasAnalyzed(false);
            }}
            placeholder="Paste your bank SMS alert here... (Supports multiple SMS separated by blank lines or ---)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-hidden transition"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAnalyze}
              disabled={!smsInput.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs disabled:opacity-40 transition active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Analyze SMS</span>
            </button>

            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>

          {navigator.clipboard && (
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) {
                    setSmsInput(text);
                    setHasAnalyzed(false);
                  }
                } catch {
                  // clipboard read restricted
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold transition"
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Paste from Clipboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Analysis Batch Results (Section 42, 43) */}
      {hasAnalyzed && analyzedList.length > 0 && (
        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {analyzedList.length} SMS Analyzed
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {summary.unique} unique candidates · {summary.strongMatches} strong matches · {summary.duplicates} possible duplicates · {summary.nonTransactional} non-transactional
              </p>
            </div>

            <button
              onClick={handleSaveToReviewInbox}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition"
            >
              <span>Add to Review Inbox</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Candidate List Preview */}
          <div className="space-y-3">
            {analyzedList.map((cand, idx) => {
              const dup = detectDuplicate(cand, matchContext);
              const match = matchCandidate(cand, matchContext);

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {cand.sender || 'Bank Alert'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {cand.transactionType}
                      </span>
                      {cand.detectedAccountReference && (
                        <span className="text-xs font-mono text-slate-500">
                          {cand.detectedAccountReference}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {cand.detectedMerchant || cand.detectedDescription || cand.normalizedText.substring(0, 70)}
                    </p>

                    {dup.status === 'DUPLICATE' && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{dup.explanation}</span>
                      </div>
                    )}

                    {match.matchConfidence === 'STRONG_MATCH' && dup.status !== 'DUPLICATE' && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{match.matchExplanation}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {cand.detectedAmount ? formatINR(cand.detectedAmount) : '—'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {cand.detectedTransactionDate || 'Today'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
