import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  variant?: 'income' | 'expense' | 'debt' | 'primary' | 'warning';
  showPercentage?: boolean;
  heightClass?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  variant = 'primary',
  showPercentage = false,
  heightClass = 'h-2',
  className = '',
}) => {
  const percentage = total > 0 ? Math.min(100, Math.max(0, Math.round((current / total) * 100))) : 0;

  const getBarColor = () => {
    if (percentage > 100) return 'bg-[#DC2626]';
    switch (variant) {
      case 'income':
        return 'bg-[#16A34A]';
      case 'expense':
        return percentage >= 90 ? 'bg-[#DC2626]' : percentage >= 75 ? 'bg-[#EAB308]' : 'bg-slate-900 dark:bg-slate-100';
      case 'debt':
        return 'bg-[#EA580C]';
      case 'warning':
        return 'bg-[#EAB308]';
      default:
        return 'bg-slate-900 dark:bg-blue-600';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${heightClass} rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-between items-center text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1.5 tabular-nums">
          <span>{percentage}% used</span>
          <span>{100 - percentage}% remaining</span>
        </div>
      )}
    </div>
  );
};
