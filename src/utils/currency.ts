/**
 * Indian Rupee (₹) formatting utilities
 * Adheres strictly to the Indian numbering system (Lakhs, Crores)
 */

export function formatINR(
  amount: number,
  options?: {
    showSign?: boolean;
    compact?: boolean;
    decimals?: number;
  }
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }

  const { showSign = false, compact = false, decimals = 0 } = options || {};

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  if (compact) {
    return formatCompactINR(amount);
  }

  const formatter = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });

  const formattedNumber = formatter.format(absAmount);
  const sign = isNegative ? '-₹' : showSign && amount > 0 ? '+₹' : '₹';

  return `${sign}${formattedNumber}`;
}

export function formatCompactINR(amount: number): string {
  if (isNaN(amount)) return '₹0';

  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let formatted = '';
  if (abs >= 10000000) {
    // 1 Crore = 10,000,000
    const cr = abs / 10000000;
    formatted = `${cr.toFixed(cr >= 10 ? 1 : 2)} Cr`;
  } else if (abs >= 100000) {
    // 1 Lakh = 100,000
    const lk = abs / 100000;
    formatted = `${lk.toFixed(lk >= 10 ? 1 : 2)} L`;
  } else if (abs >= 1000) {
    const k = abs / 1000;
    formatted = `${k.toFixed(k >= 10 ? 0 : 1)}k`;
  } else {
    formatted = abs.toLocaleString('en-IN');
  }

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

export function formatPercentage(value: number, total: number): string {
  if (!total || total <= 0) return '0%';
  const pct = Math.min(100, Math.round((value / total) * 100));
  return `${pct}%`;
}
