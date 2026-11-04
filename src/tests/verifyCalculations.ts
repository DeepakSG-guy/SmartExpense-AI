/**
 * Automated Verification Test Suite for SmartExpense AI
 * Validates the core financial calculation engine, balances, transfers, budgets, and recurrence logic.
 */

import {
  calculateAccountBalances,
  calculateNetWorth,
  calculateTotals,
  calculateBudgetStatuses,
  categorizeOffline,
} from '../services/financeCalculations';
import { getNextDate } from '../services/recurringProcessor';
import { toMinorUnits, fromMinorUnits, formatMoney, type Account, type Transaction, type Budget, type Category } from '../types/finance';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

async function runTests() {
  console.log('\n--- Running SmartExpense AI Calculation Verification ---\n');

  // TEST 1: Create an account with an opening balance of ₹20,000 (2,000,000 paise)
  const accountA: Account = {
    id: 'acc-1',
    name: 'Primary Bank',
    type: 'bank',
    initialBalance: toMinorUnits(20000), // 2000000 paise
    currency: 'INR',
    color: '#10B981',
    icon: 'Building2',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const initialBalanceMap = calculateAccountBalances([accountA], []);
  assert(
    initialBalanceMap.get('acc-1') === 2000000,
    'TEST 1: Opening balance of ₹20,000 is stored as 2,000,000 paise'
  );

  // TEST 2: Add a ₹500 food expense. Confirm the balance becomes ₹19,500
  const tx1: Transaction = {
    id: 'tx-1',
    title: 'Dinner at Restaurant',
    amount: toMinorUnits(500), // 50000 paise
    type: 'expense',
    categoryId: 'cat-food',
    fromAccountId: 'acc-1',
    date: '2026-11-04',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const balanceMapAfterExpense = calculateAccountBalances([accountA], [tx1]);
  assert(
    balanceMapAfterExpense.get('acc-1') === 1950000,
    `TEST 2: After ₹500 expense, balance becomes ₹19,500 (${fromMinorUnits(balanceMapAfterExpense.get('acc-1')!)} INR)`
  );

  // TEST 3: Add ₹5,000 income. Confirm the account balance becomes ₹24,500
  const tx2: Transaction = {
    id: 'tx-2',
    title: 'Freelance Design Milestone',
    amount: toMinorUnits(5000), // 500000 paise
    type: 'income',
    categoryId: 'cat-freelance',
    fromAccountId: 'acc-1',
    date: '2026-11-04',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const balanceMapAfterIncome = calculateAccountBalances([accountA], [tx1, tx2]);
  assert(
    balanceMapAfterIncome.get('acc-1') === 2450000,
    `TEST 3: After ₹5,000 income, balance becomes ₹24,500 (${fromMinorUnits(balanceMapAfterIncome.get('acc-1')!)} INR)`
  );

  // TEST 4: Create another account and transfer ₹2,000. Confirm net worth remains unchanged
  const accountB: Account = {
    id: 'acc-2',
    name: 'Cash Wallet',
    type: 'cash',
    initialBalance: toMinorUnits(1000), // 100,000 paise
    currency: 'INR',
    color: '#F59E0B',
    icon: 'Banknote',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const accounts = [accountA, accountB];
  const netWorthBeforeTransfer = calculateNetWorth(
    accounts,
    calculateAccountBalances(accounts, [tx1, tx2])
  );

  const transferTx: Transaction = {
    id: 'tx-3',
    title: 'ATM Cash Withdrawal',
    amount: toMinorUnits(2000), // 200,000 paise
    type: 'transfer',
    categoryId: '',
    fromAccountId: 'acc-1',
    toAccountId: 'acc-2',
    date: '2026-11-04',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const balanceMapAfterTransfer = calculateAccountBalances(accounts, [tx1, tx2, transferTx]);
  const netWorthAfterTransfer = calculateNetWorth(accounts, balanceMapAfterTransfer);

  assert(
    balanceMapAfterTransfer.get('acc-1') === 2250000,
    `TEST 4a: Source account reduced by ₹2,000 to ₹22,500 (${fromMinorUnits(balanceMapAfterTransfer.get('acc-1')!)} INR)`
  );
  assert(
    balanceMapAfterTransfer.get('acc-2') === 300000,
    `TEST 4b: Destination account increased by ₹2,000 to ₹3,000 (${fromMinorUnits(balanceMapAfterTransfer.get('acc-2')!)} INR)`
  );
  assert(
    netWorthBeforeTransfer === netWorthAfterTransfer,
    `TEST 4c: Net worth unchanged across transfer (Before: ${fromMinorUnits(netWorthBeforeTransfer)} INR, After: ${fromMinorUnits(netWorthAfterTransfer)} INR)`
  );

  // TEST 5: Create a ₹3,000 food budget. Add food transactions and verify percentage and warnings
  const foodBudget: Budget = {
    id: 'bgt-food',
    categoryId: 'cat-food',
    month: '2026-11',
    limitAmount: toMinorUnits(3000), // 300,000 paise
    warningThreshold: 75,
    dangerThreshold: 90,
    createdAt: new Date().toISOString(),
  };

  const mockCategories: Category[] = [
    { id: 'cat-food', name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#10B981', isDefault: true, createdAt: '' },
  ];

  // Currently spent: ₹500 of ₹3000 = 17% (safe)
  const statusSafe = calculateBudgetStatuses([foodBudget], [tx1], mockCategories, '2026-11')[0];
  assert(statusSafe.percentageUsed === 17 && statusSafe.state === 'safe', 'TEST 5a: Budget status at 17% is safe');

  // Add ₹2000 food expense -> total ₹2500 of ₹3000 = 83% (approaching)
  const txFood2: Transaction = {
    id: 'tx-food-2',
    title: 'Weekend Dining',
    amount: toMinorUnits(2000),
    type: 'expense',
    categoryId: 'cat-food',
    fromAccountId: 'acc-1',
    date: '2026-11-05',
    createdAt: '',
    updatedAt: '',
  };
  const statusApproaching = calculateBudgetStatuses([foodBudget], [tx1, txFood2], mockCategories, '2026-11')[0];
  assert(
    statusApproaching.percentageUsed === 83 && statusApproaching.state === 'approaching',
    'TEST 5b: Budget status at 83% is approaching threshold'
  );

  // Add ₹800 food expense -> total ₹3300 of ₹3000 = 110% (exceeded)
  const txFood3: Transaction = {
    id: 'tx-food-3',
    title: 'Cafe order',
    amount: toMinorUnits(800),
    type: 'expense',
    categoryId: 'cat-food',
    fromAccountId: 'acc-1',
    date: '2026-11-06',
    createdAt: '',
    updatedAt: '',
  };
  const statusExceeded = calculateBudgetStatuses([foodBudget], [tx1, txFood2, txFood3], mockCategories, '2026-11')[0];
  assert(
    statusExceeded.percentageUsed === 110 && statusExceeded.state === 'exceeded',
    'TEST 5c: Budget status at 110% is exceeded'
  );

  // TEST 6: Recurrence frequency math
  assert(getNextDate('2026-03-01', 'daily') === '2026-03-02', 'TEST 6a: Daily recurrence advances 1 day');
  assert(getNextDate('2026-03-01', 'weekly') === '2026-03-08', 'TEST 6b: Weekly recurrence advances 7 days');
  assert(getNextDate('2026-03-01', 'monthly') === '2026-04-01', 'TEST 6c: Monthly recurrence advances 1 month');

  // TEST 7: Offline Categorizer rule matching
  const catMatch = categorizeOffline('Swiggy Biryani Delivery', mockCategories);
  assert(catMatch !== null && catMatch.categoryId === 'cat-food', 'TEST 7: Offline rule matches "Swiggy" to Food & Dining');

  console.log('\n🎉 ALL CRITICAL FINANCIAL CALCULATION TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
