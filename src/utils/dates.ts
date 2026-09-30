/**
 * Date and time utilities formatted for Indian locale
 */

export function getCurrentDateISO(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function getCurrentMonthKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getPreviousMonthKey(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatIndianDate(
  dateStr: string,
  options?: { includeYear?: boolean; relative?: boolean }
): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const { includeYear = true, relative = false } = options || {};

  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const targetDate = new Date(cleanDateStr + 'T00:00:00');
  if (isNaN(targetDate.getTime())) return dateStr;

  if (relative) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(targetDate);
    checkDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((checkDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays === 1) return 'Tomorrow';
  }

  const day = targetDate.getDate();
  const month = targetDate.toLocaleString('en-IN', { month: 'short' });
  const year = targetDate.getFullYear();

  return includeYear ? `${day} ${month} ${year}` : `${day} ${month}`;
}

export function formatMonthYear(monthKey: string): string {
  // monthKey is YYYY-MM
  if (!monthKey || !monthKey.includes('-')) return monthKey;
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

export function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  let timeOfDay = 'Good morning';
  if (hour >= 12 && hour < 17) {
    timeOfDay = 'Good afternoon';
  } else if (hour >= 17) {
    timeOfDay = 'Good evening';
  }

  if (name) {
    const firstName = name.split(' ')[0];
    return `${timeOfDay}, ${firstName}`;
  }
  return timeOfDay;
}

export function getDaysLeftInMonth(): number {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return endOfMonth.getDate() - now.getDate();
}
