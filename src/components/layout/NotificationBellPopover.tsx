import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  X,
  CreditCard,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  Bike,
  MessageSquareCode,
  Calendar,
  CheckCircle2,
  Clock,
  Settings,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { FinancialNotification } from '../../types/finance';

export const NotificationBellPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadNotificationCount,
    urgentNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    actionNotification,
  } = useFinance();
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getNotificationIcon = (type: string, priority: string) => {
    switch (type) {
      case 'EMI_DUE':
      case 'CREDIT_CARD_DUE':
      case 'PAYMENT_DUE':
        return <CreditCard className="w-4 h-4 text-amber-500" />;
      case 'LOW_CASH':
      case 'FORECAST_LOW_CASH':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'CASH_PRESSURE':
        return <TrendingDown className="w-4 h-4 text-orange-500" />;
      case 'BUDGET_WARNING':
      case 'BUDGET_EXCEEDED':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'SWIGGY_SHIFT':
      case 'SWIGGY_TARGET':
        return <Bike className="w-4 h-4 text-orange-500" />;
      case 'SMS_REVIEW':
        return <MessageSquareCode className="w-4 h-4 text-blue-500" />;
      case 'MONTHLY_SUMMARY':
        return <Calendar className="w-4 h-4 text-indigo-500" />;
      default:
        return priority === 'URGENT' ? (
          <AlertCircle className="w-4 h-4 text-red-500" />
        ) : (
          <Clock className="w-4 h-4 text-slate-500" />
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
            Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
            High
          </span>
        );
      case 'NORMAL':
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
            Info
          </span>
        );
      default:
        return null;
    }
  };

  // Show active notifications (exclude dismissed)
  const activeNotifications = (notifications || [])
    .filter((n) => n.status !== 'DISMISSED')
    .slice(0, 6);

  const handleAction = (notif: FinancialNotification) => {
    actionNotification(notif.id);
    setIsOpen(false);
    if (notif.actionRoute) {
      navigate(notif.actionRoute);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      >
        <Bell className="w-4 h-4" />
        {unreadNotificationCount > 0 && (
          <span
            className={`absolute top-1.5 right-1.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-extrabold text-white ring-2 ring-white dark:ring-[#131926] ${
              urgentNotificationCount > 0 ? 'bg-red-600' : 'bg-blue-600'
            }`}
          >
            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-[#E5E7EB] dark:border-[#1F2937] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Notifications
              </h3>
              {unreadNotificationCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  {unreadNotificationCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {unreadNotificationCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications?tab=settings');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
                title="Notification Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {activeNotifications.length === 0 ? (
              <div className="py-8 text-center px-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  All caught up!
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  No pending reminders or urgent alerts right now.
                </p>
              </div>
            ) : (
              activeNotifications.map((n) => {
                const isUnread = n.status === 'UNREAD';
                return (
                  <div
                    key={n.id}
                    className={`p-3.5 px-4 transition flex gap-3 items-start ${
                      isUnread
                        ? 'bg-blue-50/30 dark:bg-blue-950/15'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                      {getNotificationIcon(n.type, n.priority)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            isUnread
                              ? 'text-slate-900 dark:text-white'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {n.title}
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {getPriorityBadge(n.priority)}
                          <button
                            onClick={() => dismissNotification(n.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition"
                            title="Dismiss"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1">
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        <div className="flex items-center gap-2">
                          {isUnread && (
                            <button
                              onClick={() => markNotificationRead(n.id)}
                              className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                            >
                              Read
                            </button>
                          )}
                          {n.actionRoute && (
                            <button
                              onClick={() => handleAction(n)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <span>{n.actionLabel || 'View'}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-[#E5E7EB] dark:border-[#1F2937] text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline w-full py-1"
            >
              Open Full Alert Center & Briefing →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
