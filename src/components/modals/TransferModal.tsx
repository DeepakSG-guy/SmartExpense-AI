import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { toMinorUnits, SUPPORTED_CURRENCIES } from '../../types/finance';
import { X, ArrowRight, ArrowRightLeft } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSourceAccountId?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  defaultSourceAccountId,
}) => {
  const { accounts, settings, transferMoney, showToast } = useFinance();
  const currencyConfig = SUPPORTED_CURRENCIES[settings.currency] || SUPPORTED_CURRENCIES.INR;

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeAccounts = accounts.filter((a) => !a.isArchived);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setAmountInput('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);

      if (defaultSourceAccountId) {
        setFromAccountId(defaultSourceAccountId);
        const other = activeAccounts.find((a) => a.id !== defaultSourceAccountId);
        setToAccountId(other ? other.id : '');
      } else if (activeAccounts.length >= 2) {
        setFromAccountId(activeAccounts[0].id);
        setToAccountId(activeAccounts[1].id);
      }
    }
  }, [isOpen, defaultSourceAccountId, activeAccounts]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsed = parseFloat(amountInput);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMsg('Please enter a valid positive transfer amount.');
      return;
    }

    if (!fromAccountId || !toAccountId) {
      setErrorMsg('Please specify both source and destination accounts.');
      return;
    }

    if (fromAccountId === toAccountId) {
      setErrorMsg('Source and destination accounts must be different.');
      return;
    }

    const minorAmount = toMinorUnits(parsed, currencyConfig.minorUnitDigits);

    setIsSubmitting(true);
    try {
      await transferMoney(fromAccountId, toAccountId, minorAmount, date, notes.trim() || undefined);
      showToast({
        type: 'success',
        message: `Transferred ${currencyConfig.symbol}${parsed.toLocaleString()} successfully!`,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete transfer.');
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
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
              Transfer Funds
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
              Amount to Transfer
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-serif text-lg font-bold text-[#626262]">
                {currencyConfig.symbol}
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl font-serif text-xl font-bold text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                From Account
              </label>
              <select
                required
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs font-bold text-[#202020] dark:text-white"
              >
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                To Account
              </label>
              <select
                required
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs font-bold text-[#202020] dark:text-white"
              >
                {activeAccounts
                  .filter((a) => a.id !== fromAccountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                Transfer Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs font-bold text-[#202020] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                Notes
              </label>
              <input
                type="text"
                placeholder="Optional transfer memo"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs font-medium text-[#202020] dark:text-white"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] shadow-[3px_3px_0px_#202020] font-bold text-sm text-[#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'Transferring...' : 'Execute Transfer'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
