import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
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
  } = useFinance();
  const { showToast } = useToast();

  const [salaryInput, setSalaryInput] = useState(String(centralPosition.monthlySalary));
  const [isProcessing, setIsProcessing] = useState(false);
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
    <div className="space-y-6 max-w-4xl mx-auto">
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
