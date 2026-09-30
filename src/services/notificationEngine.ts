/**
 * CASH FLOW — Stage 6 Master Service
 * Notification Engine
 *
 * Pure, read-only decision layer for financial reminders and alerts.
 * Strictly consumes outputs from calculator.ts, financialIntelligence.ts,
 * Swiggy operational engine, and SMS queue.
 *
 * NEVER mutates financial records.
 */

import {
  FinancialNotification,
  NotificationSettings,
  NotificationType,
  Payment,
  Debt,
  RecurringCommitment,
  Budget,
  Account,
} from '../types/finance';
import { AppState } from './storage';
import {
  calculateAvailableCash,
  calculateDebtOutstanding,
} from './calculator';
import {
  calculateCashPressureAnalysis,
  calculateCashFlowForecast,
} from './financialIntelligence';
import { getCurrentDateISO, getCurrentMonthKey } from '../utils/dates';
import { formatINR } from '../utils/currency';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  paymentDue7Days: true,
  paymentDue3Days: true,
  paymentDue1Day: true,
  paymentDueToday: true,
  overduePayment: true,

  creditCardDue: true,

  budgetWarning: true,
  budgetExceeded: true,
  budgetWarningThreshold: 80, // 80%

  lowCash: true,
  cashPressure: true,
  forecastLowCash: true,

  smsReview: true,

  swiggyShift: true,
  swiggyTarget: true,
  swiggyShiftReminderMinutes: 30,

  monthlySummary: true,
  reconciliation: false,

  quietHoursEnabled: true,
  quietHoursStart: '22:30',
  quietHoursEnd: '07:00',
  allowUrgentDuringQuietHours: false,

  hideAmountsInNotifications: false,
  browserNotificationsEnabled: false,
};

/**
 * Checks if a given time string (HH:MM or current time) falls within quiet hours.
 * Properly handles quiet hours that cross midnight (e.g. 22:30 to 07:00).
 */
