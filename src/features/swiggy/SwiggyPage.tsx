import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/currency';
import { formatIndianDate, getCurrentDateISO } from '../../utils/dates';
import { SwiggyShift } from '../../types/finance';
import {
  Bike,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Fuel,
  ArrowRight,
  Save,
  X,
  TrendingUp,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SwiggyPage: React.FC = () => {
  const {
    state,
    addSwiggyShift,
    updateSwiggyShift,
    deleteSwiggyShift,
    centralPosition,
  } = useFinance();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<SwiggyShift | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState(getCurrentDateISO());
  const [grossEarnings, setGrossEarnings] = useState('');
  const [incentives, setIncentives] = useState('');
  const [tips, setTips] = useState('');
  const [fuelExpense, setFuelExpense] = useState('');
  const [otherExpenses, setOtherExpenses] = useState('');
  const [notes, setNotes] = useState('');

  // Sort shifts desc
  const allShifts = [...(state.swiggyShifts || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleOpenAdd = () => {
    setEditingShift(null);
    setDate(getCurrentDateISO());
    setGrossEarnings('');
    setIncentives('');
    setTips('');
    setFuelExpense('');
    setOtherExpenses('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (shift: SwiggyShift) => {
    setEditingShift(shift);
    setDate(shift.date);
    setGrossEarnings(String(shift.grossEarnings || shift.basePay || 0));
    setIncentives(shift.surgeIncentives ? String(shift.surgeIncentives) : '');
    setTips(shift.tips ? String(shift.tips) : '');
    setFuelExpense(shift.fuelExpense ? String(shift.fuelExpense) : '');
    setOtherExpenses(shift.otherExpenses ? String(shift.otherExpenses) : '');
    setNotes(shift.notes || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(grossEarnings) || 0;
    const inc = parseFloat(incentives) || 0;
    const t = parseFloat(tips) || 0;
    const fuel = parseFloat(fuelExpense) || 0;
    const other = parseFloat(otherExpenses) || 0;

    if (gross <= 0 && inc <= 0) {
      showToast('Please enter your daily gross earnings', 'error');
      return;
    }

    const totalGross = gross + inc + t;
    const totalExp = fuel + other;
    const net = totalGross - totalExp;

    if (editingShift) {
      updateSwiggyShift({
        ...editingShift,
        date,
        basePay: gross,
        surgeIncentives: inc,
        tips: t,
        grossEarnings: totalGross,
        fuelExpense: fuel,
        otherExpenses: other,
        netEarnings: net,
        notes: notes.trim() || undefined,
        status: 'COMPLETED',
      });
      showToast(`✓ Updated Swiggy shift for ${formatIndianDate(date)} (Net: ${formatINR(net)})`);
    } else {
      addSwiggyShift({
        date,
        slot: 'DINNER',
        status: 'COMPLETED',
        orders: 12,
        basePay: gross,
        surgeIncentives: inc,
        tips: t,
        grossEarnings: totalGross,
        fuelExpense: fuel,
        otherExpenses: other,
        netEarnings: net,
        notes: notes.trim() || undefined,
        source: 'MANUAL',
      });
      showToast(`✓ Added daily earnings of ${formatINR(net)} net for ${formatIndianDate(date)}`);
    }

    setIsModalOpen(false);
    setEditingShift(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;
    deleteSwiggyShift(deleteConfirmId);
    showToast('✓ Swiggy shift record deleted');
    setDeleteConfirmId(null);
  };

  const {
    swiggyDaysWorked,
    swiggyGrossIncome,
    swiggyExpenses,
    swiggyNetIncome,
    swiggyAvgDailyNet,
  } = centralPosition;

  // Real-time calculation helper in form
  const formGross = (parseFloat(grossEarnings) || 0) + (parseFloat(incentives) || 0) + (parseFloat(tips) || 0);
  const formExp = (parseFloat(fuelExpense) || 0) + (parseFloat(otherExpenses) || 0);
  const formNet = formGross - formExp;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </span>
            <span>Swiggy Delivery Income</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track daily gross delivery earnings, subtract fuel/work expenses, and calculate net take-home
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Daily Income</span>
        </button>
      </div>

      {/* Monthly Summary Card Box */}
      <div className="bg-white dark:bg-[#131926] border border-orange-200 dark:border-orange-900/60 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 hover-lift">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            Swiggy This Month Summary
          </span>
          <span className="text-xs text-slate-500">
            Formula: Gross Swiggy Income − Work Expenses = Net Swiggy Income
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400">Days Worked</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
              {swiggyDaysWorked}
            </div>
            <span className="text-[10px] text-slate-400">completed shifts</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400">Gross Earnings</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
              {formatINR(swiggyGrossIncome)}
            </div>
            <span className="text-[10px] text-slate-400">orders + incentives</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
            <span className="text-[10px] font-bold uppercase text-rose-500">Work Expenses</span>
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
              -{formatINR(swiggyExpenses)}
            </div>
            <span className="text-[10px] text-rose-400">petrol & maintenance</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
              Net Take-Home
            </span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              {formatINR(swiggyNetIncome)}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">actual pocket money</span>
          </div>

          <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase text-orange-600 dark:text-orange-400">
              Avg Net / Day
            </span>
            <div className="text-2xl font-extrabold text-orange-600 dark:text-orange-400 tabular-nums mt-0.5">
              {formatINR(swiggyAvgDailyNet)}
            </div>
            <span className="text-[10px] text-slate-400">per shift average</span>
          </div>
        </div>
      </div>

      {/* Daily Entries List */}
      <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Daily Shift Entries ({allShifts.length})
          </h2>
          <span className="text-xs text-slate-500">
            Month Net: <strong>{formatINR(swiggyNetIncome)}</strong>
          </span>
        </div>

        {allShifts.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Bike className="w-10 h-10 mx-auto mb-2 stroke-1 opacity-50" />
            <p className="text-sm">No delivery entries recorded yet.</p>
            <button
              onClick={handleOpenAdd}
              className="mt-3 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
            >
              + Record today's delivery shift
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {allShifts.map((shift) => {
              const gross =
                shift.grossEarnings !== undefined
                  ? shift.grossEarnings
                  : (shift.basePay || 0) + (shift.surgeIncentives || 0) + (shift.tips || 0);
              const exp = (shift.fuelExpense || 0) + (shift.otherExpenses || 0);
              const net = shift.netEarnings !== undefined ? shift.netEarnings : gross - exp;

              return (
                <div
                  key={shift.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {formatIndianDate(shift.date, { relative: true })}
                      </span>
                      {shift.notes && (
                        <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                          {shift.notes}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>Base/Gross: <strong>{formatINR(gross)}</strong></span>
                      {shift.surgeIncentives ? (
                        <span>Incentives: <strong>+{formatINR(shift.surgeIncentives)}</strong></span>
                      ) : null}
                      {shift.fuelExpense ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          Fuel: <strong>-{formatINR(shift.fuelExpense)}</strong>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Net Take-Home
                      </span>
                      <div className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatINR(net)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        (Gross {formatINR(gross)} − Exp {formatINR(exp)})
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(shift)}
                        title="Edit shift"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(shift.id)}
                        title="Delete shift"
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
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
              Delete Daily Entry?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this Swiggy earnings record? Your monthly net take-home will be recalculated.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Daily Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleFormSubmit}
            className="w-full max-w-lg p-6 bg-white dark:bg-[#131926] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 my-8"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingShift ? 'Edit Daily Swiggy Entry' : 'Record Daily Swiggy Income'}
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
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden"
                />
              </div>

              {/* Earnings Inputs */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider text-[11px]">
                  1. Gross Earnings
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Base Delivery Pay (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      required
                      value={grossEarnings}
                      onChange={(e) => setGrossEarnings(e.target.value)}
                      placeholder="450"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131926] text-slate-900 dark:text-white font-semibold text-sm focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Incentives / Surge (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={incentives}
                      onChange={(e) => setIncentives(e.target.value)}
                      placeholder="150"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131926] text-slate-900 dark:text-white font-semibold text-sm focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Customer Tips (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={tips}
                      onChange={(e) => setTips(e.target.value)}
                      placeholder="40"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131926] text-slate-900 dark:text-white font-semibold text-sm focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Deductions / Expenses Inputs */}
              <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2.5">
                <span className="font-bold text-rose-600 dark:text-rose-400 block uppercase tracking-wider text-[11px]">
                  2. Work-Related Deductions
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Fuel / Petrol Expense (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={fuelExpense}
                      onChange={(e) => setFuelExpense(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131926] text-slate-900 dark:text-white font-semibold text-sm focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Other Work Expenses (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={otherExpenses}
                      onChange={(e) => setOtherExpenses(e.target.value)}
                      placeholder="e.g. puncture, parking"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131926] text-slate-900 dark:text-white font-semibold text-sm focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Auto Calculated Live Net */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-800 dark:text-emerald-200 block">
                    Calculated Net Take-Home:
                  </span>
                  <span className="text-slate-500">Gross ({formatINR(formGross)}) − Expenses ({formatINR(formExp)})</span>
                </div>
                <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatINR(formNet)}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Shift Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Dinner rush, weekend rain bonus"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingShift ? 'Save Changes' : 'Record Entry'}</span>
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
          to="/cash-flow"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          <span>See How Swiggy Balances Your Cash Flow</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
