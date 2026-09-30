import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/currency';
import { formatIndianDate, getCurrentDateISO } from '../../utils/dates';
import { Debt, DebtType } from '../../types/finance';
import {
  STANDARD_LOAN_PURPOSES,
  resolveLoanPurpose,
} from '../../services/centralFinanceCalculations';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  X,
  Save,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const LoansPage: React.FC = () => {
  const {
    debtsWithDetails,
    addDebt,
    updateDebt,
    deleteDebt,
    centralPosition,
  } = useFinance();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Debt | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [lenderName, setLenderName] = useState('');
  const [purpose, setPurpose] = useState('Personal expense');
  const [customPurpose, setCustomPurpose] = useState('');
  const [type, setType] = useState<DebtType>('PERSONAL_LOAN');
  const [originalPrincipal, setOriginalPrincipal] = useState('');
  const [outstandingPrincipal, setOutstandingPrincipal] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [remainingMonths, setRemainingMonths] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE');

  const handleOpenAdd = () => {
    setEditingLoan(null);
    setName('');
    setLenderName('');
    setPurpose('Personal expense');
    setCustomPurpose('');
    setType('PERSONAL_LOAN');
    setOriginalPrincipal('');
    setOutstandingPrincipal('');
    setEmiAmount('');
    setInterestRate('');
    setRemainingMonths('');
    setNextDueDate(getCurrentDateISO());
    setStatus('ACTIVE');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loan: Debt) => {
    setEditingLoan(loan);
    setName(loan.name);
    setLenderName(loan.lenderName || '');
    const currentPurpose = resolveLoanPurpose(loan);
    if (STANDARD_LOAN_PURPOSES.includes(currentPurpose as any)) {
      setPurpose(currentPurpose);
      setCustomPurpose('');
    } else {
      setPurpose('Other');
      setCustomPurpose(currentPurpose);
    }
    setType(loan.type);
    setOriginalPrincipal(String(loan.originalPrincipal || ''));
    setOutstandingPrincipal(String(loan.outstandingPrincipal || ''));
    setEmiAmount(String(loan.emiAmount || ''));
    setInterestRate(loan.interestRate ? String(loan.interestRate) : '');
    setRemainingMonths(loan.remainingMonths ? String(loan.remainingMonths) : '');
    setNextDueDate(loan.nextDueDate || '');
    setStatus(loan.status);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const orig = parseFloat(originalPrincipal);
    const out = parseFloat(outstandingPrincipal) || orig;
    const emi = parseFloat(emiAmount) || 0;

    if (!name.trim()) {
      showToast('Please enter a loan name', 'error');
      return;
    }
    if (isNaN(orig) || orig <= 0) {
      showToast('Please enter a valid original amount', 'error');
      return;
    }

    const finalPurpose =
      purpose === 'Other' && customPurpose.trim()
        ? customPurpose.trim()
        : purpose;

    if (editingLoan) {
      updateDebt({
        ...editingLoan,
        name: name.trim(),
        lenderName: lenderName.trim() || undefined,
        purpose: finalPurpose,
        type,
        originalPrincipal: orig,
        outstandingPrincipal: out,
        emiAmount: emi,
        interestRate: parseFloat(interestRate) || undefined,
        remainingMonths: parseInt(remainingMonths, 10) || undefined,
        nextDueDate: nextDueDate || undefined,
        status,
      });
      showToast(`✓ Updated loan "${name.trim()}"`);
    } else {
      addDebt({
        name: name.trim(),
        lenderName: lenderName.trim() || undefined,
        purpose: finalPurpose,
        type,
        originalPrincipal: orig,
        emiAmount: emi,
        interestRate: parseFloat(interestRate) || undefined,
        remainingMonths: parseInt(remainingMonths, 10) || undefined,
        nextDueDate: nextDueDate || undefined,
        status,
      });
      showToast(`✓ Added loan "${name.trim()}"`);
    }

    setIsModalOpen(false);
    setEditingLoan(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;
    const loan = debtsWithDetails.find((d) => d.id === deleteConfirmId);
    deleteDebt(deleteConfirmId);
    showToast(`✓ Deleted loan "${loan?.name || ''}"`);
    setDeleteConfirmId(null);
  };

  const {
    totalActiveLoans,
    totalOutstandingDebt,
    totalMonthlyEMI,
    emiPercentage,
    monthlySalary,
  } = centralPosition;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Loans & EMIs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track all active borrowings, stated loan purposes, and monthly EMI commitments
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Loan</span>
        </button>
      </div>

      {/* Top 4-Metric Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Loans */}
        <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Active Loans
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight mt-1">
            {totalActiveLoans}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Borrowing accounts
          </p>
        </div>

        {/* Total Outstanding */}
        <div className="bg-white dark:bg-[#131926] border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Total Outstanding
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight mt-1">
            {formatINR(totalOutstandingDebt)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Principal remaining
          </p>
        </div>

        {/* Total Monthly EMI */}
        <div className="bg-white dark:bg-[#131926] border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
            Total Monthly EMI
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums tracking-tight mt-1">
            {formatINR(totalMonthlyEMI)}
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">
            Deducted every month
          </p>
        </div>

        {/* EMI / Salary */}
        <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            EMI / Salary
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight mt-1">
            {emiPercentage}%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            of {formatINR(monthlySalary)} salary
          </p>
        </div>
      </div>

      {/* Loans Table & Cards */}
      <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            All Loans & Credit Obligations ({debtsWithDetails.length})
          </h2>
          <span className="text-xs text-slate-500">
            Total EMI: <strong>{formatINR(totalMonthlyEMI)}/mo</strong>
          </span>
        </div>

        {debtsWithDetails.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <CreditCard className="w-10 h-10 mx-auto mb-2 stroke-1 opacity-50" />
            <p className="text-sm">No loans recorded.</p>
            <button
              onClick={handleOpenAdd}
              className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add a loan or EMI commitment
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {debtsWithDetails.map((loan) => {
              const currentPurpose = resolveLoanPurpose(loan);
              return (
                <div
                  key={loan.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                >
                  {/* Left: Name, Lender, Purpose Badge */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {loan.name}
                      </h3>
                      {loan.status === 'CLOSED' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          CLOSED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          ACTIVE
                        </span>
                      )}
                      {/* Clearly Visible Purpose Badge */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <Tag className="w-3 h-3" />
                        <span>Purpose: {currentPurpose}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {loan.lenderName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Lender: <strong>{loan.lenderName}</strong></span>
                        </span>
                      )}
                      {loan.interestRate && (
                        <span>Interest: <strong>{loan.interestRate}% p.a.</strong></span>
                      )}
                      {loan.nextDueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Due: <strong>{formatIndianDate(loan.nextDueDate)}</strong></span>
                        </span>
                      )}
                      {loan.remainingMonths && (
                        <span>Tenure: <strong>{loan.remainingMonths} mos left</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Middle / Right: EMI & Outstanding Balance */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Monthly EMI
                      </span>
                      <div className="text-lg sm:text-xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatINR(loan.emiAmount || 0)}
                      </div>
                      <span className="text-[11px] text-slate-400">per month</span>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Outstanding Balance
                      </span>
                      <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {formatINR(loan.outstandingPrincipal)}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        of {formatINR(loan.originalPrincipal)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(loan)}
                        title="Edit loan"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(loan.id)}
                        title="Delete loan"
                        className="p-2 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 bg-white dark:bg-[#131926] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Delete Loan Obligation?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to remove this loan? Its EMI will no longer be deducted from your salary calculation.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition"
              >
                Delete Loan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Loan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleFormSubmit}
            className="w-full max-w-lg p-6 bg-white dark:bg-[#131926] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 my-8"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingLoan ? 'Edit Loan Obligation' : 'Add New Loan Obligation'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Name & Lender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Loan Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. PhonePe Personal Loan"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lender / Bank
                  </label>
                  <input
                    type="text"
                    value={lenderName}
                    onChange={(e) => setLenderName(e.target.value)}
                    placeholder="e.g. IDFC First Bank, TVS Credit"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Purpose (Required & Clearly Visible) */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Loan Purpose (Why was this loan taken?) *
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden"
                >
                  {STANDARD_LOAN_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {purpose === 'Other' && (
                  <input
                    type="text"
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                    placeholder="Enter custom loan purpose"
                    className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden"
                  />
                )}
              </div>

              {/* Amounts: Original & Outstanding */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Original Loan Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={originalPrincipal}
                    onChange={(e) => setOriginalPrincipal(e.target.value)}
                    placeholder="90000"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Outstanding Balance (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={outstandingPrincipal}
                    onChange={(e) => setOutstandingPrincipal(e.target.value)}
                    placeholder="Leave empty to use original"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Monthly EMI & Interest */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly EMI (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    required
                    value={emiAmount}
                    onChange={(e) => setEmiAmount(e.target.value)}
                    placeholder="4843"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Annual Interest Rate (% p.a., if known)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="15.5"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Tenure & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Remaining Tenure (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="360"
                    value={remainingMonths}
                    onChange={(e) => setRemainingMonths(e.target.value)}
                    placeholder="17"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Next EMI Due Date
                  </label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Loan Status
                </label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="loanStatus"
                      checked={status === 'ACTIVE'}
                      onChange={() => setStatus('ACTIVE')}
                    />
                    <span>Active (Deduct EMI from Salary)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="loanStatus"
                      checked={status === 'CLOSED'}
                      onChange={() => setStatus('CLOSED')}
                    />
                    <span>Closed (Paid Off)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingLoan ? 'Save Changes' : 'Create Loan'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex justify-between items-center pt-2">
        <Link
          to="/"
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          ← Back to Dashboard
        </Link>
        <Link
          to="/salary"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          <span>Check Salary & EMI Position</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
