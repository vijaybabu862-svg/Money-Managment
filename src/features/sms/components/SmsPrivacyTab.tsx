import React, { useState } from 'react';
import { useFinance } from '../../../context/FinanceContext';
import { Shield, Trash2, CheckCircle2, Lock, AlertCircle } from 'lucide-react';

export const SmsPrivacyTab: React.FC = () => {
  const { state, smsPrivacySettings, updateSmsPrivacySettings, clearSmsRawText } = useFinance();
  const [clearedNotice, setClearedNotice] = useState(false);

  const handleToggleRetain = (val: boolean) => {
    updateSmsPrivacySettings({ retainRawSmsText: val });
  };

  const handleToggleAutoDelete = (val: boolean) => {
    updateSmsPrivacySettings({ autoDeleteRawTextAfterReview: val });
  };

  const handleClearAllRaw = () => {
    clearSmsRawText();
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 4000);
  };

  const rawSmsCount = (state.smsCandidates || []).filter(
    (c) => c.rawText && c.rawText !== '[RAW_SMS_DELETED_PER_PRIVACY_POLICY]'
  ).length;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Intro */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              SMS Data Privacy & Retention Controls
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              CASH FLOW is local-first. Your messages never leave your device.
            </p>
          </div>
        </div>

        <div className="mt-3 p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Zero Telemetry & Zero Cloud Ingestion:</span> All SMS normalization, entity extraction, and duplicate detection happen entirely inside your browser's local sandbox.
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs space-y-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Storage Preferences
        </h3>

        {/* Setting 1: Store original text */}
        <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Retain original SMS text while pending review
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Allows you to inspect the original bank message during review. If disabled, raw text is discarded immediately after parsing.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={smsPrivacySettings.retainRawSmsText}
              onChange={(e) => handleToggleRetain(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-slate-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-slate-900"></div>
          </label>
        </div>

        {/* Setting 2: Auto-delete raw text after confirmation */}
        <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Automatically delete raw SMS text after confirmation
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Purges original message content once a candidate is confirmed into a ledger transaction. Preserves parsed audit metadata.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={smsPrivacySettings.autoDeleteRawTextAfterReview}
              onChange={(e) => handleToggleAutoDelete(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-slate-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-slate-900"></div>
          </label>
        </div>

        {/* Action: Clear all raw text */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Purge All Stored Raw SMS Text
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Currently storing {rawSmsCount} raw message{rawSmsCount === 1 ? '' : 's'}. Deleting raw text does NOT delete your financial transactions.
            </p>
          </div>

          <button
            onClick={handleClearAllRaw}
            disabled={rawSmsCount === 0}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold disabled:opacity-40 transition active:scale-95 flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge All SMS Text</span>
          </button>
        </div>

        {clearedNotice && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>All raw SMS message bodies successfully purged from local storage!</span>
          </div>
        )}
      </div>
    </div>
  );
};
