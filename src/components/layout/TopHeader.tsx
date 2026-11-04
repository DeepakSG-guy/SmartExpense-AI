import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatMoney } from '../../types/finance';
import {
  Sun,
  Moon,
  Plus,
  Zap,
} from 'lucide-react';

export const TopHeader: React.FC = () => {
  const location = useLocation();
  const { user, profile } = useAuth();
  const { netWorth, settings, updateSettings, openAddTxModal } = useFinance();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Financial Dashboard', subtitle: 'Overview of your wealth, cash flow, and budgets' };
      case '/transactions':
        return { title: 'Transactions Ledger', subtitle: 'View, filter, search, and manage all your records' };
      case '/accounts':
        return { title: 'Accounts & Wallets', subtitle: 'Bank accounts, UPI, credit card balances, and cash' };
      case '/budgets':
        return { title: 'Monthly Budgets', subtitle: 'Set and track spending limits by category' };
      case '/analytics':
        return { title: 'Analytics & Reports', subtitle: 'Deep dive into spending trends, health metrics, and heatmaps' };
      case '/recurring':
        return { title: 'Recurring Payments', subtitle: 'Manage subscriptions, rent, utility bills, and salary' };
      case '/goals':
        return { title: 'Savings Goals', subtitle: 'Track progress toward financial dreams and emergency funds' };
      case '/ai-assistant':
        return { title: 'AI Financial Assistant', subtitle: 'Gemini copilot, grounded chat, forecast, and receipt scanner' };
      case '/settings':
        return { title: 'Preferences & Backup', subtitle: 'Configure currency, themes, categories, and data export' };
      default:
        return { title: 'SmartExpense AI', subtitle: 'Personal Finance' };
    }
  };

  const pageInfo = getPageInfo();

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      {/* Page Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white flex-shrink-0">
          <Zap className="w-4 h-4 fill-current" />
        </div>
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            {pageInfo.title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
            {pageInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls: Net Worth Pill, Theme Toggle, + Add Button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Net Worth Chip */}
        <div className="hidden md:flex flex-col items-end px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            Net Worth
          </span>
          <span
            className={`text-sm font-bold tracking-tight ${
              netWorth >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMoney(netWorth, settings.currency)}
          </span>
        </div>

        {/* User Account Chip */}
        {user ? (
          <Link
            to="/settings"
            className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            title={user.email || 'Account Settings'}
          >
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
              {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline max-w-[90px] truncate">{profile?.displayName || user.email?.split('@')[0]}</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1 py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span>Sign In</span>
          </Link>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle light or dark theme"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {settings.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={() => openAddTxModal()}
          className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-all duration-150 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
          <span>Transaction</span>
        </button>
      </div>
    </header>
  );
};
