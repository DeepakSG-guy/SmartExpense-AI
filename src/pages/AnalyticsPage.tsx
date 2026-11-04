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

  const totals = useMemo(() => calculateTotals(periodTransactions), [periodTransactions]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    return calculateCategoryBreakdown(periodTransactions, categories, 'expense');
  }, [periodTransactions, categories]);

  // Financial Health Metrics
  const healthMetrics = useMemo(() => {
    const days = Math.max(
      1,
      Math.round(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    );
    const avgDailySpend = Math.round(totals.totalExpense / days);

    // Budget utilization
    const totalBudgetLimit = budgetStatuses.reduce((acc, b) => acc + b.limitAmount, 0);
    const totalBudgetSpent = budgetStatuses.reduce((acc, b) => acc + b.spentAmount, 0);
    const budgetUtilization = totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0;

    // Previous period expense for MoM change
    const periodDurationMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    const prevPeriodEnd = new Date(new Date(startDate).getTime() - 1000 * 60 * 60 * 24);
    const prevPeriodStart = new Date(prevPeriodEnd.getTime() - periodDurationMs);
    const prevStartStr = prevPeriodStart.toISOString().split('T')[0];
    const prevEndStr = prevPeriodEnd.toISOString().split('T')[0];

    const prevTxs = transactions.filter((t) => t.date >= prevStartStr && t.date <= prevEndStr);
    const prevTotals = calculateTotals(prevTxs);
    const momChange =
      prevTotals.totalExpense > 0
        ? Math.round(((totals.totalExpense - prevTotals.totalExpense) / prevTotals.totalExpense) * 100)
        : 0;

    return {
      savingsRate: totals.savingsRate,
      avgDailySpend,
      budgetUtilization,
      momChange,
    };
  }, [totals, startDate, endDate, budgetStatuses, transactions]);

  // Trend Chart Data (Daily / Weekly / Monthly)
  const trendData = useMemo(() => {
    const expenseTxs = periodTransactions.filter((t) => t.type === 'expense');

    if (trendView === 'daily') {
      const dailyMap = new Map<string, number>();
      for (const tx of expenseTxs) {
        const cur = dailyMap.get(tx.date) || 0;
        dailyMap.set(tx.date, cur + fromMinorUnits(tx.amount));
      }
      return Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, amount]) => ({
          label: date.substring(5), // MM-DD
          amount,
        }));
    } else if (trendView === 'monthly') {
      const monthMap = new Map<string, number>();
      for (const tx of expenseTxs) {
        const monthKey = tx.date.substring(0, 7);
        const cur = monthMap.get(monthKey) || 0;
        monthMap.set(monthKey, cur + fromMinorUnits(tx.amount));
      }
      return Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([m, amount]) => ({
          label: m,
          amount,
        }));
    } else {
      // Weekly view
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

  // Calendar Heatmap: 31 days expense intensity
  const heatmapData = useMemo(() => {
    const dayTotals = new Map<string, number>();
    for (const tx of periodTransactions) {
      if (tx.type === 'expense') {
        const cur = dayTotals.get(tx.date) || 0;
        dayTotals.set(tx.date, cur + tx.amount);
      }
    }

    const maxSpend = Math.max(1, ...Array.from(dayTotals.values()));
    return { dayTotals, maxSpend };
  }, [periodTransactions]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      showToast({ type: 'info', message: 'Generating financial audit PDF report...' });

      // Small tick to let toast render
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

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Top Header & Period Selector (Hidden in print) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Financial Analytics & Reports
          </h2>
          <p className="text-xs text-slate-400">
            Comprehensive audit of spending patterns, health metrics, and merchants
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Exporting...' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Custom date range bar */}
      {period === 'custom' && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs print:hidden">
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span className="text-slate-500">Date Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs"
          />
        </div>
      )}

      {/* Print Report Header (Visible only when printing) */}
      <div className="hidden print:block pb-4 border-b border-slate-300">
        <h1 className="text-2xl font-bold">SmartExpense AI — Financial Report</h1>
        <p className="text-sm text-slate-600">
          Period: {periodLabel} ({startDate} to {endDate}) • Exported on{' '}
          {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* 1. Health Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Savings Rate
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {healthMetrics.savingsRate}%
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Saved {formatMoney(totals.netSavings, currency)} of {formatMoney(totals.totalIncome, currency)}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Avg Daily Spending
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {formatMoney(healthMetrics.avgDailySpend, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Daily outflow run-rate</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Budget Utilization
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {healthMetrics.budgetUtilization}%
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Across active limits</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Period Expense Change
          </span>
          <div
            className={`text-xl sm:text-2xl font-extrabold mt-1 flex items-center gap-1 ${
              healthMetrics.momChange > 0
                ? 'text-rose-600'
                : healthMetrics.momChange < 0
                ? 'text-emerald-600'
                : 'text-slate-600'
            }`}
          >
            {healthMetrics.momChange > 0 ? (
              <TrendingUp className="w-5 h-5" />
            ) : healthMetrics.momChange < 0 ? (
              <TrendingDown className="w-5 h-5" />
            ) : null}
            <span>{healthMetrics.momChange > 0 ? '+' : ''}{healthMetrics.momChange}%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Compared to prior cycle</p>
        </div>
      </div>

      {/* 2. Spending Trend Area Chart */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Spending Velocity Trend
            </h3>
            <p className="text-xs text-slate-400">Expense outflow distribution over time</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold print:hidden">
            <button
              type="button"
              onClick={() => setTrendView('daily')}
              className={`px-3 py-1 rounded-md transition-all ${
                trendView === 'daily'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setTrendView('weekly')}
              className={`px-3 py-1 rounded-md transition-all ${
                trendView === 'weekly'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setTrendView('monthly')}
              className={`px-3 py-1 rounded-md transition-all ${
                trendView === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500'
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
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${currency} ${Number(val).toFixed(2)}`, 'Expense']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#spendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No trend data available for this range.
            </div>
          )}
        </div>
      </div>

      {/* 3. Category Breakdown & Ranked Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Donut */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Category Distribution
            </h3>
            <p className="text-xs text-slate-400">Proportional expense allocation</p>
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
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cat-${index}`} fill={entry.categoryColor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatMoney(Number(val), currency), 'Spent']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              No expenses in this period.
            </div>
          )}
        </div>

        {/* Ranked Category Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Top Expense Categories Ranked
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Sorted by highest cumulative drain on your funds
          </p>

          {categoryBreakdown.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {categoryBreakdown.map((cat, idx) => (
                <div key={cat.categoryId} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 w-4 text-center">{idx + 1}</span>
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.categoryColor }}
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {cat.categoryName}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {cat.transactionCount} transactions
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {formatMoney(cat.totalAmount, currency)}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {cat.percentage}% of total
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No category data recorded.
            </div>
          )}
        </div>
      </div>

      {/* 4. Merchant Insights (Most Frequent & Highest Spend) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Highest Spend Merchants
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {merchantInsights.topBySpend.map((m, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {m.name}
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatMoney(m.total, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Most Frequent Merchants
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {merchantInsights.topByFrequency.map((m, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {m.name}
                </span>
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  {m.count} visits / orders
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
