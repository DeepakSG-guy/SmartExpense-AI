import type {
  Account,
  Transaction,
  Budget,
  RecurringRule,
  Category,
  FinancialHealthMetrics,
  SpendingForecast,
  DeterministicInsight,
} from '../types/finance';
import { fromMinorUnits, toMinorUnits } from '../types/finance';

/**
 * Computes exact current balances for all accounts based on their initial balance
 * and all recorded non-archived transactions.
 * Uses integer minor units to eliminate floating point rounding error.
 */
export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): Map<string, number> {
  const balanceMap = new Map<string, number>();

  // Initialize with account initial balances
  for (const acc of accounts) {
    balanceMap.set(acc.id, acc.initialBalance || 0);
  }

  // Apply each transaction chronologically
  for (const tx of transactions) {
    if (tx.type === 'expense') {
      const current = balanceMap.get(tx.fromAccountId) ?? 0;
      balanceMap.set(tx.fromAccountId, current - tx.amount);
    } else if (tx.type === 'income') {
      const current = balanceMap.get(tx.fromAccountId) ?? 0;
      balanceMap.set(tx.fromAccountId, current + tx.amount);
    } else if (tx.type === 'transfer' && tx.toAccountId) {
      const sourceCurrent = balanceMap.get(tx.fromAccountId) ?? 0;
      const destCurrent = balanceMap.get(tx.toAccountId) ?? 0;
      balanceMap.set(tx.fromAccountId, sourceCurrent - tx.amount);
      balanceMap.set(tx.toAccountId, destCurrent + tx.amount);
    }
  }

  return balanceMap;
}

/**
 * Calculates total net worth.
 * Note: Asset accounts (bank, cash, upi, savings) add to net worth.
 * Credit card balances are liabilities (negative balance reduces net worth).
 */
export function calculateNetWorth(accounts: Account[], balanceMap: Map<string, number>): number {
  let netWorth = 0;
  for (const acc of accounts) {
    if (acc.isArchived) continue;
    const balance = balanceMap.get(acc.id) ?? acc.initialBalance;
    netWorth += balance;
  }
  return netWorth;
}

/**
 * Filters transactions within a date boundary (inclusive YYYY-MM-DD strings).
 */
export function filterTransactionsByDate(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] {
  return transactions.filter((tx) => tx.date >= startDate && tx.date <= endDate);
}

/**
 * Calculates total Income, Expense, and Net Savings for a given set of transactions.
 * Transfers are explicitly ignored so they do not inflate income or expenses.
 */
export function calculateTotals(transactions: Transaction[]): {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
} {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
    }
  }

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.min(100, Math.round((netSavings / totalIncome) * 100))) : 0;

  return { totalIncome, totalExpense, netSavings, savingsRate };
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  totalAmount: number; // minor units
  percentage: number; // 0 - 100
  transactionCount: number;
}

/**
 * Computes expense or income breakdown by category.
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  type: 'expense' | 'income' = 'expense'
): CategoryBreakdown[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, { amount: number; count: number }>();

  let grandTotal = 0;
  for (const tx of transactions) {
    if (tx.type === type && tx.categoryId) {
      grandTotal += tx.amount;
      const existing = totals.get(tx.categoryId) || { amount: 0, count: 0 };
      totals.set(tx.categoryId, {
        amount: existing.amount + tx.amount,
        count: existing.count + 1,
      });
    }
  }

  const result: CategoryBreakdown[] = [];
  totals.forEach((val, catId) => {
    const cat = categoryMap.get(catId);
    result.push({
      categoryId: catId,
      categoryName: cat?.name || 'Uncategorized',
      categoryColor: cat?.color || '#94A3B8',
      categoryIcon: cat?.icon || 'Tag',
      totalAmount: val.amount,
      percentage: grandTotal > 0 ? Number(((val.amount / grandTotal) * 100).toFixed(1)) : 0,
      transactionCount: val.count,
    });
  });

  return result.sort((a, b) => b.totalAmount - a.totalAmount);
}

export interface BudgetStatus {
  budget: Budget;
  categoryName: string;
  categoryColor: string;
  spentAmount: number; // minor units
  limitAmount: number; // minor units
  remainingAmount: number; // minor units (negative if exceeded)
  percentageUsed: number; // 0 - 100+
  state: 'safe' | 'approaching' | 'warning' | 'exceeded';
  daysRemainingInMonth: number;
}

/**
 * Evaluates budget performance for a given month.
 */
