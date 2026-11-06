import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
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
  Settings,
  Users,
  CreditCard,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
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
    splitBalances,
  } = useFinance();

  const [selectedTxForEdit, setSelectedTxForEdit] = useState<Transaction | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [chartMetric, setChartMetric] = useState<'earning' | 'expense'>('expense');
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly'>('monthly');

  const currency = settings.currency;
  const catMap = React.useMemo(() => new Map<string, Category>(categories.map((c: Category) => [c.id, c])), [categories]);
  const accMap = React.useMemo(() => new Map<string, Account>(accounts.map((a: Account) => [a.id, a])), [accounts]);

  // Greeting Name
  const greetingName = profile?.displayName || user?.email?.split('@')[0] || 'Friend';

  // Recent 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  // Vertical Bar Chart Data (Weekly vs Monthly)
  const chartData = React.useMemo(() => {
    if (chartPeriod === 'weekly') {
      // Last 7 days
      const days: Array<{ label: string; key: string; amount: number; color: string }> = [];
      const pastelColors = ['#FFAB83', '#ADE0BB', '#FFDB8A', '#CFB0E8', '#A9B9F5', '#F1B5E3', '#FFDB8A'];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        days.push({ label: dayLabel, key: dateStr, amount: 0, color: pastelColors[6 - i] });
      }

      for (const tx of transactions) {
        if (chartMetric === 'expense' && tx.type !== 'expense') continue;
        if (chartMetric === 'earning' && tx.type !== 'income') continue;

        const found = days.find((day) => day.key === tx.date);
        if (found) {
          found.amount += fromMinorUnits(tx.amount);
        }
      }
      return days;
    } else {
      // Last 6 months
      const months: Array<{ label: string; key: string; amount: number; color: string }> = [];
      const pastelColors = ['#FFAB83', '#ADE0BB', '#FFDB8A', '#CFB0E8', '#A9B9F5', '#F1B5E3'];
      const today = new Date();

      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        months.push({ label, key: monthStr, amount: 0, color: pastelColors[5 - i] });
      }

      for (const tx of transactions) {
        if (chartMetric === 'expense' && tx.type !== 'expense') continue;
        if (chartMetric === 'earning' && tx.type !== 'income') continue;

        const txMonth = tx.date.substring(0, 7);
        const found = months.find((m) => m.key === txMonth);
        if (found) {
          found.amount += fromMinorUnits(tx.amount);
        }
      }
      return months;
    }
  }, [transactions, chartMetric, chartPeriod]);

  // Overall budget left
  const totalBudget = budgetStatuses.find((b) => b.budget.categoryId === 'all');
  const totalBudgetLimit = totalBudget?.limitAmount || 0;
  const totalBudgetSpent = totalBudget?.spentAmount || currentMonthTotals.totalExpense;
  const totalBudgetRemaining = totalBudgetLimit > 0 ? totalBudgetLimit - totalBudgetSpent : 0;

  return (
    <div className="space-y-6">
      {/* 1. Greeting & Current Date Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#202020] dark:text-white tracking-tight">
            Hi, {greetingName}
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#626262] dark:text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            title="Settings"
            className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[1.5px_1.5px_0px_#202020] text-[#202020] dark:text-white hover:bg-[#F8F5EC] transition-all"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 2. Top Hero: Current Balance Card (Directly inspired by Murad Hossain reference) */}
      <div className="card-yellow p-5 sm:p-7 relative overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#202020]">
            Current Balance
          </span>
          <Link
            to="/accounts"
            className="p-1.5 rounded-xl bg-white/70 hover:bg-white border border-[#202020] text-[#202020] transition-colors"
            title="Manage Accounts & Wallets"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Large Editorial Serif Balance */}
        <div className="mb-6">
          <div className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#202020] tabular-nums">
            {formatMoney(netWorth, currency)}
          </div>
          <div className="text-xs font-semibold text-[#202020]/75 mt-1 flex items-center gap-1.5">
            <span>Across {accounts.filter((a) => !a.isArchived).length} accounts</span>
            <span>·</span>
            <span>Savings Rate: {currentMonthTotals.savingsRate}%</span>
          </div>
        </div>

        {/* Action Buttons inside Card (Murad Hossain Transfer / Request pattern) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="py-2.5 px-2 sm:px-3 rounded-xl bg-white hover:bg-[#F8F5EC] border-[1.5px] border-[#202020] shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-bold text-xs sm:text-sm text-[#202020] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#202020]" />
            <span>Transfer</span>
          </button>

          <button
            type="button"
            onClick={() => openAddTxModal({ type: 'expense' })}
            className="py-2.5 px-2 sm:px-3 rounded-xl bg-white hover:bg-[#F8F5EC] border-[1.5px] border-[#202020] shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-bold text-xs sm:text-sm text-[#202020] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-[#E25C38]" />
            <span>Add Expense</span>
          </button>

          <button
            type="button"
            onClick={() => openAddTxModal({ type: 'income' })}
            className="py-2.5 px-2 sm:px-3 rounded-xl bg-white hover:bg-[#F8F5EC] border-[1.5px] border-[#202020] shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-bold text-xs sm:text-sm text-[#202020] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-[#2B7A49]" />
            <span>Add Income</span>
          </button>
        </div>
      </div>

      {/* 3. Pastel Overview Cards: Income, Expense, Net Savings, Split Receivables */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Income Card (Pastel Mint) */}
        <div className="card-mint p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Income</span>
            <div className="w-7 h-7 rounded-lg bg-white border border-[#202020] text-[#202020] flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-[#2B7A49]" />
            </div>
          </div>
          <div>
            <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight tabular-nums">
              {formatMoney(currentMonthTotals.totalIncome, currency)}
            </div>
            <div className="text-[11px] font-medium opacity-80 mt-0.5">This Month</div>
          </div>
        </div>

        {/* Expense Card (Pastel Peach) */}
        <div className="card-peach p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Expenses</span>
            <div className="w-7 h-7 rounded-lg bg-white border border-[#202020] text-[#202020] flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-[#E25C38]" />
            </div>
          </div>
          <div>
            <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight tabular-nums">
              {formatMoney(currentMonthTotals.totalExpense, currency)}
            </div>
            <div className="text-[11px] font-medium opacity-80 mt-0.5">This Month</div>
          </div>
        </div>

        {/* Net Savings (Pastel Lavender) */}
        <div className="card-lavender p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Net Savings</span>
            <div className="w-7 h-7 rounded-lg bg-white border border-[#202020] text-[#202020] flex items-center justify-center">
              <PiggyBank className="w-4 h-4 text-[#5F3D8C]" />
            </div>
          </div>
          <div>
            <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight tabular-nums">
              {formatMoney(currentMonthTotals.netSavings, currency)}
            </div>
            <div className="text-[11px] font-medium opacity-80 mt-0.5">
              Saved {currentMonthTotals.savingsRate}%
            </div>
          </div>
        </div>

        {/* Roommate Splits / Budget Left (Pastel Sky Blue / White) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#A9B9F5] dark:bg-[#34406E] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[2.5px_2.5px_0px_#202020] text-[#202020] dark:text-[#E8EDFD] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Splits Receivable</span>
            <div className="w-7 h-7 rounded-lg bg-white border border-[#202020] text-[#202020] flex items-center justify-center">
              <Users className="w-4 h-4 text-[#2B4E99]" />
            </div>
          </div>
          <div>
            <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight tabular-nums">
              {formatMoney(splitBalances.owedToUser, currency)}
            </div>
            <div className="text-[11px] font-medium opacity-85 mt-0.5">
              {splitBalances.activeSplitsCount} active group splits
            </div>
          </div>
        </div>
      </div>

      {/* 4. Middle Section: Spending & Earning Chart + Category Breakdown (12-col grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Main Spending / Earning Bar Chart (7 cols on desktop) */}
        <div className="lg:col-span-7 card-retro p-5 sm:p-6 flex flex-col justify-between">
          <div>
            {/* Top Controls: Segmented Earning / Expense + Period Selector */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              {/* Earning vs Expense Segmented Control (Murad Hossain reference) */}
              <div className="flex items-center p-1 rounded-xl bg-[#F6F4EB] dark:bg-[#18181D] border-[1.5px] border-[#202020] dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setChartMetric('earning')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartMetric === 'earning'
                      ? 'bg-[#ADE0BB] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                      : 'text-[#626262] dark:text-slate-400 hover:text-[#202020]'
                  }`}
                >
                  Earning
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('expense')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartMetric === 'expense'
                      ? 'bg-[#FFAB83] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                      : 'text-[#626262] dark:text-slate-400 hover:text-[#202020]'
                  }`}
                >
                  Expense
                </button>
              </div>

              {/* Weekly vs Monthly Period */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setChartPeriod('weekly')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border border-[#202020] transition-all cursor-pointer ${
                    chartPeriod === 'weekly'
                      ? 'bg-white dark:bg-[#25252D] text-[#202020] dark:text-white shadow-[1px_1px_0px_#202020]'
                      : 'bg-transparent text-[#626262] dark:text-slate-400'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setChartPeriod('monthly')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border border-[#202020] transition-all cursor-pointer ${
                    chartPeriod === 'monthly'
                      ? 'bg-white dark:bg-[#25252D] text-[#202020] dark:text-white shadow-[1px_1px_0px_#202020]'
                      : 'bg-transparent text-[#626262] dark:text-slate-400'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Vertical Bar Chart matching the reference */}
            <div className="h-60 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="label"
                    stroke="#888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#202020', strokeWidth: 1 }}
                  />
                  <YAxis
                    stroke="#888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${currency === 'INR' ? '₹' : '$'}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const val = payload[0].value as number;
                        return (
                          <div className="p-2.5 rounded-xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] shadow-[2px_2px_0px_#202020] text-xs font-bold">
                            <span className="text-[#626262] dark:text-slate-400">{payload[0].payload.label}: </span>
                            <span className="text-[#202020] dark:text-white font-serif">{currency === 'INR' ? '₹' : '$'}{val.toLocaleString()}</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#202020"
                        strokeWidth={1.5}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom tag indicators below bars (like Murad Hossain reference) */}
          <div className="pt-3 border-t-[1.5px] border-[#202020]/10 dark:border-slate-800 flex items-center justify-between text-xs text-[#626262] dark:text-slate-400 font-medium">
            <span>Period Average: <strong className="text-[#202020] dark:text-white">{currency === 'INR' ? '₹' : '$'}{(chartData.reduce((acc, c) => acc + c.amount, 0) / (chartData.length || 1)).toFixed(0)}</strong></span>
            <Link to="/analytics" className="font-bold text-[#202020] dark:text-white hover:underline flex items-center gap-1">
              Detailed Analytics <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* AI Insight & Active Budget Status (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* AI Financial Copilot Insight Card */}
          <div className="card-lavender p-5 relative overflow-hidden flex-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#202020] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                AI Financial Insight
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#202020] text-[#202020]">
                Gemini
              </span>
            </div>
            <p className="text-sm font-medium text-[#202020] leading-relaxed mb-4">
              {deterministicInsights[0]?.message ||
                `You've recorded ${transactions.length} transactions this cycle. Your largest spending category is active and well-balanced against your monthly budget.`}
            </p>
            <Link
              to="/ai-assistant"
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white hover:bg-[#F8F5EC] border-[1.5px] border-[#202020] shadow-[1.5px_1.5px_0px_#202020] text-xs font-bold text-[#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Copilot</span>
            </Link>
          </div>

          {/* Budget Health Meter Card */}
          <div className="card-retro p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400">
                  Monthly Budget
                </span>
                <div className="font-serif text-lg font-bold text-[#202020] dark:text-white tabular-nums">
                  {totalBudgetLimit > 0 ? formatMoney(totalBudgetRemaining, currency) : 'No Cap Configured'}
                  {totalBudgetLimit > 0 && <span className="text-xs font-sans font-normal text-[#626262] ml-1">left</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(true)}
                className="p-1.5 rounded-xl border border-[#202020] bg-white dark:bg-[#25252D] text-[#202020] dark:text-white hover:bg-[#F8F5EC]"
                title="Configure Budget"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {totalBudgetLimit > 0 ? (
              <div className="space-y-1.5">
                <div className="w-full h-3 rounded-full border-[1.5px] border-[#202020] bg-[#F6F4EB] dark:bg-[#18181D] overflow-hidden p-[1px]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      totalBudgetSpent > totalBudgetLimit
                        ? 'bg-[#FFAB83]'
                        : (totalBudgetSpent / totalBudgetLimit) > 0.8
                        ? 'bg-[#FFDB8A]'
                        : 'bg-[#ADE0BB]'
                    }`}
                    style={{ width: `${Math.min(100, (totalBudgetSpent / totalBudgetLimit) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-medium text-[#626262] dark:text-slate-400">
                  <span>Spent: {formatMoney(totalBudgetSpent, currency)}</span>
                  <span>Limit: {formatMoney(totalBudgetLimit, currency)}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#626262] dark:text-slate-400">
                Set a monthly spending limit to protect your savings and get early alerts.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Recent Transactions Section (Directly inspired by Murad Hossain reference) */}
      <div className="card-retro p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
              Recent Transactions
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/transactions"
              className="py-1.5 px-3 rounded-xl border-[1.5px] border-[#202020] dark:border-slate-700 bg-white dark:bg-[#25252D] hover:bg-[#F8F5EC] dark:hover:bg-[#2A2A33] text-xs font-bold text-[#202020] dark:text-white shadow-[1.5px_1.5px_0px_#202020] transition-all"
            >
              View All
            </Link>
          </div>
        </div>

        {/* Transactions List */}
        {recentTransactions.length > 0 ? (
          <div className="divide-y-[1.5px] divide-[#202020]/10 dark:divide-slate-800">
            {recentTransactions.map((tx) => {
              const category = catMap.get(tx.categoryId);
              const account = accMap.get(tx.fromAccountId);
              const isIncome = tx.type === 'income';
              const isExpense = tx.type === 'expense';

              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTxForEdit(tx)}
                  className="py-3 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF7EE]/60 dark:hover:bg-[#25252D]/40 -mx-2 px-2 rounded-xl transition-colors cursor-pointer"
                >
                  {/* Left: Category Icon in pastel rounded box */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border-[1.5px] border-[#202020] flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0px_#202020] ${
                        isIncome
                          ? 'bg-[#ADE0BB] text-[#202020]'
                          : isExpense
                          ? 'bg-[#FFAB83] text-[#202020]'
                          : 'bg-[#FFDB8A] text-[#202020]'
                      }`}
                    >
                      <IconRenderer
                        name={category?.icon || (isIncome ? 'ArrowDownLeft' : isExpense ? 'ArrowUpRight' : 'ArrowRightLeft')}
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#202020] dark:text-white truncate">
                        {tx.title}
                      </div>
                      <div className="text-[11px] font-medium text-[#626262] dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span>{tx.date}</span>
                        {tx.time && <span>· {tx.time}</span>}
                        {account && <span>· {account.name}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount with + or - */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`font-serif text-base sm:text-lg font-bold tabular-nums ${
                        isIncome
                          ? 'text-[#2B7A49] dark:text-[#7BD39A]'
                          : isExpense
                          ? 'text-[#202020] dark:text-white'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {isIncome ? '+' : isExpense ? '-' : ''}
                      {formatMoney(tx.amount, currency)}
                    </div>
                    <div className="text-[10px] font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider">
                      {category?.name || tx.type}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-sm font-medium text-[#626262] dark:text-slate-400">
              No transactions recorded yet.
            </p>
            <button
              type="button"
              onClick={() => openAddTxModal()}
              className="mt-3 py-2 px-4 rounded-xl bg-[#FFDB8A] border-[1.5px] border-[#202020] shadow-[2px_2px_0px_#202020] font-bold text-xs text-[#202020] cursor-pointer"
            >
              Add First Transaction
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={Boolean(selectedTxForEdit)}
        onClose={() => setSelectedTxForEdit(null)}
        editTransaction={selectedTxForEdit}
      />
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
      />
    </div>
  );
};