export function isCurrentlyQuietHours(
  settings: NotificationSettings,
  currentDate: Date = new Date()
): boolean {
  if (!settings.quietHoursEnabled) return false;

  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

  const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
  const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);

  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  if (startMinutes <= endMinutes) {
    // Normal interval (e.g., 01:00 to 06:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Crosses midnight (e.g., 22:30 to 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Generates payment and EMI reminders (Section 11, 12, 13, 14)
 */
export function generatePaymentNotifications(
  state: AppState,
  settings: NotificationSettings,
  nowIso: string = getCurrentDateISO()
): FinancialNotification[] {
  const notifications: FinancialNotification[] = [];
  const nowDate = new Date(nowIso);
  const hideAmt = settings.hideAmountsInNotifications;

  // 1. Evaluate Scheduled Payments (Payment Center)
  for (const payment of state.payments || []) {
    if (payment.status === 'PAID' || payment.status === 'CANCELLED') continue;
    if (!payment.dueDate) continue;

    const payDate = new Date(payment.dueDate);
    const dayDiff = Math.round((payDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
    const amtStr = hideAmt ? '' : ` — ${formatINR(payment.amount)}`;

    // A. Overdue
    if (dayDiff < 0) {
      if (settings.overduePayment) {
        const daysPast = Math.abs(dayDiff);
        notifications.push({
          id: `notif_overdue_${payment.id}_${nowIso}`,
          type: 'PAYMENT_OVERDUE',
          priority: 'URGENT',
          status: 'UNREAD',
          title: `${payment.title} is Overdue`,
          message: `${payment.title} is overdue by ${daysPast} day${daysPast === 1 ? '' : 's'}${amtStr}.`,
          source: 'PAYMENT_CENTER',
          createdAt: new Date().toISOString(),
          actionLabel: 'View Payment',
          actionRoute: '/payments',
          relatedEntityType: 'Payment',
          relatedEntityId: payment.id,
          dedupeKey: `payment_overdue:${payment.id}:${payment.dueDate}`,
          metadata: { amount: payment.amount, dueDate: payment.dueDate },
        });
      }
      continue;
    }

    // B. Due Today
    if (dayDiff === 0) {
      if (settings.paymentDueToday) {
        notifications.push({
          id: `notif_today_${payment.id}_${nowIso}`,
          type: 'PAYMENT_DUE_TODAY',
          priority: 'HIGH',
          status: 'UNREAD',
          title: `${payment.title} is Due Today`,
          message: `${payment.title} payment commitment is due today${amtStr}.`,
          source: 'PAYMENT_CENTER',
          createdAt: new Date().toISOString(),
          actionLabel: 'View Payment',
          actionRoute: '/payments',
          relatedEntityType: 'Payment',
          relatedEntityId: payment.id,
          dedupeKey: `payment_due:${payment.id}:${payment.dueDate}:today`,
          metadata: { amount: payment.amount, dueDate: payment.dueDate },
        });
      }
      continue;
    }

    // C. Due Soon (1, 3, 7 days)
    if (
      (dayDiff === 1 && settings.paymentDue1Day) ||
      (dayDiff === 3 && settings.paymentDue3Days) ||
      (dayDiff === 7 && settings.paymentDue7Days)
    ) {
      notifications.push({
        id: `notif_due_${payment.id}_${dayDiff}d_${nowIso}`,
        type: payment.type === 'EMI' ? 'EMI_DUE' : payment.type === 'CREDIT_CARD' ? 'CREDIT_CARD_DUE' : 'PAYMENT_DUE',
        priority: dayDiff === 1 ? 'HIGH' : 'NORMAL',
        status: 'UNREAD',
        title: `${payment.title} Due in ${dayDiff} Day${dayDiff === 1 ? '' : 's'}`,
        message: `${payment.title} is due in ${dayDiff} day${dayDiff === 1 ? '' : 's'}${amtStr}.`,
        source: 'PAYMENT_CENTER',
        createdAt: new Date().toISOString(),
        actionLabel: 'View Payment',
        actionRoute: '/payments',
        relatedEntityType: 'Payment',
        relatedEntityId: payment.id,
        dedupeKey: `payment_due:${payment.id}:${payment.dueDate}:${dayDiff}d`,
        metadata: { amount: payment.amount, dueDate: payment.dueDate, daysUntil: dayDiff },
      });
    }
  }

  // 2. Evaluate Active Debts with nextDueDate (EMI Reminders)
  for (const debt of state.debts || []) {
    if (debt.status === 'CLOSED' || !debt.nextDueDate || !debt.emiAmount) continue;

    // Check if there is already an existing payment record for this debt to avoid duplicate notifications
    const hasPaymentRecord = (state.payments || []).some(
      (p) => p.debtId === debt.id && p.dueDate === debt.nextDueDate && p.status !== 'PAID'
    );
    if (hasPaymentRecord) continue;

    const dueDate = new Date(debt.nextDueDate);
    const dayDiff = Math.round((dueDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
    const emiAmtStr = hideAmt ? '' : ` — ${formatINR(debt.emiAmount)}`;

    if (dayDiff < 0 && settings.overduePayment) {
      notifications.push({
        id: `notif_debt_overdue_${debt.id}_${nowIso}`,
        type: 'EMI_DUE',
        priority: 'URGENT',
        status: 'UNREAD',
        title: `${debt.name} EMI Overdue`,
        message: `${debt.name} EMI of ${debt.emiAmount ? formatINR(debt.emiAmount) : ''} is overdue by ${Math.abs(dayDiff)} days.`,
        source: 'DEBT',
        createdAt: new Date().toISOString(),
        actionLabel: 'View Debt',
        actionRoute: '/debts',
        relatedEntityType: 'Debt',
        relatedEntityId: debt.id,
        dedupeKey: `debt_overdue:${debt.id}:${debt.nextDueDate}`,
      });
    } else if (dayDiff === 0 && settings.paymentDueToday) {
      notifications.push({
        id: `notif_debt_today_${debt.id}_${nowIso}`,
        type: 'EMI_DUE',
        priority: 'HIGH',
        status: 'UNREAD',
        title: `${debt.name} EMI Due Today`,
        message: `${debt.name} EMI is due today${emiAmtStr}.`,
        source: 'DEBT',
        createdAt: new Date().toISOString(),
        actionLabel: 'View Debt',
        actionRoute: '/debts',
        relatedEntityType: 'Debt',
        relatedEntityId: debt.id,
        dedupeKey: `debt_due:${debt.id}:${debt.nextDueDate}:today`,
      });
    } else if (
      (dayDiff === 1 && settings.paymentDue1Day) ||
      (dayDiff === 3 && settings.paymentDue3Days) ||
      (dayDiff === 7 && settings.paymentDue7Days)
    ) {
      notifications.push({
        id: `notif_debt_soon_${debt.id}_${dayDiff}d_${nowIso}`,
        type: 'EMI_DUE',
        priority: dayDiff === 1 ? 'HIGH' : 'NORMAL',
        status: 'UNREAD',
        title: `${debt.name} EMI Due in ${dayDiff} Day${dayDiff === 1 ? '' : 's'}`,
        message: `${debt.name} EMI is due in ${dayDiff} day${dayDiff === 1 ? '' : 's'}${emiAmtStr}.`,
        source: 'DEBT',
        createdAt: new Date().toISOString(),
        actionLabel: 'View Debt',
        actionRoute: '/debts',
        relatedEntityType: 'Debt',
        relatedEntityId: debt.id,
        dedupeKey: `debt_due:${debt.id}:${debt.nextDueDate}:${dayDiff}d`,
      });
    }
  }

  // 3. Evaluate Recurring Commitments
  for (const rc of state.recurringCommitments || []) {
    if (!rc.active || !rc.nextDueDate) continue;

    const dueDate = new Date(rc.nextDueDate);
    const dayDiff = Math.round((dueDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
    const amtStr = hideAmt ? '' : ` — ${formatINR(rc.amount)}`;

    if (dayDiff === 0 && settings.paymentDueToday) {
      notifications.push({
        id: `notif_rc_today_${rc.id}_${nowIso}`,
        type: 'COMMITMENT_DUE',
        priority: 'HIGH',
        status: 'UNREAD',
        title: `${rc.name} Due Today`,
        message: `Recurring commitment "${rc.name}" is due today${amtStr}.`,
        source: 'PAYMENT_CENTER',
        createdAt: new Date().toISOString(),
        actionLabel: 'View Commitments',
        actionRoute: '/payments',
        relatedEntityType: 'RecurringCommitment',
        relatedEntityId: rc.id,
        dedupeKey: `rc_due:${rc.id}:${rc.nextDueDate}:today`,
      });
    } else if (
      (dayDiff === 1 && settings.paymentDue1Day) ||
      (dayDiff === 3 && settings.paymentDue3Days)
    ) {
      notifications.push({
        id: `notif_rc_soon_${rc.id}_${dayDiff}d_${nowIso}`,
        type: 'COMMITMENT_DUE',
        priority: 'NORMAL',
        status: 'UNREAD',
        title: `${rc.name} Due in ${dayDiff} Day${dayDiff === 1 ? '' : 's'}`,
        message: `${rc.name} is due in ${dayDiff} day${dayDiff === 1 ? '' : 's'}${amtStr}.`,
        source: 'PAYMENT_CENTER',
        createdAt: new Date().toISOString(),
        actionLabel: 'View Commitments',
        actionRoute: '/payments',
        relatedEntityType: 'RecurringCommitment',
        relatedEntityId: rc.id,
        dedupeKey: `rc_due:${rc.id}:${rc.nextDueDate}:${dayDiff}d`,
      });
    }
  }

  return notifications;
}

/**
 * Generates budget warning and exceeded notifications (Section 17, 18)
 */
export function generateBudgetNotifications(
  state: AppState,
  settings: NotificationSettings,
  monthKey: string = getCurrentMonthKey()
): FinancialNotification[] {
  const notifications: FinancialNotification[] = [];
  if (!settings.budgetWarning && !settings.budgetExceeded) return notifications;

  const thresholdRatio = (settings.budgetWarningThreshold || 80) / 100;
  const hideAmt = settings.hideAmountsInNotifications;

  for (const b of state.budgets || []) {
    if (b.month !== monthKey) continue;
    if (b.limit <= 0) continue;

    // Calculate actual spending for this category in the month
    const actual = (state.transactions || [])
      .filter((t) => t.type === 'EXPENSE' && t.date.startsWith(monthKey) && t.categoryId === b.categoryId)
      .reduce((sum, t) => sum + t.amount, 0);
    const cat = state.categories.find((c) => c.id === b.categoryId);
    const catName = cat ? cat.name : 'Category';
    const pct = Math.round((actual / b.limit) * 100);

    // A. Budget Exceeded (100%+)
    if (pct >= 100 && settings.budgetExceeded) {
      const overAmt = actual - b.limit;
      const overStr = hideAmt ? '' : ` by ${formatINR(overAmt)}`;
      notifications.push({
        id: `notif_budget_exceeded_${b.id}_${monthKey}`,
        type: 'BUDGET_EXCEEDED',
        priority: 'HIGH',
        status: 'UNREAD',
        title: `${catName} Budget Exceeded`,
        message: `${catName} spending has exceeded the monthly budget limit${overStr} (${pct}% of ${hideAmt ? 'budget' : formatINR(b.limit)}).`,
        source: 'BUDGET',
        createdAt: new Date().toISOString(),
        actionLabel: 'View Budget',
        actionRoute: '/budget',
        relatedEntityType: 'Budget',
        relatedEntityId: b.id,
        dedupeKey: `budget_exceeded:${b.categoryId}:${monthKey}`,
        metadata: { limit: b.limit, actual, percent: pct },
      });
    }
    // B. Budget Warning (e.g. 80% to 99%)
    else if (pct >= settings.budgetWarningThreshold && pct < 100 && settings.budgetWarning) {
      notifications.push({
        id: `notif_budget_warn_${b.id}_${monthKey}`,
        type: 'BUDGET_WARNING',
        priority: 'NORMAL',
        status: 'UNREAD',
        title: `${catName} Budget Warning`,
        message: `${catName} spending has reached ${pct}% of the monthly limit (${hideAmt ? 'spent' : formatINR(actual)} of ${hideAmt ? 'limit' : formatINR(b.limit)}).`,
        source: 'BUDGET',
        createdAt: new Date().toISOString(),
        actionLabel: 'View Budget',
        actionRoute: '/budget',
        relatedEntityType: 'Budget',
        relatedEntityId: b.id,
        dedupeKey: `budget_warning:${b.categoryId}:${monthKey}`,
        metadata: { limit: b.limit, actual, percent: pct },
      });
    }
  }

  return notifications;
}

/**
 * Generates low cash, cash pressure, and forecasted deficit alerts (Section 19, 20, 21)
 */
export function generateCashNotifications(
  state: AppState,
  settings: NotificationSettings,
  nowIso: string = getCurrentDateISO()
): FinancialNotification[] {
  const notifications: FinancialNotification[] = [];
  const currentCash = calculateAvailableCash(state.accounts, state.transactions);
  const minBuffer = state.cashBufferSetting?.enabled ? state.cashBufferSetting.minimumCashBuffer : 0;
  const hideAmt = settings.hideAmountsInNotifications;

  // 1. Current Low Cash Alert
  if (settings.lowCash && minBuffer > 0 && currentCash < minBuffer) {
    const deficit = minBuffer - currentCash;
    notifications.push({
      id: `notif_low_cash_${nowIso}`,
      type: 'LOW_CASH',
      priority: currentCash < 0 ? 'URGENT' : 'HIGH',
      status: 'UNREAD',
      title: 'Available Cash Below Minimum Buffer',
      message: hideAmt
        ? 'Available cash is below your configured minimum buffer.'
        : `Available cash (${formatINR(currentCash)}) is below your configured minimum buffer (${formatINR(minBuffer)}) by ${formatINR(deficit)}.`,
      source: 'FORECAST',
      createdAt: new Date().toISOString(),
      actionLabel: 'View Accounts',
      actionRoute: '/accounts',
      dedupeKey: `low_cash:${nowIso}`,
      metadata: { currentCash, minBuffer, deficit },
    });
  }

  // 2. Cash Pressure Period Alert
  if (settings.cashPressure) {
    const pressure = calculateCashPressureAnalysis(state, minBuffer);
    if (pressure && (pressure.pressureLevel === 'NEGATIVE' || pressure.pressureLevel === 'TIGHT')) {
      const isNegative = pressure.pressureLevel === 'NEGATIVE';
      notifications.push({
        id: `notif_pressure_${pressure.endDate}_${pressure.pressureLevel}`,
        type: 'CASH_PRESSURE',
        priority: isNegative ? 'URGENT' : 'HIGH',
        status: 'UNREAD',
        title: isNegative ? 'Projected Cash Deficit Expected' : 'Cash Pressure Expected',
        message: hideAmt
          ? `Cash pressure expected before next income on ${pressure.endDate}.`
          : pressure.reason,
        source: 'FORECAST',
        createdAt: new Date().toISOString(),
        actionLabel: 'View Cash Pressure',
        actionRoute: '/forecast',
        dedupeKey: `cash_pressure:${pressure.startDate}:${pressure.endDate}:${pressure.pressureLevel}`,
        metadata: {
          pressureLevel: pressure.pressureLevel,
          projectedEndingCash: pressure.projectedEndingCash,
          nextIncomeDate: pressure.endDate,
        },
      });
    }
  }

  // 3. Forecast Ending Cash Below Buffer
  if (settings.forecastLowCash) {
    const forecast = calculateCashFlowForecast(state, 30);
    if (forecast.projectedEndingCash < minBuffer) {
      notifications.push({
        id: `notif_forecast_low_${nowIso}`,
        type: 'FORECAST_LOW_CASH',
        priority: forecast.projectedEndingCash < 0 ? 'URGENT' : 'NORMAL',
        status: 'UNREAD',
        title: 'Forecast Indicates Low Month-End Cash',
        message: hideAmt
          ? 'Forecast indicates projected cash may fall below your minimum buffer.'
          : `Forecast indicates 30-day projected cash (${formatINR(forecast.projectedEndingCash)}) may fall below your buffer (${formatINR(minBuffer)}).`,
        source: 'FORECAST',
        createdAt: new Date().toISOString(),
        actionLabel: 'View Forecast',
        actionRoute: '/forecast',
        dedupeKey: `forecast_low_cash:${nowIso.substring(0, 7)}`,
        metadata: {
          projectedEndingCash: forecast.projectedEndingCash,
          minBuffer,
        },
      });
    }
  }

  return notifications;
}

/**
 * Generates aggregated pending SMS review notifications (Section 15, 16)
 */
export function generateSmsNotifications(
  state: AppState,
  settings: NotificationSettings,
  nowIso: string = getCurrentDateISO()
): FinancialNotification[] {
  const notifications: FinancialNotification[] = [];
  if (!settings.smsReview) return notifications;

  const pendingSms = (state.smsCandidates || []).filter((c) => c.reviewStatus === 'PENDING');
  if (pendingSms.length === 0) return notifications;

  const totalDetected = pendingSms.reduce((sum, c) => sum + (c.detectedAmount || 0), 0);
  const hideAmt = settings.hideAmountsInNotifications;
  const count = pendingSms.length;

  notifications.push({
    id: `notif_sms_pending_${count}_${nowIso}`,
    type: 'SMS_REVIEW',
    priority: 'NORMAL',
    status: 'UNREAD',
    title: `${count} SMS Transaction${count === 1 ? '' : 's'} Need Review`,
    message: hideAmt
      ? `${count} SMS transaction${count === 1 ? '' : 's'} are waiting for your review and confirmation.`
      : `${count} SMS transaction${count === 1 ? '' : 's'} (${formatINR(totalDetected)}) waiting for your confirmation before ledger entry.`,
    source: 'SMS',
    createdAt: new Date().toISOString(),
    actionLabel: 'Review SMS',
    actionRoute: '/sms',
    dedupeKey: `sms_review:pending_count:${count}:${nowIso}`,
    metadata: { count, totalDetected },
  });

  return notifications;
}

/**
 * Generates Swiggy shift and operational target reminders (Section 22, 23, 24)
 */
export function generateSwiggyNotifications(
  state: AppState,
  settings: NotificationSettings,
  nowIso: string = getCurrentDateISO()
): FinancialNotification[] {
  const notifications: FinancialNotification[] = [];
  const hideAmt = settings.hideAmountsInNotifications;

  // 1. Shift Reminders
  if (settings.swiggyShift) {
    const todayShifts = (state.swiggyShifts || []).filter(
      (s) => s.date === nowIso && s.status === 'PLANNED'
    );

    for (const shift of todayShifts) {
      notifications.push({
        id: `notif_swiggy_shift_${shift.id}_${nowIso}`,
        type: 'SWIGGY_SHIFT',
        priority: 'NORMAL',
        status: 'UNREAD',
        title: `Swiggy ${shift.slot} Shift Planned Today`,
        message: `Your Swiggy ${shift.slot} shift is scheduled for today. Target: ${shift.orders || 0} orders.`,
        source: 'SWIGGY',
        createdAt: new Date().toISOString(),
        actionLabel: 'Open Swiggy Hub',
        actionRoute: '/swiggy',
        relatedEntityType: 'SwiggyShift',
        relatedEntityId: shift.id,
        dedupeKey: `swiggy_shift:${shift.id}:${nowIso}`,
      });
    }
  }

  // 2. Daily Earning Target Gap
  if (settings.swiggyTarget && state.swiggyTargets?.dailyEarningsTarget) {
    const target = state.swiggyTargets.dailyEarningsTarget;
    const todayCompletedShifts = (state.swiggyShifts || []).filter(
      (s) => s.date === nowIso && s.status === 'COMPLETED'
    );
    const todayNet = todayCompletedShifts.reduce((sum, s) => sum + s.netEarnings, 0);

    if (todayNet < target && todayCompletedShifts.length > 0) {
      const remaining = target - todayNet;
      notifications.push({
        id: `notif_swiggy_target_${nowIso}`,
        type: 'SWIGGY_TARGET',
        priority: 'LOW',
        status: 'UNREAD',
        title: 'Swiggy Daily Target Progress',
        message: hideAmt
          ? 'You have progress towards today\'s Swiggy earnings target.'
          : `Today's net earnings: ${formatINR(todayNet)} of ${formatINR(target)} target (${formatINR(remaining)} remaining).`,
        source: 'SWIGGY',
        createdAt: new Date().toISOString(),
        actionLabel: 'View Swiggy Hub',
        actionRoute: '/swiggy',
        dedupeKey: `swiggy_target:${nowIso}:${Math.floor(todayNet / 100)}`,
        metadata: { todayNet, target, remaining },
      });
    }
  }

  return notifications;
}

/**
 * Generates monthly financial summary report notification (Section 25, 26)
 */
export function generateMonthlyNotifications(
  state: AppState,
  settings: NotificationSettings,
  currentDate: Date = new Date()
): FinancialNotification[] {
  const notifications: FinancialNotification[] = [];
  if (!settings.monthlySummary) return notifications;

  // Trigger on the 1st, 2nd, or 3rd of the month for the completed previous month
  const dayOfMonth = currentDate.getDate();
  if (dayOfMonth <= 3) {
    const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const monthName = prevMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    notifications.push({
      id: `notif_monthly_summary_${prevMonthKey}`,
      type: 'MONTHLY_SUMMARY',
      priority: 'LOW',
      status: 'UNREAD',
      title: `${monthName} Financial Summary Ready`,
      message: `Your financial report for ${monthName} has been compiled with complete cash flow and debt metrics.`,
      source: 'REPORT',
      createdAt: new Date().toISOString(),
      actionLabel: 'View Reports',
      actionRoute: '/reports',
      dedupeKey: `monthly_summary:${prevMonthKey}`,
      metadata: { monthKey: prevMonthKey },
    });
  }

  return notifications;
}

/**
 * Aggregates all notification generators into a pure candidate list
 */
export function generateAllNotifications(
  state: AppState,
  settings: NotificationSettings = state.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS,
  nowIso: string = getCurrentDateISO()
): FinancialNotification[] {
  const candidates: FinancialNotification[] = [
    ...generatePaymentNotifications(state, settings, nowIso),
    ...generateBudgetNotifications(state, settings),
    ...generateCashNotifications(state, settings, nowIso),
    ...generateSmsNotifications(state, settings, nowIso),
    ...generateSwiggyNotifications(state, settings, nowIso),
    ...generateMonthlyNotifications(state, settings),
  ];

  return candidates;
}
