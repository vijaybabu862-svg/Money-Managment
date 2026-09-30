import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/currency';
import { formatIndianDate } from '../../utils/dates';

export const CalendarPage: React.FC = () => {
  const { state } = useFinance();

  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Next / Prev month
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Aggregate items by day for this month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Map of YYYY-MM-DD to events
  const dailyEvents = useMemo(() => {
    const map: Record<string, { income: number; expense: number; debt: number; items: Array<{ title: string; amount: number; type: 'INCOME' | 'EXPENSE' | 'DEBT' }> }> = {};

    // 1. Transactions
    state.transactions.forEach((tx) => {
      if (tx.date.startsWith(monthKey)) {
        if (!map[tx.date]) {
          map[tx.date] = { income: 0, expense: 0, debt: 0, items: [] };
        }
        if (tx.type === 'INCOME') {
          map[tx.date].income += tx.amount;
          map[tx.date].items.push({ title: tx.description || 'Income', amount: tx.amount, type: 'INCOME' });
        } else if (tx.type === 'EXPENSE') {
          map[tx.date].expense += tx.amount;
          map[tx.date].items.push({ title: tx.description || 'Expense', amount: tx.amount, type: 'EXPENSE' });
        } else if (tx.type === 'DEBT_PAYMENT') {
          map[tx.date].debt += tx.amount;
          map[tx.date].items.push({ title: tx.description || 'Loan Payment', amount: tx.amount, type: 'DEBT' });
        }
      }
    });

    // 2. Upcoming Payments
    state.payments.forEach((p) => {
      if (p.dueDate.startsWith(monthKey) && p.status === 'UPCOMING') {
        if (!map[p.dueDate]) {
          map[p.dueDate] = { income: 0, expense: 0, debt: 0, items: [] };
        }
        const isDebt = p.type === 'EMI' || p.type === 'CREDIT_CARD';
        if (isDebt) {
          map[p.dueDate].debt += p.amount;
          map[p.dueDate].items.push({ title: `Due: ${p.title}`, amount: p.amount, type: 'DEBT' });
        } else {
          map[p.dueDate].expense += p.amount;
          map[p.dueDate].items.push({ title: `Due: ${p.title}`, amount: p.amount, type: 'EXPENSE' });
        }
      }
    });

    return map;
  }, [state.transactions, state.payments, monthKey]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
            Financial Calendar
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Cash in, expenses, and loan EMI due dates mapped across the calendar
          </p>
        </div>

        {/* Month selector navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131926] text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-xl p-1">
            <button
              onClick={prevMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-900 dark:text-white min-w-[120px] text-center">
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Semantic Legend */}
      <div className="flex items-center gap-4 text-xs text-[#6B7280] dark:text-[#9CA3AF] bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] p-3 rounded-xl">
        <span className="font-semibold text-slate-900 dark:text-white">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
          <span>Money In (Income)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
          <span>Money Out (Expenses)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
          <span>EMI / Debt Due</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-4 sm:p-6 shadow-xs">
        {/* Days of week */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold uppercase text-slate-400">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[85px] sm:min-h-[105px] p-2 bg-slate-50/40 dark:bg-slate-900/20 rounded-xl border border-transparent" />
          ))}

          {/* Active days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayDateStr = `${monthKey}-${String(dayNum).padStart(2, '0')}`;
            const events = dailyEvents[dayDateStr];
            const isToday = new Date().toISOString().startsWith(dayDateStr);
            const isSelected = selectedDay === dayDateStr;

            return (
              <div
                key={dayDateStr}
                onClick={() => setSelectedDay(dayDateStr)}
                className={`min-h-[85px] sm:min-h-[105px] p-2 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 bg-slate-50 dark:bg-slate-800/60'
                    : isToday
                    ? 'border-blue-400 dark:border-blue-700 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {dayNum}
                  </span>
                </div>

                {/* Day Dots & Mini-Amounts */}
                <div className="space-y-0.5 mt-1 text-[10px] tabular-nums font-semibold">
                  {events?.income ? (
                    <div className="text-[#16A34A] truncate">
                      +{formatINR(events.income, { compact: true })}
                    </div>
                  ) : null}
                  {events?.expense ? (
                    <div className="text-[#DC2626] truncate">
                      -{formatINR(events.expense, { compact: true })}
                    </div>
                  ) : null}
                  {events?.debt ? (
                    <div className="text-[#EA580C] truncate font-bold">
                      EMI {formatINR(events.debt, { compact: true })}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Panel */}
      {selectedDay && (
        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
              Transactions & Due Dates on {formatIndianDate(selectedDay)}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>

          {!dailyEvents[selectedDay] || dailyEvents[selectedDay].items.length === 0 ? (
            <p className="text-sm text-slate-400 py-3">No activity or payments scheduled on this date.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dailyEvents[selectedDay].items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {item.type === 'INCOME' ? (
                      <ArrowUpRight className="w-4 h-4 text-[#16A34A]" />
                    ) : item.type === 'DEBT' ? (
                      <CreditCard className="w-4 h-4 text-[#EA580C]" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-[#DC2626]" />
                    )}
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      item.type === 'INCOME'
                        ? 'text-[#16A34A]'
                        : item.type === 'DEBT'
                        ? 'text-[#EA580C]'
                        : 'text-[#DC2626]'
                    }`}
                  >
                    {item.type === 'INCOME' ? `+${formatINR(item.amount)}` : `-${formatINR(item.amount)}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
