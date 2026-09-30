import React, { useState } from 'react';
import {
  SmsTransactionCandidate,
  CandidateMatchResult,
} from '../../../types/finance';
import { formatINR } from '../../../utils/currency';
import {
  CheckCircle2,
  Edit3,
  Link2,
  XCircle,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building2,
  Bike,
  Trash2,
} from 'lucide-react';

interface SmsReviewCardProps {
  candidate: SmsTransactionCandidate;
  matchResult?: CandidateMatchResult;
  onConfirm: (candidate: SmsTransactionCandidate) => void;
  onEdit: (candidate: SmsTransactionCandidate) => void;
  onMatch: (candidate: SmsTransactionCandidate) => void;
  onReject: (candidateId: string) => void;
  onIgnore: (candidateId: string) => void;
  onClearRawText: (candidateId: string) => void;
}

export const SmsReviewCard: React.FC<SmsReviewCardProps> = ({
  candidate,
  matchResult,
  onConfirm,
  onEdit,
  onMatch,
  onReject,
  onIgnore,
  onClearRawText,
}) => {
  const [showRaw, setShowRaw] = useState(false);

  const isConfirmed = candidate.reviewStatus === 'CONFIRMED';
  const isRejected = candidate.reviewStatus === 'REJECTED';
  const isIgnored = candidate.reviewStatus === 'IGNORED';
  const isDuplicate = matchResult?.duplicateStatus === 'DUPLICATE' || candidate.reviewStatus === 'DUPLICATE';
  const isPossibleDuplicate = matchResult?.duplicateStatus === 'POSSIBLE_DUPLICATE';
  const isStrongMatch = matchResult?.matchConfidence === 'STRONG_MATCH';
  const isPossibleMatch = matchResult?.matchConfidence === 'POSSIBLE_MATCH';

  // Confidence styling
  const confidenceColor =
    candidate.parserConfidence === 'HIGH'
      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
      : candidate.parserConfidence === 'MEDIUM'
      ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
      : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';

  // Type color
  const typeBadgeColor =
    candidate.transactionType === 'INCOME'
      ? 'text-emerald-700 dark:text-emerald-400'
      : candidate.transactionType === 'DEBT_PAYMENT'
      ? 'text-amber-700 dark:text-amber-400'
      : candidate.transactionType === 'TRANSFER'
      ? 'text-blue-700 dark:text-blue-400'
      : candidate.transactionType === 'REFUND'
      ? 'text-purple-700 dark:text-purple-400'
      : 'text-rose-700 dark:text-rose-400';

  return (
    <div
      className={`bg-white dark:bg-[#131926] border rounded-2xl p-5 shadow-xs transition-all ${
        isDuplicate
          ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20'
          : isStrongMatch
          ? 'border-blue-300 dark:border-blue-800/80'
          : 'border-[#E5E7EB] dark:border-[#1F2937]'
      }`}
    >
      {/* Top Metadata Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {candidate.sender || 'Bank Alert'}
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {candidate.detectedTransactionDate || candidate.receivedAt?.split('T')[0] || 'Today'}
          </span>
          {candidate.detectedAccountReference && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 dark:text-slate-300">
                <Building2 className="w-3 h-3 text-slate-400" />
                {candidate.detectedAccountReference}
              </span>
            </>
          )}
          {candidate.detectedCardReference && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 dark:text-slate-300">
                <CreditCard className="w-3 h-3 text-slate-400" />
                {candidate.detectedCardReference}
              </span>
            </>
          )}
        </div>

        {/* Confidence & Review Status Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${confidenceColor}`}
            title={`Parser Confidence: ${candidate.parserConfidence}`}
          >
            {candidate.parserConfidence} CONFIDENCE
          </span>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              isConfirmed
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : isRejected
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : isIgnored
                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                : isDuplicate
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
            }`}
          >
            {candidate.reviewStatus}
          </span>
        </div>
      </div>

      {/* Main Financial Presentation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {candidate.detectedAmount ? formatINR(candidate.detectedAmount) : '—'}
            </span>
            <span className={`text-xs font-extrabold tracking-wide uppercase ${typeBadgeColor}`}>
              {candidate.transactionType.replace('_', ' ')}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
            {candidate.detectedMerchant || candidate.detectedPayee || candidate.detectedDescription || 'Transaction via SMS'}
          </p>
        </div>

        {/* Multi-Amount details (Section 70, 71) */}
        {(candidate.totalDue || candidate.minimumDue) && (
          <div className="text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            {candidate.totalDue && (
              <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                <span>Total Due:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatINR(candidate.totalDue)}</span>
              </div>
            )}
            {candidate.minimumDue && (
              <div className="flex justify-between gap-3 text-slate-500 dark:text-slate-400 mt-0.5">
                <span>Min Due:</span>
                <span className="font-semibold">{formatINR(candidate.minimumDue)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Match / Duplicate Guidance Banner */}
      {isDuplicate && (
        <div className="my-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Duplicate Detected:</span> {matchResult?.duplicateExplanation || 'Matches an existing confirmed transaction.'}
          </div>
        </div>
      )}

      {isPossibleDuplicate && !isDuplicate && (
        <div className="my-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Possible Duplicate:</span> {matchResult?.duplicateExplanation}
          </div>
        </div>
      )}

      {isStrongMatch && !isDuplicate && (
        <div className="my-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Match Found:</span> {matchResult?.matchExplanation}
          </div>
        </div>
      )}

      {isPossibleMatch && !isStrongMatch && !isDuplicate && (
        <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <Link2 className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Potential Match:</span> {matchResult?.matchExplanation}
          </div>
        </div>
      )}

      {candidate.matchedSwiggyShiftId && (
        <div className="my-2 p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 flex items-center gap-2 text-xs text-orange-900 dark:text-orange-200">
          <Bike className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <span>Operational Link: Matched with Swiggy Shift #{candidate.matchedSwiggyShiftId}</span>
        </div>
      )}

      {/* Raw SMS Text Accordion (Privacy Controlled) */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition font-medium"
          >
            {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showRaw ? 'Hide Raw SMS Text' : 'View Raw SMS Text'}</span>
          </button>

          {candidate.rawText && candidate.rawText !== '[RAW_SMS_DELETED_PER_PRIVACY_POLICY]' && (
            <button
              onClick={() => onClearRawText(candidate.id)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
              title="Permanently remove raw SMS text while keeping parsed transaction data"
            >
              <Trash2 className="w-3 h-3" />
              <span>Purge SMS Text</span>
            </button>
          )}
        </div>

        {showRaw && (
          <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap select-all">
            {candidate.rawText}
          </div>
        )}
      </div>

      {/* Primary Action Buttons (Section 22, 67: Touch-friendly Mobile First) */}
      {!isConfirmed && !isRejected && !isIgnored && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          {/* Confirm Button */}
          <button
            onClick={() => onConfirm(candidate)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs active:scale-95 transition"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>Confirm Transaction</span>
          </button>

          {/* Edit Button */}
          <button
            onClick={() => onEdit(candidate)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold active:scale-95 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          {/* Match / Link Existing Button */}
          <button
            onClick={() => onMatch(candidate)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold active:scale-95 transition"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Match / Link</span>
          </button>

          {/* Reject Button */}
          <button
            onClick={() => onReject(candidate.id)}
            className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold active:scale-95 transition"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>

          {/* Ignore Button */}
          <button
            onClick={() => onIgnore(candidate.id)}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium active:scale-95 transition"
            title="Mark as ignored (OTP, promotional, or non-transactional)"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Ignore</span>
          </button>
        </div>
      )}

      {/* Already Confirmed Banner */}
      {isConfirmed && (
        <div className="mt-3 pt-2 text-xs text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
          <span className="flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed & Posted to Ledger
            {candidate.matchedTransactionId ? ` (${candidate.matchedTransactionId})` : ''}
          </span>
          <span className="text-[11px] text-slate-400">
            {candidate.reviewedAt ? new Date(candidate.reviewedAt).toLocaleDateString() : ''}
          </span>
        </div>
      )}

      {/* Rejected / Ignored Note */}
      {(isRejected || isIgnored) && (
        <div className="mt-3 pt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>{isRejected ? 'Rejected (Not added to ledger)' : 'Ignored (Non-transactional)'}</span>
          <button
            onClick={() => onEdit(candidate)}
            className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:underline"
          >
            Reopen
          </button>
        </div>
      )}
    </div>
  );
};
