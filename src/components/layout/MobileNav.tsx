import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  PieChart,
  Menu,
  Wallet,
  BarChart3,
  Repeat,
  Target,
  Sparkles,
  Settings,
  X,
  Users,
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { openAddTxModal, budgetStatuses } = useFinance();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const warningBudgetsCount = budgetStatuses.filter(
    (b) => b.state === 'warning' || b.state === 'exceeded'
  ).length;

  const moreItems = [
    { to: '/splits', label: 'Split Expenses', icon: Users },
    { to: '/accounts', label: 'Accounts & Wallets', icon: Wallet },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { to: '/recurring', label: 'Recurring Payments', icon: Repeat },
    { to: '/goals', label: 'Savings Goals', icon: Target },
    { to: '/ai-assistant', label: 'AI Assistant', icon: Sparkles },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="fixed inset-y-0 right-0 max-w-xs w-full bg-white dark:bg-slate-900 p-6 shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  More Pages
                </span>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                {moreItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5 text-slate-500" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
              SmartExpense AI v1.0
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-lg transition-colors ${
              isActive ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-lg transition-colors ${
              isActive ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <Receipt className="w-5 h-5" />
          <span>Ledger</span>
        </NavLink>

        {/* Floating Center (+) Action Button */}
        <button
          type="button"
          onClick={() => openAddTxModal()}
          aria-label="Add Transaction"
          className="-mt-5 w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>

        <NavLink
          to="/budgets"
          className={({ isActive }) =>
            `relative flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-lg transition-colors ${
              isActive ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <PieChart className="w-5 h-5" />
          <span>Budgets</span>
          {warningBudgetsCount > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-amber-500" />
          )}
        </NavLink>

        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-lg text-slate-500 dark:text-slate-400"
        >
          <Menu className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
};
