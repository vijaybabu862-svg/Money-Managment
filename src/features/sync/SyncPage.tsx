import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Laptop,
  Smartphone,
  ShieldCheck,
  Download,
  UploadCloud,
  LogOut,
  LogIn,
  AlertCircle,
  HelpCircle,
  Database,
  ArrowRight,
  HardDriveDownload,
  Info,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  OverallSyncStatus,
  SyncConflict,
  ConflictResolution,
  CloudBackupRecord,
  DeviceRecord,
} from '../../types/sync';
import { loadSyncQueue, clearCompletedAndFailedQueue } from '../../services/syncQueue';
import { getStoredLastSyncTime } from '../../services/syncEngine';

export const SyncPage: React.FC = () => {
  const {
    syncStatus,
    syncConflicts,
    pendingSyncCount,
    triggerSyncNow,
    resolveConflictAction,
    createCloudBackupAction,
    listCloudBackupsAction,
    restoreCloudBackupAction,
    getKnownDevicesList,
    updateDeviceFriendlyNameAction,
    state,
  } = useFinance();

  const { authState, loginWithGoogle, logout, isConfigured } = useAuth();
  const { showToast } = useToast();

  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<CloudBackupRecord[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<CloudBackupRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [isEditingDeviceName, setIsEditingDeviceName] = useState(false);
  const [queueItems, setQueueItems] = useState(loadSyncQueue());

  const lastSyncIso = getStoredLastSyncTime();

  const refreshQueue = () => {
    setQueueItems(loadSyncQueue());
  };

  const fetchBackups = async () => {
    if (authState.status === 'signed_in') {
      setIsLoadingBackups(true);
      try {
        const backups = await listCloudBackupsAction();
        setCloudBackups(backups);
      } catch (err) {
        console.warn('Failed to load cloud backups', err);
      } finally {
        setIsLoadingBackups(false);
      }
    }
  };

  useEffect(() => {
    fetchBackups();
    refreshQueue();
    const interval = setInterval(refreshQueue, 3000);
    return () => clearInterval(interval);
  }, [authState.status]);

  const handleSyncNow = async () => {
    if (isSyncingLocal) return;
    setIsSyncingLocal(true);
    try {
      const res = await triggerSyncNow();
      refreshQueue();
      if (res.success) {
        showToast(`Sync completed successfully. ${res.syncedItemsCount} item(s) processed.`, 'success');
        fetchBackups();
      } else {
        showToast(res.error || 'Sync could not be completed.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Sync failed.', 'error');
    } finally {
      setIsSyncingLocal(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const res = await createCloudBackupAction(`Manual backup on ${new Date().toLocaleDateString()}`);
      if (res.success && res.backup) {
        showToast('Full cloud backup snapshot saved to Firestore!', 'success');
        setCloudBackups((prev) => [res.backup!, ...prev]);
      } else {
        showToast(res.error || 'Failed to create cloud backup snapshot.', 'error');
      }
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupForRestore) return;
    setIsRestoring(true);
    try {
      const res = await restoreCloudBackupAction(selectedBackupForRestore.backupId);
      if (res.success) {
        showToast('Cloud backup restored successfully. Local snapshot created.', 'success');
        setSelectedBackupForRestore(null);
      } else {
        showToast(res.error || 'Failed to restore cloud backup.', 'error');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConflictChoice = (conflictId: string, resolution: ConflictResolution) => {
    resolveConflictAction(conflictId, resolution);
    showToast(`Conflict resolved using '${resolution.replace('_', ' ')}'.`, 'info');
  };

  const devices = getKnownDevicesList();
  const currentDevice = devices.find((d) => d.isCurrentDevice) || devices[0];

  const getStatusBadge = (status: OverallSyncStatus) => {
    switch (status) {
      case 'SYNCED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Synced
          </span>
        );
      case 'SYNCING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <CloudOff className="w-3.5 h-3.5" /> Offline
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" /> Pending ({pendingSyncCount})
          </span>
        );
      case 'CONFLICT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Conflict ({syncConflicts.length})
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
            <AlertCircle className="w-3.5 h-3.5" /> Error
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Cloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Cloud Sync & Multi-Device Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Local-first architecture with end-to-end user isolation, offline queueing, and safe conflict resolution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge(syncStatus)}
          <button
            onClick={handleSyncNow}
            disabled={isSyncingLocal || syncStatus === 'SYNCING'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingLocal ? 'animate-spin' : ''}`} />
            <span>Sync Now</span>
          </button>
        </div>
      </div>

      {/* Auth & Routing Status Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {authState.photoURL ? (
              <img
                src={authState.photoURL}
                alt={authState.displayName || 'User'}
                className="w-12 h-12 rounded-full border border-slate-300 dark:border-slate-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                {authState.displayName ? authState.displayName[0].toUpperCase() : 'G'}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  {authState.status === 'signed_in' ? authState.displayName || authState.email : 'Local Guest Account'}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {authState.status === 'signed_in' ? 'Google Authenticated' : 'Signed Out (Local First)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {authState.status === 'signed_in'
                  ? `UID: ${authState.userId} • Email: ${authState.email}`
                  : 'Operating locally. Sign in with Google to enable cross-device cloud synchronization.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {authState.status === 'signed_in' ? (
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Sign out without clearing local data"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Database & Security Info Footer */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-500" />
            <span>Database: <strong className="font-mono text-[11px] text-slate-700 dark:text-slate-300">ai-studio-cashflow-2d092c09-2ebd-4665-a3f7-f5088f8c860c</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Isolation: <strong className="text-slate-700 dark:text-slate-300">users/{'{uid}'} (Strict ABAC)</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Raw SMS: <strong className="text-emerald-600 dark:text-emerald-400">Local Only (Privacy Protected)</strong></span>
          </div>
        </div>
      </div>

      {/* Sync Health & Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Sync Status</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{syncStatus}</span>
            {getStatusBadge(syncStatus)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Last Successful Sync</p>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {lastSyncIso ? new Date(lastSyncIso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Not yet synced'}
          </p>
          <p className="text-[11px] text-slate-400">
            {lastSyncIso ? new Date(lastSyncIso).toLocaleDateString('en-IN') : 'Awaiting first synchronization'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Pending Outbox</p>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            {pendingSyncCount} <span className="text-xs font-normal text-slate-400">mutations queued</span>
          </p>
          <p className="text-[11px] text-slate-400">Persistent across browser refreshes</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Active Conflicts</p>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            {syncConflicts.length} <span className="text-xs font-normal text-slate-400">awaiting user choice</span>
          </p>
          <p className="text-[11px] text-slate-400">Zero silent financial overwrites</p>
        </div>
      </div>

      {/* Financial Sync Conflicts Section */}
      {syncConflicts.length > 0 && (
        <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-900 space-y-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-base font-bold text-red-900 dark:text-red-200">
              Active Financial Conflicts ({syncConflicts.length})
            </h2>
          </div>
          <p className="text-xs text-red-700 dark:text-red-300">
            Financial figures differed between devices. CASH FLOW adheres to strict anti-overwriting policy. Choose how to resolve each discrepancy:
          </p>

          <div className="space-y-3">
            {syncConflicts.map((c) => {
              const local = c.localVersion as Record<string, any>;
              const cloud = c.cloudVersion as Record<string, any>;
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#131926] border border-red-200 dark:border-red-800/80 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {c.entityType} #{c.entityId}
                    </span>
                    <span className="text-slate-500">
                      Detected: {new Date(c.detectedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Local Device Version:</p>
                      <p className="text-slate-700 dark:text-slate-300">Amount: <strong>₹{local.amount ?? local.currentBalance ?? local.outstandingPrincipal}</strong></p>
                      <p className="text-slate-500">Description: {local.description || local.name || 'N/A'}</p>
                      {local.date && <p className="text-slate-500">Date: {local.date}</p>}
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                      <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Cloud / Remote Version:</p>
                      <p className="text-blue-800 dark:text-blue-300">Amount: <strong>₹{cloud.amount ?? cloud.currentBalance ?? cloud.outstandingPrincipal}</strong></p>
                      <p className="text-slate-500">Description: {cloud.description || cloud.name || 'N/A'}</p>
                      {cloud.date && <p className="text-slate-500">Date: {cloud.date}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => handleConflictChoice(c.id, 'KEEP_LOCAL')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition cursor-pointer"
                    >
                      Keep Local
                    </button>
                    <button
                      onClick={() => handleConflictChoice(c.id, 'KEEP_CLOUD')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
                    >
                      Use Cloud
                    </button>
                    <button
                      onClick={() => handleConflictChoice(c.id, 'KEEP_BOTH')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition cursor-pointer"
                      title="Keep both records as separate transactions"
                    >
                      Keep Both
                    </button>
                    <button
                      onClick={() => handleConflictChoice(c.id, 'MERGE')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Merge Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Devices Section */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Registered Devices</h2>
          </div>
          <span className="text-xs text-slate-500">
            {devices.length} authorized device(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {devices.map((dev) => (
            <div
              key={dev.deviceId}
              className={`p-3.5 rounded-xl border transition ${
                dev.isCurrentDevice
                  ? 'border-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {dev.platform.includes('Android') || dev.platform.includes('iOS') ? (
                    <Smartphone className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <Laptop className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{dev.name}</p>
                      {dev.isCurrentDevice && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          This Device
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {dev.platform} • {dev.browser || 'Web'} • App v{dev.appVersion}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>First Seen: {new Date(dev.firstSeenAt).toLocaleDateString()}</span>
                <span>Active: {new Date(dev.lastActiveAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cloud Backups Snapshot Management */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              Cloud Backup Snapshots
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Immutable encrypted full-state snapshots saved in Firestore under your isolated profile.
            </p>
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup || authState.status !== 'signed_in'}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Create Cloud Backup</span>
          </button>
        </div>

        {isLoadingBackups ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
            Loading cloud backup history...
          </div>
        ) : cloudBackups.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
            No cloud backups stored yet. Click "Create Cloud Backup" to capture a checkpoint.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {cloudBackups.map((b) => (
              <div
                key={b.backupId}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131926] hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {b.backupId}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      CRC: {b.checksum}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(b.createdAt).toLocaleString()} • {b.recordCounts.transactions} txs • {b.recordCounts.accounts} accounts • {b.recordCounts.debts} debts
                  </p>
                </div>

                <button
                  onClick={() => setSelectedBackupForRestore(b)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer self-start sm:self-center"
                >
                  <HardDriveDownload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Restore...</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal with Stage 8 Safety */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Confirm Cloud Backup Restore
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Restoring from this cloud backup will replace your current active working ledger with the snapshot captured on{' '}
              <strong>{new Date(selectedBackupForRestore.createdAt).toLocaleString()}</strong>.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Snapshot Contents:</p>
              <ul className="list-disc pl-4 text-slate-600 dark:text-slate-300 space-y-0.5">
                <li>Transactions: {selectedBackupForRestore.recordCounts.transactions}</li>
                <li>Accounts: {selectedBackupForRestore.recordCounts.accounts}</li>
                <li>Debts / Loans: {selectedBackupForRestore.recordCounts.debts}</li>
                <li>Checksum: <code className="font-mono text-[11px]">{selectedBackupForRestore.checksum}</code></li>
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>A local recovery snapshot will be automatically created before restoration so you can rollback at any time.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedBackupForRestore(null)}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isRestoring ? 'Restoring...' : 'Confirm & Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
