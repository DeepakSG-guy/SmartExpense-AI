import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import type { Transaction, TransactionType } from '../../types/finance';
import { toMinorUnits, fromMinorUnits, SUPPORTED_CURRENCIES } from '../../types/finance';
import { aiService } from '../../services/aiService';
import { IconRenderer } from '../common/IconRenderer';
import { AmountKeypad } from '../common/AmountKeypad';
import {
  X,
  Sparkles,
  ArrowRightLeft,
  Calendar,
  Clock,
  Tag,
  FileText,
  CreditCard,
  Building2,
  Wallet,
  Smartphone,
  Check,
  Camera,
  Keyboard,
  Grid3X3,
} from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTransaction?: Transaction | null;
  initialData?: Partial<Transaction>;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  editTransaction,
  initialData,
}) => {
  const {
    accounts,
    categories,
    settings,
    addTransaction,
    updateTransaction,
    showToast,
  } = useFinance();

  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [toTime, setToTime] = useState(new Date().toTimeString().substring(0, 5));
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>();

  // Mode: Keypad (mobile-first / Murad Hossain reference) vs Detailed Form
  const [inputMode, setInputMode] = useState<'keypad' | 'form'>('keypad');
  const [showExtendedFields, setShowExtendedFields] = useState(false);

  // AI Auto-suggestion
  const [suggestedCategory, setSuggestedCategory] = useState<{
    name: string;
    catId: string;
    confidence: number;
    explanation?: string;
  } | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencyConfig = SUPPORTED_CURRENCIES[settings.currency] || SUPPORTED_CURRENCIES.INR;

  // Initialize fields on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuggestedCategory(null);

      if (editTransaction) {
        setType(editTransaction.type);
        setTitle(editTransaction.title);
        setAmountInput(fromMinorUnits(editTransaction.amount, currencyConfig.minorUnitDigits).toString());
        setCategoryId(editTransaction.categoryId || '');
        setFromAccountId(editTransaction.fromAccountId || '');
        setToDate(editTransaction.date);
        setToTime(editTransaction.time || new Date().toTimeString().substring(0, 5));
        setPaymentMethod(editTransaction.paymentMethod || 'UPI');
        setNotes(editTransaction.notes || '');
        setTagsInput((editTransaction.tags || []).join(', '));
        setReceiptUrl(editTransaction.receiptUrl);
        setInputMode('form'); // When editing, default to form mode
      } else {
        setType(initialData?.type || 'expense');
        setTitle(initialData?.title || '');
        setAmountInput(
          initialData?.amount
            ? fromMinorUnits(initialData.amount, currencyConfig.minorUnitDigits).toString()
            : ''
        );
        setCategoryId(initialData?.categoryId || '');

        const defaultAcc = accounts.find((a) => !a.isArchived);
        setFromAccountId(initialData?.fromAccountId || defaultAcc?.id || '');
        setToDate(new Date().toISOString().split('T')[0]);
        setToTime(new Date().toTimeString().substring(0, 5));
        setPaymentMethod('UPI');
        setNotes('');
        setTagsInput('');
        setReceiptUrl(undefined);
        // Default to keypad mode on smaller devices, form on large desktops
        setInputMode(window.innerWidth < 768 ? 'keypad' : 'form');
      }
    }
  }, [isOpen, editTransaction, initialData, accounts, currencyConfig.minorUnitDigits]);

  // AI Category Auto-categorization when title changes
  useEffect(() => {
    if (!title.trim() || title.length < 3 || categoryId) return;

    const timer = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const suggestion = await aiService.categorizeTransaction(title, categories);
        if (suggestion && !categoryId) {
          const matched = categories.find((c) => c.name.toLowerCase() === suggestion.category.toLowerCase()) || categories[0];
          if (matched) {
            setSuggestedCategory({
              name: matched.name,
              catId: matched.id,
              confidence: suggestion.confidence,
              explanation: suggestion.explanation,
            });
          }
        }
      } catch (err) {
        // Silently ignore AI prediction failure
      } finally {
        setIsSuggesting(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [title, categoryId, categories]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);
  const activeAccount = accounts.find((a) => a.id === fromAccountId) || accounts[0];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    const finalTitle = title.trim() || (type === 'expense' ? 'General Expense' : 'Income Deposit');
    if (!fromAccountId && accounts.length > 0) {
      setErrorMsg('Please select an account.');
      return;
    }

    const minorAmount = toMinorUnits(parsedAmount, currencyConfig.minorUnitDigits);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      if (editTransaction) {
        await updateTransaction(editTransaction.id, {
          title: finalTitle,
          amount: minorAmount,
          type,
          categoryId: categoryId || undefined,
          fromAccountId: fromAccountId || undefined,
          date: toDate,
          time: toTime,
          paymentMethod,
          notes: notes.trim() || undefined,
          tags,
          receiptUrl,
        });
        showToast({ type: 'success', message: 'Transaction updated successfully.' });
      } else {
        await addTransaction({
          title: finalTitle,
          amount: minorAmount,
          type,
          categoryId: categoryId || '',
          fromAccountId,
          date: toDate,
          time: toTime,
          paymentMethod,
          notes: notes.trim() || undefined,
          tags,
          receiptUrl,
        });
        showToast({
          type: 'success',
          message: `${type === 'income' ? 'Income' : 'Expense'} of ${currencyConfig.symbol}${parsedAmount.toLocaleString()} recorded!`,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save transaction.');
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
        className="w-full max-w-lg bg-[#FAF7EE] dark:bg-[#18181D] rounded-3xl border-2 border-[#202020] dark:border-slate-700 shadow-[4px_4px_0px_#202020] dark:shadow-[3px_3px_0px_#0A0A0C] overflow-hidden my-auto transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-[1.5px] border-[#202020]/15 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
              {editTransaction ? 'Edit Transaction' : type === 'expense' ? 'New Expense' : 'New Income'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle between Keypad and Standard Form */}
            <button
              type="button"
              onClick={() => setInputMode(inputMode === 'keypad' ? 'form' : 'keypad')}
              title={`Switch to ${inputMode === 'keypad' ? 'Standard Form' : 'Tactile Keypad'}`}
              className="p-1.5 rounded-xl border-[1.5px] border-[#202020] bg-white dark:bg-[#25252D] text-[#202020] dark:text-white shadow-[1px_1px_0px_#202020] hover:bg-[#F8F5EC] cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              {inputMode === 'keypad' ? (
                <>
                  <Keyboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Form</span>
                </>
              ) : (
                <>
                  <Grid3X3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keypad</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border-[1.5px] border-[#202020] bg-white dark:bg-[#25252D] text-[#202020] dark:text-white shadow-[1px_1px_0px_#202020] hover:bg-[#F8F5EC] cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Expense vs Income Type Segmented Control */}
        <div className="p-4 bg-white dark:bg-[#1E1E23] border-b-[1.5px] border-[#202020]/15 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#F6F4EB] dark:bg-[#141416] border-[1.5px] border-[#202020]">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-[#FFAB83] text-[#202020] border-[1.5px] border-[#202020] shadow-[1.5px_1.5px_0px_#202020]'
                  : 'text-[#626262] dark:text-slate-400 hover:text-[#202020]'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-[#ADE0BB] text-[#202020] border-[1.5px] border-[#202020] shadow-[1.5px_1.5px_0px_#202020]'
                  : 'text-[#626262] dark:text-slate-400 hover:text-[#202020]'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-[#FFAB83]/40 border-[1.5px] border-[#202020] text-xs font-bold text-[#202020]">
            {errorMsg}
          </div>
        )}

        {/* Mode 1: Tactile Keypad Mode (Direct Murad Hossain Reference Implementation) */}
        {inputMode === 'keypad' ? (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Quick Description Input */}
            <div>
              <input
                type="text"
                placeholder={type === 'expense' ? 'What was this for? (e.g. Swiggy, Coffee, Rent)' : 'Income source (e.g. Salary, Client payment)'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full py-2.5 px-3.5 rounded-xl border-[1.5px] border-[#202020] dark:border-slate-700 bg-white dark:bg-[#1E1E23] text-sm font-bold text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
              />
            </div>

            {/* AI Suggested Category Chip */}
            {suggestedCategory && (
              <div className="p-2.5 rounded-xl bg-[#CFB0E8]/40 border border-[#202020] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#202020]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Suggested: {suggestedCategory.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId(suggestedCategory.catId);
                    setSuggestedCategory(null);
                  }}
                  className="px-2 py-0.5 rounded-md bg-white border border-[#202020] font-bold text-[#202020] shadow-[1px_1px_0px_#202020]"
                >
                  Apply
                </button>
              </div>
            )}

            {/* Category Quick Selector Chips */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1.5">
                Category
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {filteredCategories.slice(0, 8).map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl border-[1.5px] border-[#202020] text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFDB8A] text-[#202020] shadow-[1.5px_1.5px_0px_#202020]'
                          : 'bg-white dark:bg-[#1E1E23] text-[#202020] dark:text-white hover:bg-[#F8F5EC]'
                      }`}
                    >
                      <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Keypad Component */}
            <AmountKeypad
              amount={amountInput}
              onChange={setAmountInput}
              currencySymbol={currencyConfig.symbol}
              availableBalanceText={activeAccount ? `Account: ${activeAccount.name} (${currencyConfig.symbol}${fromMinorUnits(activeAccount.initialBalance).toLocaleString()})` : undefined}
              accountName={activeAccount?.name || 'Primary Bank'}
              accountSubtitle={activeAccount?.type.toUpperCase()}
              onChangeAccount={() => {
                const nextIdx = (accounts.findIndex((a) => a.id === fromAccountId) + 1) % accounts.length;
                setFromAccountId(accounts[nextIdx]?.id || '');
              }}
              onConfirm={() => handleSubmit()}
              confirmLabel={editTransaction ? 'Update Transaction' : type === 'expense' ? 'Save Expense' : 'Save Income'}
              isSubmitting={isSubmitting}
            />

            {/* Expander link for extended options */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setInputMode('form')}
                className="text-xs font-bold text-[#626262] dark:text-slate-400 hover:text-[#202020] dark:hover:text-white underline cursor-pointer"
              >
                Add Notes, Date, Receipt photo, or Tags →
              </button>
            </div>
          </div>
        ) : (
          /* Mode 2: Standard Detailed Form */
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            {/* Amount & Currency */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                Amount ({currencyConfig.code})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-serif text-lg font-bold text-[#626262]">
                  {currencyConfig.symbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full py-3 pl-9 pr-4 rounded-xl border-[1.5px] border-[#202020] dark:border-slate-700 bg-white dark:bg-[#1E1E23] text-lg font-bold font-serif text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
                />
              </div>
            </div>

            {/* Description / Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                Description / Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Swiggy food delivery, Grocery, Rent"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full py-2.5 px-3.5 rounded-xl border-[1.5px] border-[#202020] dark:border-slate-700 bg-white dark:bg-[#1E1E23] text-sm font-bold text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
              />
            </div>

            {/* Category & Account Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border-[1.5px] border-[#202020] dark:border-slate-700 bg-white dark:bg-[#1E1E23] text-xs font-bold text-[#202020] dark:text-white"
                >
                  <option value="">Select Category</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                  Account / Wallet
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border-[1.5px] border-[#202020] dark:border-slate-700 bg-white dark:bg-[#1E1E23] text-xs font-bold text-[#202020] dark:text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border-[1.5px] border-[#202020] dark:border-slate-700 bg-white dark:bg-[#1E1E23] text-xs font-bold text-[#202020] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border-[1.5px] border-[#202020] dark:border-slate-700 bg-white dark:bg-[#1E1E23] text-xs font-bold text-[#202020] dark:text-white"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                Payment Method
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['UPI', 'Cash', 'Card', 'Bank'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-2 rounded-xl border-[1.5px] border-[#202020] text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-[#FFDB8A] text-[#202020] shadow-[1.5px_1.5px_0px_#202020]'
                        : 'bg-white dark:bg-[#1E1E23] text-[#626262] dark:text-slate-300 hover:bg-[#F8F5EC]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes & Tags */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border-[1.5px] border-[#202020] dark:border-slate-700 bg-white dark:bg-[#1E1E23] text-xs font-medium text-[#202020] dark:text-white"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] shadow-[3px_3px_0px_#202020] font-bold text-base text-[#202020] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : editTransaction ? 'Update Transaction' : 'Save Transaction'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
