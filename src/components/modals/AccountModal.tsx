import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import type { Account, AccountType } from '../../types/finance';
import { toMinorUnits, fromMinorUnits, SUPPORTED_CURRENCIES } from '../../types/finance';
import { X, Building2, CreditCard, Wallet, Smartphone, ShieldCheck, Coins } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  editAccount?: Account | null;
}

const ACCOUNT_TYPES: Array<{ type: AccountType; label: string; icon: string; defaultColor: string }> = [
  { type: 'bank', label: 'Bank Account', icon: 'Building2', defaultColor: '#0284C7' },
  { type: 'upi', label: 'UPI Wallet (GPay/Paytm)', icon: 'Smartphone', defaultColor: '#10B981' },
  { type: 'credit', label: 'Credit Card', icon: 'CreditCard', defaultColor: '#8B5CF6' },
  { type: 'cash', label: 'Cash Wallet', icon: 'Banknote', defaultColor: '#F59E0B' },
  { type: 'savings', label: 'Savings & Deposit', icon: 'ShieldCheck', defaultColor: '#059669' },
  { type: 'other', label: 'Other Account', icon: 'Coins', defaultColor: '#64748B' },
];

const PRESET_COLORS = [
  '#0284C7', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#6366F1', '#14B8A6', '#64748B'
];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  editAccount,
}) => {
  const { addAccount, updateAccount, settings } = useFinance();
  const currencyConfig = SUPPORTED_CURRENCIES[settings.currency] || SUPPORTED_CURRENCIES.INR;

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [initialBalanceInput, setInitialBalanceInput] = useState('');
  const [color, setColor] = useState('#0284C7');
  const [accountNumberMasked, setAccountNumberMasked] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (editAccount) {
        setName(editAccount.name);
        setType(editAccount.type);
        setInitialBalanceInput(fromMinorUnits(editAccount.initialBalance, currencyConfig.minorUnitDigits).toString());
        setColor(editAccount.color);
        setAccountNumberMasked(editAccount.accountNumberMasked || '');
        setNotes(editAccount.notes || '');
      } else {
        setName('');
        setType('bank');
        setInitialBalanceInput('0');
        setColor('#0284C7');
        setAccountNumberMasked('');
        setNotes('');
      }
    }
  }, [isOpen, editAccount, currencyConfig.minorUnitDigits]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter an account name.');
      return;
    }

    const parsedBalance = parseFloat(initialBalanceInput);
    if (isNaN(parsedBalance)) {
      setErrorMsg('Please enter a valid numeric opening balance.');
      return;
    }

    const balanceMinor = toMinorUnits(parsedBalance, currencyConfig.minorUnitDigits);
    const selectedTypeConfig = ACCOUNT_TYPES.find((t) => t.type === type);

    setIsSubmitting(true);
    try {
      if (editAccount) {
        await updateAccount(editAccount.id, {
          name: name.trim(),
          type,
          initialBalance: balanceMinor,
          color,
          accountNumberMasked: accountNumberMasked.trim(),
          notes: notes.trim(),
        });
      } else {
        await addAccount({
          name: name.trim(),
          type,
          initialBalance: balanceMinor,
          currency: settings.currency,
          color,
          icon: selectedTypeConfig?.icon || 'Wallet',
          accountNumberMasked: accountNumberMasked.trim(),
          isArchived: false,
          notes: notes.trim(),
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {editAccount ? 'Edit Account' : 'Add Financial Account'}
          </h2>
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
              Account Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Salary Account, GPay, ICICI Credit Card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => {
                    setType(t.type);
                    if (!editAccount) setColor(t.defaultColor);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                    type === t.type
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.defaultColor }}
                  />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Opening Balance ({currencyConfig.symbol})
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="0.00"
              value={initialBalanceInput}
              onChange={(e) => setInitialBalanceInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              For credit cards, enter current outstanding balance as negative or zero.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Color Accent
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-110 border-slate-900 dark:border-white shadow-sm' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Masked Info / Identifier (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. •••• 4812 or upi@oksbi"
              value={accountNumberMasked}
              onChange={(e) => setAccountNumberMasked(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
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
              {isSubmitting ? 'Saving...' : editAccount ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
