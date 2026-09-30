import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/currency';
import {
  TrendingUp,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SalaryPage: React.FC = () => {
  const { centralPosition, updateSalary } = useFinance();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [salaryInput, setSalaryInput] = useState(String(centralPosition.monthlySalary));

  const handleSaveSalary = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(salaryInput);
    if (isNaN(parsed) || parsed < 0) {
      showToast('Please enter a valid salary amount', 'error');
      return;
    }
    updateSalary(parsed);
    setIsEditing(false);
    showToast(`✓ Monthly salary updated to ${formatINR(parsed)}`);
  };

  const {
    monthlySalary,
    totalMonthlyEMI,
    salaryRemainingAfterEMI,
    emiPercentage,
    totalActiveLoans,
  } = centralPosition;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Salary & EMI Position
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track how much of your monthly company salary goes toward loan EMIs
          </p>
        </div>

        <div>
          {!isEditing ? (
            <button
              onClick={() => {
                setSalaryInput(String(monthlySalary));
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition shadow-xs cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
              <span>Change Salary</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Salary Edit Form */}
      {isEditing && (
        <form
          onSubmit={handleSaveSalary}
          className="p-5 rounded-2xl bg-white dark:bg-[#131926] border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Update Monthly Salary
            </h3>
            <span className="text-xs text-slate-500">Credited to Bank Account</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
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
                placeholder="21000"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-base font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Salary</span>
            </button>
          </div>
        </form>
      )}

      {/* Primary 3-Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Monthly Salary */}
        <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Monthly Salary
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {formatINR(monthlySalary)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Company salary received on 1st of each month
          </p>
        </div>

        {/* Total Monthly EMI */}
        <div className="bg-white dark:bg-[#131926] border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
              Total Monthly EMI
            </span>
            <CreditCard className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums tracking-tight">
            -{formatINR(totalMonthlyEMI)}
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-2">
            {emiPercentage}% of salary across {totalActiveLoans} active loans
          </p>
        </div>

        {/* Salary Remaining */}
        <div className={`bg-white dark:bg-[#131926] border rounded-2xl p-5 shadow-xs ${
          salaryRemainingAfterEMI >= 0
            ? 'border-emerald-200 dark:border-emerald-900/50'
            : 'border-red-300 dark:border-red-900/70'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Remaining After EMI
            </span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-3xl font-extrabold tabular-nums tracking-tight ${
            salaryRemainingAfterEMI >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {formatINR(salaryRemainingAfterEMI)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Salary left for living expenses & rent
          </p>
        </div>
      </div>

      {/* Salary vs EMI Equation Card */}
      <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Salary Breakdown Equation
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-5 items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
          <div className="p-3">
            <span className="text-xs text-slate-500 uppercase font-semibold">Monthly Salary</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
              {formatINR(monthlySalary)}
            </div>
          </div>

          <div className="text-2xl font-bold text-slate-400">−</div>

          <div className="p-3">
            <span className="text-xs text-rose-500 uppercase font-semibold">Total Loan EMIs</span>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-1">
              {formatINR(totalMonthlyEMI)}
            </div>
          </div>

          <div className="text-2xl font-bold text-slate-400">=</div>

          <div className="p-3">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-semibold">
              Salary Remaining
            </span>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
              {formatINR(salaryRemainingAfterEMI)}
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
            <span>EMI Burden: {emiPercentage}%</span>
            <span>Salary Remaining: {100 - emiPercentage}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            <div
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, emiPercentage)}%` }}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${Math.max(0, 100 - emiPercentage)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            <strong>Formula:</strong> EMI burden = Total EMI ({formatINR(totalMonthlyEMI)}) ÷ Salary ({formatINR(monthlySalary)}) × 100 = <strong>{emiPercentage}%</strong>
          </p>
        </div>

        {/* Explanatory Note */}
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold">Salary Alone Leaves Shortfall:</span>
            <p className="mt-0.5">
              With house rent typically at ₹8,000/month, your remaining salary of {formatINR(salaryRemainingAfterEMI)} is not enough to cover both rent and essential groceries. This is why your <strong>Swiggy gig income</strong> is critical to maintain cash solvency.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            to="/loans"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white hover:underline"
          >
            <span>Review Active Loans</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/cash-flow"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <span>View Full Monthly Cash Flow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
