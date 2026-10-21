/**
 * Module: Formatting Utilities
 * Responsibility: Enforces Indian currency formatting (INR) with standard commas,
 * and computes relative due date text ("Due in 3 days", "Overdue by 5 days", "Due today").
 */

/**
 * Formats a monetary number into Indian Rupee format: e.g. ₹1,500.50, ₹1,00,000.00
 */
export function formatINR(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';

  const parts = num.toFixed(2).split('.');
  let integerPart = parts[0]!;
  const decimalPart = parts[1]!;

  // Indian comma grouping: last 3 digits, then every 2 digits
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  return `₹${integerPart}.${decimalPart}`;
}

export interface RelativeDueInfo {
  text: string;
  isOverdue: boolean;
  daysDiff: number;
}

/**
 * Computes human-friendly relative due date text based on calendar dates (YYYY-MM-DD).
 * Eliminates timezone conversion shifts by calculating delta purely from calendar dates.
 */
export function getRelativeDueDate(dueDateStr: string, isRepaid: boolean = false): RelativeDueInfo {
  if (isRepaid) {
    return {
      text: 'Repaid',
      isOverdue: false,
      daysDiff: 0,
    };
  }

  // Parse YYYY-MM-DD into year, month, day in UTC to avoid time-of-day offsets
  const [y, m, d] = dueDateStr.split('-').map(Number);
  if (!y || !m || !d) {
    return { text: dueDateStr, isOverdue: false, daysDiff: 0 };
  }

  const due = new Date(Date.UTC(y, m - 1, d));

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.round((due.getTime() - today.getTime()) / msPerDay);

  if (daysDiff < 0) {
    const overdueDays = Math.abs(daysDiff);
    return {
      text: overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      isOverdue: true,
      daysDiff,
    };
  } else if (daysDiff === 0) {
    return {
      text: 'Due today',
      isOverdue: false,
      daysDiff: 0,
    };
  } else if (daysDiff === 1) {
    return {
      text: 'Due tomorrow',
      isOverdue: false,
      daysDiff: 1,
    };
  } else {
    return {
      text: `Due in ${daysDiff} days`,
      isOverdue: false,
      daysDiff,
    };
  }
}
