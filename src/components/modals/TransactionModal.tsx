import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import type { Transaction, TransactionType } from '../../types/finance';
import { toMinorUnits, fromMinorUnits, SUPPORTED_CURRENCIES } from '../../types/finance';
import { aiService } from '../../services/aiService';
import { IconRenderer } from '../common/IconRenderer';
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
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().substring(0, 5));
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>();

  // AI Category Auto-suggestion
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

  // Populate fields on open or change
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
        setToAccountId(editTransaction.toAccountId || '');
        setDate(editTransaction.date);
        setTime(editTransaction.time || new Date().toTimeString().substring(0, 5));
        setPaymentMethod(editTransaction.paymentMethod || 'UPI');
        setNotes(editTransaction.notes || '');
        setTagsInput((editTransaction.tags || []).join(', '));
        setReceiptUrl(editTransaction.receiptUrl);
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
        setToAccountId(initialData?.toAccountId || '');
        setDate(initialData?.date || new Date().toISOString().split('T')[0]);
        setTime(new Date().toTimeString().substring(0, 5));
        setPaymentMethod(initialData?.paymentMethod || 'UPI');
        setNotes(initialData?.notes || '');
        setTagsInput((initialData?.tags || []).join(', '));
        setReceiptUrl(initialData?.receiptUrl);
      }
    }
  }, [isOpen, editTransaction, initialData, accounts, currencyConfig.minorUnitDigits]);

  // AI / Rule Category Suggestion trigger when user types title
  useEffect(() => {
    if (!title || title.trim().length < 3 || type === 'transfer') {
      setSuggestedCategory(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSuggesting(true);
      const parsedAmt = parseFloat(amountInput) || 0;
      const res = await aiService.suggestCategory(title, parsedAmt, type, categories);
      if (res && res.category) {
        const matchingCat = categories.find(
          (c) => c.name.toLowerCase() === res.category.toLowerCase() && c.type === type
        );
        if (matchingCat && matchingCat.id !== categoryId) {
          setSuggestedCategory({
            name: matchingCat.name,
            catId: matchingCat.id,
            confidence: res.confidence,
            explanation: res.explanation,
          });
        }
      }
      setIsSuggesting(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [title, type, amountInput, categories, categoryId]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);
  const activeAccounts = accounts.filter((a) => !a.isArchived);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid positive amount.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Description / Merchant name is required.');
      return;
    }

    if (!fromAccountId) {
      setErrorMsg('Please select an account.');
      return;
    }

    if (type === 'transfer') {
      if (!toAccountId) {
        setErrorMsg('Please select a destination account for the transfer.');
        return;
      }
      if (toAccountId === fromAccountId) {
        setErrorMsg('Source and Destination accounts must be different.');
        return;
      }
    } else {
      if (!categoryId) {
        setErrorMsg('Please choose a category.');
        return;
      }
    }

    const minorUnits = toMinorUnits(parsedAmount, currencyConfig.minorUnitDigits);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    setIsSubmitting(true);
    try {
      if (editTransaction) {
        await updateTransaction(editTransaction.id, {
          title: title.trim(),
          amount: minorUnits,
          type,
          categoryId: type === 'transfer' ? '' : categoryId,
          fromAccountId,
          toAccountId: type === 'transfer' ? toAccountId : undefined,
          date,
          time,
          paymentMethod,
          notes: notes.trim(),
          tags,
          receiptUrl,
        });
      } else {
        await addTransaction({
          title: title.trim(),
          amount: minorUnits,
          type,
          categoryId: type === 'transfer' ? '' : categoryId,
          fromAccountId,
          toAccountId: type === 'transfer' ? toAccountId : undefined,
          date,
          time,
          paymentMethod,
          notes: notes.trim(),
          tags,
          receiptUrl,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {editTransaction ? 'Edit Transaction' : 'Record Transaction'}
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

        {/* Transaction Type Segmented Switch */}
        <div className="p-4 sm:p-5 pb-0">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategoryId('');
              }}
              className={`py-2 rounded-lg transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Expense (-)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategoryId('');
              }}
              className={`py-2 rounded-lg transition-all ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Income (+)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('transfer');
                setCategoryId('');
              }}
              className={`py-2 rounded-lg transition-all ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Transfer (⇄)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900">
              {errorMsg}
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Amount ({currencyConfig.code})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
                {currencyConfig.symbol}
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                autoFocus={!editTransaction}
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-2xl font-bold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Description / Merchant */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {type === 'transfer' ? 'Transfer Description' : 'Merchant / Description'}
            </label>
            <input
              type="text"
              required
              placeholder={
                type === 'expense'
                  ? 'e.g. Swiggy, Uber ride, Reliance Smart, Netflix'
                  : type === 'income'
                  ? 'e.g. TechCorp Salary, Client Project, Dividend'
                  : 'e.g. Transfer to UPI wallet, Credit card repayment'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {/* Smart Category Suggestion Badge */}
            {suggestedCategory && type !== 'transfer' && (
              <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Suggested Category: <strong>{suggestedCategory.name}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId(suggestedCategory.catId);
                    setSuggestedCategory(null);
                  }}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Category Selector (Expense & Income) */}
          {type !== 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs font-medium transition-all ${
                      categoryId === cat.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-100 dark:border-slate-750'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: categoryId === cat.id ? 'rgba(255,255,255,0.2)' : cat.color,
                        color: '#fff',
                      }}
                    >
                      <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Accounts Grid: From & To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {type === 'transfer' ? 'From Account' : 'Account'}
              </label>
              <select
                required
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="" disabled>
                  Select Account
                </option>
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  To Account
                </label>
                <select
                  required
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="" disabled>
                    Destination Account
                  </option>
                  {activeAccounts
                    .filter((a) => a.id !== fromAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type.toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {type !== 'transfer' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="NetBanking">Net Banking</option>
                  <option value="Cash">Cash</option>
                  <option value="AutoDebit">Auto-Debit / ECS</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Optional Tags & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="e.g. food, friends, work"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Notes
              </label>
              <input
                type="text"
                placeholder="Optional notes or memo"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting
                ? 'Saving...'
                : editTransaction
                ? 'Update Record'
                : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
