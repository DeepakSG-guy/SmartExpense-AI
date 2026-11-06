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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#202020]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#1E1E22] w-full max-w-md rounded-3xl shadow-2xl border-2 border-[#202020] shadow-[3.5px_3.5px_0px_#202020] overflow-hidden my-auto">
        <div className="px-6 py-4 border-b-2 border-[#202020]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFDB8A] border-2 border-[#202020] text-[#202020] flex items-center justify-center shadow-[1.5px_1.5px_0px_#202020]">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-serif font-bold text-[#202020] dark:text-white">
              {editAccount ? 'Edit Account' : 'Add Financial Account'}
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
              Account Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Salary Account, GPay, ICICI Credit Card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-sm font-medium text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
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
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-bold transition-all text-left ${
                    type === t.type
                      ? 'border-[#202020] bg-[#FFDB8A] text-[#202020] shadow-[1.5px_1.5px_0px_#202020]'
                      : 'border-[#202020]/30 bg-[#FBF9F2] dark:bg-[#141416] text-[#626262] dark:text-slate-300 hover:border-[#202020]'
                  }`}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-[#202020]"
                    style={{ backgroundColor: t.defaultColor }}
                  />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Opening Balance ({currencyConfig.symbol})
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="0.00"
              value={initialBalanceInput}
              onChange={(e) => setInitialBalanceInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-lg font-serif font-bold text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-[#626262] dark:text-slate-400">
              For credit cards, enter current outstanding balance as negative or zero.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Color Accent
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-xl border-2 transition-transform ${
                    color === c ? 'scale-110 border-[#202020] shadow-[1px_1px_0px_#202020]' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Masked Info / Identifier (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. •••• 4812 or upi@oksbi"
              value={accountNumberMasked}
              onChange={(e) => setAccountNumberMasked(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs sm:text-sm text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none"
            />
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
              {isSubmitting ? 'Saving...' : editAccount ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
