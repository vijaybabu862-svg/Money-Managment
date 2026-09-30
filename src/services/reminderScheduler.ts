/**
 * CASH FLOW — Stage 6 Master Service
 * Reminder Scheduler & Notification Deduplication Store
 *
 * Evaluates reminder rules, manages persistent notification queue,
 * applies deduplication keys, respects quiet hours, and coordinates browser/PWA notifications.
 *
 * NEVER mutates financial transactions or ledger balances.
 */

import {
  FinancialNotification,
  NotificationSchedulerState,
  NotificationSettings,
} from '../types/finance';
import { AppState } from './storage';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  generateAllNotifications,
  isCurrentlyQuietHours,
} from './notificationEngine';

export interface EvaluationResult {
  newNotifications: FinancialNotification[];
  allNotifications: FinancialNotification[];
  schedulerState: NotificationSchedulerState;
  suppressedByQuietHours: number;
}

/**
 * Deduplicates newly generated notification candidates against existing notifications
 * using deterministic dedupe keys.
 */
export function deduplicateNotifications(
  candidates: FinancialNotification[],
  existing: FinancialNotification[]
): FinancialNotification[] {
  const existingKeys = new Set(existing.map((n) => n.dedupeKey));
  const uniqueNew: FinancialNotification[] = [];

  for (const cand of candidates) {
    if (!existingKeys.has(cand.dedupeKey)) {
      uniqueNew.push(cand);
      existingKeys.add(cand.dedupeKey);
    }
  }

  return uniqueNew;
}

/**
 * Evaluates the full notification suite against the current app state.
 * Returns newly generated notifications and updated notification queue.
 */
export function evaluateAndScheduleNotifications(
  state: AppState,
  currentDate: Date = new Date()
): EvaluationResult {
  const settings = state.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;
  const existing = state.notifications || [];
  const nowIso = currentDate.toISOString().split('T')[0];

  // 1. Generate all notification candidates via the pure notification engine
  const candidates = generateAllNotifications(state, settings, nowIso);

  // 2. Filter out duplicates against existing notifications
  const newCandidates = deduplicateNotifications(candidates, existing);

  // 3. Check quiet hours
  const inQuietHours = isCurrentlyQuietHours(settings, currentDate);
  let suppressedByQuietHours = 0;

  const deliveredNew: FinancialNotification[] = [];

  for (const notif of newCandidates) {
    const isUrgent = notif.priority === 'URGENT';
    const canBypassQuiet = isUrgent && settings.allowUrgentDuringQuietHours;

    if (inQuietHours && !canBypassQuiet) {
      // In quiet hours: Store in-app for user review, but mark with quiet hours metadata
      suppressedByQuietHours += 1;
      deliveredNew.push({
        ...notif,
        metadata: {
          ...notif.metadata,
          quietHoursSuppressedBrowserAlert: true,
        },
      });
    } else {
      deliveredNew.push(notif);
    }
  }

  // 4. Combine new notifications with existing (newest first)
  const allNotifications = [...deliveredNew, ...existing];

  // 5. Update scheduler state
  const schedulerState: NotificationSchedulerState = {
    ...state.notificationSchedulerState,
    lastEvaluationAt: currentDate.toISOString(),
  };

  return {
    newNotifications: deliveredNew,
    allNotifications,
    schedulerState,
    suppressedByQuietHours,
  };
}

/**
 * Dispatches browser/PWA notifications if permission is granted and enabled.
 * Only triggers for new notifications that weren't suppressed by quiet hours.
 */
export async function triggerBrowserNotificationIfEligible(
  notification: FinancialNotification,
  settings: NotificationSettings
): Promise<boolean> {
  if (!settings.browserNotificationsEnabled) return false;
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const options: NotificationOptions = {
      body: notification.message,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: notification.dedupeKey, // native deduplication
      data: {
        route: notification.actionRoute,
        id: notification.id,
      },
    };

    // If Service Worker registration is active, use showNotification
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(notification.title, options);
        return true;
      }
    }

    // Fallback to standard window Notification
    new Notification(notification.title, options);
    return true;
  } catch (err) {
    console.warn('Failed to trigger browser notification:', err);
    return false;
  }
}
