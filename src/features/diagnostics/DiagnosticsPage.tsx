import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { exportTechnicalDiagnostics } from '../../services/diagnosticsService';
import {
  Activity,
  HardDrive,
  Wifi,
  WifiOff,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Cpu,
  Layers,
  FileText,
  ShieldCheck,
} from 'lucide-react';

export const DiagnosticsPage: React.FC = () => {
  const { state, appDiagnostics, errorLogs, clearErrorLogs } = useFinance();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleExportDiagnostics = () => {
    const jsonStr = exportTechnicalDiagnostics(state);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            System Diagnostics & Health
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time status of local storage, PWA service worker, data integrity, and error telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportDiagnostics}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Diagnostics
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2 border border-emerald-200 dark:border-emerald-900">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Technical diagnostic report successfully exported (no private financial data included).
        </div>
      )}

      {/* Grid of Diagnostic Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Application & Environment */}
        <div className="bg-white dark:bg-[#131926] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
            <Cpu className="w-5 h-5" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Application</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">App Version</span>
              <span className="font-mono font-medium text-gray-900 dark:text-gray-100">v{appDiagnostics.appVersion}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Architecture</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">Stage 10 Hardened</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Target Currency</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">INR (₹)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Firebase Cloud</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {appDiagnostics.firebaseConfigured ? 'Connected' : 'Offline / Standalone'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500 dark:text-gray-400">Cloud Sync Status</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {appDiagnostics.syncStatus || 'IDLE'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Storage & Backup */}
        <div className="bg-white dark:bg-[#131926] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
            <HardDrive className="w-5 h-5" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Storage Engine</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Schema Version</span>
              <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                cashflow_storage_v{appDiagnostics.storageVersion}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Local Snapshots</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {appDiagnostics.recordCounts.backupSnapshots} saved
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Audit Trail Depth</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {appDiagnostics.recordCounts.auditEvents} events
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500 dark:text-gray-400">Last Backup</span>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {appDiagnostics.lastBackupAt ? new Date(appDiagnostics.lastBackupAt).toLocaleDateString('en-IN') : 'Manual backup recommended'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. PWA & Network */}
        <div className="bg-white dark:bg-[#131926] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            {appDiagnostics.isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5 text-amber-500" />}
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">PWA & Offline</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Network State</span>
              <span className={`font-medium ${appDiagnostics.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                {appDiagnostics.isOnline ? 'Online (Ready)' : 'Offline (Local-First Active)'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Service Worker</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {appDiagnostics.serviceWorkerActive ? 'Active & Caching' : 'Supported'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Standalone App</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {appDiagnostics.pwaInstalled ? 'Installed PWA' : 'Web Browser'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500 dark:text-gray-400">Offline Resilience</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                100% Offline-Capable
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Record Counts Breakdown */}
      <div className="bg-white dark:bg-[#131926] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
          <Layers className="w-5 h-5" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Ledger Entity Volume</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{appDiagnostics.recordCounts.accounts}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Accounts</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{appDiagnostics.recordCounts.transactions}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Transactions</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{appDiagnostics.recordCounts.debts}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Debts & Loans</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{appDiagnostics.recordCounts.payments}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Payments</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{appDiagnostics.recordCounts.goals}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Savings Goals</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{appDiagnostics.recordCounts.smsCandidates}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">SMS Candidates</div>
          </div>
        </div>
      </div>

      {/* Local Error Log */}
      <div className="bg-white dark:bg-[#131926] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Local Error Log</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
              {errorLogs.length}
            </span>
          </div>

          {errorLogs.length > 0 && (
            <button
              onClick={clearErrorLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Error Log
            </button>
          )}
        </div>

        {errorLogs.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/40 rounded-lg">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Clean runtime log</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Zero active errors or exceptions recorded in this session.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {errorLogs.map((e) => (
              <div
                key={e.id}
                className="p-3 bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-xs"
              >
                <div className="flex items-center justify-between text-red-700 dark:text-red-400 font-semibold mb-1">
                  <span>[{e.severity}] {e.area}</span>
                  <span className="font-mono text-[10px] text-gray-500">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-800 dark:text-gray-200 font-mono text-[11px]">{e.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
