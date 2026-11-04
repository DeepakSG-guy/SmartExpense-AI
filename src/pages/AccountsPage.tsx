import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, type Account, type Transaction } from '../types/finance';
import { IconRenderer } from '../components/common/IconRenderer';
import { AccountModal } from '../components/modals/AccountModal';
import { TransferModal } from '../components/modals/TransferModal';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import {
  Wallet,
  Building2,
  Smartphone,
  CreditCard,
  ShieldCheck,
  Plus,
  ArrowRightLeft,
  Archive,
  RotateCcw,
  Trash2,
  Edit2,
  TrendingUp,
  History,
  X,
} from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const {
    accounts,
    accountBalances,
    netWorth,
    settings,
    transactions,
    deleteAccount,
    updateAccount,
  } = useFinance();

  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferSourceId, setTransferSourceId] = useState<string | undefined>();
  const [showArchived, setShowArchived] = useState(false);
  const [selectedAccountHistory, setSelectedAccountHistory] = useState<Account | null>(null);
  const [deleteAccountCandidate, setDeleteAccountCandidate] = useState<Account | null>(null);

  const currency = settings.currency;

  const displayedAccounts = accounts.filter((a) => (showArchived ? true : !a.isArchived));

  // Get account specific transactions
  const accountTransactions = selectedAccountHistory
    ? transactions.filter(
        (t) =>
          t.fromAccountId === selectedAccountHistory.id ||
          t.toAccountId === selectedAccountHistory.id
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Top Net Worth & Quick Transfer Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-lg shadow-emerald-700/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold text-emerald-100 tracking-wider">
            Total Net Worth & Liquidity
          </span>
          <div className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-1">
            {formatMoney(netWorth, currency)}
          </div>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-sm">
            Total assets in cash, bank, savings and UPI minus credit card liability balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setTransferSourceId(undefined);
              setIsTransferOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-semibold text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transfer Funds</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddAccountOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-semibold text-xs sm:text-sm shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Account Filters and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Managed Accounts ({displayedAccounts.length})
          </h2>
          <p className="text-xs text-slate-400">Click an account to inspect transaction history</p>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span>Show Archived ({accounts.filter((a) => a.isArchived).length})</span>
        </label>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedAccounts.map((acc) => {
          const currentBalance = accountBalances.get(acc.id) ?? acc.initialBalance;
          const isNegative = currentBalance < 0;

          return (
            <div
              key={acc.id}
              className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 relative group flex flex-col justify-between ${
                acc.isArchived
                  ? 'border-slate-200/50 dark:border-slate-800 opacity-60'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              <div>
                {/* Header: Icon, Name, Type */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-2xs"
                      style={{ backgroundColor: acc.color }}
                    >
                      <IconRenderer name={acc.icon || 'Wallet'} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          {acc.name}
                        </h3>
                        {acc.isArchived && (
                          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Archived
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 capitalize">
                        {acc.type === 'credit'
                          ? 'Credit Card Liability'
                          : acc.type === 'upi'
                          ? 'UPI Wallet'
                          : acc.type}
                      </span>
                    </div>
                  </div>

                  {/* Actions Dropdown / Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditAccount(acc)}
                      title="Edit Account"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {acc.isArchived ? (
                      <button
                        type="button"
                        onClick={() => updateAccount(acc.id, { isArchived: false })}
                        title="Unarchive Account"
                        className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteAccountCandidate(acc)}
                        title="Archive or Delete Account"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Balances */}
                <div className="space-y-1 mb-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Current Balance
                  </span>
                  <div
                    className={`text-2xl font-extrabold tracking-tight ${
                      isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {formatMoney(currentBalance, currency)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Opening: {formatMoney(acc.initialBalance, currency)}
                    {acc.accountNumberMasked && ` • ${acc.accountNumberMasked}`}
                  </div>
                </div>
              </div>

              {/* Bottom Card Actions: Transfer & History */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAccountHistory(acc)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View History</span>
                </button>

                {!acc.isArchived && (
                  <button
                    type="button"
                    onClick={() => {
                      setTransferSourceId(acc.id);
                      setIsTransferOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Transfer</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Account Specific Transaction History Drawer */}
      {selectedAccountHistory && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end"
          onClick={() => setSelectedAccountHistory(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: selectedAccountHistory.color }}
                  >
                    <IconRenderer name={selectedAccountHistory.icon || 'Wallet'} className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {selectedAccountHistory.name}
                    </h3>
                    <span className="text-xs text-slate-400">
                      Balance:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatMoney(
                          accountBalances.get(selectedAccountHistory.id) ??
                            selectedAccountHistory.initialBalance,
                          currency
                        )}
                      </strong>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAccountHistory(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Transactions list */}
              <div className="mt-4 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Transactions ({accountTransactions.length})
                </span>

                {accountTransactions.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {accountTransactions.map((tx) => (
                      <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {tx.title}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {tx.date} • {tx.type}
                          </div>
                        </div>
                        <div
                          className={`font-bold text-sm ${
                            tx.type === 'income'
                              ? 'text-emerald-600'
                              : tx.type === 'expense'
                              ? 'text-slate-900 dark:text-white'
                              : 'text-blue-600'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                          {formatMoney(tx.amount, currency)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    No transactions associated with this account.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedAccountHistory(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
            >
              Close Ledger
            </button>
          </div>
        </div>
      )}

      {/* Add & Edit Account Modal */}
      <AccountModal
        isOpen={isAddAccountOpen || !!editAccount}
        onClose={() => {
          setIsAddAccountOpen(false);
          setEditAccount(null);
        }}
        editAccount={editAccount}
      />

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        defaultSourceAccountId={transferSourceId}
      />

      {/* Delete / Archive Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteAccountCandidate}
        onClose={() => setDeleteAccountCandidate(null)}
        onConfirm={() => {
          if (deleteAccountCandidate) {
            deleteAccount(deleteAccountCandidate.id);
          }
        }}
        title="Archive or Delete Account?"
        message={`Are you sure you want to remove "${deleteAccountCandidate?.name}"? If the account has past transactions, it will be safely archived so your historical financial records remain intact.`}
        confirmText="Confirm Remove"
        confirmVariant="danger"
      />
    </div>
  );
};