export function calculateBudgetStatuses(
  budgets: Budget[],
  transactions: Transaction[],
  categories: Category[],
  monthStr: string // 'YYYY-MM'
): BudgetStatus[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Get month date range
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthNumStr, 10) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startDate = `${monthStr}-01`;
  const endDate = `${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

  const monthExpenses = filterTransactionsByDate(transactions, startDate, endDate).filter(
    (tx) => tx.type === 'expense'
  );

  // Today comparison for days remaining
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  let daysRemainingInMonth = 0;
  if (monthStr === currentMonthStr) {
    daysRemainingInMonth = Math.max(0, daysInMonth - today.getDate());
  } else if (monthStr > currentMonthStr) {
    daysRemainingInMonth = daysInMonth;
  }

  return budgets
    .filter((b) => b.month === monthStr)
    .map((b) => {
      let spent = 0;
      let catName = 'Total Monthly Spending';
      let catColor = '#10B981';

      if (b.categoryId === 'all') {
        spent = monthExpenses.reduce((sum, tx) => sum + tx.amount, 0);
      } else {
        const cat = categoryMap.get(b.categoryId);
        if (cat) {
          catName = cat.name;
          catColor = cat.color;
        }
        spent = monthExpenses
          .filter((tx) => tx.categoryId === b.categoryId)
          .reduce((sum, tx) => sum + tx.amount, 0);
      }

      const limit = b.limitAmount;
      const remaining = limit - spent;
      const percentageUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      const warningThresh = b.warningThreshold || 75;
      const dangerThresh = b.dangerThreshold || 90;

      let state: 'safe' | 'approaching' | 'warning' | 'exceeded' = 'safe';
      if (percentageUsed >= 100) {
        state = 'exceeded';
      } else if (percentageUsed >= dangerThresh) {
        state = 'warning';
      } else if (percentageUsed >= warningThresh) {
        state = 'approaching';
      }

      return {
        budget: b,
        categoryName: catName,
        categoryColor: catColor,
        spentAmount: spent,
        limitAmount: limit,
        remainingAmount: remaining,
        percentageUsed,
        state,
        daysRemainingInMonth,
      };
    })
    .sort((a, b) => b.percentageUsed - a.percentageUsed);
}

/**
 * Transparent, deterministic spending forecast for the current month.
 * Computes average daily run-rate from elapsed days, adds upcoming scheduled
 * recurring bills due in the remaining days of the month, and projects month-end total.
 */
export function calculateSpendingForecast(
  transactions: Transaction[],
  recurringRules: RecurringRule[],
  currentDate: Date = new Date()
): SpendingForecast {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentDay = currentDate.getDate();

  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const startDate = `${monthStr}-01`;
  const endDateToday = `${monthStr}-${String(currentDay).padStart(2, '0')}`;

  const currentMonthExpenses = filterTransactionsByDate(transactions, startDate, endDateToday).filter(
    (tx) => tx.type === 'expense'
  );

  const spentSoFar = currentMonthExpenses.reduce((sum, tx) => sum + tx.amount, 0);
  const daysElapsed = Math.max(1, currentDay);
  const daysRemaining = Math.max(0, daysInMonth - currentDay);

  // Daily pace so far
  const currentPace = Math.round(spentSoFar / daysElapsed);

  // Upcoming recurring expenses due between tomorrow and end of month
  let upcomingRecurring = 0;
  const tomorrowStr = `${monthStr}-${String(Math.min(daysInMonth, currentDay + 1)).padStart(2, '0')}`;
  const endOfMonthStr = `${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

  for (const rule of recurringRules) {
    if (rule.isActive && rule.type === 'expense') {
      if (rule.nextDueDate >= tomorrowStr && rule.nextDueDate <= endOfMonthStr) {
        upcomingRecurring += rule.amount;
      }
    }
  }

  // Model: spentSoFar + (daily discretionary pace * daysRemaining) + upcoming recurring commitments
  const projectedMonthEndExpense = spentSoFar + currentPace * daysRemaining + upcomingRecurring;

  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (daysElapsed < 5) {
    confidence = 'low';
  } else if (daysElapsed < 12) {
    confidence = 'medium';
  }

  const summaryText = `Based on your ${daysElapsed} days of spending (${fromMinorUnits(spentSoFar).toFixed(0)} so far) at an average pace of ${fromMinorUnits(currentPace).toFixed(0)}/day, plus ${fromMinorUnits(upcomingRecurring).toFixed(0)} in upcoming recurring commitments, you are projected to reach ${fromMinorUnits(projectedMonthEndExpense).toFixed(0)} by month-end.`;

  return {
    projectedMonthEndExpense,
    currentPace,
    daysElapsed,
    daysRemaining,
    recurringCommitmentsRemaining: upcomingRecurring,
    forecastConfidence: confidence,
    summaryText,
  };
}

