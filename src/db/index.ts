import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Category,
  Transaction,
  Budget,
  RecurringRule,
  SavingsGoal,
  SavingsContribution,
  AppSettings,
} from '../types/finance';
import type {
  SplitParticipant,
  ExpenseSplit,
  SplitShare,
  SplitSettlement,
} from '../types/split';
import { toMinorUnits } from '../types/finance';

export class SmartExpenseDB extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  recurringRules!: Table<RecurringRule, string>;
  savingsGoals!: Table<SavingsGoal, string>;
  savingsContributions!: Table<SavingsContribution, string>;
  settings!: Table<AppSettings, string>;
  splitParticipants!: Table<SplitParticipant, string>;
  expenseSplits!: Table<ExpenseSplit, string>;
  splitShares!: Table<SplitShare, string>;
  splitSettlements!: Table<SplitSettlement, string>;

  constructor() {
    super('SmartExpenseDB');

    // Schema version 1 (Base tables)
    this.version(1).stores({
      accounts: 'id, type, isArchived, createdAt',
      categories: 'id, type, name',
      transactions: 'id, type, categoryId, fromAccountId, toAccountId, date, createdAt',
      budgets: 'id, categoryId, month',
      recurringRules: 'id, frequency, isActive, nextDueDate',
      savingsGoals: 'id, targetDate',
      savingsContributions: 'id, goalId, date',
      settings: 'id',
    });

    // Schema version 2 (Group & Student Expense Splitting)
    this.version(2).stores({
      splitParticipants: 'id, isCurrentUser, name, createdAt',
      expenseSplits: 'id, payerParticipantId, status, date, createdAt',
      splitShares: 'id, splitId, participantId, isPaid',
      splitSettlements: 'id, splitId, fromParticipantId, toParticipantId, date, createdAt',
    });
  }
}

export const db = new SmartExpenseDB();

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'current',
  displayName: 'Alex Carter',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  theme: 'light',
  budgetThresholds: {
    warning: 75,
    danger: 90,
  },
  hasCompletedOnboarding: false,
  isDemoMode: false,
  aiBackendUrl: '',
};

