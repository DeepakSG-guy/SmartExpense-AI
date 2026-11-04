import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, fromMinorUnits, type Transaction, type TransactionType, type Category, type Account } from '../types/finance';
import { IconRenderer } from '../components/common/IconRenderer';
import { TransactionModal } from '../components/modals/TransactionModal';
import { MultiAddModal } from '../components/modals/MultiAddModal';
import { ReceiptScanModal } from '../components/modals/ReceiptScanModal';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import { exportTransactionsCSV, downloadFile } from '../services/backupService';
import {
  Search,
  Filter,
  Plus,
  ListPlus,
  Camera,
  Download,
  Trash2,
  Edit2,
  Calendar,
  X,
  ArrowUpDown,
  Tag,
  ArrowRightLeft,
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    settings,
    openAddTxModal,
    deleteTransaction,
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Modals
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [isMultiAddOpen, setIsMultiAddOpen] = useState(false);
  const [isReceiptScanOpen, setIsReceiptScanOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Transaction | null>(null);

  const catMap = useMemo(() => new Map<string, Category>(categories.map((c: Category) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map<string, Account>(accounts.map((a: Account) => [a.id, a])), [accounts]);
  const currency = settings.currency;

  // Filter & Search Logic
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();

    let startDate = '';
    let endDate = '';

    if (dateRangeFilter === 'this-month') {
      const monthStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
      const days = new Date(curYear, curMonth + 1, 0).getDate();
      startDate = `${monthStr}-01`;
      endDate = `${monthStr}-${String(days).padStart(2, '0')}`;
    } else if (dateRangeFilter === 'last-month') {
      const prevDate = new Date(curYear, curMonth - 1, 1);
      const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      const days = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
      startDate = `${prevMonthStr}-01`;
      endDate = `${prevMonthStr}-${String(days).padStart(2, '0')}`;
    } else if (dateRangeFilter === 'custom') {
      startDate = customStartDate;
      endDate = customEndDate;
    }

    return transactions.filter((tx) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const cat = catMap.get(tx.categoryId)?.name.toLowerCase() || '';
        const notes = (tx.notes || '').toLowerCase();
        const tags = (tx.tags || []).join(' ').toLowerCase();
        const title = tx.title.toLowerCase();

        const match =
          title.includes(query) || cat.includes(query) || notes.includes(query) || tags.includes(query);
        if (!match) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;

      // Account filter
      if (accountFilter !== 'all' && tx.fromAccountId !== accountFilter && tx.toAccountId !== accountFilter) {
        return false;
      }

      // Date range filter
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });
  }, [
    transactions,
    searchQuery,
    typeFilter,
    categoryFilter,
    accountFilter,
    dateRangeFilter,
    customStartDate,
    customEndDate,
    sortBy,
    catMap,
  ]);

  // Export filtered transactions to CSV
  const handleExportCSV = () => {
    const csv = exportTransactionsCSV(filteredTransactions, categories, accounts);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(csv, `smartexpense-transactions-${dateStr}.csv`, 'text/csv');
  };

  return (
    <div className="space-y-5">
      {/* Action Bar: Search, Filters, Multi-Add, Receipt Scan, Export */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        {/* Top Search & Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by merchant, category, notes, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setIsReceiptScanOpen(true)}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Scan</span>
              <span>Receipt</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMultiAddOpen(true)}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
            >
              <ListPlus className="w-3.5 h-3.5 text-blue-500" />
              <span>Multi-Add</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export</span>
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={() => openAddTxModal()}
              className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Type Filter */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
              <option value="transfer">Transfers Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Account
            </label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Period
            </label>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="amount-desc">Amount (Highest First)</option>
              <option value="amount-asc">Amount (Lowest First)</option>
            </select>
          </div>
        </div>

        {/* Custom date range inputs */}
        {dateRangeFilter === 'custom' && (
          <div className="flex items-center gap-3 pt-2">
            <div>
              <span className="text-[10px] text-slate-400 block">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Ledger Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Summary Bar */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-900 dark:text-white">{filteredTransactions.length}</strong> transactions
          </span>
          <div className="flex items-center gap-3">
            <span>
              Net:{' '}
              <strong className="text-slate-900 dark:text-white">
                {formatMoney(
                  filteredTransactions.reduce((acc, t) => {
                    if (t.type === 'income') return acc + t.amount;
                    if (t.type === 'expense') return acc - t.amount;
                    return acc;
                  }, 0),
                  currency
                )}
              </strong>
            </span>
          </div>
        </div>

        {filteredTransactions.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTransactions.map((tx) => {
              const cat = catMap.get(tx.categoryId);
              const fromAcc = accMap.get(tx.fromAccountId);
              const toAcc = tx.toAccountId ? accMap.get(tx.toAccountId) : null;

              return (
                <div
                  key={tx.id}
                  className="p-3.5 sm:px-5 sm:py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Left: Icon, Details */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-2xs"
                      style={{
                        backgroundColor:
                          tx.type === 'transfer' ? '#3B82F6' : cat?.color || '#64748B',
                      }}
                    >
                      <IconRenderer
                        name={tx.type === 'transfer' ? 'ArrowRightLeft' : cat?.icon || 'Tag'}
                        className="w-5 h-5"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {tx.title}
                        </span>
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="hidden md:flex items-center gap-1">
                            {tx.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{tx.date}</span>
                        {tx.time && <span>{tx.time}</span>}
                        <span>•</span>
                        <span className="truncate">
                          {tx.type === 'transfer'
                            ? `${fromAcc?.name} → ${toAcc?.name}`
                            : fromAcc?.name || 'Account'}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{tx.paymentMethod || tx.type}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center gap-3 pl-3 flex-shrink-0">
                    <div className="text-right">
                      <div
                        className={`font-bold text-xs sm:text-base ${
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'expense'
                            ? 'text-slate-900 dark:text-white'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatMoney(tx.amount, currency)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {tx.type === 'transfer' ? 'Transfer' : cat?.name || 'Expense'}
                      </span>
                    </div>

                    {/* Edit & Delete Actions (always visible on touch, hover on desktop) */}
                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setEditTx(tx)}
                        title="Edit Transaction"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(tx)}
                        title="Delete Transaction"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No transactions found
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              No entries match your current search or filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {editTx && (
        <TransactionModal
          isOpen={!!editTx}
          onClose={() => setEditTx(null)}
          editTransaction={editTx}
        />
      )}

      {/* Quick Multi-Add Modal */}
      <MultiAddModal
        isOpen={isMultiAddOpen}
        onClose={() => setIsMultiAddOpen(false)}
      />

      {/* Receipt Scan Modal */}
      <ReceiptScanModal
        isOpen={isReceiptScanOpen}
        onClose={() => setIsReceiptScanOpen(false)}
        onPopulateTransaction={(data) => {
          openAddTxModal({
            title: data.title,
            amount: data.amount,
            date: data.date,
            categoryId: data.categoryId,
            notes: data.notes,
          });
        }}
      />

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (deleteCandidate) {
            deleteTransaction(deleteCandidate.id);
          }
        }}
        title="Delete Transaction?"
        message={`Are you sure you want to delete "${deleteCandidate?.title}" (${formatMoney(
          deleteCandidate?.amount || 0,
          currency
        )})? Your account balances and reports will be recalculated immediately.`}
        confirmText="Delete Transaction"
        confirmVariant="danger"
      />
    </div>
  );
};
