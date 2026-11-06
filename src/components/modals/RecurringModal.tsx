import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import type { RecurringRule, RecurrenceFrequency, TransactionType } from '../../types/finance';
import { toMinorUnits, fromMinorUnits, SUPPORTED_CURRENCIES } from '../../types/finance';
import { X, Repeat } from 'lucide-react';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  editRule?: RecurringRule | null;
}

export const RecurringModal: React.FC<RecurringModalProps> = ({
  isOpen,
  onClose,
  editRule,
}) => {
  const { categories, accounts, settings, addRecurringRule, updateRecurringRule } = useFinance();
  const currencyConfig = SUPPORTED_CURRENCIES[settings.currency] || SUPPORTED_CURRENCIES.INR;

  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (editRule) {
        setTitle(editRule.title);
        setAmountInput(fromMinorUnits(editRule.amount, currencyConfig.minorUnitDigits).toString());
        setType(editRule.type);
        setCategoryId(editRule.categoryId);
        setFromAccountId(editRule.fromAccountId);
        setFrequency(editRule.frequency);
        setStartDate(editRule.startDate);
        setNextDueDate(editRule.nextDueDate);
        setEndDate(editRule.endDate || '');
        setNotes(editRule.notes || '');
      } else {
        setTitle('');
        setAmountInput('');
        setType('expense');
        setCategoryId(categories.find((c) => c.type === 'expense')?.id || '');
        setFromAccountId(accounts.find((a) => !a.isArchived)?.id || '');
        setFrequency('monthly');
        const todayStr = new Date().toISOString().split('T')[0];
        setStartDate(todayStr);
        setNextDueDate(todayStr);
        setEndDate('');
        setNotes('');
      }
    }
  }, [isOpen, editRule, categories, accounts, currencyConfig.minorUnitDigits]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Title/Service name is required.');
      return;
    }

    const parsed = parseFloat(amountInput);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMsg('Please enter a valid recurring amount.');
      return;
    }

    if (!fromAccountId) {
      setErrorMsg('Please select an account.');
      return;
    }

    const minorUnits = toMinorUnits(parsed, currencyConfig.minorUnitDigits);

    setIsSubmitting(true);
    try {
      if (editRule) {
        await updateRecurringRule(editRule.id, {
          title: title.trim(),
          amount: minorUnits,
          type,
          categoryId,
          fromAccountId,
          frequency,
          startDate,
          nextDueDate,
          endDate: endDate || undefined,
          notes: notes.trim(),
        });
      } else {
        await addRecurringRule({
          title: title.trim(),
          amount: minorUnits,
          type,
          categoryId,
          fromAccountId,
          frequency,
          startDate,
          nextDueDate,
          endDate: endDate || undefined,
          isActive: true,
          notes: notes.trim(),
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save recurring rule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#202020]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#1E1E22] w-full max-w-md rounded-3xl shadow-2xl border-2 border-[#202020] shadow-[3.5px_3.5px_0px_#202020] overflow-hidden my-auto">
        <div className="px-6 py-4 border-b-2 border-[#202020]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFDB8A] border-2 border-[#202020] text-[#202020] flex items-center justify-center shadow-[1.5px_1.5px_0px_#202020]">
              <Repeat className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-serif font-bold text-[#202020] dark:text-white">
              {editRule ? 'Edit Recurring Rule' : 'New Recurring Payment'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-[#202020]/20 hover:border-[#202020] text-[#202020] dark:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-[#FFAB83]/20 border-2 border-[#202020] text-[#202020] dark:text-white text-xs font-medium shadow-[1.5px_1.5px_0px_#202020]">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Service / Bill Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Netflix, Apartment Rent, Broadband, Salary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-sm font-medium text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Amount ({currencyConfig.symbol})
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="649"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-sm font-serif font-bold text-[#202020] dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs sm:text-sm font-medium text-[#202020] dark:text-white focus:outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Account
              </label>
              <select
                required
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs text-[#202020] dark:text-white font-medium focus:outline-none"
              >
                {accounts
                  .filter((a) => !a.isArchived)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs text-[#202020] dark:text-white font-medium focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Next Due Date
              </label>
              <input
                type="date"
                required
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs sm:text-sm font-medium text-[#202020] dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs sm:text-sm font-medium text-[#202020] dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t-2 border-[#202020]/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-[#626262] dark:text-slate-400 font-bold text-sm hover:text-[#202020] dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#ADE0BB] hover:bg-[#9CD3AA] text-[#202020] text-sm font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : editRule ? 'Update Rule' : 'Save Recurring Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
