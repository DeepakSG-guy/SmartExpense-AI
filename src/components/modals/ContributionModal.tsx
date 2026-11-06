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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#202020]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#1E1E22] w-full max-w-sm rounded-3xl shadow-2xl border-2 border-[#202020] shadow-[3.5px_3.5px_0px_#202020] overflow-hidden my-auto">
        <div className="px-6 py-4 border-b-2 border-[#202020]/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#202020] dark:text-white">
              {mode === 'add' ? 'Contribute to Goal' : 'Withdraw from Goal'}
            </h2>
            <p className="text-xs text-[#626262] dark:text-slate-400 font-medium truncate max-w-[240px]">{goal.name}</p>
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

          {/* Mode Switch: Add vs Withdraw */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                mode === 'add'
                  ? 'bg-[#ADE0BB] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                  : 'text-[#626262] dark:text-slate-400'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setMode('withdraw')}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                mode === 'withdraw'
                  ? 'bg-[#FFAB83] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                  : 'text-[#626262] dark:text-slate-400'
              }`}
            >
              <MinusCircle className="w-3.5 h-3.5" />
              Withdraw
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Amount ({currencyConfig.symbol})
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-serif font-bold text-[#202020]">
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
                className="w-full pl-10 pr-4 py-3 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-2xl text-2xl font-serif font-bold text-[#202020] dark:text-white placeholder-[#626262]/30 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Link with Financial Account (Optional)
            </label>
            <select
              value={linkedAccountId}
              onChange={(e) => setLinkedAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs font-medium text-[#202020] dark:text-white focus:outline-none"
            >
              <option value="">No linked transaction (Track goal independently)</option>
              {accounts
                .filter((a) => !a.isArchived)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    Record on: {acc.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Note
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly transfer, Festival bonus"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs font-medium text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t-2 border-[#202020]/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-[#626262] dark:text-slate-400 font-bold text-xs hover:text-[#202020] dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-[#202020] text-xs font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 cursor-pointer ${
                mode === 'add' ? 'bg-[#ADE0BB] hover:bg-[#9CD3AA]' : 'bg-[#FFAB83] hover:bg-[#F69C72]'
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
