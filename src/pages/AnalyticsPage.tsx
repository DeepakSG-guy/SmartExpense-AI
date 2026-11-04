import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, fromMinorUnits, type Transaction } from '../types/finance';
import { calculateTotals, calculateCategoryBreakdown } from '../services/financeCalculations';
import {
  BarChart3,
  Calendar,
  Printer,
  Download,
  TrendingUp,
  TrendingDown,
  Activity,
  PieChart as PieIcon,
  Store,
  Flame,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { generateFinancialReportPDF } from '../services/pdfReportService';
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
  AreaChart,
  Area,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { transactions, categories, settings, budgetStatuses, accounts, showToast } = useFinance();
  const [period, setPeriod] = useState<
    'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year' | 'custom'
  >('this-month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [trendView, setTrendView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const currency = settings.currency;

  // 1. Date boundaries computation
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();

    if (period === 'this-month') {
      const monthStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
      const days = new Date(curYear, curMonth + 1, 0).getDate();
      return {
        startDate: `${monthStr}-01`,
        endDate: `${monthStr}-${String(days).padStart(2, '0')}`,
        periodLabel: 'This Month',
      };
    } else if (period === 'last-month') {
      const prevDate = new Date(curYear, curMonth - 1, 1);
      const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      const days = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
      return {
        startDate: `${prevMonthStr}-01`,
        endDate: `${prevMonthStr}-${String(days).padStart(2, '0')}`,
        periodLabel: 'Last Month',
      };
    } else if (period === 'last-3-months') {
      const d = new Date(curYear, curMonth - 2, 1);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const end = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(
        new Date(curYear, curMonth + 1, 0).getDate()
      ).padStart(2, '0')}`;
      return { startDate: start, endDate: end, periodLabel: 'Last 3 Months' };
    } else if (period === 'last-6-months') {
      const d = new Date(curYear, curMonth - 5, 1);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const end = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(
        new Date(curYear, curMonth + 1, 0).getDate()
      ).padStart(2, '0')}`;
      return { startDate: start, endDate: end, periodLabel: 'Last 6 Months' };
    } else if (period === 'this-year') {
      return {
        startDate: `${curYear}-01-01`,
        endDate: `${curYear}-12-31`,
        periodLabel: `Year ${curYear}`,
      };
    } else {
      return {
        startDate: customStart || '2020-01-01',
        endDate: customEnd || '2099-12-31',
        periodLabel: 'Custom Period',
      };
    }
  }, [period, customStart, customEnd]);

  // Filtered transactions for the selected period
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => t.date >= startDate && t.date <= endDate);
  }, [transactions, startDate, endDate]);

  // Financial totals for the period
  const totals = useMemo(() => {
    return calculateTotals(periodTransactions);
  }, [periodTransactions]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    return calculateCategoryBreakdown(periodTransactions, categories);
  }, [periodTransactions, categories]);

  // Health Metrics
  const healthMetrics = useMemo(() => {
    const daysDiff = Math.max(
      1,
      Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    );
    const avgDailySpend = Math.round(totals.totalExpense / daysDiff);

    // Budget utilization
    const activeBudgets = budgetStatuses.filter((b) => b.budget.categoryId !== 'all');
    const totalBudgetCap = activeBudgets.reduce((acc, b) => acc + b.limitAmount, 0);
    const totalBudgetSpent = activeBudgets.reduce((acc, b) => acc + b.spentAmount, 0);
    const budgetUtilization = totalBudgetCap > 0 ? Math.round((totalBudgetSpent / totalBudgetCap) * 100) : 0;

    // Previous period comparison for MoM / period-over-period spend
    const prevStart = new Date(new Date(startDate).getTime() - daysDiff * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const prevTxs = transactions.filter((t) => t.date >= prevStart && t.date < startDate && t.type === 'expense');
    const prevTotalExpense = prevTxs.reduce((acc, t) => acc + t.amount, 0);
    const momChange =
      prevTotalExpense > 0
        ? Math.round(((totals.totalExpense - prevTotalExpense) / prevTotalExpense) * 100)
        : 0;

    return {
      savingsRate: totals.savingsRate,
      avgDailySpend,
      budgetUtilization,
      momChange,
    };
  }, [totals, startDate, endDate, budgetStatuses, transactions]);

  // Trend Chart Data (daily / weekly / monthly)
  const trendData = useMemo(() => {
    const expenseTxs = periodTransactions.filter((t) => t.type === 'expense');

    if (trendView === 'daily') {
      const dayMap = new Map<string, number>();
      for (const tx of expenseTxs) {
        const cur = dayMap.get(tx.date) || 0;
        dayMap.set(tx.date, cur + fromMinorUnits(tx.amount));
      }
      return Array.from(dayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, amount]) => ({
          label: date.substring(5), // MM-DD
          amount,
        }));
    } else if (trendView === 'monthly') {
      const monthMap = new Map<string, number>();
      for (const tx of expenseTxs) {
        const m = tx.date.substring(0, 7);
        const cur = monthMap.get(m) || 0;
        monthMap.set(m, cur + fromMinorUnits(tx.amount));
      }
      return Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([m, amount]) => ({
          label: m,
          amount,
        }));
    } else {
      // Weekly aggregation
      const weekMap = new Map<string, number>();
      for (const tx of expenseTxs) {
        const d = new Date(tx.date);
        const weekNum = Math.ceil(d.getDate() / 7);
        const key = `${tx.date.substring(0, 7)} W${weekNum}`;
        const cur = weekMap.get(key) || 0;
        weekMap.set(key, cur + fromMinorUnits(tx.amount));
      }
      return Array.from(weekMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, amount]) => ({
          label,
          amount,
        }));
    }
  }, [periodTransactions, trendView]);

  // Merchant Insights: Top cumulative & most frequent
  const merchantInsights = useMemo(() => {
    const expenseTxs = periodTransactions.filter((t) => t.type === 'expense');
    const merchantMap = new Map<string, { total: number; count: number }>();

    for (const tx of expenseTxs) {
      const mName = tx.title.trim();
      const existing = merchantMap.get(mName) || { total: 0, count: 0 };
      merchantMap.set(mName, {
        total: existing.total + tx.amount,
        count: existing.count + 1,
      });
    }

    const list = Array.from(merchantMap.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      count: data.count,
    }));

    const topBySpend = [...list].sort((a, b) => b.total - a.total).slice(0, 5);
    const topByFrequency = [...list].sort((a, b) => b.count - a.count).slice(0, 5);

    return { topBySpend, topByFrequency };
  }, [periodTransactions]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      showToast({ type: 'info', message: 'Generating financial audit PDF report...' });

      await new Promise((r) => setTimeout(r, 80));

      generateFinancialReportPDF({
        periodLabel,
        startDate,
        endDate,
        currency,
        userName: settings.displayName,
        totals,
        metrics: healthMetrics,
        categories,
        accounts,
        transactions: periodTransactions,
        categoryBreakdown,
        budgetStatuses,
      });

      showToast({ type: 'success', message: 'PDF report downloaded successfully!' });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      showToast({ type: 'error', message: 'Failed to generate PDF report: ' + (err.message || 'Unknown error') });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const pastelColors = ['#FFDB8A', '#FFAB83', '#ADE0BB', '#CFB0E8', '#A9B9F5', '#F1B5E3', '#FFE099'];

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Top Header & Period Selector (Hidden in print) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#202020] dark:text-white tracking-tight">
            Analytics & Reports
          </h2>
          <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-400 mt-0.5">
            Audit spending patterns, health metrics, and merchant trends
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-3.5 py-2 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#202020] dark:text-white shadow-[1.5px_1.5px_0px_#202020]"
          >
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="last-3-months">Last 3 Months</option>
            <option value="last-6-months">Last 6 Months</option>
            <option value="this-year">This Year</option>
            <option value="custom">Custom Date Range</option>
          </select>

          <button
            type="button"
            disabled={isGeneratingPdf}
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] text-[#202020] text-xs sm:text-sm font-bold shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{isGeneratingPdf ? 'Exporting...' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl border-[1.5px] border-[#202020] bg-white dark:bg-[#1E1E23] hover:bg-[#F8F5EC] text-xs sm:text-sm font-bold text-[#202020] dark:text-white shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Custom date range bar */}
      {period === 'custom' && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[1.5px_1.5px_0px_#202020] text-xs font-bold print:hidden">
          <Calendar className="w-4 h-4 text-[#202020]" />
          <span className="text-[#626262]">Date Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2.5 py-1 bg-white dark:bg-[#1E1E23] border border-[#202020] rounded-lg text-xs font-bold"
          />
          <span className="text-[#626262]">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2.5 py-1 bg-white dark:bg-[#1E1E23] border border-[#202020] rounded-lg text-xs font-bold"
          />
        </div>
      )}

      {/* Print Report Header */}
      <div className="hidden print:block pb-4 border-b border-slate-300">
        <h1 className="text-2xl font-bold font-serif">SmartExpense AI — Financial Report</h1>
        <p className="text-sm text-slate-600">
          Period: {periodLabel} ({startDate} to {endDate}) • Exported on{' '}
          {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* 1. Health Metrics Cards in Soft Pastels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card-mint p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider">
            Savings Rate
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mt-1 tabular-nums">
            {healthMetrics.savingsRate}%
          </div>
          <p className="text-[11px] font-medium opacity-80 mt-0.5">
            Saved {formatMoney(totals.netSavings, currency)}
          </p>
        </div>

        <div className="card-peach p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider">
            Avg Daily Spend
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mt-1 tabular-nums">
            {formatMoney(healthMetrics.avgDailySpend, currency)}
          </div>
          <p className="text-[11px] font-medium opacity-80 mt-0.5">Daily outflow run-rate</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#A9B9F5] dark:bg-[#34406E] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[2.5px_2.5px_0px_#202020] text-[#202020] dark:text-[#E8EDFD] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider">
            Budget Utilization
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mt-1 tabular-nums">
            {healthMetrics.budgetUtilization}%
          </div>
          <p className="text-[11px] font-medium opacity-85 mt-0.5">Across active category caps</p>
        </div>

        <div className="card-lavender p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider">
            Period Expense Drift
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mt-1 flex items-center gap-1 tabular-nums">
            {healthMetrics.momChange > 0 ? (
              <TrendingUp className="w-5 h-5 text-[#E25C38]" />
            ) : healthMetrics.momChange < 0 ? (
              <TrendingDown className="w-5 h-5 text-[#2B7A49]" />
            ) : null}
            <span>{healthMetrics.momChange > 0 ? '+' : ''}{healthMetrics.momChange}%</span>
          </div>
          <p className="text-[11px] font-medium opacity-80 mt-0.5">Vs prior equivalent period</p>
        </div>
      </div>

      {/* 2. Spending Trend Chart */}
      <div className="card-retro p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#202020] dark:text-white">
              Spending Velocity Trend
            </h3>
            <p className="text-xs text-[#626262] dark:text-slate-400">Expense outflow distribution over time</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F6F4EB] dark:bg-[#18181D] border-[1.5px] border-[#202020] rounded-xl text-xs font-bold print:hidden">
            <button
              type="button"
              onClick={() => setTrendView('daily')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                trendView === 'daily'
                  ? 'bg-[#FFDB8A] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                  : 'text-[#626262] dark:text-slate-400'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setTrendView('weekly')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                trendView === 'weekly'
                  ? 'bg-[#FFDB8A] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                  : 'text-[#626262] dark:text-slate-400'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setTrendView('monthly')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                trendView === 'monthly'
                  ? 'bg-[#FFDB8A] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                  : 'text-[#626262] dark:text-slate-400'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFAB83" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#FFAB83" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#888" fontSize={11} tickLine={false} axisLine={{ stroke: '#202020' }} />
                <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
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
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#202020"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#spendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[#626262] dark:text-slate-400 font-medium">
              No trend data available for this range.
            </div>
          )}
        </div>
      </div>

      {/* 3. Category Breakdown & Ranked Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Donut */}
        <div className="card-retro p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#202020] dark:text-white">
              Category Distribution
            </h3>
            <p className="text-xs text-[#626262] dark:text-slate-400">Proportional expense allocation</p>
          </div>

          {categoryBreakdown.length > 0 ? (
            <div className="h-56 w-full my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="totalAmount"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    stroke="#202020"
                    strokeWidth={1.5}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cat-${index}`} fill={pastelColors[index % pastelColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatMoney(Number(val), currency), 'Spent']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-[#626262] dark:text-slate-400 font-medium">
              No expenses in this period.
            </div>
          )}
        </div>

        {/* Ranked Category Table */}
        <div className="lg:col-span-2 card-retro p-5 sm:p-6">
          <h3 className="font-serif text-lg font-bold text-[#202020] dark:text-white mb-1">
            Top Expense Categories Ranked
          </h3>
          <p className="text-xs text-[#626262] dark:text-slate-400 mb-4">
            Sorted by highest cumulative drain on your funds
          </p>

          {categoryBreakdown.length > 0 ? (
            <div className="divide-y-[1.5px] divide-[#202020]/10 dark:divide-slate-800 text-xs">
              {categoryBreakdown.map((cat, idx) => (
                <div key={cat.categoryId} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-serif font-bold text-[#202020] dark:text-white w-4 text-center">{idx + 1}</span>
                    <span
                      className="w-3.5 h-3.5 rounded-md border border-[#202020] flex-shrink-0"
                      style={{ backgroundColor: pastelColors[idx % pastelColors.length] }}
                    />
                    <div>
                      <span className="font-bold text-[#202020] dark:text-slate-200">
                        {cat.categoryName}
                      </span>
                      <span className="text-[10px] text-[#626262] dark:text-slate-400 block">
                        {cat.transactionCount} transactions
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-serif font-bold text-[#202020] dark:text-white tabular-nums">
                      {formatMoney(cat.totalAmount, currency)}
                    </div>
                    <span className="text-[10px] font-bold text-[#2B7A49] dark:text-[#7BD39A]">
                      {cat.percentage}% of total
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#626262] dark:text-slate-400 font-medium">
              No category data recorded.
            </div>
          )}
        </div>
      </div>

      {/* 4. Merchant Insights (Most Frequent & Highest Spend) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        <div className="card-retro p-5">
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4 text-[#202020] dark:text-white" />
            <h3 className="font-serif text-base font-bold text-[#202020] dark:text-white">
              Highest Spend Outlets & Merchants
            </h3>
          </div>
          <div className="divide-y-[1.5px] divide-[#202020]/10 dark:divide-slate-800 text-xs">
            {merchantInsights.topBySpend.map((m, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-[#202020] dark:text-slate-200 truncate max-w-[200px]">
                  {m.name}
                </span>
                <span className="font-serif font-bold text-[#202020] dark:text-white tabular-nums">
                  {formatMoney(m.total, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-retro p-5">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-[#E25C38]" />
            <h3 className="font-serif text-base font-bold text-[#202020] dark:text-white">
              Most Frequent Merchants
            </h3>
          </div>
          <div className="divide-y-[1.5px] divide-[#202020]/10 dark:divide-slate-800 text-xs">
            {merchantInsights.topByFrequency.map((m, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-[#202020] dark:text-slate-200 truncate max-w-[200px]">
                  {m.name}
                </span>
                <span className="font-bold text-[#626262] dark:text-slate-400">
                  {m.count} visits
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
