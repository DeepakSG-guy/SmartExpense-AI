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
  const { openAddTxModal, budgetStatuses, splitBalances } = useFinance();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const warningBudgetsCount = budgetStatuses.filter(
    (b) => b.state === 'warning' || b.state === 'exceeded'
  ).length;

  const moreItems = [
    { to: '/splits', label: 'Split Expenses', icon: Users, badge: splitBalances.activeSplitsCount > 0 ? `${splitBalances.activeSplitsCount}` : undefined },
    { to: '/accounts', label: 'Accounts & Wallets', icon: Wallet },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { to: '/recurring', label: 'Recurring Payments', icon: Repeat },
    { to: '/goals', label: 'Savings Goals', icon: Target },
    { to: '/ai-assistant', label: 'AI Assistant', icon: Sparkles, badge: 'Gemini' },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-[#202020]/60 backdrop-blur-xs transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="fixed inset-y-0 right-0 max-w-xs w-full bg-[#FAF7EE] dark:bg-[#18181D] p-6 shadow-2xl border-l-[1.5px] border-[#202020] dark:border-slate-800 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b-[1.5px] border-[#202020]/15 dark:border-slate-800">
                <span className="font-serif font-bold text-[#202020] dark:text-white text-lg">
                  More Pages
                </span>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-xl border border-[#202020] bg-white dark:bg-[#1E1E23] text-[#202020] dark:text-white hover:bg-[#F8F5EC]"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <div className="mt-4 space-y-1.5">
                {moreItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-white dark:bg-[#25252D] text-[#202020] dark:text-white border-[1.5px] border-[#202020] shadow-[2px_2px_0px_#202020]'
                          : 'text-[#626262] dark:text-slate-300 hover:bg-white/60 dark:hover:bg-[#25252D]/60'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-[#202020] dark:text-white" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#CFB0E8] border border-[#202020] text-[#202020]">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t-[1.5px] border-[#202020]/15 dark:border-slate-800 text-center text-xs font-medium text-[#626262] dark:text-slate-400">
              SmartExpense AI v2.0
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar (Murad Hossain mobile bottom navigation) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FAF7EE]/95 dark:bg-[#18181D]/95 backdrop-blur-md border-t-[1.5px] border-[#202020]/20 dark:border-slate-800 px-3 py-2 flex items-center justify-around">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-bold py-1 px-3 rounded-xl transition-all ${
              isActive
                ? 'text-[#202020] dark:text-white bg-white dark:bg-[#25252D] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                : 'text-[#626262] dark:text-slate-400'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4 stroke-[2.2]" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-bold py-1 px-3 rounded-xl transition-all ${
              isActive
                ? 'text-[#202020] dark:text-white bg-white dark:bg-[#25252D] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                : 'text-[#626262] dark:text-slate-400'
            }`
          }
        >
          <Receipt className="w-4 h-4 stroke-[2.2]" />
          <span>Ledger</span>
        </NavLink>

        {/* Floating Center (+) Action Button (Murad Hossain pastel yellow Send/Action button) */}
        <button
          type="button"
          onClick={() => openAddTxModal()}
          aria-label="Add Transaction"
          className="-mt-5 w-12 h-12 rounded-2xl bg-[#FFDB8A] text-[#202020] flex items-center justify-center border-2 border-[#202020] shadow-[3px_3px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        <NavLink
          to="/budgets"
          className={({ isActive }) =>
            `relative flex flex-col items-center gap-0.5 text-[10px] font-bold py-1 px-3 rounded-xl transition-all ${
              isActive
                ? 'text-[#202020] dark:text-white bg-white dark:bg-[#25252D] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                : 'text-[#626262] dark:text-slate-400'
            }`
          }
        >
          <PieChart className="w-4 h-4 stroke-[2.2]" />
          <span>Budgets</span>
          {warningBudgetsCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#FFAB83] border border-[#202020]" />
          )}
        </NavLink>

        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold py-1 px-3 rounded-xl text-[#626262] dark:text-slate-400 cursor-pointer"
        >
          <Menu className="w-4 h-4 stroke-[2.2]" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
};
