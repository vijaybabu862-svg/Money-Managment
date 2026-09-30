import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { filterAuditTrail } from '../../services/auditService';
import { AuditAction, AuditEvent } from '../../types/finance';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  History,
  Search,
  Filter,
  RotateCcw,
  Calendar,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';

export const AuditPage: React.FC = () => {
  const { auditEvents, undoAuditEvent } = useFinance();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [undoStatus, setUndoStatus] = useState<{ id: string; message: string; isError?: boolean } | null>(null);
  const [undoConfirmEvent, setUndoConfirmEvent] = useState<AuditEvent | null>(null);

  // Date boundary calculation
  const { startDate, endDate } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    if (dateFilter === 'TODAY') {
      return { startDate: today, endDate: today };
    }
    if (dateFilter === '7DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { startDate: d.toISOString().split('T')[0], endDate: today };
    }
    if (dateFilter === '30DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { startDate: d.toISOString().split('T')[0], endDate: today };
    }
    return { startDate: undefined, endDate: undefined };
  }, [dateFilter]);

  const filteredEvents = useMemo(() => {
    return filterAuditTrail(auditEvents, {
      query: searchQuery,
      entityType: selectedEntity,
      action: selectedAction,
      startDate,
      endDate,
    });
  }, [auditEvents, searchQuery, selectedEntity, selectedAction, startDate, endDate]);

  const handleUndo = (event: AuditEvent) => {
    setUndoConfirmEvent(event);
  };

  const handleConfirmUndoAction = () => {
    if (!undoConfirmEvent) return;
    const event = undoConfirmEvent;
    const res = undoAuditEvent(event);
    if (res.success) {
      setUndoStatus({ id: event.id, message: 'Action successfully reversed!' });
      setTimeout(() => setUndoStatus(null), 4000);
    } else {
      setUndoStatus({ id: event.id, message: res.error || 'Failed to undo action.', isError: true });
    }
    setUndoConfirmEvent(null);
  };

  const entityTypes = ['ALL', 'Transaction', 'Account', 'Debt', 'DebtPayment', 'Goal', 'Budget', 'SmsCandidate', 'Backup', 'Ledger'];
  const actions: (AuditAction | 'ALL')[] = [
    'ALL',
    'CREATE',
    'UPDATE',
    'DELETE',
    'CONFIRM',
    'RECONCILE',
    'RESTORE',
    'REVERSAL',
    'REPAIR',
    'DUPLICATE',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
              <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Audit Trail & History
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              Immutable
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Complete chronological record of financial transactions, edits, reconciliations, and recovery events.
          </p>
        </div>

        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
          Total Recorded Events: <span className="font-semibold text-gray-800 dark:text-gray-200">{auditEvents.length}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#131926] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Entity Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {entityTypes.map((et) => (
                <option key={et} value={et}>
                  {et === 'ALL' ? 'All Entities' : et}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {actions.map((act) => (
                <option key={act} value={act}>
                  {act === 'ALL' ? 'All Actions' : act}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full py-2 px-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="7DAYS">Last 7 Days</option>
              <option value="30DAYS">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Undo feedback banner */}
      {undoStatus && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            undoStatus.isError
              ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
          }`}
        >
          {undoStatus.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>{undoStatus.message}</span>
        </div>
      )}

      {/* Timeline List */}
      <div className="bg-white dark:bg-[#131926] rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-xs overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No audit events found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              No audit records match your search criteria. As you make transactions, edits, or reconciliations, events will appear here.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isExpanded = expandedEventId === ev.id;
            const dateObj = new Date(ev.timestamp);
            const formattedDate = dateObj.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            const formattedTime = dateObj.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const actionColors: Record<string, string> = {
              CREATE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
              UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
              DELETE: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
              RESTORE: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
              CONFIRM: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
              RECONCILE: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
              REVERSAL: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
              REPAIR: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
              DUPLICATE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
            };

            return (
              <div key={ev.id} className="p-4 hover:bg-gray-50/70 dark:hover:bg-gray-900/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {formattedDate} • {formattedTime}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          actionColors[ev.action] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {ev.action}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono">
                        {ev.entityType}
                      </span>
                      {ev.source && (
                        <span className="text-[11px] text-gray-400">
                          via {ev.source}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {ev.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {ev.canUndo && (
                      <button
                        onClick={() => handleUndo(ev)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md transition-colors cursor-pointer"
                        title="Safely undo this specific change"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Undo
                      </button>
                    )}

                    {(Boolean(ev.before) || Boolean(ev.after)) && (
                      <button
                        onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            Less <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            Diff <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Diff Viewer */}
                {isExpanded && (Boolean(ev.before) || Boolean(ev.after)) && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/80 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-mono grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Boolean(ev.before) && (
                      <div>
                        <div className="font-semibold text-red-600 dark:text-red-400 mb-1">State Before:</div>
                        <pre className="overflow-x-auto p-2 bg-white dark:bg-black/30 rounded border border-gray-200 dark:border-gray-800 text-[11px] leading-relaxed">
                          {JSON.stringify(ev.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {Boolean(ev.after) && (
                      <div>
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">State After:</div>
                        <pre className="overflow-x-auto p-2 bg-white dark:bg-black/30 rounded border border-gray-200 dark:border-gray-800 text-[11px] leading-relaxed">
                          {JSON.stringify(ev.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* Undo Action Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!undoConfirmEvent}
        title="Undo Audit Event"
        message={`Are you sure you want to safely reverse this action?\n\n"${undoConfirmEvent?.summary || ''}"`}
        confirmText="Undo Action"
        isDestructive={true}
        onConfirm={handleConfirmUndoAction}
        onCancel={() => setUndoConfirmEvent(null)}
      />
    </div>
  );
};
