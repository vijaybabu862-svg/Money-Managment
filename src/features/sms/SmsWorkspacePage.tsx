import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';
import {
  SmsTransactionCandidate,
  SmsCandidateType,
} from '../../types/finance';
import { matchCandidate } from '../../services/transactionMatcher';
import { SmsReviewCard } from './components/SmsReviewCard';
import { SmsImportTab } from './components/SmsImportTab';
import { SmsConfirmModal } from './components/SmsConfirmModal';
import { SmsEditModal } from './components/SmsEditModal';
import { SmsLinkModal } from './components/SmsLinkModal';
import { SmsPrivacyTab } from './components/SmsPrivacyTab';
import { formatINR } from '../../utils/currency';
import {
  MessageSquareCode,
  Inbox,
  PlusCircle,
  Link2,
  History,
  Shield,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const SmsWorkspacePage: React.FC = () => {
  const {
    state,
    confirmSmsTransaction,
    rejectSmsCandidate,
    ignoreSmsCandidate,
    linkSmsCandidate,
    clearSmsRawText,
  } = useFinance();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'review';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'AMOUNT_HIGH' | 'AMOUNT_LOW'>('NEWEST');

  // Modals state
  const [confirmCandidate, setConfirmCandidate] = useState<SmsTransactionCandidate | null>(null);
  const [editCandidate, setEditCandidate] = useState<SmsTransactionCandidate | null>(null);
  const [linkCandidate, setLinkCandidate] = useState<SmsTransactionCandidate | null>(null);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

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

  // Pre-calculate matches for all candidates
  const candidateMatches = useMemo(() => {
    const map = new Map();
    for (const cand of state.smsCandidates || []) {
      map.set(cand.id, matchCandidate(cand, matchContext));
    }
    return map;
  }, [state.smsCandidates, state.transactions, state.debts, state.swiggyShifts]);

  // Counts for tabs
  const pendingCount = (state.smsCandidates || []).filter((c) => c.reviewStatus === 'PENDING').length;
  const matchedCount = (state.smsCandidates || []).filter((c) => {
    const m = candidateMatches.get(c.id);
    return c.reviewStatus === 'PENDING' && (m?.matchConfidence === 'STRONG_MATCH' || m?.matchConfidence === 'POSSIBLE_MATCH');
  }).length;
  const historyCount = (state.smsCandidates || []).filter(
    (c) => c.reviewStatus === 'CONFIRMED' || c.reviewStatus === 'REJECTED' || c.reviewStatus === 'IGNORED'
  ).length;

  // Filtered and sorted candidate list
  const filteredCandidates = useMemo(() => {
    let list = [...(state.smsCandidates || [])];

    // Tab view partition
    if (activeTab === 'review') {
      list = list.filter((c) => c.reviewStatus === 'PENDING');
    } else if (activeTab === 'matched') {
      list = list.filter((c) => {
        const m = candidateMatches.get(c.id);
        return m?.matchConfidence === 'STRONG_MATCH' || m?.matchConfidence === 'POSSIBLE_MATCH' || c.matchedSwiggyShiftId;
      });
    } else if (activeTab === 'history') {
      list = list.filter((c) => c.reviewStatus === 'CONFIRMED' || c.reviewStatus === 'REJECTED' || c.reviewStatus === 'IGNORED');
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        return (
          c.detectedMerchant?.toLowerCase().includes(q) ||
          c.detectedDescription?.toLowerCase().includes(q) ||
          c.sender?.toLowerCase().includes(q) ||
          c.detectedAccountReference?.toLowerCase().includes(q) ||
          c.detectedCardReference?.toLowerCase().includes(q) ||
          String(c.detectedAmount || '').includes(q)
        );
      });
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      list = list.filter((c) => c.reviewStatus === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      list = list.filter((c) => c.transactionType === typeFilter);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'AMOUNT_HIGH') return (b.detectedAmount || 0) - (a.detectedAmount || 0);
      if (sortBy === 'AMOUNT_LOW') return (a.detectedAmount || 0) - (b.detectedAmount || 0);
      if (sortBy === 'OLDEST') {
        const dateA = a.detectedTransactionDate || a.createdAt;
        const dateB = b.detectedTransactionDate || b.createdAt;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      }
      // NEWEST default
      const dateA = a.detectedTransactionDate || a.createdAt;
      const dateB = b.detectedTransactionDate || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return list;
  }, [state.smsCandidates, activeTab, searchQuery, statusFilter, typeFilter, sortBy, candidateMatches]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-extrabold text-sm shadow-xs">
              <MessageSquareCode className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              SMS Transaction Detection & Review
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Private, local-first SMS ingestion with duplicate prevention, operational matching, and user confirmation.
          </p>
        </div>

        <button
          onClick={() => setTab('import')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs active:scale-95 transition flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Paste / Import SMS</span>
        </button>
      </div>

      {/* Stage 5 Architecture Flow Indicator (Section 1, 79, 80) */}
      <div className="p-3 bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl shadow-xs overflow-x-auto text-[11px] font-bold text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-slate-900 dark:text-white flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            SMS Ingestion
          </span>
          <span className="text-slate-300 dark:text-slate-700">→</span>
          <span>Parser</span>
          <span className="text-slate-300 dark:text-slate-700">→</span>
          <span>Candidate Extraction</span>
          <span className="text-slate-300 dark:text-slate-700">→</span>
          <span>Duplicate Detection</span>
          <span className="text-slate-300 dark:text-slate-700">→</span>
          <span className="text-blue-600 dark:text-blue-400 font-extrabold">Review Inbox</span>
          <span className="text-slate-300 dark:text-slate-700">→</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">User Confirmation</span>
          <span className="text-slate-300 dark:text-slate-700">→</span>
          <span className="text-slate-900 dark:text-white">Financial Ledger</span>
        </div>
      </div>

      {/* Navigation Tabs (Section 21, 62) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setTab('review')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
            activeTab === 'review'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Needs Review</span>
          {pendingCount > 0 && (
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                activeTab === 'review'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
              }`}
            >
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('import')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
            activeTab === 'import'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Import SMS</span>
        </button>

        <button
          onClick={() => setTab('matched')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
            activeTab === 'matched'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Matched & Linked</span>
          {matchedCount > 0 && (
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                activeTab === 'matched'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              {matchedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('history')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Review History ({historyCount})</span>
        </button>

        <button
          onClick={() => setTab('privacy')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
            activeTab === 'privacy'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Privacy & Data</span>
        </button>
      </div>

      {/* Tab 1: Import View */}
      {activeTab === 'import' && (
        <SmsImportTab onImportComplete={() => setTab('review')} />
      )}

      {/* Tab 2: Privacy View */}
      {activeTab === 'privacy' && <SmsPrivacyTab />}

      {/* Tab 3, 4, 5: Review / Matched / History Cards View */}
      {activeTab !== 'import' && activeTab !== 'privacy' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SMS by merchant, account XXXX, amount, or sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-hidden"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'history' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="IGNORED">Ignored</option>
                  <option value="DUPLICATE">Duplicate</option>
                </select>
              )}

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden"
              >
                <option value="ALL">All Types</option>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
                <option value="DEBT_PAYMENT">Debt Payment (EMI)</option>
                <option value="TRANSFER">Transfer</option>
                <option value="REFUND">Refund</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden"
              >
                <option value="NEWEST">Newest Date First</option>
                <option value="OLDEST">Oldest Date First</option>
                <option value="AMOUNT_HIGH">Highest Amount</option>
                <option value="AMOUNT_LOW">Lowest Amount</option>
              </select>
            </div>
          </div>

          {/* Cards List */}
          {filteredCandidates.length === 0 ? (
            <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-3xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No SMS Candidates Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                {activeTab === 'review'
                  ? 'All detected SMS alerts have been reviewed! New pasted SMS messages will show up here.'
                  : 'No records matching the selected search or filter criteria.'}
              </p>
              <button
                onClick={() => setTab('import')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Paste Sample Bank SMS</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCandidates.map((candidate) => {
                const matchResult = candidateMatches.get(candidate.id);
                return (
                  <SmsReviewCard
                    key={candidate.id}
                    candidate={candidate}
                    matchResult={matchResult}
                    onConfirm={(c) => setConfirmCandidate(c)}
                    onEdit={(c) => setEditCandidate(c)}
                    onMatch={(c) => setLinkCandidate(c)}
                    onReject={(id) => rejectSmsCandidate(id)}
                    onIgnore={(id) => ignoreSmsCandidate(id)}
                    onClearRawText={(id) => clearSmsRawText(id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmCandidate && (
        <SmsConfirmModal
          candidate={confirmCandidate}
          matchResult={candidateMatches.get(confirmCandidate.id)}
          isOpen={!!confirmCandidate}
          onClose={() => setConfirmCandidate(null)}
          onConfirm={() => {
            confirmSmsTransaction(confirmCandidate.id);
            setConfirmCandidate(null);
          }}
        />
      )}

      {/* Edit Modal */}
      {editCandidate && (
        <SmsEditModal
          candidate={editCandidate}
          isOpen={!!editCandidate}
          onClose={() => setEditCandidate(null)}
          onSaveAndConfirm={(overrides) => {
            confirmSmsTransaction(editCandidate.id, overrides);
            setEditCandidate(null);
          }}
        />
      )}

      {/* Link Existing Modal */}
      {linkCandidate && (
        <SmsLinkModal
          candidate={linkCandidate}
          matchResult={candidateMatches.get(linkCandidate.id)}
          isOpen={!!linkCandidate}
          onClose={() => setLinkCandidate(null)}
          onLink={(targetTxId, targetShiftId, targetDebtId) => {
            linkSmsCandidate(linkCandidate.id, targetTxId, targetShiftId, targetDebtId);
            setLinkCandidate(null);
          }}
        />
      )}
    </div>
  );
};
