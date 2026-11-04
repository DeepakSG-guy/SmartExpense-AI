import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, fromMinorUnits, type Budget } from '../types/finance';
import { calculateBudgetStatuses, type BudgetStatus } from '../services/financeCalculations';
import { BudgetModal } from '../components/modals/BudgetModal';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import {
  PieChart as PieIcon,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export const BudgetsPage: React.FC = () => {
  const {
    budgets,
    transactions,
    categories,
    settings,
    deleteBudget,
  } = useFinance();

  const today = new Date();
  const currentMonthDefault = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthDefault);

  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Budget | null>(null);

  const currency = settings.currency;

  // Compute budget statuses for the selected month
  const activeStatuses = useMemo(() => {
    return calculateBudgetStatuses(budgets, transactions, categories, selectedMonth);
  }, [budgets, transactions, categories, selectedMonth]);

  // Overall summary stats for the selected month
  const totalLimit = activeStatuses.reduce((acc, b) => acc + b.limitAmount, 0);
  const totalSpent = activeStatuses.reduce((acc, b) => acc + b.spentAmount, 0);
  const totalRemaining = totalLimit - totalSpent;
  const overallPercentage = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  // Previous month comparison
  const prevMonthDate = new Date(
    parseInt(selectedMonth.split('-')[0], 10),
    parseInt(selectedMonth.split('-')[1], 10) - 2,
    1
  );
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthStatuses = useMemo(() => {
    return calculateBudgetStatuses(budgets, transactions, categories, prevMonthStr);
  }, [budgets, transactions, categories, prevMonthStr]);

  const prevSpentMap = useMemo(() => {
    return new Map<string, number>(prevMonthStatuses.map((s) => [s.budget.categoryId, s.spentAmount]));
  }, [prevMonthStatuses]);

  return (
    <div className="space-y-6">
      {/* Top Controls & Month Picker */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Budget Control Center
          </h2>
          <p className="text-xs text-slate-400">
            Keep your spending within planned guardrails and avoid month-end surprises
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <button
            type="button"
            onClick={() => setIsAddBudgetOpen(true)}
            className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Budget</span>
          </button>
        </div>
      </div>

      {/* Aggregate Overview Card */}
      {activeStatuses.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Monthly Spending Envelope
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {formatMoney(totalSpent, currency)}
                </span>
                <span className="text-sm font-medium text-slate-400">
                  of {formatMoney(totalLimit, currency)} Limit
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                {totalRemaining >= 0 ? 'Remaining Buffer' : 'Budget Exceeded By'}
              </span>
              <div
                className={`text-xl font-bold ${
                  totalRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                }`}
              >
                {formatMoney(Math.abs(totalRemaining), currency)}
              </div>
            </div>
          </div>

          {/* Aggregate Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  overallPercentage >= 100
                    ? 'bg-rose-500'
                    : overallPercentage >= 90
                    ? 'bg-amber-500'
                    : overallPercentage >= 75
                    ? 'bg-blue-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, overallPercentage)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{overallPercentage}% utilized</span>
              <span>{activeStatuses[0]?.daysRemainingInMonth || 0} days remaining in month</span>
            </div>
          </div>
        </div>
      )}

      {/* Category Budgets Grid */}
      {activeStatuses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeStatuses.map((b: BudgetStatus) => {
            const prevSpent = prevSpentMap.get(b.budget.categoryId);
            const hasPrevSpent = prevSpent !== undefined && prevSpent > 0;
            const spendDiff = hasPrevSpent ? b.spentAmount - prevSpent : 0;
            const pctChange = hasPrevSpent ? Math.round((spendDiff / prevSpent) * 100) : null;

            return (
              <div
                key={b.budget.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Card Header: Category, Status Pill, Actions */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: b.categoryColor }}
                        />
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          {b.categoryName}
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Limit: {formatMoney(b.limitAmount, currency)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Warning Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          b.state === 'exceeded'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : b.state === 'warning'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : b.state === 'approaching'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        }`}
                      >
                        {b.state === 'exceeded'
                          ? 'Exceeded'
                          : b.state === 'warning'
                          ? 'Warning'
                          : b.state === 'approaching'
                          ? 'Approaching'
                          : 'On Track'}
                      </span>

                      {/* Edit & Delete */}
                      <button
                        type="button"
                        onClick={() => setEditBudget(b.budget)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(b.budget)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="mt-3 flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Spent: {formatMoney(b.spentAmount, currency)}
                    </span>
                    <span
                      className={`font-semibold ${
                        b.remainingAmount < 0 ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      {b.remainingAmount >= 0 ? 'Left: ' : 'Over by: '}
                      {formatMoney(Math.abs(b.remainingAmount), currency)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-1.5 h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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

                {/* Footer comparison info */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{b.percentageUsed}% of limit</span>

                  {pctChange !== null && (
                    <span
                      className={`flex items-center gap-1 font-medium ${
                        pctChange > 0 ? 'text-rose-500' : 'text-emerald-500'
                      }`}
                    >
                      {pctChange > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {Math.abs(pctChange)}% vs last month ({formatMoney(prevSpent || 0, currency)})
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <PieIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Budgets Defined for {selectedMonth}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-5">
            Set up category budgets (such as Food & Dining, Groceries, Shopping) or an overall monthly spending envelope.
          </p>
          <button
            type="button"
            onClick={() => setIsAddBudgetOpen(true)}
            className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            Create Your First Budget
          </button>
        </div>
      )}

      {/* Add / Edit Budget Modal */}
      <BudgetModal
        isOpen={isAddBudgetOpen || !!editBudget}
        onClose={() => {
          setIsAddBudgetOpen(false);
          setEditBudget(null);
        }}
        editBudget={editBudget}
        defaultMonth={selectedMonth}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (deleteCandidate) deleteBudget(deleteCandidate.id);
        }}
        title="Remove Budget?"
        message="Are you sure you want to delete this budget limit? Your underlying transactions will not be affected."
        confirmText="Remove Budget"
        confirmVariant="danger"
      />
    </div>
  );
};
