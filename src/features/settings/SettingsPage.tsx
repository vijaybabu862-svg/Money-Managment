import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/currency';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Save,
  DollarSign,
  ShieldAlert,
  Eraser,
  Loader2,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  User,
  RefreshCw,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    centralPosition,
    updateSalary,
    createBackup,
    restoreBackup,
    safeDeleteFinancialData,
    factoryReset,
    removeDemoData,
    triggerSyncNow,
  } = useFinance();
  const { showToast } = useToast();
  const { authState, loginWithGoogle, logout, isConfigured } = useAuth();

  const [salaryInput, setSalaryInput] = useState(String(centralPosition.monthlySalary));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'REMOVE_DEMO' | 'DELETE_FINANCIAL' | 'FACTORY_RESET';
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'REMOVE_DEMO',
  });

  const handleSaveSalary = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(salaryInput);
    if (isNaN(parsed) || parsed < 0) {
      showToast('Please enter a valid salary amount', 'error');
      return;
    }
    updateSalary(parsed);
    showToast(`✓ Monthly salary updated to ${formatINR(parsed)}`);
  };

  const handleDownloadBackup = () => {
    try {
      const { jsonString, filename } = createBackup();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      showToast('✓ Backup downloaded successfully');
    } catch (err) {
      showToast('Failed to generate backup file', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const res = restoreBackup(content);
        if (res.success) {
          showToast('✓ Data restored successfully from backup!');
        } else {
          showToast(`Restore error: ${res.error || 'Invalid file format'}`, 'error');
        }
      } catch (err) {
        showToast('Failed to parse backup JSON file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSignIn = async () => {
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        showToast('✓ Signed in with Google! Multi-device sync active.');
      } else if (res.error) {
        showToast(`Sign in error: ${res.error}`, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      showToast(`Sign in failed: ${msg}`, 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      showToast('Signed out of cloud account');
    } catch (err) {
      showToast('Failed to sign out', 'error');
    }
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await triggerSyncNow();
      if (res.success) {
        showToast(`✓ Cloud sync completed (${res.syncedItemsCount} records updated)`);
      } else {
        showToast(res.error || 'Sync encountered an issue', 'error');
      }
    } catch (err) {
      showToast('Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmAction = async () => {
    setIsProcessing(true);
    try {
      if (confirmModal.actionType === 'REMOVE_DEMO') {
        const res = await removeDemoData();
        if (res.success) {
          showToast('✓ Demo data successfully removed');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } else {
          showToast(res.error || 'Unable to remove demo data. No records were removed.', 'error');
        }
      } else if (confirmModal.actionType === 'DELETE_FINANCIAL') {
        const res = await safeDeleteFinancialData();
        if (res.success) {
          showToast('✓ All financial records cleared');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } else {
          showToast(res.error || 'Unable to delete financial records. No data was removed.', 'error');
        }
      } else if (confirmModal.actionType === 'FACTORY_RESET') {
        if (resetConfirmInput.trim() !== 'RESET') {
          showToast('Please type RESET exactly to confirm factory reset', 'error');
          setIsProcessing(false);
          return;
        }
        const res = await factoryReset();
        if (res.success) {
          showToast('✓ Application reset to default factory state');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setResetConfirmInput('');
        } else {
          showToast(res.error || 'Unable to perform factory reset.', 'error');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      showToast(`Error: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openModal = (actionType: 'REMOVE_DEMO' | 'DELETE_FINANCIAL' | 'FACTORY_RESET') => {
    setResetConfirmInput('');
    if (actionType === 'REMOVE_DEMO') {
      setConfirmModal({
        isOpen: true,
        title: 'Remove Demo Data Only?',
        description:
          'This will remove only sample demonstration loans, shifts, and expenses. Your real financial records, real loans, salary, real Swiggy records, and real expenses will be strictly preserved.',
        actionType: 'REMOVE_DEMO',
      });
    } else if (actionType === 'DELETE_FINANCIAL') {
      setConfirmModal({
        isOpen: true,
        title: 'Delete All Financial Records?',
        description:
          'This will permanently delete all your loans, EMI payment records, salary data, Swiggy earnings and expenses, and essential expenses. Dashboard and cash flow values will reset to zero.',
        actionType: 'DELETE_FINANCIAL',
      });
    } else if (actionType === 'FACTORY_RESET') {
      setConfirmModal({
        isOpen: true,
        title: 'Factory Reset CASH FLOW?',
        description:
          'Factory Reset will permanently remove all CASH FLOW financial data and return the application to its clean initial state with baseline demo figures.',
        actionType: 'FACTORY_RESET',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          <span>Settings</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Simple system settings, salary configuration, and data backup controls
        </p>
      </div>

      {/* Cloud Database & Multi-Device Sync */}
      <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 hover-lift">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-500" />
              <span>Cloud Database & Multi-Device Sync</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Connect your Google Account to synchronize your loans, salary, shifts, and expenses across all your phones, laptops, and tablets.
            </p>
          </div>

          <div>
            {authState.status === 'signed_in' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Cloud Sync Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <CloudOff className="w-3.5 h-3.5" />
                Device-Only (Offline)
              </span>
            )}
          </div>
        </div>

        {authState.status === 'signed_in' ? (
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                {authState.displayName?.[0] || authState.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {authState.displayName || 'Google Account Connected'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {authState.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100/50 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg">
                You are currently in local storage mode. To view and edit your finances on multiple devices at the same time, sign in with your Google account.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignIn}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google</span>
            </button>
          </div>
        )}
      </div>

      {/* 1. Salary Settings */}
      <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Salary Configuration
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Set your baseline monthly company salary. This amount is used to calculate EMI burden percentages and monthly remaining cash.
        </p>

        <form onSubmit={handleSaveSalary} className="flex flex-col sm:flex-row gap-3 max-w-md">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
              ₹
            </span>
            <input
              type="number"
              min="0"
              step="500"
              required
              value={salaryInput}
              onChange={(e) => setSalaryInput(e.target.value)}
              className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Update Salary</span>
          </button>
        </form>
      </div>

      {/* 2. Currency Display */}
      <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Currency Standard
        </h2>
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <span>Active Currency Format:</span>
          <span className="font-extrabold text-slate-900 dark:text-white px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            Indian Rupee (INR — ₹)
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          All financial calculations adhere strictly to the Indian numbering system without unnecessary decimal values.
        </p>
      </div>

      {/* 3. Data Backup & Restore */}
      <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Data Backup & Restore
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Export a standalone JSON backup file of all your loans, salary records, Swiggy shifts, and expenses to your device.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {/* Download Backup */}
          <button
            onClick={handleDownloadBackup}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131926] text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Download Backup (JSON)</span>
          </button>

          {/* Restore Backup */}
          <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131926] text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Restore From File</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 4. Reset & Danger Zone */}
      <div className="bg-white dark:bg-[#131926] border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Danger Zone & Data Management</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operations that delete records or reset state. These require explicit confirmation before execution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* 1. Remove Demo Data */}
          <button
            type="button"
            onClick={() => openModal('REMOVE_DEMO')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer"
          >
            <Eraser className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Remove Demo Data</span>
          </button>

          {/* 2. Delete Financial Records */}
          <button
            type="button"
            onClick={() => openModal('DELETE_FINANCIAL')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Financial Records</span>
          </button>

          {/* 3. Factory Reset */}
          <button
            type="button"
            onClick={() => openModal('FACTORY_RESET')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Factory Reset</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 bg-white dark:bg-[#131926] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>{confirmModal.title}</span>
            </h3>

            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
              <p>{confirmModal.description}</p>

              {confirmModal.actionType === 'FACTORY_RESET' && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-2">
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                    Step 2 Confirmation: Type <span className="font-mono bg-rose-200 dark:bg-rose-900 px-1 py-0.5 rounded text-rose-900 dark:text-rose-100">RESET</span> below to execute:
                  </p>
                  <input
                    type="text"
                    value={resetConfirmInput}
                    onChange={(e) => setResetConfirmInput(e.target.value)}
                    placeholder="Type RESET"
                    disabled={isProcessing}
                    className="w-full px-3 py-2 text-sm font-mono font-bold rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Note: This is an application data reset. Your Firebase project, hosting, authentication, and source code will NOT be deleted.
                  </p>
                </div>
              )}

              {confirmModal.actionType === 'REMOVE_DEMO' && (
                <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40">
                  ✓ Safe Action: Any loans, salary, Swiggy shifts, or expenses that you manually created will be preserved intact.
                </p>
              )}

              {confirmModal.actionType === 'DELETE_FINANCIAL' && (
                <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/40">
                  ⚠️ Warning: All loans, EMI obligations, salary figures, Swiggy shift records, and essential expenses will be wiped to zero.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isProcessing ||
                  (confirmModal.actionType === 'FACTORY_RESET' && resetConfirmInput.trim() !== 'RESET')
                }
                onClick={handleConfirmAction}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold transition cursor-pointer"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isProcessing
                    ? 'Processing...'
                    : confirmModal.actionType === 'FACTORY_RESET'
                    ? 'Execute Factory Reset'
                    : 'Confirm Deletion'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
