import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Sun, Moon, Wallet, Settings, LogIn, User, Cloud } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getGreeting } from '../../utils/dates';
import { formatINR } from '../../utils/currency';

interface HeaderProps {
  onToggleMobileDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileDrawer }) => {
  const { state, centralPosition } = useFinance();
  const { theme, setTheme, isDark } = useTheme();
  const { authState, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const handleSignIn = async () => {
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        showToast('✓ Signed in with Google! Multi-device sync is active.');
      } else if (res.error) {
        showToast(`Sign in error: ${res.error}`, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      showToast(`Sign in failed: ${msg}`, 'error');
    }
  };

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(isDark ? 'light' : 'dark');
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  const { isShortfall, shortfallOrSurplusAmount } = centralPosition;

  return (
    <header className="h-16 px-4 sm:px-6 bg-white dark:bg-[#131926] border-b border-[#E5E7EB] dark:border-[#1F2937] flex items-center justify-between sticky top-0 z-30">
      {/* Left: Hamburger (mobile) & Brand/Greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileDrawer}
          className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F3F4F6] tracking-tight">
            {getGreeting(state.profile.name || 'Vijay')}
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            {todayStr}
          </p>
        </div>
      </div>

      {/* Right: Balance Chip, Auth, Theme Toggle & Settings */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Cash Flow Position Chip */}
        <Link
          to="/cash-flow"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
            isShortfall
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60'
          }`}
          title="Click to view full monthly cash flow ledger"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>{isShortfall ? `Shortfall: ${formatINR(shortfallOrSurplusAmount)}` : `Left: ${formatINR(shortfallOrSurplusAmount)}`}</span>
        </Link>

        {/* Auth / Account indicator */}
        {authState.status === 'signed_in' ? (
          <Link
            to="/settings"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100/50 transition cursor-pointer"
            title={`Connected to Cloud as ${authState.email || 'User'}. Click to manage in Settings.`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Cloud className="w-3.5 h-3.5" />
            <span className="hidden md:inline max-w-[120px] truncate text-[11px] font-semibold">
              {authState.displayName || authState.email?.split('@')[0] || 'Synced'}
            </span>
          </Link>
        ) : (
          <button
            onClick={handleSignIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
            title="Sign in with Google to sync transactions across your phone and PC"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Settings Shortcut */}
        <Link
          to="/settings"
          aria-label="Settings"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
};
