import React from 'react';
import { formatINR } from '../../utils/currency';

interface MoneyCardProps {
  label: string;
  amount: number;
  subtext?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  semanticColor?: 'income' | 'expense' | 'debt' | 'neutral' | 'info';
  action?: React.ReactNode;
  className?: string;
}

export const MoneyCard: React.FC<MoneyCardProps> = ({
  label,
  amount,
  subtext,
  trend,
  semanticColor = 'neutral',
  action,
  className = '',
}) => {
  const getAmountColor = () => {
    switch (semanticColor) {
      case 'income':
        return 'text-[#16A34A] dark:text-[#22C55E]';
      case 'expense':
        return 'text-[#DC2626] dark:text-[#EF4444]';
      case 'debt':
        return 'text-[#EA580C] dark:text-[#F97316]';
      case 'info':
        return 'text-[#2563EB] dark:text-[#3B82F6]';
      default:
        return 'text-[#111827] dark:text-[#F3F4F6]';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs sm:text-sm font-medium text-[#6B7280] dark:text-[#9CA3AF]">
          {label}
        </span>
        {action && <div>{action}</div>}
      </div>

      <div className={`text-3xl sm:text-4xl font-bold tracking-tight tabular-nums ${getAmountColor()}`}>
        {formatINR(amount)}
      </div>

      {(subtext || trend) && (
        <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          {trend && (
            <span
              className={`font-semibold tabular-nums ${
                trend.isPositive ? 'text-[#16A34A]' : 'text-[#DC2626]'
              }`}
            >
              {trend.value}
            </span>
          )}
          {trend?.label && <span>{trend.label}</span>}
          {subtext && !trend && <span>{subtext}</span>}
        </div>
      )}
    </div>
  );
};
