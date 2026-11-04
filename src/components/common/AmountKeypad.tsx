import React from 'react';
import { Delete, ArrowRight, Wallet } from 'lucide-react';

interface AmountKeypadProps {
  amount: string;
  onChange: (value: string) => void;
  currencySymbol: string;
  availableBalanceText?: string;
  accountName?: string;
  accountSubtitle?: string;
  onChangeAccount?: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  isSubmitting?: boolean;
}

export const AmountKeypad: React.FC<AmountKeypadProps> = ({
  amount,
  onChange,
  currencySymbol,
  availableBalanceText,
  accountName,
  accountSubtitle,
  onChangeAccount,
  onConfirm,
  confirmLabel = 'Send',
  isSubmitting = false,
}) => {
  const handleDigit = (digit: string) => {
    if (amount.length >= 10) return; // prevent overflow

    // If typing decimal
    if (digit === '.') {
      if (amount.includes('.')) return;
      if (!amount || amount === '0') {
        onChange('0.');
        return;
      }
      onChange(amount + '.');
      return;
    }

    // If zero is pressed when empty or already "0"
    if (digit === '0' && (!amount || amount === '0')) {
      onChange('0');
      return;
    }

    // If decimal already exists, max 2 decimals
    if (amount.includes('.')) {
      const parts = amount.split('.');
      if (parts[1] && parts[1].length >= 2) return;
    }

    // Replace initial solo "0" if non-decimal is pressed
    if (amount === '0') {
      onChange(digit);
      return;
    }

    onChange(amount + digit);
  };

  const handleBackspace = () => {
    if (!amount || amount.length <= 1) {
      onChange('');
      return;
    }
    onChange(amount.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'];

  const numericValue = parseFloat(amount || '0');
  const isValidAmount = !isNaN(numericValue) && numericValue > 0;

  return (
    <div className="flex flex-col space-y-4 w-full max-w-sm mx-auto">
      {/* Account Info Pill if provided */}
      {accountName && (
        <div className="p-3 rounded-2xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[2px_2px_0px_#202020] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#ADE0BB] border-[1.5px] border-[#202020] flex items-center justify-center text-[#202020] flex-shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#202020] dark:text-white truncate">
                {accountName}
              </div>
              {accountSubtitle && (
                <div className="text-[11px] text-[#626262] dark:text-slate-400 truncate">
                  {accountSubtitle}
                </div>
              )}
            </div>
          </div>
          {onChangeAccount && (
            <button
              type="button"
              onClick={onChangeAccount}
              className="px-2.5 py-1 text-xs font-bold text-[#E25C38] dark:text-[#FFA07A] hover:underline cursor-pointer"
            >
              Change
            </button>
          )}
        </div>
      )}

      {/* Large Amount Display Container */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[2.5px_2.5px_0px_#202020] text-center">
        <div className="flex items-baseline justify-center gap-1.5 overflow-hidden">
          <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#626262] dark:text-slate-400">
            {currencySymbol}
          </span>
          <span className="font-serif text-4xl sm:text-5xl font-bold text-[#202020] dark:text-white tracking-tight tabular-nums">
            {amount ? amount : '0.00'}
          </span>
        </div>
        {availableBalanceText && (
          <div className="text-xs font-medium text-[#626262] dark:text-slate-400 mt-1">
            {availableBalanceText}
          </div>
        )}
      </div>

      {/* 3x4 Tactile Keypad */}
      <div className="p-3 rounded-2xl bg-[#F6F4EB] dark:bg-[#18181D] border-[1.5px] border-[#202020] dark:border-slate-700 shadow-[2.5px_2.5px_0px_#202020]">
        <div className="grid grid-cols-3 gap-2.5">
          {keys.map((key) => {
            if (key === 'delete') {
              return (
                <button
                  key="del"
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Backspace"
                  className="keypad-btn text-[#202020] dark:text-white"
                >
                  <Delete className="w-5 h-5" />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleDigit(key)}
                className="keypad-btn"
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Action Button (Murad Hossain pastel yellow Send button) */}
      <button
        type="button"
        disabled={!isValidAmount || isSubmitting}
        onClick={onConfirm}
        className={`w-full py-3.5 px-4 rounded-2xl border-2 border-[#202020] dark:border-slate-700 shadow-[3px_3px_0px_#202020] font-bold text-base text-[#202020] transition-all flex items-center justify-center gap-2 cursor-pointer ${
          isValidAmount && !isSubmitting
            ? 'bg-[#FFDB8A] hover:bg-[#FFE099] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none'
            : 'bg-[#FFDB8A]/50 text-[#202020]/40 cursor-not-allowed shadow-[1px_1px_0px_#202020]'
        }`}
      >
        <span>{isSubmitting ? 'Saving...' : confirmLabel}</span>
        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
};
