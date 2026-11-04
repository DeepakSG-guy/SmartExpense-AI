import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import type { SavingsGoal } from '../../types/finance';
import { toMinorUnits, formatMoney, SUPPORTED_CURRENCIES } from '../../types/finance';
import { X, PlusCircle, MinusCircle, Wallet } from 'lucide-react';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
}

export const ContributionModal: React.FC<ContributionModalProps> = ({
  isOpen,
  onClose,
  goal,
}) => {
  const { addContribution, accounts, settings } = useFinance();
  const currencyConfig = SUPPORTED_CURRENCIES[settings.currency] || SUPPORTED_CURRENCIES.INR;

  const [mode, setMode] = useState<'add' | 'withdraw'>('add');
  const [amountInput, setAmountInput] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setAmountInput('');
      setMode('add');
      setLinkedAccountId('');
      setNotes('');
    }
  }, [isOpen, goal]);

  if (!isOpen || !goal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amountInput);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMsg('Please enter a positive numeric contribution amount.');
      return;
    }

    const minorUnits = toMinorUnits(parsed, currencyConfig.minorUnitDigits);
    const finalAmount = mode === 'withdraw' ? -minorUnits : minorUnits;

    setIsSubmitting(true);
    try {
      await addContribution(
        goal.id,
        finalAmount,
        notes.trim() || (mode === 'add' ? 'Savings Contribution' : 'Savings Withdrawal'),
        linkedAccountId || undefined
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update goal contribution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {mode === 'add' ? 'Contribute to Goal' : 'Withdraw from Goal'}
            </h2>
            <p className="text-xs text-slate-500 truncate max-w-[240px]">{goal.name}</p>
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

          {/* Mode Switch: Add vs Withdraw */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'add'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setMode('withdraw')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'withdraw'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <MinusCircle className="w-3.5 h-3.5" />
              Withdraw
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Amount ({currencyConfig.symbol})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                {currencyConfig.symbol}
              </span>
              <input
                type="number"
                step="any"
                min="1"
                required
                autoFocus
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xl font-bold text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Link with Financial Account (Optional)
            </label>
            <select
              value={linkedAccountId}
              onChange={(e) => setLinkedAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">No linked transaction (Track goal independently)</option>
              {accounts
                .filter((a) => !a.isArchived)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    Record expense on: {acc.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Note
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly transfer, Festival bonus"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 ${
                mode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-500 hover:bg-rose-600'
              }`}
            >
              {isSubmitting ? 'Recording...' : mode === 'add' ? 'Record Deposit' : 'Record Withdrawal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