/**
 * Generates deterministic financial insights directly on client side without relying on AI.
 */
export function generateDeterministicInsights(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  accounts: Account[],
  currentDate: Date = new Date()
): DeterministicInsight[] {
  const insights: DeterministicInsight[] = [];

  const currentYear = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth();

  const curMonthStr = `${currentYear}-${String(currentMonthNum + 1).padStart(2, '0')}`;
  const prevDate = new Date(currentYear, currentMonthNum - 1, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const curMonthDays = new Date(currentYear, currentMonthNum + 1, 0).getDate();
  const curStart = `${curMonthStr}-01`;
  const curEnd = `${curMonthStr}-${String(curMonthDays).padStart(2, '0')}`;

  const prevMonthDays = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
  const prevStart = `${prevMonthStr}-01`;
  const prevEnd = `${prevMonthStr}-${String(prevMonthDays).padStart(2, '0')}`;

  const curTxs = filterTransactionsByDate(transactions, curStart, curEnd);
  const prevTxs = filterTransactionsByDate(transactions, prevStart, prevEnd);

  const curTotals = calculateTotals(curTxs);
  const prevTotals = calculateTotals(prevTxs);

  // 1. Savings Rate Insight
  if (curTotals.totalIncome > 0) {
    if (curTotals.savingsRate >= 30) {
      insights.push({
        id: 'ins-savings-healthy',
        title: 'Strong Savings Pace',
        type: 'positive',
        message: `You are currently saving ${curTotals.savingsRate}% of your income this month. Keep it up!`,
        actionText: 'View Savings Goals',
        actionRoute: '/goals',
      });
    } else if (curTotals.savingsRate < 10 && curTotals.totalExpense > 0) {
      insights.push({
        id: 'ins-savings-low',
        title: 'Low Savings Margin',
        type: 'warning',
        message: `Your savings rate is only ${curTotals.savingsRate}%. Consider reviewing discretionary spending.`,
        actionText: 'Review Budgets',
        actionRoute: '/budgets',
      });
    }
  }

  // 2. Month-over-Month Expense Comparison
  if (prevTotals.totalExpense > 0 && curTotals.totalExpense > 0) {
    const change = Math.round(((curTotals.totalExpense - prevTotals.totalExpense) / prevTotals.totalExpense) * 100);
    if (change > 20) {
      insights.push({
        id: 'ins-mom-increase',
        title: 'Spending Increased',
        type: 'warning',
        message: `Your overall spending is ${change}% higher than last month at this stage.`,
        actionText: 'Analyze Expenses',
        actionRoute: '/analytics',
      });
    } else if (change < -15) {
      insights.push({
        id: 'ins-mom-decrease',
        title: 'Reduced Outflows',
        type: 'positive',
        message: `Great job! Your spending is ${Math.abs(change)}% lower compared to last month.`,
      });
    }
  }

  // 3. Top Expense Category Concentration
  const curCategoryBreakdown = calculateCategoryBreakdown(curTxs, categories, 'expense');
  if (curCategoryBreakdown.length > 0 && curCategoryBreakdown[0].percentage >= 35) {
    const top = curCategoryBreakdown[0];
    insights.push({
      id: 'ins-top-category',
      title: `High ${top.categoryName} Concentration`,
      type: 'tip',
      message: `${top.categoryName} represents ${top.percentage}% of all your monthly expenses (${fromMinorUnits(top.totalAmount).toFixed(0)}).`,
      actionText: 'See Breakdown',
      actionRoute: '/analytics',
    });
  }

  // 4. Budget Warning Check
  const budgetStatuses = calculateBudgetStatuses(budgets, transactions, categories, curMonthStr);
  const exceeded = budgetStatuses.filter((b) => b.state === 'exceeded');
  const warning = budgetStatuses.filter((b) => b.state === 'warning');

  if (exceeded.length > 0) {
    insights.push({
      id: 'ins-budget-exceeded',
      title: 'Budget Limit Exceeded',
      type: 'warning',
      message: `${exceeded.map((e) => e.categoryName).join(', ')} has exceeded its allocated monthly budget limit.`,
      actionText: 'Adjust Budgets',
      actionRoute: '/budgets',
    });
  } else if (warning.length > 0) {
    insights.push({
      id: 'ins-budget-warning',
      title: 'Approaching Budget Limit',
      type: 'tip',
      message: `${warning.map((w) => w.categoryName).join(', ')} has used over 90% of its budget limit.`,
      actionText: 'Check Budgets',
      actionRoute: '/budgets',
    });
  }

  // Fallback tip if few insights
  if (insights.length === 0) {
    insights.push({
      id: 'ins-baseline',
      title: 'Healthy Financial Tracking',
      type: 'neutral',
      message: 'All your accounts and budgets are operating within normal expected ranges this month.',
    });
  }

  return insights;
}

/**
 * Fast, offline, rule-based categorizer for immediate transaction suggestions.
 * Matches ~100 common Indian and international merchants, utility providers, and keywords.
 */
export function categorizeOffline(
  description: string,
  categories: Category[]
): { categoryId: string; confidence: number } | null {
  const text = description.toLowerCase().trim();
  if (!text) return null;

  const rules: Array<{ keywords: string[]; categoryMatch: string; confidence: number }> = [
    // Food & Dining
    { keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'kfc', 'burger king', 'pizza', 'domino', 'dine', 'biryani', 'subway', 'haldiram', 'barbeque', 'third wave', 'blue tokai'], categoryMatch: 'Food & Dining', confidence: 0.95 },
    // Groceries
    { keywords: ['blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart', 'd-mart', 'reliance smart', 'supermarket', 'groceries', 'grocery', 'nature basket', 'spencer', 'vegetables', 'fruits', 'milk', 'bakery'], categoryMatch: 'Groceries', confidence: 0.95 },
    // Transportation
    { keywords: ['uber', 'ola', 'rapido', 'metro', 'petrol', 'diesel', 'fuel', 'indian oil', 'hpcl', 'bpcl', 'toll', 'parking', 'fastag', 'auto', 'bus ticket', 'irctc', 'flight', 'indigo', 'air india'], categoryMatch: 'Transportation', confidence: 0.95 },
    // Shopping
    { keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'uniqlo', 'croma', 'reliance digital', 'clothing', 'shoes', 'electronics', 'ikea', 'meesho', 'nykaa'], categoryMatch: 'Shopping', confidence: 0.9 },
    // Rent & Housing
    { keywords: ['rent', 'house rent', 'flat rent', 'society maintenance', 'landlord', 'brokerage'], categoryMatch: 'Rent & Housing', confidence: 0.98 },
    // Utilities
    { keywords: ['electricity', 'bescom', 'tneb', 'mseb', 'airtel', 'jio', 'broadband', 'wifi', 'gas bill', 'water bill', 'cylinder', 'indane', 'piped gas', 'dth', 'recharge'], categoryMatch: 'Utilities & Bills', confidence: 0.95 },
    // Subscriptions
    { keywords: ['netflix', 'spotify', 'prime video', 'youtube premium', 'apple music', 'hotstar', 'disney', 'chatgpt', 'openai', 'icloud', 'google one', 'adobe', 'playstation', 'game pass'], categoryMatch: 'Subscriptions', confidence: 0.98 },
    // Healthcare
    { keywords: ['apollo', 'pharmacy', 'medicine', 'medplus', '1mg', 'pharmeasy', 'hospital', 'clinic', 'dentist', 'gym', 'cult.fit', 'fitness', 'doctor', 'blood test'], categoryMatch: 'Healthcare & Fitness', confidence: 0.95 },
    // Entertainment
    { keywords: ['pvr', 'inox', 'movie', 'cinema', 'bookmyshow', 'concert', 'amusement', 'gaming', 'bowling'], categoryMatch: 'Entertainment', confidence: 0.95 },
    // Education
    { keywords: ['coursera', 'udemy', 'tuition', 'school fee', 'college fee', 'books', 'kindle', 'course', 'exam fee'], categoryMatch: 'Education', confidence: 0.92 },
    // Salary / Income
    { keywords: ['salary', 'payroll', 'techcorp', 'infosys', 'tcs', 'wipro', 'bonus', 'stipend'], categoryMatch: 'Salary', confidence: 0.98 },
    // Freelancing
    { keywords: ['freelance', 'client payment', 'upwork', 'fiverr', 'consulting', 'invoice'], categoryMatch: 'Freelancing', confidence: 0.95 },
    // Investments
    { keywords: ['dividend', 'mutual fund', 'zerodha', 'groww', 'interest credit', 'fixed deposit', 'stocks'], categoryMatch: 'Investments & Dividends', confidence: 0.95 },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      const matchedCat = categories.find((c) => c.name.toLowerCase().includes(rule.categoryMatch.toLowerCase()));
      if (matchedCat) {
        return { categoryId: matchedCat.id, confidence: rule.confidence };
      }
    }
  }

  return null;
}
