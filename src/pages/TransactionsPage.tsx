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
      if (accountFilter !== 'all') {
        if (tx.fromAccountId !== accountFilter && tx.toAccountId !== accountFilter) return false;
      }

      // Date Range
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || '');
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '');
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

  const handleExportCSV = () => {
    const csvString = exportTransactionsCSV(filteredTransactions, categories, accounts);
    const filename = `smartexpense_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csvString, filename, 'text/csv');
  };

  const handleConfirmDelete = async () => {
    if (deleteCandidate) {
      await deleteTransaction(deleteCandidate.id);
      setDeleteCandidate(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#202020] dark:text-white tracking-tight">
            Transactions Ledger
          </h2>
          <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-400 mt-0.5">
            Search, filter, edit, and organize all financial entries
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsReceiptScanOpen(true)}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl border-[1.5px] border-[#202020] bg-white dark:bg-[#1E1E23] hover:bg-[#F8F5EC] text-xs font-bold text-[#202020] dark:text-white shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-[#E25C38]" />
            <span className="hidden sm:inline">Scan</span> Receipt
          </button>

          <button
            type="button"
            onClick={() => setIsMultiAddOpen(true)}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl border-[1.5px] border-[#202020] bg-white dark:bg-[#1E1E23] hover:bg-[#F8F5EC] text-xs font-bold text-[#202020] dark:text-white shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <ListPlus className="w-3.5 h-3.5 text-[#5F3D8C]" />
            <span className="hidden sm:inline">Batch</span> Add
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl border-[1.5px] border-[#202020] bg-white dark:bg-[#1E1E23] hover:bg-[#F8F5EC] text-xs font-bold text-[#202020] dark:text-white shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#2B7A49]" />
            CSV
          </button>

          <button
            type="button"
            onClick={() => openAddTxModal()}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] text-[#202020] font-bold text-xs sm:text-sm shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Panel */}
      <div className="card-retro p-4 sm:p-5 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#626262] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transactions by title, category, note, or #tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border-[1.5px] border-[#202020] dark:border-slate-700 bg-white dark:bg-[#1E1E23] text-xs sm:text-sm font-bold text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#626262] hover:text-[#202020]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t-[1.5px] border-[#202020]/10 dark:border-slate-800 text-xs">
          <div>
            <label className="text-[10px] uppercase font-bold text-[#626262] dark:text-slate-400 block mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-lg text-xs font-bold text-[#202020] dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
              <option value="transfer">Transfers Only</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-[#626262] dark:text-slate-400 block mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-lg text-xs font-bold text-[#202020] dark:text-white"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-[#626262] dark:text-slate-400 block mb-1">
              Account
            </label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-lg text-xs font-bold text-[#202020] dark:text-white"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-[#626262] dark:text-slate-400 block mb-1">
              Period
            </label>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-lg text-xs font-bold text-[#202020] dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-[#626262] dark:text-slate-400 block mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-lg text-xs font-bold text-[#202020] dark:text-white"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Custom date range inputs */}
        {dateRangeFilter === 'custom' && (
          <div className="flex items-center gap-3 pt-2">
            <div>
              <span className="text-[10px] font-bold text-[#626262] block">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-white dark:bg-[#1E1E23] border border-[#202020] rounded-lg text-xs font-bold"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#626262] block">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-white dark:bg-[#1E1E23] border border-[#202020] rounded-lg text-xs font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {/* Ledger Table / List */}
      <div className="card-retro overflow-hidden">
        {/* Table Summary Bar */}
        <div className="px-5 py-3 border-b-[1.5px] border-[#202020]/10 dark:border-slate-800 flex items-center justify-between text-xs text-[#626262] dark:text-slate-400 font-medium">
          <span>
            Showing <strong className="text-[#202020] dark:text-white">{filteredTransactions.length}</strong> entries
          </span>
          <div>
            <span>
              Net Period Flow:{' '}
              <strong className="text-[#202020] dark:text-white font-serif tabular-nums">
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
          <div className="divide-y-[1.5px] divide-[#202020]/10 dark:divide-slate-800">
            {filteredTransactions.map((tx) => {
              const cat = catMap.get(tx.categoryId);
              const fromAcc = accMap.get(tx.fromAccountId);
              const toAcc = tx.toAccountId ? accMap.get(tx.toAccountId) : null;
              const isIncome = tx.type === 'income';
              const isExpense = tx.type === 'expense';

              return (
                <div
                  key={tx.id}
                  className="p-3.5 sm:px-5 sm:py-4 flex items-center justify-between hover:bg-[#FAF7EE]/60 dark:hover:bg-[#25252D]/40 transition-colors group"
                >
                  {/* Left: Icon & Details */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border-[1.5px] border-[#202020] flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0px_#202020] ${
                        isIncome
                          ? 'bg-[#ADE0BB] text-[#202020]'
                          : isExpense
                          ? 'bg-[#FFAB83] text-[#202020]'
                          : 'bg-[#FFDB8A] text-[#202020]'
                      }`}
                    >
                      <IconRenderer
                        name={tx.type === 'transfer' ? 'ArrowRightLeft' : cat?.icon || 'Tag'}
                        className="w-5 h-5"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[#202020] dark:text-white truncate">
                          {tx.title}
                        </span>
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="hidden md:flex items-center gap-1">
                            {tx.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-[#1E1E23] border border-[#202020] text-[#202020]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] font-medium text-[#626262] dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{tx.date}</span>
                        {tx.time && <span>· {tx.time}</span>}
                        <span>·</span>
                        <span className="truncate">
                          {tx.type === 'transfer'
                            ? `${fromAcc?.name} → ${toAcc?.name}`
                            : fromAcc?.name || 'Account'}
                        </span>
                        <span>·</span>
                        <span className="capitalize">{tx.paymentMethod || tx.type}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Action Buttons */}
                  <div className="flex items-center gap-3 pl-3 flex-shrink-0">
                    <div className="text-right">
                      <div
                        className={`font-serif text-base sm:text-lg font-bold tabular-nums ${
                          isIncome
                            ? 'text-[#2B7A49] dark:text-[#7BD39A]'
                            : isExpense
                            ? 'text-[#202020] dark:text-white'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {isIncome ? '+' : isExpense ? '-' : ''}
                        {formatMoney(tx.amount, currency)}
                      </div>
                      <span className="text-[10px] font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider">
                        {tx.type === 'transfer' ? 'Transfer' : cat?.name || 'Expense'}
                      </span>
                    </div>

                    {/* Edit & Delete Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditTx(tx)}
                        title="Edit Transaction"
                        className="p-1.5 rounded-xl border border-[#202020] bg-white dark:bg-[#1E1E23] text-[#202020] dark:text-white hover:bg-[#F8F5EC] shadow-[1px_1px_0px_#202020] cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(tx)}
                        title="Delete Transaction"
                        className="p-1.5 rounded-xl border border-[#202020] bg-white dark:bg-[#1E1E23] text-rose-600 hover:bg-rose-50 shadow-[1px_1px_0px_#202020] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Calendar className="w-10 h-10 text-[#626262]/40 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#202020] dark:text-white">
              No transactions found
            </h3>
            <p className="text-xs text-[#626262] dark:text-slate-400 mt-1 max-w-xs mx-auto">
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

      {/* AI Receipt Scan Modal */}
      <ReceiptScanModal
        isOpen={isReceiptScanOpen}
        onClose={() => setIsReceiptScanOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteCandidate)}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${deleteCandidate?.title}" (${formatMoney(deleteCandidate?.amount || 0, currency)})? This will update your account balances accordingly.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCandidate(null)}
      />
    </div>
  );
};
