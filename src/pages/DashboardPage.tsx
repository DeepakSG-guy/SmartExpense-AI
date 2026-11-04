import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, fromMinorUnits, type Transaction, type Category, type Account } from '../types/finance';
import { IconRenderer } from '../components/common/IconRenderer';
import { TransactionModal } from '../components/modals/TransactionModal';
import { TransferModal } from '../components/modals/TransferModal';
import { BudgetModal } from '../components/modals/BudgetModal';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PiggyBank,
  PieChart as PieIcon,
  Plus,
  ArrowRightLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const {
    netWorth,
    currentMonthTotals,
    budgetStatuses,
    transactions,
    categories,
    accounts,
    settings,
    openAddTxModal,
    deterministicInsights,
    aiHealth,
  } = useFinance();

  const [selectedTxForEdit, setSelectedTxForEdit] = useState<Transaction | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [chartView, setChartView] = useState<'monthly' | 'yearly'>('monthly');

  const currency = settings.currency;
  const catMap = React.useMemo(() => new Map<string, Category>(categories.map((c: Category) => [c.id, c])), [categories]);
  const accMap = React.useMemo(() => new Map<string, Account>(accounts.map((a: Account) => [a.id, a])), [accounts]);

  // Monthly Budget remaining calculation
  const totalBudget = budgetStatuses.find((b) => b.budget.categoryId === 'all');
  const totalBudgetLimit = totalBudget?.limitAmount || 0;
  const totalBudgetSpent = totalBudget?.spentAmount || currentMonthTotals.totalExpense;
  const totalBudgetRemaining = totalBudgetLimit > 0 ? totalBudgetLimit - totalBudgetSpent : 0;

  // Recent 6 transactions
  const recentTransactions = transactions.slice(0, 6);

  // Income vs Expense Chart Data
  // Group transactions by month for the last 6 months
  const monthlyChartData = React.useMemo(() => {
    const monthsMap = new Map<string, { month: string; income: number; expense: number }>();
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      monthsMap.set(key, { month: label, income: 0, expense: 0 });
    }

    for (const tx of transactions) {
      const txMonth = tx.date.substring(0, 7);
      if (monthsMap.has(txMonth)) {
        const item = monthsMap.get(txMonth)!;
        if (tx.type === 'income') {
          item.income += fromMinorUnits(tx.amount);
        } else if (tx.type === 'expense') {
          item.expense += fromMinorUnits(tx.amount);
        }
      }
    }

    return Array.from(monthsMap.values());
  }, [transactions]);

  // Expense Distribution Data (Current Month)
  const expensePieData = React.useMemo(() => {
    const today = new Date();
    const curMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthExpenses = transactions.filter(
      (tx) => tx.type === 'expense' && tx.date.startsWith(curMonthStr) && tx.categoryId
    );

    const catTotals = new Map<string, number>();
    for (const tx of monthExpenses) {
      const cur = catTotals.get(tx.categoryId) || 0;
      catTotals.set(tx.categoryId, cur + tx.amount);
    }

    const data: Array<{ name: string; value: number; color: string }> = [];
    catTotals.forEach((minorAmt, catId) => {
      const cat = catMap.get(catId);
      if (cat) {
        data.push({
          name: cat.name,
          value: fromMinorUnits(minorAmt),
          color: cat.color,
        });
      }
    });

    return data.sort((a, b) => b.value - a.value).slice(0, 6);
  }, [transactions, catMap]);

  return (
    <div className="space-y-6">
      {/* 1. Top Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Balance / Net Worth */}
        <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Balance</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                netWorth >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'
              }`}
            >
              {formatMoney(netWorth, currency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Across all active accounts</div>
          </div>
        </div>

        {/* Total Income */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Income</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatMoney(currentMonthTotals.totalIncome, currency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">This Month</div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {formatMoney(currentMonthTotals.totalExpense, currency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">This Month</div>
          </div>
        </div>

        {/* Net Savings */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Savings</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                currentMonthTotals.netSavings >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'
              }`}
            >
              {formatMoney(currentMonthTotals.netSavings, currency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Rate: <span className="font-semibold text-emerald-600">{currentMonthTotals.savingsRate}%</span>
            </div>
          </div>
        </div>

        {/* Monthly Budget Remaining */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Budget Left</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <PieIcon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                totalBudgetRemaining >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'
              }`}
            >
              {totalBudgetLimit > 0
                ? formatMoney(totalBudgetRemaining, currency)
                : 'No Limit Set'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {totalBudgetLimit > 0
                ? `${Math.round((totalBudgetSpent / totalBudgetLimit) * 100)}% used`
                : 'Click Budgets to set'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Actions Toolbar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => openAddTxModal({ type: 'expense' })}
          className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs whitespace-nowrap active:scale-95 transition-all"
        >
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Add Expense</span>
        </button>

        <button
          type="button"
          onClick={() => openAddTxModal({ type: 'income' })}
          className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs whitespace-nowrap active:scale-95 transition-all"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Add Income</span>
        </button>

        <button
          type="button"
          onClick={() => setIsTransferModalOpen(true)}
          className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs whitespace-nowrap active:scale-95 transition-all"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
          <span>Transfer Money</span>
        </button>

        <button
          type="button"
          onClick={() => setIsBudgetModalOpen(true)}
          className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs whitespace-nowrap active:scale-95 transition-all"
        >
          <PieIcon className="w-3.5 h-3.5 text-amber-500" />
          <span>Create Budget</span>
        </button>

        <Link
          to="/ai-assistant"
          className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-2xs whitespace-nowrap active:scale-95 transition-all ml-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Ask Gemini AI</span>
        </Link>
      </div>

      {/* 3. Deterministic Smart Insights Banner */}
      {deterministicInsights.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Automated Financial Insights
              </h2>
            </div>
            <Link
              to="/ai-assistant"
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Explore AI Insights</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {deterministicInsights.slice(0, 3).map((insight) => (
              <div
                key={insight.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-750 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    {insight.type === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    ) : insight.type === 'positive' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    )}
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">
                      {insight.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {insight.message}
                  </p>
                </div>
                {insight.actionRoute && insight.actionText && (
                  <Link
                    to={insight.actionRoute}
                    className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>{insight.actionText}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Charts Workspace: Income vs Expense & Donut Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Income vs Expenses
              </h2>
              <p className="text-xs text-slate-400">Monthly cash flow trajectory</p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
              <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs">
                Last 6 Months
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${settings.currency} ${Number(value).toFixed(0)}`]}
                />
                <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Distribution Donut Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Expense Distribution
              </h2>
              <p className="text-xs text-slate-400">Current month top categories</p>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View Full
            </Link>
          </div>

          {expensePieData.length > 0 ? (
            <>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {expensePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${settings.currency} ${Number(val).toFixed(0)}`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 mt-2">
                {expensePieData.slice(0, 4).map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {settings.currency} {item.value.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center p-4">
              <PieIcon className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs text-slate-400">No expenses recorded for this month yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Lower Section: Budget Overview & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget Progress Overview */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Budgets
              </h2>
              <p className="text-xs text-slate-400">Category spending limits</p>
            </div>
            <Link
              to="/budgets"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {budgetStatuses.length > 0 ? (
            <div className="space-y-3.5">
              {budgetStatuses.slice(0, 4).map((b) => (
                <div key={b.budget.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                      {b.categoryName}
                    </span>
                    <span
                      className={`font-semibold ${
                        b.state === 'exceeded'
                          ? 'text-rose-600'
                          : b.state === 'warning'
                          ? 'text-amber-600'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {formatMoney(b.spentAmount, currency)} / {formatMoney(b.limitAmount, currency)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        b.state === 'exceeded'
                          ? 'bg-rose-500'
                          : b.state === 'warning'
                          ? 'bg-amber-500'
                          : b.state === 'approaching'
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <PieIcon className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-400 mb-3">No active budgets for this month.</p>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
              >
                Set First Budget
              </button>
            </div>
          )}
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Transactions
              </h2>
              <p className="text-xs text-slate-400">Latest recorded financial entries</p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentTransactions.map((tx) => {
                const cat = catMap.get(tx.categoryId);
                const fromAcc = accMap.get(tx.fromAccountId);
                const toAcc = tx.toAccountId ? accMap.get(tx.toAccountId) : null;

                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTxForEdit(tx)}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                        style={{
                          backgroundColor:
                            tx.type === 'transfer' ? '#3B82F6' : cat?.color || '#64748B',
                        }}
                      >
                        <IconRenderer
                          name={tx.type === 'transfer' ? 'ArrowRightLeft' : cat?.icon || 'Tag'}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {tx.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span className="truncate">
                            {tx.type === 'transfer'
                              ? `${fromAcc?.name} → ${toAcc?.name}`
                              : fromAcc?.name || 'Account'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 pl-3">
                      <div
                        className={`font-bold text-xs sm:text-sm ${
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'expense'
                            ? 'text-slate-900 dark:text-white'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatMoney(tx.amount, currency)}
                      </div>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {tx.paymentMethod || tx.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No transactions recorded yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Transaction Modal */}
      {selectedTxForEdit && (
        <TransactionModal
          isOpen={!!selectedTxForEdit}
          onClose={() => setSelectedTxForEdit(null)}
          editTransaction={selectedTxForEdit}
        />
      )}

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />

      {/* Budget Modal */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
      />
    </div>
  );
};
