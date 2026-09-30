import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  RefreshCw,
  Sliders,
  ShieldAlert,
  CreditCard,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  Bike,
  MessageSquareCode,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  EyeOff,
  Eye,
  Sparkles,
  Inbox,
  Filter,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { FinancialNotification, NotificationPriority, NotificationType } from '../../types/finance';
import { formatINR } from '../../utils/currency';
import { formatIndianDate } from '../../utils/dates';

export const NotificationsPage: React.FC = () => {
  const {
    state,
    notifications,
    notificationSettings,
    unreadNotificationCount,
    urgentNotificationCount,
    markNotificationRead,
    markNotificationUnread,
    markAllNotificationsRead,
    dismissNotification,
    actionNotification,
    clearReadNotifications,
    clearAllNotifications,
    evaluateNotifications,
    updateNotificationSettings,
    requestBrowserNotificationPermission,
    cashPressure,
  } = useFinance();
  const { showToast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'inbox'; // 'inbox' | 'settings'

  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterReadStatus, setFilterReadStatus] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const setTab = (tab: 'inbox' | 'settings') => {
    setSearchParams({ tab });
  };

  const handleEvaluate = () => {
    setIsEvaluating(true);
    evaluateNotifications();
    setTimeout(() => {
      setIsEvaluating(false);
    }, 400);
  };

  // Filtered notifications
  const filteredNotifications = (notifications || []).filter((n) => {
    if (n.status === 'DISMISSED') return false;

    if (filterReadStatus === 'UNREAD' && n.status !== 'UNREAD') return false;
    if (filterReadStatus === 'READ' && n.status === 'UNREAD') return false;

    if (filterPriority !== 'ALL' && n.priority !== filterPriority) return false;

    if (filterType !== 'ALL') {
      if (filterType === 'PAYMENTS' && !['EMI_DUE', 'CREDIT_CARD_DUE', 'PAYMENT_DUE', 'COMMITMENT_DUE'].includes(n.type)) return false;
      if (filterType === 'BUDGET' && !['BUDGET_WARNING', 'BUDGET_EXCEEDED'].includes(n.type)) return false;
      if (filterType === 'CASH' && !['LOW_CASH', 'CASH_PRESSURE', 'FORECAST_LOW_CASH'].includes(n.type)) return false;
      if (filterType === 'SWIGGY' && !['SWIGGY_SHIFT', 'SWIGGY_TARGET'].includes(n.type)) return false;
      if (filterType === 'SMS' && n.type !== 'SMS_REVIEW') return false;
    }

    return true;
  });

  const getNotificationIcon = (type: NotificationType, priority: NotificationPriority) => {
    switch (type) {
      case 'EMI_DUE':
      case 'CREDIT_CARD_DUE':
      case 'PAYMENT_DUE':
      case 'COMMITMENT_DUE':
        return <CreditCard className="w-5 h-5 text-amber-500" />;
      case 'LOW_CASH':
      case 'FORECAST_LOW_CASH':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'CASH_PRESSURE':
        return <TrendingDown className="w-5 h-5 text-orange-500" />;
      case 'BUDGET_WARNING':
      case 'BUDGET_EXCEEDED':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'SWIGGY_SHIFT':
      case 'SWIGGY_TARGET':
        return <Bike className="w-5 h-5 text-orange-500" />;
      case 'SMS_REVIEW':
        return <MessageSquareCode className="w-5 h-5 text-blue-500" />;
      case 'MONTHLY_SUMMARY':
        return <Calendar className="w-5 h-5 text-indigo-500" />;
      default:
        return priority === 'URGENT' ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : (
          <Clock className="w-5 h-5 text-slate-500" />
        );
    }
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-900">
            Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            High
          </span>
        );
      case 'NORMAL':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
            Normal
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Notification & Alert Center
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
              Stage 6
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Deterministic daily briefings, proactive payment reminders, cash pressure alerts, and quiet hours.
          </p>
        </div>

        {/* Tab Switcher & Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={() => setTab('inbox')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'inbox'
                  ? 'bg-white dark:bg-[#131926] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Inbox</span>
              {unreadNotificationCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                  {unreadNotificationCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-[#131926] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Preferences</span>
            </button>
          </div>

          <button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition shadow-xs"
            title="Re-run notification evaluation engine"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Re-evaluate</span>
          </button>
        </div>
      </div>

      {/* Daily Briefing Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Urgent Attention */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Urgent & High Priority
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {urgentNotificationCount} Action{urgentNotificationCount === 1 ? '' : 's'}
            </div>
            <span className="text-[11px] text-slate-400">
              {urgentNotificationCount > 0 ? 'Requires attention today' : 'All clear right now'}
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              urgentNotificationCount > 0
                ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Upcoming Commitments */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Due in Next 3 Days
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {(state.payments || []).filter((p) => p.status === 'UPCOMING').length} Payments
            </div>
            <span className="text-[11px] text-slate-400">
              Auto-tracked by reminders
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Cash Buffer Status */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Cash Pressure Level
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {cashPressure?.pressureLevel || 'NORMAL'}
            </div>
            <span className="text-[11px] text-slate-400">
              Min buffer: {state.cashBufferSetting?.enabled ? formatINR(state.cashBufferSetting.minimumCashBuffer) : 'Off'}
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              cashPressure?.pressureLevel === 'NEGATIVE'
                ? 'bg-red-100 dark:bg-red-950/60 text-red-600'
                : cashPressure?.pressureLevel === 'TIGHT'
                ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-600'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
            }`}
          >
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Quiet Hours State */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Quiet Hours
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {notificationSettings.quietHoursEnabled ? 'Active' : 'Disabled'}
            </div>
            <span className="text-[11px] text-slate-400">
              {notificationSettings.quietHoursEnabled
                ? `${notificationSettings.quietHoursStart} – ${notificationSettings.quietHoursEnd}`
                : 'Alerts sound anytime'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            {notificationSettings.quietHoursEnabled ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </div>
        </div>
      </div>

      {/* TAB 1: INBOX */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Filter Bar & Controls */}
          <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'PAYMENTS', label: 'Payments & Debt' },
                { id: 'BUDGET', label: 'Budgets' },
                { id: 'CASH', label: 'Cash & Forecast' },
                { id: 'SWIGGY', label: 'Swiggy' },
                { id: 'SMS', label: 'SMS Review' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setFilterType(pill.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filterType === pill.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Read / Unread Status Filters & Bulk Actions */}
            <div className="flex items-center gap-2">
              <select
                value={filterReadStatus}
                onChange={(e) => setFilterReadStatus(e.target.value as any)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 font-medium"
              >
                <option value="ALL">All Status</option>
                <option value="UNREAD">Unread Only</option>
                <option value="READ">Read Only</option>
              </select>

              {unreadNotificationCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
              )}

              {notifications.some((n) => n.status === 'READ') && (
                <button
                  onClick={() => {
                    clearReadNotifications();
                    showToast('✓ Read notifications cleared');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                  title="Clear Read Notifications"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-2.5">
            {filteredNotifications.length === 0 ? (
              <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No notifications match your filter
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Your finances are operating smoothly. New reminders will appear here when due dates or budget thresholds are reached.
                </p>
                <button
                  onClick={() => {
                    setFilterType('ALL');
                    setFilterReadStatus('ALL');
                    setFilterPriority('ALL');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isUnread = n.status === 'UNREAD';
                return (
                  <div
                    key={n.id}
                    className={`bg-white dark:bg-[#131926] border rounded-2xl p-4 sm:p-5 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isUnread
                        ? 'border-blue-200 dark:border-blue-900/60 ring-1 ring-blue-500/10'
                        : 'border-slate-200 dark:border-slate-800 opacity-90'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5">
                        {getNotificationIcon(n.type, n.priority)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`text-sm font-bold truncate ${
                              isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {n.title}
                          </h3>
                          {getPriorityBadge(n.priority)}
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {n.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                          <span>
                            {new Date(n.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span className="uppercase tracking-wider font-semibold text-[10px]">
                            {n.source}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      {isUnread ? (
                        <button
                          onClick={() => markNotificationRead(n.id)}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                        >
                          Mark Read
                        </button>
                      ) : (
                        <button
                          onClick={() => markNotificationUnread(n.id)}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                        >
                          Mark Unread
                        </button>
                      )}

                      {n.actionRoute && (
                        <button
                          onClick={() => {
                            actionNotification(n.id);
                            navigate(n.actionRoute!);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs"
                        >
                          <span>{n.actionLabel || 'View'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          dismissNotification(n.id);
                          showToast('✓ Notification dismissed');
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Dismiss"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PREFERENCES & SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-[#131926] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-8">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Notification Engine Preferences
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure deterministic reminder cadences, quiet hours, and privacy masking.
            </p>
          </div>

          {/* Browser / PWA Push Notifications */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Browser & Device Notifications
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Deliver alerts even when CASH FLOW is in the background or minimized.
              </p>
            </div>
            <button
              onClick={() => requestBrowserNotificationPermission()}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                notificationSettings.browserNotificationsEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              }`}
            >
              {notificationSettings.browserNotificationsEnabled ? 'Notifications Enabled ✓' : 'Enable Device Alerts'}
            </button>
          </div>

          {/* Section 1: Payment Reminders */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. Payment & Debt Reminders
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  key: 'paymentDue7Days',
                  label: '7 Days Before Due Date',
                  desc: 'Advance notice for planning cash',
                },
                {
                  key: 'paymentDue3Days',
                  label: '3 Days Before Due Date',
                  desc: 'Standard preparation reminder',
                },
                {
                  key: 'paymentDue1Day',
                  label: '1 Day Before Due Date',
                  desc: 'Urgent reminder to verify funds',
                },
                {
                  key: 'paymentDueToday',
                  label: 'Due Today Alert',
                  desc: 'High priority alert on due date',
                },
                {
                  key: 'overduePayment',
                  label: 'Overdue Alert',
                  desc: 'Urgent alerts for past-due commitments',
                },
                {
                  key: 'creditCardDue',
                  label: 'Credit Card Bill Due',
                  desc: 'Statement due dates and min amounts',
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.label}
                    </span>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(notificationSettings as any)[item.key]}
                    onChange={(e) =>
                      updateNotificationSettings({ [item.key]: e.target.checked } as any)
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Budget & Cash Alerts */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Budget & Cash Flow Warnings
            </h3>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Budget Warning Threshold
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Alert when category spending reaches {notificationSettings.budgetWarningThreshold}% of monthly limit
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={notificationSettings.budgetWarningThreshold}
                    onChange={(e) =>
                      updateNotificationSettings({
                        budgetWarningThreshold: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-32 accent-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-white w-10 text-right">
                    {notificationSettings.budgetWarningThreshold}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    key: 'budgetExceeded',
                    label: 'Budget Exceeded (100%+)',
                    desc: 'High priority alert when category exceeds limit',
                  },
                  {
                    key: 'lowCash',
                    label: 'Low Cash Below Minimum Buffer',
                    desc: 'Alerts when current liquid cash breaches buffer',
                  },
                  {
                    key: 'cashPressure',
                    label: 'Upcoming Cash Pressure Period',
                    desc: 'Alerts if cash will be tight before next salary',
                  },
                  {
                    key: 'forecastLowCash',
                    label: 'Forecasted Month-End Deficit',
                    desc: '30-day projection falls below buffer threshold',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {item.label}
                      </span>
                      <p className="text-[11px] text-slate-400">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={(notificationSettings as any)[item.key]}
                      onChange={(e) =>
                        updateNotificationSettings({ [item.key]: e.target.checked } as any)
                      }
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: SMS & Swiggy Reminders */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3. Operational Reminders (SMS & Swiggy)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Aggregated SMS Review
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Single daily reminder when pending SMS candidates exist
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.smsReview}
                  onChange={(e) =>
                    updateNotificationSettings({ smsReview: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Planned Swiggy Shift Reminder
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Alert before scheduled lunch/dinner delivery shifts
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.swiggyShift}
                  onChange={(e) =>
                    updateNotificationSettings({ swiggyShift: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Daily Earning Target Progress
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Status alert when shift ends with remaining target gap
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.swiggyTarget}
                  onChange={(e) =>
                    updateNotificationSettings({ swiggyTarget: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Monthly Financial Summary
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Notification on 1st of month with previous month recap
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.monthlySummary}
                  onChange={(e) =>
                    updateNotificationSettings({ monthlySummary: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Section 4: Quiet Hours & Privacy */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              4. Quiet Hours & Privacy Masking
            </h3>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Enable Quiet Hours
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Suppress non-urgent sound and banner notifications during rest hours
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.quietHoursEnabled}
                  onChange={(e) =>
                    updateNotificationSettings({ quietHoursEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              {notificationSettings.quietHoursEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Quiet Hours Start
                    </label>
                    <input
                      type="time"
                      value={notificationSettings.quietHoursStart}
                      onChange={(e) =>
                        updateNotificationSettings({ quietHoursStart: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Quiet Hours End
                    </label>
                    <input
                      type="time"
                      value={notificationSettings.quietHoursEnd}
                      onChange={(e) =>
                        updateNotificationSettings({ quietHoursEnd: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Allow Urgent Alerts During Quiet Hours
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Overdue payments and zero-balance alerts will bypass quiet hours
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.allowUrgentDuringQuietHours}
                  onChange={(e) =>
                    updateNotificationSettings({
                      allowUrgentDuringQuietHours: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Hide Financial Amounts in Notifications
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Prevents lock screen or shoulder-surfing exposure of balances and ₹ amounts
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.hideAmountsInNotifications}
                  onChange={(e) =>
                    updateNotificationSettings({
                      hideAmountsInNotifications: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
