import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Sun, Moon, Wallet, Settings } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useTheme } from '../../context/ThemeContext';
import { getGreeting } from '../../utils/dates';
import { formatINR } from '../../utils/currency';

interface HeaderProps {
  onToggleMobileDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileDrawer }) => {
  const { state, centralPosition } = useFinance();
  const { theme, setTheme, isDark } = useTheme();

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

      {/* Right: Balance Chip & Theme Toggle */}
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