export const DEFAULT_CATEGORIES: Category[] = [
  // Expense Categories
  { id: 'cat-food', name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-groceries', name: 'Groceries', type: 'expense', icon: 'ShoppingBag', color: '#059669', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-shopping', name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#EC4899', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-transport', name: 'Transportation', type: 'expense', icon: 'Car', color: '#3B82F6', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-rent', name: 'Rent & Housing', type: 'expense', icon: 'Home', color: '#6366F1', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-utilities', name: 'Utilities & Bills', type: 'expense', icon: 'Zap', color: '#F59E0B', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-education', name: 'Education', type: 'expense', icon: 'GraduationCap', color: '#8B5CF6', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-health', name: 'Healthcare & Fitness', type: 'expense', icon: 'HeartPulse', color: '#EF4444', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-entertainment', name: 'Entertainment', type: 'expense', icon: 'Film', color: '#F97316', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-subs', name: 'Subscriptions', type: 'expense', icon: 'Tv', color: '#8B5CF6', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-travel', name: 'Travel & Vacations', type: 'expense', icon: 'Plane', color: '#06B6D4', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-personal', name: 'Personal Care', type: 'expense', icon: 'Sparkles', color: '#14B8A6', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-gifts-exp', name: 'Gifts & Donations', type: 'expense', icon: 'Gift', color: '#A855F7', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-other-exp', name: 'Other Expense', type: 'expense', icon: 'CircleEllipsis', color: '#64748B', isDefault: true, createdAt: new Date().toISOString() },

  // Student-Focused Categories
  { id: 'cat-canteen-mess', name: 'Canteen & Mess', type: 'expense', icon: 'Utensils', color: '#F59E0B', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-hostel-rent', name: 'Hostel & PG Rent', type: 'expense', icon: 'Home', color: '#6366F1', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-books-stationery', name: 'College Books & Stationery', type: 'expense', icon: 'BookOpen', color: '#8B5CF6', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-project-expenses', name: 'Project & Lab Expenses', type: 'expense', icon: 'FolderKanban', color: '#06B6D4', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-wifi-recharge', name: 'Shared Wi-Fi & Recharge', type: 'expense', icon: 'Wifi', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },

  // Income Categories
  { id: 'cat-salary', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-freelance', name: 'Freelancing', type: 'income', icon: 'Laptop', color: '#3B82F6', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-business', name: 'Business Income', type: 'income', icon: 'Building2', color: '#6366F1', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-investments', name: 'Investments & Dividends', type: 'income', icon: 'TrendingUp', color: '#059669', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-refunds', name: 'Refunds & Cashback', type: 'income', icon: 'RotateCcw', color: '#06B6D4', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat-other-inc', name: 'Other Income', type: 'income', icon: 'Coins', color: '#84CC16', isDefault: true, createdAt: new Date().toISOString() },
];

/**
 * Seed initial baseline data if tables are empty.
 */
export async function initializeDatabase(): Promise<AppSettings> {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.put(DEFAULT_SETTINGS);
  }

  const catCount = await db.categories.count();
  if (catCount === 0) {
    await db.categories.bulkPut(DEFAULT_CATEGORIES);
  } else {
    // Ensure student-focused categories exist even in existing profiles
    for (const cat of DEFAULT_CATEGORIES) {
      const exists = await db.categories.get(cat.id);
      if (!exists) {
        await db.categories.put(cat);
      }
    }
  }

  // Ensure starter self-participant exists for split feature
  const selfPart = await db.splitParticipants.get('part-self');
  if (!selfPart) {
    await db.splitParticipants.put({
      id: 'part-self',
      name: 'You (Me)',
      isCurrentUser: true,
      avatarColor: '#10B981',
      createdAt: new Date().toISOString(),
    });
  }

  const currentSettings = await db.settings.get('current');
  return currentSettings || DEFAULT_SETTINGS;
}

/**
 * Generates realistic demo data (Option B: Explore Demo)
 * Includes ~40 transactions across 3 consecutive months, 5 accounts, budgets, goals, recurring rules.
 */
export async function seedDemoData(): Promise<void> {
  // Clear existing workspace first
  await db.transaction('rw', [
    db.accounts,
    db.categories,
    db.transactions,
    db.budgets,
    db.recurringRules,
    db.savingsGoals,
    db.savingsContributions,
    db.settings,
    db.splitParticipants,
    db.expenseSplits,
    db.splitShares,
    db.splitSettlements,
  ], async () => {
    await db.accounts.clear();
    await db.categories.clear();
    await db.transactions.clear();
    await db.budgets.clear();
    await db.recurringRules.clear();
    await db.savingsGoals.clear();
    await db.savingsContributions.clear();
    await db.splitParticipants.clear();
    await db.expenseSplits.clear();
    await db.splitShares.clear();
    await db.splitSettlements.clear();

    // Default categories
    await db.categories.bulkPut(DEFAULT_CATEGORIES);

    // 1. Realistic Accounts
    const demoAccounts: Account[] = [
      {
        id: 'acc-hdfc',
        name: 'HDFC Salary Account',
        type: 'bank',
        initialBalance: toMinorUnits(45000), // ₹45,000
        currency: 'INR',
        color: '#0284C7',
        icon: 'Building2',
        accountNumberMasked: '•••• 4812',
        isArchived: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'acc-upi',
        name: 'Google Pay UPI',
        type: 'upi',
        initialBalance: toMinorUnits(4500), // ₹4,500
        currency: 'INR',
        color: '#10B981',
        icon: 'Smartphone',
        accountNumberMasked: 'alex@okhdfc',
        isArchived: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'acc-cash',
        name: 'Wallet Cash',
        type: 'cash',
        initialBalance: toMinorUnits(2200), // ₹2,200
        currency: 'INR',
        color: '#F59E0B',
        icon: 'Banknote',
        isArchived: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'acc-card',
        name: 'ICICI Amazon Pay Card',
        type: 'credit',
        initialBalance: toMinorUnits(-3400), // ₹3,400 current bill liability
        currency: 'INR',
        color: '#8B5CF6',
        icon: 'CreditCard',
        accountNumberMasked: '•••• 9201',
        isArchived: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'acc-savings',
        name: 'Emergency Savings Account',
        type: 'savings',
        initialBalance: toMinorUnits(75000), // ₹75,000
        currency: 'INR',
        color: '#059669',
        icon: 'ShieldCheck',
        accountNumberMasked: '•••• 7714',
        isArchived: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ];
    await db.accounts.bulkPut(demoAccounts);

    // Current date helpers for dynamic realistic 3-month sample data
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth(); // 0-indexed

    const formatISODate = (year: number, month: number, day: number) => {
      const d = new Date(year, month, day);
      return d.toISOString().split('T')[0];
    };

    const currentMonthStr = `${currentYear}-${String(currentMonthNum + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(currentYear, currentMonthNum - 1, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const twoMonthsAgoDate = new Date(currentYear, currentMonthNum - 2, 1);
    const twoMonthsAgoStr = `${twoMonthsAgoDate.getFullYear()}-${String(twoMonthsAgoDate.getMonth() + 1).padStart(2, '0')}`;

    // 2. Realistic Transactions (Spread over current month, previous month, and 2 months ago)
    const demoTransactions: Transaction[] = [
      // Current Month Transactions
      {
        id: 'tx-cur-sal',
        title: 'TechCorp Monthly Salary',
        amount: toMinorUnits(85000),
        type: 'income',
        categoryId: 'cat-salary',
        fromAccountId: 'acc-hdfc',
        date: formatISODate(currentYear, currentMonthNum, 1),
        time: '09:00',
        paymentMethod: 'NetBanking',
        notes: 'Monthly regular payroll credit',
        tags: ['salary', 'techcorp'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-rent',
        title: 'Apartment House Rent',
        amount: toMinorUnits(22000),
        type: 'expense',
        categoryId: 'cat-rent',
        fromAccountId: 'acc-hdfc',
        date: formatISODate(currentYear, currentMonthNum, 2),
        time: '10:30',
        paymentMethod: 'NetBanking',
        notes: 'November 2BHK rental payment',
        tags: ['rent', 'fixed'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-gpay-topup',
        title: 'UPI Wallet Top-up',
        amount: toMinorUnits(5000),
        type: 'transfer',
        categoryId: '',
        fromAccountId: 'acc-hdfc',
        toAccountId: 'acc-upi',
        date: formatISODate(currentYear, currentMonthNum, 2),
        time: '11:15',
        paymentMethod: 'UPI',
        notes: 'Weekly petty expense fund transfer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-grocery-1',
        title: 'Reliance Smart Groceries',
        amount: toMinorUnits(3850),
        type: 'expense',
        categoryId: 'cat-groceries',
        fromAccountId: 'acc-upi',
        date: formatISODate(currentYear, currentMonthNum, 3),
        time: '18:40',
        paymentMethod: 'UPI',
        notes: 'Monthly staples, olive oil, and kitchen essentials',
        tags: ['staples'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-swiggy-1',
        title: 'Swiggy - Meghana Foods Biryani',
        amount: toMinorUnits(620),
        type: 'expense',
        categoryId: 'cat-food',
        fromAccountId: 'acc-upi',
        date: formatISODate(currentYear, currentMonthNum, 4),
        time: '20:15',
        paymentMethod: 'UPI',
        notes: 'Dinner with college friends',
        tags: ['dining', 'weekend'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-uber-1',
        title: 'Uber Premier to Tech Park',
        amount: toMinorUnits(420),
        type: 'expense',
        categoryId: 'cat-transport',
        fromAccountId: 'acc-upi',
        date: formatISODate(currentYear, currentMonthNum, 5),
        time: '08:45',
        paymentMethod: 'UPI',
        tags: ['commute'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-wifi',
        title: 'Airtel Fiber Broadband',
        amount: toMinorUnits(1179),
        type: 'expense',
        categoryId: 'cat-utilities',
        fromAccountId: 'acc-hdfc',
        date: formatISODate(currentYear, currentMonthNum, 6),
        time: '12:00',
        paymentMethod: 'AutoDebit',
        tags: ['internet', 'bills'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-netflix',
        title: 'Netflix Premium 4K',
        amount: toMinorUnits(649),
        type: 'expense',
        categoryId: 'cat-subs',
        fromAccountId: 'acc-card',
        date: formatISODate(currentYear, currentMonthNum, 7),
        time: '00:05',
        paymentMethod: 'Card',
        tags: ['subscription'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-amazon',
        title: 'Amazon India - Ergonomic Mouse',
        amount: toMinorUnits(2499),
        type: 'expense',
        categoryId: 'cat-shopping',
        fromAccountId: 'acc-card',
        date: formatISODate(currentYear, currentMonthNum, 8),
        time: '15:20',
        paymentMethod: 'Card',
        notes: 'Logitech wireless mouse for work setup',
        tags: ['work', 'gadgets'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-freelance',
        title: 'Freelance UI Design Milestone',
        amount: toMinorUnits(28000),
        type: 'income',
        categoryId: 'cat-freelance',
        fromAccountId: 'acc-hdfc',
        date: formatISODate(currentYear, currentMonthNum, 10),
        time: '16:00',
        paymentMethod: 'NetBanking',
        notes: 'Landing page redesign client payment',
        tags: ['design', 'freelance'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-zomato-1',
        title: 'Zomato - Third Wave Coffee',
        amount: toMinorUnits(380),
        type: 'expense',
        categoryId: 'cat-food',
        fromAccountId: 'acc-upi',
        date: formatISODate(currentYear, currentMonthNum, 11),
        time: '11:30',
        paymentMethod: 'UPI',
        notes: 'Cold brew & croissant work session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-fuel',
        title: 'Indian Oil Petrol Pump',
        amount: toMinorUnits(1800),
        type: 'expense',
        categoryId: 'cat-transport',
        fromAccountId: 'acc-card',
        date: formatISODate(currentYear, currentMonthNum, 12),
        time: '17:40',
        paymentMethod: 'Card',
        tags: ['fuel', 'car'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-pharmacy',
        title: 'Apollo Pharmacy - Vitamins',
        amount: toMinorUnits(740),
        type: 'expense',
        categoryId: 'cat-health',
        fromAccountId: 'acc-upi',
        date: formatISODate(currentYear, currentMonthNum, 14),
        time: '19:10',
        paymentMethod: 'UPI',
        notes: 'Omega 3 and daily multivitamins',
        tags: ['health'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-electricity',
        title: 'BESCOM Power Utility Bill',
        amount: toMinorUnits(2150),
        type: 'expense',
        categoryId: 'cat-utilities',
        fromAccountId: 'acc-upi',
        date: formatISODate(currentYear, currentMonthNum, 15),
        time: '14:20',
        paymentMethod: 'UPI',
        tags: ['electricity'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-cinema',
        title: 'PVR Inox Movies & Popcorn',
        amount: toMinorUnits(1280),
        type: 'expense',
        categoryId: 'cat-entertainment',
        fromAccountId: 'acc-card',
        date: formatISODate(currentYear, currentMonthNum, 18),
        time: '21:00',
        paymentMethod: 'Card',
        notes: 'Weekend IMAX show with partner',
        tags: ['movies'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-blinkit',
        title: 'Blinkit 10-min Grocery delivery',
        amount: toMinorUnits(650),
        type: 'expense',
        categoryId: 'cat-groceries',
        fromAccountId: 'acc-upi',
        date: formatISODate(currentYear, currentMonthNum, 20),
        time: '08:15',
        paymentMethod: 'UPI',
        notes: 'Milk, bread, eggs, and Greek yogurt',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-cur-savings-transfer',
        title: 'Transfer to Emergency Fund',
        amount: toMinorUnits(15000),
        type: 'transfer',
        categoryId: '',
        fromAccountId: 'acc-hdfc',
        toAccountId: 'acc-savings',
        date: formatISODate(currentYear, currentMonthNum, 21),
        time: '10:00',
        paymentMethod: 'NetBanking',
        notes: 'Monthly savings commitment',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // Previous Month Transactions (Baseline for comparisons)
      {
        id: 'tx-prev-sal',
        title: 'TechCorp Monthly Salary',
        amount: toMinorUnits(85000),
        type: 'income',
        categoryId: 'cat-salary',
        fromAccountId: 'acc-hdfc',
        date: formatISODate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1),
        time: '09:00',
        paymentMethod: 'NetBanking',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-prev-rent',
        title: 'Apartment House Rent',
        amount: toMinorUnits(22000),
        type: 'expense',
        categoryId: 'cat-rent',
        fromAccountId: 'acc-hdfc',
        date: formatISODate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 2),
        time: '10:30',
        paymentMethod: 'NetBanking',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-prev-groc',
        title: 'D-Mart Supermarket Bulk Store',
        amount: toMinorUnits(5200),
        type: 'expense',
        categoryId: 'cat-groceries',
        fromAccountId: 'acc-card',
        date: formatISODate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 5),
        time: '16:00',
        paymentMethod: 'Card',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-prev-dining',
        title: 'Toscano Italian Bistro',
        amount: toMinorUnits(2400),
        type: 'expense',
        categoryId: 'cat-food',
        fromAccountId: 'acc-card',
        date: formatISODate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 12),
        time: '20:30',
        paymentMethod: 'Card',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-prev-uber',
        title: 'Uber City Commute Rides',
        amount: toMinorUnits(1650),
        type: 'expense',
        categoryId: 'cat-transport',
        fromAccountId: 'acc-upi',
        date: formatISODate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 15),
        time: '18:00',
        paymentMethod: 'UPI',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-prev-wifi',
        title: 'Airtel Fiber Broadband',
        amount: toMinorUnits(1179),
        type: 'expense',
        categoryId: 'cat-utilities',
        fromAccountId: 'acc-hdfc',
        date: formatISODate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 6),
        time: '12:00',
        paymentMethod: 'AutoDebit',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-prev-shopping',
        title: 'Zara Clothing & Footwear',
        amount: toMinorUnits(4600),
        type: 'expense',
        categoryId: 'cat-shopping',
        fromAccountId: 'acc-card',
        date: formatISODate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 22),
        time: '19:40',
        paymentMethod: 'Card',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-prev-div',
        title: 'Nifty 50 Index Fund Dividend',
        amount: toMinorUnits(3200),
        type: 'income',
        categoryId: 'cat-investments',
        fromAccountId: 'acc-hdfc',
        date: formatISODate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 24),
        time: '11:00',
        paymentMethod: 'NetBanking',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // 2 Months Ago Transactions
      {
        id: 'tx-2m-sal',
        title: 'TechCorp Monthly Salary',
        amount: toMinorUnits(85000),
        type: 'income',
        categoryId: 'cat-salary',
        fromAccountId: 'acc-hdfc',
        date: formatISODate(twoMonthsAgoDate.getFullYear(), twoMonthsAgoDate.getMonth(), 1),
        time: '09:00',
        paymentMethod: 'NetBanking',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-2m-rent',
        title: 'Apartment House Rent',
        amount: toMinorUnits(22000),
        type: 'expense',
        categoryId: 'cat-rent',
        fromAccountId: 'acc-hdfc',
        date: formatISODate(twoMonthsAgoDate.getFullYear(), twoMonthsAgoDate.getMonth(), 2),
        time: '10:30',
        paymentMethod: 'NetBanking',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-2m-groc',
        title: 'Reliance Smart Groceries',
        amount: toMinorUnits(4900),
        type: 'expense',
        categoryId: 'cat-groceries',
        fromAccountId: 'acc-upi',
        date: formatISODate(twoMonthsAgoDate.getFullYear(), twoMonthsAgoDate.getMonth(), 8),
        time: '17:30',
        paymentMethod: 'UPI',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-2m-travel',
        title: 'Goa Weekend Resort Booking',
        amount: toMinorUnits(8500),
        type: 'expense',
        categoryId: 'cat-travel',
        fromAccountId: 'acc-card',
        date: formatISODate(twoMonthsAgoDate.getFullYear(), twoMonthsAgoDate.getMonth(), 18),
        time: '14:00',
        paymentMethod: 'Card',
        notes: 'Beach resort stay',
        tags: ['travel', 'vacation'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    await db.transactions.bulkPut(demoTransactions);

    // 3. Budgets for Current & Previous Month
    const demoBudgets: Budget[] = [
      {
        id: `bgt-food-${currentMonthStr}`,
        categoryId: 'cat-food',
        month: currentMonthStr,
        limitAmount: toMinorUnits(4000), // ₹4,000
        warningThreshold: 75,
        dangerThreshold: 90,
        createdAt: new Date().toISOString(),
      },
      {
        id: `bgt-groc-${currentMonthStr}`,
        categoryId: 'cat-groceries',
        month: currentMonthStr,
        limitAmount: toMinorUnits(7000), // ₹7,000
        warningThreshold: 75,
        dangerThreshold: 90,
        createdAt: new Date().toISOString(),
      },
      {
        id: `bgt-shop-${currentMonthStr}`,
        categoryId: 'cat-shopping',
        month: currentMonthStr,
        limitAmount: toMinorUnits(5000), // ₹5,000
        warningThreshold: 75,
        dangerThreshold: 90,
        createdAt: new Date().toISOString(),
      },
      {
        id: `bgt-trans-${currentMonthStr}`,
        categoryId: 'cat-transport',
        month: currentMonthStr,
        limitAmount: toMinorUnits(3500), // ₹3,500
        warningThreshold: 75,
        dangerThreshold: 90,
        createdAt: new Date().toISOString(),
      },
      {
        id: `bgt-all-${currentMonthStr}`,
        categoryId: 'all',
        month: currentMonthStr,
        limitAmount: toMinorUnits(50000), // Total monthly expense budget ₹50,000
        warningThreshold: 75,
        dangerThreshold: 90,
        createdAt: new Date().toISOString(),
      },
      // Previous month budgets for comparison
      {
        id: `bgt-food-${prevMonthStr}`,
        categoryId: 'cat-food',
        month: prevMonthStr,
        limitAmount: toMinorUnits(4000),
        warningThreshold: 75,
        dangerThreshold: 90,
        createdAt: new Date().toISOString(),
      },
      {
        id: `bgt-groc-${prevMonthStr}`,
        categoryId: 'cat-groceries',
        month: prevMonthStr,
        limitAmount: toMinorUnits(7000),
        warningThreshold: 75,
        dangerThreshold: 90,
        createdAt: new Date().toISOString(),
      },
    ];
    await db.budgets.bulkPut(demoBudgets);

    // 4. Recurring Rules
    const demoRecurring: RecurringRule[] = [
      {
        id: 'rec-rent',
        title: 'Apartment House Rent',
        amount: toMinorUnits(22000),
        type: 'expense',
        categoryId: 'cat-rent',
        fromAccountId: 'acc-hdfc',
        frequency: 'monthly',
        startDate: '2026-01-01',
        nextDueDate: formatISODate(currentYear, currentMonthNum + 1, 2),
        lastGeneratedDate: formatISODate(currentYear, currentMonthNum, 2),
        isActive: true,
        notes: 'Monthly 2BHK rental auto-debit',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec-netflix',
        title: 'Netflix 4K Subscription',
        amount: toMinorUnits(649),
        type: 'expense',
        categoryId: 'cat-subs',
        fromAccountId: 'acc-card',
        frequency: 'monthly',
        startDate: '2026-01-07',
        nextDueDate: formatISODate(currentYear, currentMonthNum + 1, 7),
        lastGeneratedDate: formatISODate(currentYear, currentMonthNum, 7),
        isActive: true,
        notes: 'Entertainment family plan',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec-wifi',
        title: 'Airtel Fiber Broadband',
        amount: toMinorUnits(1179),
        type: 'expense',
        categoryId: 'cat-utilities',
        fromAccountId: 'acc-hdfc',
        frequency: 'monthly',
        startDate: '2026-01-06',
        nextDueDate: formatISODate(currentYear, currentMonthNum + 1, 6),
        lastGeneratedDate: formatISODate(currentYear, currentMonthNum, 6),
        isActive: true,
        notes: 'Gigabit home internet',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec-spotify',
        title: 'Spotify Premium Family',
        amount: toMinorUnits(199),
        type: 'expense',
        categoryId: 'cat-subs',
        fromAccountId: 'acc-card',
        frequency: 'monthly',
        startDate: '2026-02-15',
        nextDueDate: formatISODate(currentYear, currentMonthNum, 28),
        isActive: true,
        notes: 'Music streaming',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec-salary',
        title: 'TechCorp Monthly Salary',
        amount: toMinorUnits(85000),
        type: 'income',
        categoryId: 'cat-salary',
        fromAccountId: 'acc-hdfc',
        frequency: 'monthly',
        startDate: '2026-01-01',
        nextDueDate: formatISODate(currentYear, currentMonthNum + 1, 1),
        lastGeneratedDate: formatISODate(currentYear, currentMonthNum, 1),
        isActive: true,
        notes: 'Monthly recurring compensation',
        createdAt: new Date().toISOString(),
      },
    ];
    await db.recurringRules.bulkPut(demoRecurring);

    // 5. Savings Goals & Contributions
    const demoGoals: SavingsGoal[] = [
      {
        id: 'goal-emergency',
        name: 'Emergency Fund (6 Months Expenses)',
        targetAmount: toMinorUnits(150000), // ₹1,50,000
        savedAmount: toMinorUnits(90000), // ₹90,000
        targetDate: '2027-04-30',
        color: '#10B981',
        icon: 'Shield',
        notes: 'Safety net in high-interest savings account',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'goal-laptop',
        name: 'M4 MacBook Pro & Studio Display',
        targetAmount: toMinorUnits(180000), // ₹1,80,000
        savedAmount: toMinorUnits(125000), // ₹1,25,000
        targetDate: '2026-12-31',
        color: '#6366F1',
        icon: 'Laptop',
        notes: 'Workstation upgrade for freelance development',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'goal-vacation',
        name: 'Japan Cherry Blossom Trip',
        targetAmount: toMinorUnits(220000), // ₹2,20,000
        savedAmount: toMinorUnits(65000), // ₹65,000
        targetDate: '2027-03-25',
        color: '#F43F5E',
        icon: 'Plane',
        notes: 'Flights and hotels for 10-day Tokyo & Kyoto travel',
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      },
    ];
    await db.savingsGoals.bulkPut(demoGoals);

    const demoContributions: SavingsContribution[] = [
      {
        id: 'con-1',
        goalId: 'goal-emergency',
        amount: toMinorUnits(15000),
        date: formatISODate(currentYear, currentMonthNum, 21),
        notes: 'Monthly emergency savings deposit',
        linkedAccountId: 'acc-savings',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'con-2',
        goalId: 'goal-laptop',
        amount: toMinorUnits(20000),
        date: formatISODate(currentYear, currentMonthNum, 10),
        notes: 'Bonus allocation from freelance project',
        createdAt: new Date().toISOString(),
      },
    ];
    await db.savingsContributions.bulkPut(demoContributions);

    // 6. Split Participants & Demo Splits (Student Group Finances)
    const demoParticipants: SplitParticipant[] = [
      {
        id: 'part-self',
        name: 'You (Me)',
        isCurrentUser: true,
        avatarColor: '#10B981',
        upiId: 'alex@okhdfc',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'part-rohan',
        name: 'Rohan Sharma (Roommate)',
        isCurrentUser: false,
        avatarColor: '#3B82F6',
        phone: '+91 98765 43210',
        upiId: 'rohan.sharma@okaxis',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'part-priya',
        name: 'Priya Nair (Hostel Mate)',
        isCurrentUser: false,
        avatarColor: '#EC4899',
        upiId: 'priya.nair@okhdfcbank',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'part-amit',
        name: 'Amit Verma (Project Partner)',
        isCurrentUser: false,
        avatarColor: '#F59E0B',
        upiId: 'amit.v@upi',
        createdAt: new Date().toISOString(),
      },
    ];
    await db.splitParticipants.bulkPut(demoParticipants);

    const demoSplits: ExpenseSplit[] = [
      {
        id: 'split-wifi',
        title: 'Room Wi-Fi & Power Backup',
        totalAmount: toMinorUnits(1200), // ₹1,200
        currency: 'INR',
        splitMethod: 'equal',
        payerParticipantId: 'part-self',
        date: formatISODate(currentYear, currentMonthNum, 5),
        categoryId: 'cat-wifi-recharge',
        notes: 'Monthly 200Mbps optical fiber + power backup split',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'split-dinner',
        title: 'Swiggy Midnight Biryani Feast',
        totalAmount: toMinorUnits(1500), // ₹1,500
        currency: 'INR',
        splitMethod: 'equal',
        payerParticipantId: 'part-rohan',
        date: formatISODate(currentYear, currentMonthNum, 12),
        categoryId: 'cat-canteen-mess',
        notes: 'Late night exam study order',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    await db.expenseSplits.bulkPut(demoSplits);

    const demoShares: SplitShare[] = [
      // Split 1: ₹1,200 split 4 ways = ₹300 each
      { id: 'sh-1', splitId: 'split-wifi', participantId: 'part-self', amount: toMinorUnits(300), settledAmount: toMinorUnits(300), isPaid: true },
      { id: 'sh-2', splitId: 'split-wifi', participantId: 'part-priya', amount: toMinorUnits(300), settledAmount: toMinorUnits(300), isPaid: true },
      { id: 'sh-3', splitId: 'split-wifi', participantId: 'part-rohan', amount: toMinorUnits(300), settledAmount: 0, isPaid: false },
      { id: 'sh-4', splitId: 'split-wifi', participantId: 'part-amit', amount: toMinorUnits(300), settledAmount: 0, isPaid: false },

      // Split 2: ₹1,500 split 2 ways between You and Rohan = ₹750 each
      { id: 'sh-5', splitId: 'split-dinner', participantId: 'part-rohan', amount: toMinorUnits(750), settledAmount: toMinorUnits(750), isPaid: true },
      { id: 'sh-6', splitId: 'split-dinner', participantId: 'part-self', amount: toMinorUnits(750), settledAmount: 0, isPaid: false },
    ];
    await db.splitShares.bulkPut(demoShares);

    const demoSettlements: SplitSettlement[] = [
      {
        id: 'stl-1',
        splitId: 'split-wifi',
        fromParticipantId: 'part-priya',
        toParticipantId: 'part-self',
        amount: toMinorUnits(300),
        paymentMode: 'upi',
        date: formatISODate(currentYear, currentMonthNum, 6),
        notes: 'Paid via Google Pay UPI',
        createdAt: new Date().toISOString(),
      },
    ];
    await db.splitSettlements.bulkPut(demoSettlements);

    // Update settings to show demo mode is active and onboarding is done
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      hasCompletedOnboarding: true,
      isDemoMode: true,
      displayName: 'Alex Carter (Demo User)',
    });
  });
}

/**
 * Reset workspace to a clean state (Option A: Start Fresh)
 */
export async function resetCleanWorkspace(): Promise<void> {
  await db.transaction('rw', [
    db.accounts,
    db.categories,
    db.transactions,
    db.budgets,
    db.recurringRules,
    db.savingsGoals,
    db.savingsContributions,
    db.settings,
    db.splitParticipants,
    db.expenseSplits,
    db.splitShares,
    db.splitSettlements,
  ], async () => {
    await db.accounts.clear();
    await db.categories.clear();
    await db.transactions.clear();
    await db.budgets.clear();
    await db.recurringRules.clear();
    await db.savingsGoals.clear();
    await db.savingsContributions.clear();
    await db.splitParticipants.clear();
    await db.expenseSplits.clear();
    await db.splitShares.clear();
    await db.splitSettlements.clear();

    await db.categories.bulkPut(DEFAULT_CATEGORIES);

    // Create self-participant for splitting
    await db.splitParticipants.put({
      id: 'part-self',
      name: 'You (Me)',
      isCurrentUser: true,
      avatarColor: '#10B981',
      createdAt: new Date().toISOString(),
    });

    // Create one starter cash/bank account so the user can immediately record expenses
    const primaryAccount: Account = {
      id: 'acc-primary',
      name: 'Primary Bank Account',
      type: 'bank',
      initialBalance: toMinorUnits(20000), // Default ₹20,000 as per TEST 1
      currency: 'INR',
      color: '#10B981',
      icon: 'Building2',
      isArchived: false,
      notes: 'Initial account',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.accounts.put(primaryAccount);

    await db.settings.put({
      ...DEFAULT_SETTINGS,
      hasCompletedOnboarding: true,
      isDemoMode: false,
      displayName: 'My Workspace',
    });
  });
}
