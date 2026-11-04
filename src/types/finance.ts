/**
 * Core Domain Types & Models for SmartExpense AI
 */

export type TransactionType = 'expense' | 'income' | 'transfer';

export type AccountType = 'cash' | 'bank' | 'upi' | 'credit' | 'savings' | 'other';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  minorUnitDigits: number; // e.g. 2 for paise/cents, 0 for JPY
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', minorUnitDigits: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', minorUnitDigits: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', minorUnitDigits: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', minorUnitDigits: 2 },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', locale: 'ar-AE', minorUnitDigits: 2 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA', minorUnitDigits: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', minorUnitDigits: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', minorUnitDigits: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', minorUnitDigits: 0 },
};

/**
 * Money utilities: Store all financial amounts in integer minor currency units (paise/cents)
 * to avoid floating point precision issues (e.g., 0.1 + 0.2 !== 0.3).
 */
export function toMinorUnits(amount: number, digits: number = 2): number {
  if (isNaN(amount)) return 0;
  return Math.round(amount * Math.pow(10, digits));
}

export function fromMinorUnits(minorUnits: number, digits: number = 2): number {
  if (isNaN(minorUnits)) return 0;
  return minorUnits / Math.pow(10, digits);
}

export function formatMoney(
  minorUnits: number,
  currencyCode: string = 'INR',
  options?: { showPlusSign?: boolean; compact?: boolean }
): string {
  const config = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.INR;
  const majorAmount = fromMinorUnits(minorUnits, config.minorUnitDigits);

  try {
    let formatted = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: config.minorUnitDigits,
      maximumFractionDigits: config.minorUnitDigits,
      notation: options?.compact ? 'compact' : 'standard',
    }).format(Math.abs(majorAmount));

    if (majorAmount < 0) {
      formatted = `-${formatted}`;
    } else if (options?.showPlusSign && majorAmount > 0) {
      formatted = `+${formatted}`;
    }
    return formatted;
  } catch {
    const sign = majorAmount < 0 ? '-' : options?.showPlusSign && majorAmount > 0 ? '+' : '';
    return `${sign}${config.symbol}${Math.abs(majorAmount).toFixed(config.minorUnitDigits)}`;
  }
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number; // in minor units (paise)
  currency: string;
  color: string;
  icon: string;
  accountNumberMasked?: string;
  isArchived: boolean;
  notes?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number; // in minor units (paise), always positive
  type: TransactionType;
  categoryId: string; // empty string for transfer
  fromAccountId: string; // source account or single account for expense/income
  toAccountId?: string; // destination account for transfer
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  paymentMethod?: string; // 'UPI' | 'Card' | 'NetBanking' | 'Cash' | 'AutoDebit' | 'Other'
  notes?: string;
  tags?: string[];
  receiptUrl?: string; // data URL or storage ref
  recurringRuleId?: string; // linked if created by recurring rule
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  categoryId: string; // 'all' for total monthly budget, or specific categoryId
  month: string; // 'YYYY-MM'
  limitAmount: number; // in minor units (paise)
  warningThreshold: number; // default 75 (%)
  dangerThreshold: number; // default 90 (%)
  createdAt: string;
}

export interface RecurringRule {
  id: string;
  title: string;
  amount: number; // in minor units (paise)
  type: TransactionType;
  categoryId: string;
  fromAccountId: string;
  toAccountId?: string;
  frequency: RecurrenceFrequency;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (optional)
  nextDueDate: string; // YYYY-MM-DD
  lastGeneratedDate?: string; // YYYY-MM-DD
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number; // in minor units (paise)
  savedAmount: number; // in minor units (paise)
  targetDate: string; // YYYY-MM-DD
  color: string;
  icon: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  amount: number; // in minor units (paise, positive or negative for withdrawal)
  date: string; // YYYY-MM-DD
  notes?: string;
  linkedAccountId?: string;
  createdAt: string;
}

export interface AppSettings {
  id: string; // single row, usually 'current'
  displayName: string;
  currency: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  theme: 'light' | 'dark' | 'system';
  budgetThresholds: {
    warning: number; // e.g. 75
    danger: number; // e.g. 90
  };
  hasCompletedOnboarding: boolean;
  isDemoMode: boolean;
  aiBackendUrl: string; // empty string = current origin (/api)
}

export interface FinancialHealthMetrics {
  savingsRate: number; // 0 - 100 (%)
  dailyAverageSpend: number; // minor units
  budgetUtilization: number; // 0 - 100 (%)
  monthOverMonthExpenseChange: number; // percentage change (e.g. +12.5 or -8.2)
  netWorth: number; // minor units
  totalIncome: number; // minor units
  totalExpense: number; // minor units
  netSavings: number; // minor units
}

export interface SpendingForecast {
  projectedMonthEndExpense: number; // minor units
  currentPace: number; // minor units per day
  daysElapsed: number;
  daysRemaining: number;
  recurringCommitmentsRemaining: number; // minor units
  forecastConfidence: 'high' | 'medium' | 'low';
  summaryText: string;
}

export interface DeterministicInsight {
  id: string;
  title: string;
  type: 'positive' | 'warning' | 'tip' | 'neutral';
  message: string;
  actionText?: string;
  actionRoute?: string;
}
