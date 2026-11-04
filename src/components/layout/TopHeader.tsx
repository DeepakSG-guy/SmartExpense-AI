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
        return { title: 'Dashboard', subtitle: 'Overview of your wealth, cash flow, and budgets' };
      case '/transactions':
        return { title: 'Transactions Ledger', subtitle: 'View, filter, search, and manage all your records' };
      case '/splits':
        return { title: 'Split Expenses', subtitle: 'Roommates, shared bills, and UPI settlements' };
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
        return { title: 'AI Assistant', subtitle: 'Gemini copilot, grounded chat, forecast, and receipt scanner' };
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
    <header className="sticky top-0 z-30 bg-[#FBF9F2]/90 dark:bg-[#141416]/90 backdrop-blur-md border-b-[1.5px] border-[#202020]/15 dark:border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Page Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden w-8 h-8 rounded-xl bg-[#FFDB8A] border-[1.5px] border-[#202020] shadow-[1.5px_1.5px_0px_#202020] flex items-center justify-center text-[#202020] flex-shrink-0">
          <Zap className="w-4 h-4 fill-current" />
        </div>
        <div>
          <h1 className="font-serif text-lg lg:text-xl font-bold text-[#202020] dark:text-white tracking-tight leading-tight">
            {pageInfo.title}
          </h1>
          <p className="hidden sm:block text-[11px] text-[#626262] dark:text-slate-400">
            {pageInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls: Net Worth Pill, Theme Toggle, + Add Button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Net Worth Chip */}
        <div className="hidden md:flex flex-col items-end px-3 py-1 rounded-xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[1.5px_1.5px_0px_#202020]">
          <span className="text-[9px] font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider">
            Net Worth
          </span>
          <span
            className={`text-xs font-bold tracking-tight tabular-nums ${
              netWorth >= 0 ? 'text-[#202020] dark:text-white' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMoney(netWorth, settings.currency)}
          </span>
        </div>

        {/* User Account Chip */}
        {user ? (
          <Link
            to="/settings"
            className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[1.5px_1.5px_0px_#202020] text-xs font-bold text-[#202020] dark:text-slate-200 hover:bg-[#F8F5EC] transition-all"
            title={user.email || 'Account Settings'}
          >
            <div className="w-5 h-5 rounded-lg bg-[#ADE0BB] border border-[#202020] text-[#202020] flex items-center justify-center text-[10px] font-bold">
              {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline max-w-[90px] truncate">{profile?.displayName || user.email?.split('@')[0]}</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1 py-1.5 px-3 rounded-xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[1.5px_1.5px_0px_#202020] text-xs font-bold text-[#202020] dark:text-slate-300 hover:bg-[#F8F5EC] transition-all"
          >
            <span>Sign In</span>
          </Link>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle light or dark theme"
          className="p-2 rounded-xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[1.5px_1.5px_0px_#202020] text-[#202020] dark:text-slate-300 hover:bg-[#F8F5EC] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
        >
          {settings.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#202020]" />}
        </button>

        {/* Quick Add Button (Murad Hossain pastel yellow action) */}
        <button
          type="button"
          onClick={() => openAddTxModal()}
          className="flex items-center gap-1.5 py-1.5 px-3 sm:px-3.5 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-[1.5px] border-[#202020] text-[#202020] font-bold text-xs sm:text-sm shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">New</span>
          <span>Expense</span>
        </button>
      </div>
    </header>
  );
};
