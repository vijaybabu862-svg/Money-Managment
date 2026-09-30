import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  Bike,
  Wallet,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const MobileBottomNav: React.FC = () => {
  const { centralPosition } = useFinance();
  const { totalActiveLoans } = centralPosition;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#131926]/95 backdrop-blur-md border-t border-[#E5E7EB] dark:border-[#1F2937] safe-area-pb">
      <div className="grid grid-cols-5 items-center h-16 px-1">
        {/* Dashboard */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 transition ${
              isActive
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Home</span>
        </NavLink>

        {/* Loans */}
        <NavLink
          to="/loans"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-1 transition ${
              isActive
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`
          }
        >
          <div className="relative">
            <CreditCard className="w-5 h-5 mb-0.5" />
            {totalActiveLoans > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-amber-600 text-[9px] font-bold text-white leading-none">
                {totalActiveLoans}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Loans</span>
        </NavLink>

        {/* Salary */}
        <NavLink
          to="/salary"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 transition ${
              isActive
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`
          }
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Salary</span>
        </NavLink>

        {/* Swiggy */}
        <NavLink
          to="/swiggy"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 transition ${
              isActive
                ? 'text-orange-600 dark:text-orange-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`
          }
        >
          <Bike className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Swiggy</span>
        </NavLink>

        {/* Cash Flow */}
        <NavLink
          to="/cash-flow"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 transition ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`
          }
        >
          <Wallet className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Cash Flow</span>
        </NavLink>
      </div>
    </div>
  );
};
