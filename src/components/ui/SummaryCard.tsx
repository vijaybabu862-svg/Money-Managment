import React from 'react';
import { formatINR } from '../../utils/currency';

interface SummaryCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'income' | 'expense' | 'debt' | 'neutral' | 'warning';
  onClick?: () => void;
  className?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  amount,
  subtitle,
  icon,
  variant = 'neutral',
  onClick,
  className = '',
}) => {
  const getAccentColor = () => {
    switch (variant) {
      case 'income':
        return 'text-[#16A34A] dark:text-[#22C55E]';
      case 'expense':
        return 'text-[#DC2626] dark:text-[#EF4444]';
      case 'debt':
        return 'text-[#EA580C] dark:text-[#F97316]';
      case 'warning':
        return 'text-[#D97706] dark:text-[#FBBF24]';
      default:
        return 'text-[#111827] dark:text-[#F3F4F6]';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs transition ${
        onClick ? 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-600' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="text-xs sm:text-sm font-medium text-[#6B7280] dark:text-[#9CA3AF]">
          {title}
        </span>
        {icon && (
          <div className="text-[#6B7280] dark:text-[#9CA3AF]">
            {icon}
          </div>
        )}
      </div>

      <div className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums ${getAccentColor()}`}>
        {formatINR(amount)}
      </div>

      {subtitle && (
        <div className="mt-1.5 text-xs text-[#6B7280] dark:text-[#9CA3AF] line-clamp-1">
          {subtitle}
        </div>
      )}
    </div>
  );
};
