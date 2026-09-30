import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  Bike,
  ShoppingBag,
  Wallet,
  Settings,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/currency';

interface SidebarProps {
  onCloseMobileDrawer?: () => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/loans', label: 'Loans', icon: CreditCard, isLoans: true },
  { to: '/salary', label: 'Salary', icon: TrendingUp },
  { to: '/swiggy', label: 'Swiggy', icon: Bike, isSwiggy: true },
  { to: '/expenses', label: 'Expenses', icon: ShoppingBag },
  { to: '/cash-flow', label: 'Cash Flow', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobileDrawer }) => {
  const { centralPosition } = useFinance();
  const { totalActiveLoans, swiggyNetIncome } = centralPosition;

  return (
    <aside className="w-64 h-full bg-white dark:bg-[#131926] border-r border-[#E5E7EB] dark:border-[#1F2937] flex flex-col justify-between flex-shrink-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-[#E5E7EB] dark:border-[#1F2937]">
          <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-extrabold text-sm tracking-tight shadow-xs">
            ₹
          </div>
          <div>
            <h1 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6] tracking-tight">
              CASH FLOW
            </h1>
            <p className="text-[10px] uppercase font-semibold tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
              Know your money
            </p>
          </div>
        </div>

        {/* Navigation List - Only the 7 core sections */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onCloseMobileDrawer}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>

                {/* Loans Count Badge */}
                {item.isLoans && totalActiveLoans > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    {totalActiveLoans}
                  </span>
                )}

                {/* Swiggy Net Badge */}
                {item.isSwiggy && swiggyNetIncome > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                    {formatINR(swiggyNetIncome)}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Simple Footer Tag */}
      <div className="p-4 border-t border-[#E5E7EB] dark:border-[#1F2937] text-center">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          Control your debt.
        </p>
      </div>
    </aside>
  );
};
