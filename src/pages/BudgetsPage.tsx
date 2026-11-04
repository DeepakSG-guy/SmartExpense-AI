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

  return (
    <div className="space-y-6">
      {/* Top Controls & Month Picker */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#202020] dark:text-white tracking-tight">
            Monthly Budgets
          </h2>
          <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-400 mt-0.5">
            Keep your spending within planned guardrails and protect your savings
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#202020] dark:text-white shadow-[1.5px_1.5px_0px_#202020] focus:outline-none"
          />

          <button
            type="button"
            onClick={() => setIsAddBudgetOpen(true)}
            className="flex items-center gap-1.5 py-2 px-3.5 sm:px-4 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] text-[#202020] text-xs sm:text-sm font-bold shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Budget</span>
          </button>
        </div>
      </div>

      {/* Aggregate Overview Card (Murad Hossain pastel yellow card) */}
      {activeStatuses.length > 0 && (
        <div className="card-yellow p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#202020]">
                Monthly Spending Envelope
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-[#202020] tabular-nums">
                  {formatMoney(totalSpent, currency)}
                </span>
                <span className="text-xs font-bold text-[#202020]/70">
                  of {formatMoney(totalLimit, currency)} Limit
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-[#202020]">
                {totalRemaining >= 0 ? 'Remaining Buffer' : 'Budget Exceeded By'}
              </span>
              <div className="font-serif text-2xl font-bold text-[#202020] tabular-nums">
                {formatMoney(Math.abs(totalRemaining), currency)}
              </div>
            </div>
          </div>

          {/* Aggregate Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-full bg-white rounded-full border-[1.5px] border-[#202020] overflow-hidden p-[1px]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  overallPercentage >= 100
                    ? 'bg-[#FFAB83]'
                    : overallPercentage >= 85
                    ? 'bg-[#FFAB83]'
                    : overallPercentage >= 70
                    ? 'bg-[#FFDB8A]'
                    : 'bg-[#ADE0BB]'
                }`}
                style={{ width: `${Math.min(100, overallPercentage)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-[#202020]">
              <span>{overallPercentage}% utilized</span>
              <span>{activeStatuses[0]?.daysRemainingInMonth || 0} days remaining in cycle</span>
            </div>
          </div>
        </div>
      )}

      {/* Category Budgets Grid */}
      {activeStatuses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeStatuses.map((b: BudgetStatus) => {
            return (
              <div
                key={b.budget.id}
                className="card-retro p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Card Header: Category, Status Pill, Actions */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-md border border-[#202020] flex-shrink-0"
                          style={{ backgroundColor: b.categoryColor }}
                        />
                        <h3 className="font-serif font-bold text-base text-[#202020] dark:text-white">
                          {b.categoryName}
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-[#626262] dark:text-slate-400 mt-0.5 block">
                        Cap: {formatMoney(b.limitAmount, currency)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Warning Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border border-[#202020] uppercase tracking-wider ${
                          b.state === 'exceeded'
                            ? 'bg-[#FFAB83] text-[#202020]'
                            : b.state === 'warning'
                            ? 'bg-[#FFDB8A] text-[#202020]'
                            : b.state === 'approaching'
                            ? 'bg-[#A9B9F5] text-[#202020]'
                            : 'bg-[#ADE0BB] text-[#202020]'
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
                        className="p-1 rounded-lg border border-[#202020] bg-white dark:bg-[#1E1E23] text-[#202020] dark:text-white hover:bg-[#F8F5EC] cursor-pointer"
                        title="Edit Budget"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(b.budget)}
                        className="p-1 rounded-lg border border-[#202020] bg-white dark:bg-[#1E1E23] text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete Budget"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="mt-3 flex items-baseline justify-between text-xs font-bold">
                    <span className="text-[#202020] dark:text-white font-serif tabular-nums">
                      Spent: {formatMoney(b.spentAmount, currency)}
                    </span>
                    <span
                      className={`font-serif tabular-nums ${
                        b.remainingAmount < 0 ? 'text-[#E25C38]' : 'text-[#626262] dark:text-slate-400'
                      }`}
                    >
                      {b.remainingAmount >= 0 ? 'Left: ' : 'Over: '}
                      {formatMoney(Math.abs(b.remainingAmount), currency)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 space-y-1">
                    <div className="h-3 w-full bg-[#F6F4EB] dark:bg-[#18181D] rounded-full border border-[#202020] overflow-hidden p-[1px]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          b.percentageUsed >= 100
                            ? 'bg-[#FFAB83]'
                            : b.percentageUsed >= (b.budget.warningThreshold || 75)
                            ? 'bg-[#FFDB8A]'
                            : 'bg-[#ADE0BB]'
                        }`}
                        style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#626262] dark:text-slate-400">
                      <span>{b.percentageUsed}% of limit</span>
                      <span>Run-rate: {formatMoney(b.dailyRunRate, currency)}/day</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-retro p-12 text-center">
          <PieIcon className="w-10 h-10 text-[#626262]/40 mx-auto mb-2" />
          <h3 className="font-serif text-lg font-bold text-[#202020] dark:text-white">
            No Budgets Set for {selectedMonth}
          </h3>
          <p className="text-xs text-[#626262] dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Set category envelopes to keep dining, shopping, rent, and outings within predictable ranges.
          </p>
          <button
            type="button"
            onClick={() => setIsAddBudgetOpen(true)}
            className="mt-4 py-2 px-4 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] text-[#202020] font-bold text-xs shadow-[2px_2px_0px_#202020] cursor-pointer"
          >
            Create First Budget
          </button>
        </div>
      )}

      {/* Modals */}
      <BudgetModal
        isOpen={isAddBudgetOpen || Boolean(editBudget)}
        onClose={() => {
          setIsAddBudgetOpen(false);
          setEditBudget(null);
        }}
        editBudget={editBudget}
        defaultMonth={selectedMonth}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteCandidate)}
        title="Delete Budget"
        message="Are you sure you want to delete this budget envelope? Existing transaction records will not be deleted."
        confirmLabel="Delete"
        isDestructive
        onConfirm={async () => {
          if (deleteCandidate) {
            await deleteBudget(deleteCandidate.id);
            setDeleteCandidate(null);
          }
        }}
        onCancel={() => setDeleteCandidate(null)}
      />
    </div>
  );
};
