import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  ArrowRight,
  ShieldAlert,
  Wallet,
  Calendar,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/currency';
import { formatIndianDate, getCurrentDateISO } from '../../utils/dates';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Payment, PaymentStatus, PaymentType } from '../../types/finance';

export const PaymentsPage: React.FC = () => {
  const { state, updatePaymentStatus, addPayment, deletePayment, payAndSettlePayment, summary, debtObligations } = useFinance();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'ALL_SECTIONS' | 'OVERDUE' | 'TODAY' | 'WEEK' | 'MONTH' | 'PAID'>('ALL_SECTIONS');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [settlingPayment, setSettlingPayment] = useState<Payment | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  // Settlement Form states
  const [settleAccountId, setSettleAccountId] = useState(state.accounts[0]?.id || '');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDate, setSettleDate] = useState(getCurrentDateISO());
  const [settlePrincipal, setSettlePrincipal] = useState('');
  const [settleInterest, setSettleInterest] = useState('');
  const [settleNotes, setSettleNotes] = useState('');

  // Add Commitment Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(getCurrentDateISO());
  const [type, setType] = useState<PaymentType>('UTILITY');
  const [recurring, setRecurring] = useState(true);
  const [linkedDebtId, setLinkedDebtId] = useState('');

  const todayStr = getCurrentDateISO();
  const todayTime = new Date(todayStr).getTime();

  // Date categorization
  const { overduePayments, todayPayments, next7DaysPayments, next30DaysPayments, recentlyPaidPayments } = useMemo(() => {
    const overdue: Payment[] = [];
    const todayList: Payment[] = [];
    const next7Days: Payment[] = [];
    const next30Days: Payment[] = [];
    const paidList: Payment[] = [];

    for (const p of state.payments) {
      if (p.status === 'PAID') {
        paidList.push(p);
        continue;
      }

      const pTime = new Date(p.dueDate).getTime();
      const diffDays = Math.round((pTime - todayTime) / (1000 * 60 * 60 * 24));

      if (diffDays < 0 || p.status === 'OVERDUE') {
        overdue.push(p);
      } else if (diffDays === 0) {
        todayList.push(p);
      } else if (diffDays > 0 && diffDays <= 7) {
        next7Days.push(p);
      } else if (diffDays > 7 && diffDays <= 30) {
        next30Days.push(p);
      } else {
        next30Days.push(p); // Future scheduled
      }
    }

    const sortFn = (a: Payment, b: Payment) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    overdue.sort(sortFn);
    todayList.sort(sortFn);
    next7Days.sort(sortFn);
    next30Days.sort(sortFn);
    paidList.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

    return {
      overduePayments: overdue,
      todayPayments: todayList,
      next7DaysPayments: next7Days,
      next30DaysPayments: next30Days,
      recentlyPaidPayments: paidList,
    };
  }, [state.payments, todayTime]);

  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);
  const totalToday = todayPayments.reduce((sum, p) => sum + p.amount, 0);
  const total7Days = next7DaysPayments.reduce((sum, p) => sum + p.amount, 0);
  const total30Days = next30DaysPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = recentlyPaidPayments.reduce((sum, p) => sum + p.amount, 0);

  const handleOpenSettle = (p: Payment) => {
    setSettlingPayment(p);
    setSettleAmount(String(p.amount));
    setSettleDate(getCurrentDateISO());
    setSettleNotes(`Paid ${p.title} via payment center`);

    // Pick first bank or cash account with positive balance if available
    const defaultAcc = state.accounts.find((a) => a.type === 'BANK' && a.isActive) || state.accounts[0];
    if (defaultAcc) setSettleAccountId(defaultAcc.id);

    // If linked debt, calculate initial split
    if (p.debtId) {
      const debt = state.debts.find((d) => d.id === p.debtId);
      const rate = ((debt?.interestRate || 14) / 100) / 12;
      const outstanding = debt?.outstandingPrincipal || p.amount;
      const estInterest = Math.round(outstanding * rate);
      const estPrincipal = Math.max(0, p.amount - estInterest);
      setSettleInterest(String(estInterest));
      setSettlePrincipal(String(estPrincipal));
    } else {
      setSettleInterest('0');
      setSettlePrincipal(String(p.amount));
    }
  };

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingPayment) return;

    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    const pAmt = parseFloat(settlePrincipal) || 0;
    const iAmt = parseFloat(settleInterest) || 0;

    payAndSettlePayment({
      paymentId: settlingPayment.id,
      accountId: settleAccountId,
      amount: amt,
      date: settleDate,
      principalAmount: settlingPayment.debtId ? pAmt : undefined,
      interestAmount: settlingPayment.debtId ? iAmt : undefined,
      notes: settleNotes,
    });

    const accName = state.accounts.find((a) => a.id === settleAccountId)?.name || 'Account';
    showToast(`✓ Paid ₹${amt.toLocaleString('en-IN')} for "${settlingPayment.title}" from ${accName}`);
    setSettlingPayment(null);
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    addPayment({
      title: title.trim(),
      amount: val,
      dueDate,
      type,
      status: 'UPCOMING',
      recurring,
      debtId: linkedDebtId ? linkedDebtId : undefined,
    });

    showToast(`✓ Added commitment "${title}"`);
    setTitle('');
    setAmount('');
    setLinkedDebtId('');
    setIsAddOpen(false);
  };

  const renderPaymentCard = (p: Payment) => {
    const isPaid = p.status === 'PAID';
    const isOverdue = p.status === 'OVERDUE' || (new Date(p.dueDate).getTime() < todayTime && !isPaid);
    const linkedDebt = p.debtId ? state.debts.find((d) => d.id === p.debtId) : undefined;

    return (
      <div
        key={p.id}
        className={`bg-white dark:bg-[#131926] border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
          isPaid
            ? 'border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/20 dark:bg-emerald-950/10'
            : isOverdue
            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
            : 'border-[#E5E7EB] dark:border-[#1F2937]'
        }`}
      >
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                  {p.type}
                </span>
                {p.recurring && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
                    • Recurring
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F3F4F6] mt-1">
                {p.title}
              </h3>
              {linkedDebt && (
                <div className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                  <span>Linked:</span>
                  <span className="font-semibold">{linkedDebt.name}</span>
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-lg sm:text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatINR(p.amount)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-3">
            <Clock className="w-3.5 h-3.5" />
            <span>Due {formatIndianDate(p.dueDate, { relative: true })}</span>
          </div>
        </div>

        {/* Action Button & Status Bar */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              isPaid
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : isOverdue
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'DUE SOON'}
          </span>

          {!isPaid ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => updatePaymentStatus(p.id, 'PAID')}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                title="Mark as paid without recording cash transfer"
              >
                Mark Paid
              </button>
              <button
                onClick={() => handleOpenSettle(p)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pay & Settle</span>
              </button>
              <button
                onClick={() => setDeletePaymentId(p.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                title="Delete Commitment"
                aria-label="Delete Commitment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Settled</span>
              </div>
              <button
                onClick={() => setDeletePaymentId(p.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                title="Delete Commitment"
                aria-label="Delete Commitment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
            Payment Center
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Date-categorized obligations: EMIs, credit cards, bills, and recurring commitments
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Commitment</span>
        </button>
      </div>

      {/* Critical Overdue Banner if overdue payments exist */}
      {overduePayments.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">
                {overduePayments.length} Payment{overduePayments.length > 1 ? 's' : ''} Overdue ({formatINR(totalOverdue)})
              </div>
              <div className="text-xs text-rose-700 dark:text-rose-300">
                Immediate attention required to prevent penalty charges and credit score impact.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('OVERDUE')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition"
          >
            Review Overdue
          </button>
        </div>
      )}

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Overdue
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-1">
            {formatINR(totalOverdue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{overduePayments.length} pending</div>
        </div>

        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Due Today
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {formatINR(totalToday)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{todayPayments.length} items</div>
        </div>

        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
            Next 7 Days
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {formatINR(total7Days)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{next7DaysPayments.length} items</div>
        </div>

        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Recently Paid
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
            {formatINR(totalPaid)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{recentlyPaidPayments.length} settled</div>
        </div>
      </div>

      {/* Debt-to-Income (DTI) Obligation Overview Bar */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#6B7280] dark:text-[#9CA3AF] uppercase">
                Monthly Debt & Commitment Burden
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  debtObligations.dtiStatus === 'HEALTHY'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : debtObligations.dtiStatus === 'CAUTION'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {debtObligations.dtiStatus} ({debtObligations.debtToIncomeRatio}% DTI)
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
              {formatINR(debtObligations.totalMonthlyObligations)}{' '}
              <span className="text-xs font-normal text-slate-500">/ month fixed obligation</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Loan EMIs</div>
              <div className="font-semibold tabular-nums">{formatINR(debtObligations.monthlyTotalEMIs)}</div>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase">CC Min Due</div>
              <div className="font-semibold tabular-nums">{formatINR(debtObligations.creditCardMinimumDues)}</div>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Other Recurring</div>
              <div className="font-semibold tabular-nums">{formatINR(debtObligations.recurringCommitmentsTotal)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'ALL_SECTIONS', label: 'All Date Sections', count: state.payments.length },
          { id: 'OVERDUE', label: 'Overdue', count: overduePayments.length },
          { id: 'TODAY', label: 'Due Today', count: todayPayments.length },
          { id: 'WEEK', label: 'Next 7 Days', count: next7DaysPayments.length },
          { id: 'MONTH', label: 'Next 30 Days', count: next30DaysPayments.length },
          { id: 'PAID', label: 'Recently Paid', count: recentlyPaidPayments.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] opacity-75 font-mono px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Date-Based Sections View */}
      {activeTab === 'ALL_SECTIONS' ? (
        <div className="space-y-8">
          {/* Section 1: Overdue */}
          {overduePayments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    Overdue ({overduePayments.length})
                  </h2>
                </div>
                <div className="text-sm font-bold text-rose-600 tabular-nums">
                  {formatINR(totalOverdue)}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {overduePayments.map(renderPaymentCard)}
              </div>
            </div>
          )}

          {/* Section 2: Due Today */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Due Today ({todayPayments.length})
                </h2>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                {formatINR(totalToday)}
              </div>
            </div>
            {todayPayments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayPayments.map(renderPaymentCard)}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
                ✓ No payments scheduled for today.
              </div>
            )}
          </div>

          {/* Section 3: Next 7 Days */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Next 7 Days ({next7DaysPayments.length})
                </h2>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                {formatINR(total7Days)}
              </div>
            </div>
            {next7DaysPayments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {next7DaysPayments.map(renderPaymentCard)}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
                No commitments due in the next 7 days.
              </div>
            )}
          </div>

          {/* Section 4: Next 30 Days */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Next 30 Days & Later ({next30DaysPayments.length})
                </h2>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                {formatINR(total30Days)}
              </div>
            </div>
            {next30DaysPayments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {next30DaysPayments.map(renderPaymentCard)}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
                No further commitments scheduled this month.
              </div>
            )}
          </div>

          {/* Section 5: Recently Paid */}
          {recentlyPaidPayments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h2 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Recently Paid ({recentlyPaidPayments.length})
                  </h2>
                </div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatINR(totalPaid)}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentlyPaidPayments.map(renderPaymentCard)}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Filtered View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === 'OVERDUE' && overduePayments.map(renderPaymentCard)}
          {activeTab === 'TODAY' && todayPayments.map(renderPaymentCard)}
          {activeTab === 'WEEK' && next7DaysPayments.map(renderPaymentCard)}
          {activeTab === 'MONTH' && next30DaysPayments.map(renderPaymentCard)}
          {activeTab === 'PAID' && recentlyPaidPayments.map(renderPaymentCard)}
        </div>
      )}

      {/* Pay & Settle Interactive Modal */}
      {settlingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131926] p-6 shadow-2xl border border-[#E5E7EB] dark:border-[#1F2937]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                  Pay & Settle Commitment
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Deducts from account and updates status to Paid
                </p>
              </div>
              <button
                onClick={() => setSettlingPayment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500">Payment for:</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {settlingPayment.title}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Due: {formatIndianDate(settlingPayment.dueDate)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  PAY FROM ACCOUNT *
                </label>
                <select
                  value={settleAccountId}
                  onChange={(e) => setSettleAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                >
                  {state.accounts
                    .filter((a) => a.isActive && a.type !== 'CREDIT_CARD')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    TOTAL AMOUNT (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white tabular-nums font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    SETTLEMENT DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* If it's linked to debt EMI, show principal & interest split */}
              {settlingPayment.debtId && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Loan Principal & Interest Split
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Principal (₹)
                      </label>
                      <input
                        type="number"
                        value={settlePrincipal}
                        onChange={(e) => setSettlePrincipal(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Interest (₹)
                      </label>
                      <input
                        type="number"
                        value={settleInterest}
                        onChange={(e) => setSettleInterest(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white tabular-nums"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Principal repayment reduces debt balance; interest is recorded as cost.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  NOTES (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR / Transaction reference..."
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSettlingPayment(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                >
                  Confirm & Pay ₹{parseFloat(settleAmount || '0').toLocaleString('en-IN')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Commitment Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131926] p-6 shadow-2xl border border-[#E5E7EB] dark:border-[#1F2937]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                Add Payment Commitment
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  TITLE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PhonePe Loan EMI, Electricity Bill..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    AMOUNT (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    DUE DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  PAYMENT TYPE
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PaymentType)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                >
                  <option value="EMI">Loan EMI</option>
                  <option value="CREDIT_CARD">Credit Card Bill</option>
                  <option value="RENT">Rent</option>
                  <option value="UTILITY">Electricity / Water / Gas</option>
                  <option value="PHONE">Phone & Internet</option>
                  <option value="SUBSCRIPTION">Subscription</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {type === 'EMI' && (
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    LINK TO DEBT / LOAN
                  </label>
                  <select
                    value={linkedDebtId}
                    onChange={(e) => setLinkedDebtId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                  >
                    <option value="">-- None (Standalone) --</option>
                    {state.debts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (Outstanding: ₹{d.outstandingPrincipal.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rec"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <label htmlFor="rec" className="text-xs text-slate-700 dark:text-slate-300">
                  Recurring commitment every month
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
                >
                  Save Commitment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Payment Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletePaymentId}
        title="Delete Payment Commitment"
        message="Are you sure you want to delete this payment commitment? Scheduled cash flow alerts and upcoming payment trackers will be updated."
        confirmText="Delete Commitment"
        isDestructive={true}
        onConfirm={() => {
          if (deletePaymentId) {
            const p = state.payments.find((item) => item.id === deletePaymentId);
            deletePayment(deletePaymentId);
            showToast(`✓ Payment commitment "${p?.title || ''}" deleted`);
            setDeletePaymentId(null);
          }
        }}
        onCancel={() => setDeletePaymentId(null)}
      />
    </div>
  );
};
