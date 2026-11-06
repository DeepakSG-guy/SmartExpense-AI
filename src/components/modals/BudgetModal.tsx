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
  const { categories, settings, addBudget, updateBudget, showToast } = useFinance();
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

    const parsed = parseFloat(limitAmountInput);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMsg('Please specify a valid budget amount.');
      return;
    }

    const minorAmount = toMinorUnits(parsed, currencyConfig.minorUnitDigits);

    setIsSubmitting(true);
    try {
      if (editBudget) {
        await updateBudget(editBudget.id, {
          categoryId,
          month,
          limitAmount: minorAmount,
          warningThreshold,
          dangerThreshold,
        });
        showToast({ type: 'success', message: 'Budget updated successfully.' });
      } else {
        await addBudget({
          categoryId,
          month,
          limitAmount: minorAmount,
          warningThreshold,
          dangerThreshold,
        });
        showToast({
          type: 'success',
          message: `Monthly budget of ${currencyConfig.symbol}${parsed.toLocaleString()} set!`,
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
    <div
      className="fixed inset-0 z-50 bg-[#202020]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FAF7EE] dark:bg-[#18181D] rounded-3xl border-2 border-[#202020] dark:border-slate-700 shadow-[4px_4px_0px_#202020] dark:shadow-[3px_3px_0px_#0A0A0C] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b-[1.5px] border-[#202020]/15 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFDB8A] border border-[#202020] text-[#202020] flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
              {editBudget ? 'Edit Budget' : 'Configure Budget'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border-[1.5px] border-[#202020] bg-white dark:bg-[#25252D] text-[#202020] dark:text-white shadow-[1px_1px_0px_#202020] hover:bg-[#F8F5EC]"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-[#FFAB83]/40 border-[1.5px] border-[#202020] text-xs font-bold text-[#202020]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
              Category Scope
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs font-bold text-[#202020] dark:text-white"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                Month
              </label>
              <input
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs font-bold text-[#202020] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
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
                className="w-full px-3 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl font-serif text-sm font-bold text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[1.5px_1.5px_0px_#202020] space-y-3">
            <span className="text-xs font-bold text-[#202020] dark:text-slate-200 block">
              Warning Alerts
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#626262] dark:text-slate-400 block mb-1">
                  Caution: {warningThreshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="85"
                  step="5"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(parseInt(e.target.value, 10))}
                  className="w-full accent-[#FFAB83]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#626262] dark:text-slate-400 block mb-1">
                  Danger: {dangerThreshold}%
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] shadow-[3px_3px_0px_#202020] font-bold text-sm text-[#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : editBudget ? 'Update Budget' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
