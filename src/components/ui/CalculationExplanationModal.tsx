import React from 'react';
import { X, HelpCircle, Calculator, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { FinancialExplanation } from '../../types/finance';
import { formatINR } from '../../utils/currency';

interface CalculationExplanationModalProps {
  explanation: FinancialExplanation | null;
  onClose: () => void;
}

export const CalculationExplanationModal: React.FC<CalculationExplanationModalProps> = ({
  explanation,
  onClose,
}) => {
  if (!explanation) return null;

  const getBasisBadge = (basis: string) => {
    switch (basis) {
      case 'ACTUAL':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            Recorded Ledger
          </span>
        );
      case 'FORECAST':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
            Deterministic Forecast
          </span>
        );
      case 'SCENARIO':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
            Hypothetical Scenario
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Historical Average
          </span>
        );
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'COMPLETE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Complete Data</span>
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Partial Data</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <Info className="w-3.5 h-3.5" />
            <span>Limited Data</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                How is this calculated?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {explanation.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Top Metric & Badges */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs text-slate-400 font-medium">Calculated Metric</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight tabular-nums">
                {explanation.valueDisplay}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {getBasisBadge(explanation.basis)}
              {getQualityBadge(explanation.dataQuality)}
            </div>
          </div>

          {/* Formula */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Mathematical Formula
            </h4>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
              {explanation.formula}
            </div>
          </div>

          {/* Breakdown Items */}
          {explanation.breakdownItems.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Calculation Breakdown
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                {explanation.breakdownItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 px-4 flex items-center justify-between text-xs transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {item.isDeduction ? '− ' : '+ '}
                      {item.label}
                    </span>
                    <div className="text-right">
                      {item.amount !== undefined ? (
                        <span
                          className={`font-bold tabular-nums ${
                            item.isDeduction
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {formatINR(item.amount)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">{item.note}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanation Notes */}
          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
              <Info className="w-3.5 h-3.5" />
              <span>Explanation & Governance</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {explanation.explanation}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition shadow-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
