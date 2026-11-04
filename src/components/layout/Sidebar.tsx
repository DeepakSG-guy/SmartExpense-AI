import React from 'react';
import { NavLink } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PieChart,
  BarChart3,
  Repeat,
  Target,
  Sparkles,
  Settings,
  Plus,
  Zap,
  Info,
  LogOut,
  Users,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { openAddTxModal, settings, aiHealth, budgetStatuses, cloudSyncStatus, splitBalances } = useFinance();

  const warningBudgetsCount = budgetStatuses.filter(
    (b) => b.state === 'warning' || b.state === 'exceeded'
  ).length;

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: Receipt },
    {
      to: '/splits',
      label: 'Split Expenses',
      icon: Users,
      badge: splitBalances.activeSplitsCount > 0 ? `${splitBalances.activeSplitsCount}` : undefined,
      badgeColor: 'bg-[#CFB0E8] text-[#202020] border border-[#202020]',
    },
    { to: '/accounts', label: 'Accounts & Wallets', icon: Wallet },
    {
      to: '/budgets',
      label: 'Budgets',
      icon: PieChart,
      badge: warningBudgetsCount > 0 ? `${warningBudgetsCount}` : undefined,
      badgeColor: 'bg-[#FFAB83] text-[#202020] border border-[#202020]',
    },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { to: '/recurring', label: 'Recurring Payments', icon: Repeat },
    { to: '/goals', label: 'Savings Goals', icon: Target },
    {
      to: '/ai-assistant',
      label: 'AI Assistant',
      icon: Sparkles,
      badge: 'Gemini',
      badgeColor: 'bg-[#CFB0E8] text-[#202020] border border-[#202020]',
    },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-[#FAF7EE] dark:bg-[#18181D] border-r-[1.5px] border-[#202020]/20 dark:border-slate-800 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b-[1.5px] border-[#202020]/15 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FFDB8A] border-[1.5px] border-[#202020] shadow-[2px_2px_0px_#202020] flex items-center justify-center text-[#202020]">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="font-serif font-bold text-[#202020] dark:text-white tracking-tight text-lg leading-none flex items-center gap-1.5">
              SmartExpense
              <span className="text-[10px] font-sans font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-lg bg-[#CFB0E8] border border-[#202020] text-[#202020]">
                AI
              </span>
            </div>
            <div className="text-[11px] font-medium text-[#626262] dark:text-slate-400 mt-1">
              Personal Wealth Copilot
            </div>
          </div>
        </div>
      </div>

      {/* Demo Mode Badge if active */}
      {settings.isDemoMode && (
        <div className="mx-4 mt-3 p-2.5 rounded-xl bg-[#FFDB8A]/40 border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[1.5px_1.5px_0px_#202020] flex items-start gap-2">
          <Info className="w-4 h-4 text-[#202020] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#202020] leading-tight">
            <span className="font-bold">Demo Mode Active:</span> Sample Indian financial records loaded.
          </div>
        </div>
      )}

      {/* Quick Action Button (Murad Hossain pastel yellow primary button) */}
      <div className="px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => openAddTxModal()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-[1.5px] border-[#202020] text-[#202020] font-bold text-sm shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Transaction</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-white dark:bg-[#25252D] text-[#202020] dark:text-white border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[2px_2px_0px_#202020] dark:shadow-[1.5px_1.5px_0px_#0A0A0C]'
                  : 'text-[#626262] dark:text-slate-400 hover:text-[#202020] dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#25252D]/60'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${item.badgeColor || 'bg-slate-200 text-slate-800'}`}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Account & Cloud Sync Status */}
      <div className="p-3 mx-3 mb-2 rounded-2xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[2px_2px_0px_#202020]">
        {user ? (
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#ADE0BB] border border-[#202020] text-[#202020] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#202020] dark:text-slate-200 truncate">
                    {profile?.displayName || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-[#626262] dark:text-slate-400 flex items-center gap-1 font-medium">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        cloudSyncStatus === 'synced'
                          ? 'bg-emerald-500'
                          : cloudSyncStatus === 'syncing'
                          ? 'bg-blue-500 animate-spin'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span className="capitalize">{cloudSyncStatus === 'synced' ? 'Cloud Synced' : cloudSyncStatus}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                title="Sign Out"
                className="p-1.5 text-[#626262] hover:text-rose-600 rounded-lg hover:bg-[#F8F5EC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#202020] dark:text-slate-300">
                Local Storage
              </div>
              <div className="text-[10px] text-[#626262] dark:text-slate-400">Offline / Guest</div>
            </div>
            <NavLink
              to="/login"
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#FFDB8A] hover:bg-[#FFE099] border border-[#202020] text-[#202020] transition-colors shadow-[1px_1px_0px_#202020]"
            >
              Sign In
            </NavLink>
          </div>
        )}
      </div>

      {/* AI Connection Status Footer */}
      <div className="p-3 mx-3 mb-3 rounded-2xl bg-[#CFB0E8]/20 dark:bg-[#49365E]/30 border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[2px_2px_0px_#202020]">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-bold text-[#202020] dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#202020] dark:text-[#CFB0E8]" />
            AI Service
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-[#1E1E23] border border-[#202020] text-[#202020] dark:text-slate-200">
            {aiHealth.isAvailable && aiHealth.hasGeminiKey ? 'Ready' : 'Local'}
          </span>
        </div>
        <p className="text-[10px] text-[#626262] dark:text-slate-400 line-clamp-1">
          {aiHealth.message}
        </p>
      </div>
    </aside>
  );
};
