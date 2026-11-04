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
  Cloud,
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
      badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400',
    },
    { to: '/accounts', label: 'Accounts & Wallets', icon: Wallet },
    {
      to: '/budgets',
      label: 'Budgets',
      icon: PieChart,
      badge: warningBudgetsCount > 0 ? `${warningBudgetsCount}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { to: '/recurring', label: 'Recurring Payments', icon: Repeat },
    { to: '/goals', label: 'Savings Goals', icon: Target },
    {
      to: '/ai-assistant',
      label: 'AI Assistant',
      icon: Sparkles,
      badge: 'Gemini',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white tracking-tight text-base leading-none flex items-center gap-1.5">
              SmartExpense
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                AI
              </span>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Personal Wealth Copilot
            </div>
          </div>
        </div>
      </div>

      {/* Demo Mode Badge if active */}
      {settings.isDemoMode && (
        <div className="mx-4 mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 leading-tight">
            <span className="font-semibold">Demo Mode Active:</span> Sample Indian financial records loaded.
          </div>
        </div>
      )}

      {/* Quick Action Button */}
      <div className="px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => openAddTxModal()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Transaction</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Account & Cloud Sync Status */}
      <div className="p-3 mx-3 mb-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
        {user ? (
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {profile?.displayName || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
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
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Local Storage
              </div>
              <div className="text-[10px] text-slate-400">Offline / Guest</div>
            </div>
            <NavLink
              to="/login"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              Sign In
            </NavLink>
          </div>
        )}
      </div>

      {/* AI Connection Status Footer */}
      <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                aiHealth.isAvailable && aiHealth.hasGeminiKey
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            AI Service
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {aiHealth.isAvailable && aiHealth.hasGeminiKey ? 'Ready' : 'Local Only'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1">
          {aiHealth.message}
        </p>
      </div>
    </aside>
  );
};
