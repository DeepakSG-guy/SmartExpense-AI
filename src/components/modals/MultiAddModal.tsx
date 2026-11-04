import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import type { TransactionType } from '../../types/finance';
import { toMinorUnits, SUPPORTED_CURRENCIES } from '../../types/finance';
import { X, Plus, Trash2, ListPlus } from 'lucide-react';

interface MultiAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DraftRow {
  id: string;
  title: string;
  amount: string;
  type: TransactionType;
  categoryId: string;
  fromAccountId: string;
  date: string;
}

export const MultiAddModal: React.FC<MultiAddModalProps> = ({ isOpen, onClose }) => {
  const { categories, accounts, settings, bulkAddTransactions } = useFinance();
  const currencyConfig = SUPPORTED_CURRENCIES[settings.currency] || SUPPORTED_CURRENCIES.INR;

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultAccId = accounts.find((a) => !a.isArchived)?.id || '';
  const defaultCatId = categories.find((c) => c.type === 'expense')?.id || '';

  const createInitialRow = (): DraftRow => ({
    id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: '',
    amount: '',
    type: 'expense',
    categoryId: defaultCatId,
    fromAccountId: defaultAccId,
    date: todayStr,
  });

  const [rows, setRows] = useState<DraftRow[]>([
    createInitialRow(),
    createInitialRow(),
    createInitialRow(),
  ]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const updateRow = (id: string, field: keyof DraftRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, createInitialRow()]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Filter filled rows
    const filled = rows.filter((r) => r.title.trim() && parseFloat(r.amount) > 0);
    if (filled.length === 0) {
      setErrorMsg('Please enter at least one transaction with description and amount.');
      return;
    }

    const payload = filled.map((r) => ({
      title: r.title.trim(),
      amount: toMinorUnits(parseFloat(r.amount), currencyConfig.minorUnitDigits),
      type: r.type,
      categoryId: r.categoryId,
      fromAccountId: r.fromAccountId,
      date: r.date,
      paymentMethod: 'UPI',
    }));

    setIsSubmitting(true);
    try {
      await bulkAddTransactions(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save transactions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ListPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Quick Multi-Add Ledger
              </h2>
              <p className="text-xs text-slate-500">Record several expenses at once</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2.5">
            {rows.map((row, idx) => (
              <div
                key={row.id}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <span className="hidden sm:inline-block font-mono text-slate-400 w-4 text-center">
                  {idx + 1}
                </span>

                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />

                <input
                  type="text"
                  placeholder="Merchant / Item name"
                  value={row.title}
                  onChange={(e) => updateRow(row.id, 'title', e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />

                <div className="flex items-center gap-2">
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                      {currencyConfig.symbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={row.amount}
                      onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <select
                    value={row.categoryId}
                    onChange={(e) => updateRow(row.id, 'categoryId', e.target.value)}
                    className="w-32 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    {categories
                      .filter((c) => c.type === row.type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>

                  <select
                    value={row.fromAccountId}
                    onChange={(e) => updateRow(row.id, 'fromAccountId', e.target.value)}
                    className="w-28 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs truncate"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline pt-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add another row</span>
          </button>

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
              {isSubmitting ? 'Saving Batch...' : 'Save All Transactions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
