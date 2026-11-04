import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import type { Budget } from '../../types/finance';
import { toMinorUnits, fromMinorUnits, SUPPORTED_CURRENCIES } from '../../types/finance';
import { X, PieChart } from 'lucide-react';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editBudget?: Budget | null;
  defaultMonth?: string;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  editBudget,
  defaultMonth,
}) => {
  const { categories, settings, addBudget, updateBudget } = useFinance();
  const currencyConfig = SUPPORTED_CURRENCIES[settings.currency] || SUPPORTED_CURRENCIES.INR;

  const currentMonthStr =
    defaultMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const [categoryId, setCategoryId] = useState<string>('all');
  const [month, setMonth] = useState<string>(currentMonthStr);
  const [limitAmountInput, setLimitAmountInput] = useState<string>('');
  const [warningThreshold, setWarningThreshold] = useState<number>(75);
  const [dangerThreshold, setDangerThreshold] = useState<number>(90);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (editBudget) {
        setCategoryId(editBudget.categoryId);
        setMonth(editBudget.month);
        setLimitAmountInput(fromMinorUnits(editBudget.limitAmount, currencyConfig.minorUnitDigits).toString());
        setWarningThreshold(editBudget.warningThreshold || 75);
        setDangerThreshold(editBudget.dangerThreshold || 90);
      } else {
        setCategoryId('all');
        setMonth(currentMonthStr);
        setLimitAmountInput('');
        setWarningThreshold(settings.budgetThresholds?.warning || 75);
        setDangerThreshold(settings.budgetThresholds?.danger || 90);
      }
    }
  }, [isOpen, editBudget, currentMonthStr, currencyConfig.minorUnitDigits, settings.budgetThresholds]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedLimit = parseFloat(limitAmountInput);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      setErrorMsg('Please enter a valid positive budget limit.');
      return;
    }

    if (warningThreshold >= dangerThreshold) {
      setErrorMsg('Warning threshold must be less than danger threshold.');
      return;
    }

    const minorUnits = toMinorUnits(parsedLimit, currencyConfig.minorUnitDigits);

    setIsSubmitting(true);
    try {
      if (editBudget) {
        await updateBudget(editBudget.id, {
          categoryId,
          month,
          limitAmount: minorUnits,
          warningThreshold,
          dangerThreshold,
        });
      } else {
        await addBudget({
          categoryId,
          month,
          limitAmount: minorUnits,
          warningThreshold,
          dangerThreshold,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save budget.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {editBudget ? 'Modify Budget' : 'Set Category Budget'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Category Scope
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Total Monthly Spending (Overall Budget)</option>
              {expenseCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Month
              </label>
              <input
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Limit ({currencyConfig.symbol})
              </label>
              <input
                type="number"
                step="any"
                min="1"
                required
                placeholder="5000"
                value={limitAmountInput}
                onChange={(e) => setLimitAmountInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Alert Warning Thresholds
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">
                  Approaching Warning (%): {warningThreshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="85"
                  step="5"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">
                  Critical Warning (%): {dangerThreshold}%
                </label>
                <input
                  type="range"
                  min="85"
                  max="99"
                  step="1"
                  value={dangerThreshold}
                  onChange={(e) => setDangerThreshold(parseInt(e.target.value, 10))}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editBudget ? 'Update Budget' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
