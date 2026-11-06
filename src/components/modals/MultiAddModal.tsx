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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#202020]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#1E1E22] w-full max-w-3xl rounded-3xl shadow-2xl border-2 border-[#202020] shadow-[3.5px_3.5px_0px_#202020] overflow-hidden my-auto flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b-2 border-[#202020]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#ADE0BB] border-2 border-[#202020] text-[#202020] flex items-center justify-center shadow-[1.5px_1.5px_0px_#202020]">
              <ListPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#202020] dark:text-white">
                Quick Multi-Add Ledger
              </h2>
              <p className="text-xs text-[#626262] dark:text-slate-400 font-medium">Record several transactions at once</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-[#202020]/20 hover:border-[#202020] text-[#202020] dark:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-[#FFAB83]/20 border-2 border-[#202020] text-[#202020] dark:text-white text-xs font-medium shadow-[1.5px_1.5px_0px_#202020]">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div
                key={row.id}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 rounded-2xl bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] text-xs"
              >
                <span className="hidden sm:inline-block font-mono font-bold text-[#626262] w-5 text-center">
                  {idx + 1}
                </span>

                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                  className="px-2.5 py-2 bg-white dark:bg-[#1E1E22] border-2 border-[#202020] rounded-xl text-xs font-medium focus:outline-none"
                />

                <input
                  type="text"
                  placeholder="Merchant / Item name"
                  value={row.title}
                  onChange={(e) => updateRow(row.id, 'title', e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-[#1E1E22] border-2 border-[#202020] rounded-xl text-xs font-medium focus:outline-none"
                />

                <div className="flex items-center gap-2">
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#202020] font-serif font-bold text-xs">
                      {currencyConfig.symbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={row.amount}
                      onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                      className="w-full pl-6 pr-2 py-2 bg-white dark:bg-[#1E1E22] border-2 border-[#202020] rounded-xl text-xs font-serif font-bold focus:outline-none"
                    />
                  </div>

                  <select
                    value={row.categoryId}
                    onChange={(e) => updateRow(row.id, 'categoryId', e.target.value)}
                    className="w-32 px-2.5 py-2 bg-white dark:bg-[#1E1E22] border-2 border-[#202020] rounded-xl text-xs font-medium focus:outline-none"
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
                    className="w-28 px-2.5 py-2 bg-white dark:bg-[#1E1E22] border-2 border-[#202020] rounded-xl text-xs font-medium truncate focus:outline-none"
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
                    className="p-1.5 text-[#626262] hover:text-rose-600 disabled:opacity-30 cursor-pointer"
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
            className="flex items-center gap-1.5 text-xs font-bold text-[#202020] dark:text-[#ADE0BB] hover:underline pt-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add another row</span>
          </button>

          <div className="pt-4 border-t-2 border-[#202020]/10 flex items-center justify-end gap-2.5">
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
              className="px-5 py-2.5 rounded-xl bg-[#FFDB8A] hover:bg-[#FCD276] text-[#202020] text-sm font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving Batch...' : 'Save All Transactions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
