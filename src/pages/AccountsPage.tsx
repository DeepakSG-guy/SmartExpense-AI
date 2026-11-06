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

  const getAccountPastelColor = (type: string, index: number) => {
    switch (type) {
      case 'bank':
        return 'bg-[#FFDB8A]';
      case 'upi':
      case 'wallet':
        return 'bg-[#ADE0BB]';
      case 'cash':
        return 'bg-[#FFAB83]';
      case 'credit_card':
        return 'bg-[#F1B5E3]';
      case 'savings':
      case 'investment':
        return 'bg-[#CFB0E8]';
      default:
        return 'bg-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Net Worth Card (Murad Hossain pastel yellow aesthetic) */}
      <div className="card-yellow p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#202020]">
            Total Net Worth & Liquidity
          </span>
          <div className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#202020] mt-1 tabular-nums">
            {formatMoney(netWorth, currency)}
          </div>
          <p className="text-xs font-medium text-[#202020]/80 mt-1 max-w-sm">
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
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-[#F8F5EC] border-[1.5px] border-[#202020] text-[#202020] font-bold text-xs sm:text-sm shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transfer Funds</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddAccountOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#202020] hover:bg-[#303030] text-white font-bold text-xs sm:text-sm border-[1.5px] border-[#202020] shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Account Filters and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#202020] dark:text-white">
            Configured Accounts & Wallets
          </h2>
          <p className="text-xs text-[#626262] dark:text-slate-400">
            {displayedAccounts.length} accounts configured
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs font-bold text-[#626262] dark:text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border border-[#202020] text-[#202020] focus:ring-[#FFDB8A]"
          />
          <span>Show Archived</span>
        </label>
      </div>

      {/* Accounts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {displayedAccounts.map((acc, index) => {
          const balance = accountBalances.get(acc.id) ?? acc.initialBalance;
          const isNegative = balance < 0;
          const bgPill = getAccountPastelColor(acc.type, index);

          return (
            <div
              key={acc.id}
              className={`card-retro p-5 flex flex-col justify-between space-y-4 ${
                acc.isArchived ? 'opacity-60' : ''
              }`}
            >
              <div>
                {/* Account Top Row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl border-[1.5px] border-[#202020] flex items-center justify-center text-[#202020] shadow-[1.5px_1.5px_0px_#202020] ${bgPill}`}
                    >
                      <IconRenderer
                        name={
                          acc.type === "bank"
                            ? "Building2"
                            : acc.type === "upi"
                            ? "Smartphone"
                            : acc.type === "credit"
                            ? "CreditCard"
                            : "Wallet"
                        }
                        className="w-5 h-5"
                      />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-base text-[#202020] dark:text-white line-clamp-1">
                        {acc.name}
                      </h3>
                      <div className="text-[11px] font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider">
                        {acc.type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  {acc.accountNumberMasked && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-[#1E1E23] border border-[#202020] text-[#202020] dark:text-slate-300">
                      {acc.accountNumberMasked}
                    </span>
                  )}
                </div>

                {/* Account Balance */}
                <div className="mt-4">
                  <span className="text-[10px] uppercase font-bold text-[#626262] dark:text-slate-400 tracking-wider">
                    Current Balance
                  </span>
                  <div
                    className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${
                      isNegative ? 'text-rose-600' : 'text-[#202020] dark:text-white'
                    }`}
                  >
                    {formatMoney(balance, currency)}
                  </div>
                  {acc.notes && (
                    <p className="text-[11px] text-[#626262] dark:text-slate-400 line-clamp-1 mt-0.5">
                      {acc.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Account Card Bottom Actions */}
              <div className="pt-3 border-t-[1.5px] border-[#202020]/10 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setTransferSourceId(acc.id);
                    setIsTransferOpen(true);
                  }}
                  className="py-1 px-2.5 rounded-xl bg-white dark:bg-[#1E1E23] border border-[#202020] text-xs font-bold text-[#202020] dark:text-white shadow-[1px_1px_0px_#202020] hover:bg-[#F8F5EC] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedAccountHistory(acc)}
                    title="Account Ledger History"
                    className="p-1.5 rounded-xl border border-[#202020] bg-white dark:bg-[#1E1E23] text-[#202020] dark:text-white hover:bg-[#F8F5EC] shadow-[1px_1px_0px_#202020] cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditAccount(acc)}
                    title="Edit Account Details"
                    className="p-1.5 rounded-xl border border-[#202020] bg-white dark:bg-[#1E1E23] text-[#202020] dark:text-white hover:bg-[#F8F5EC] shadow-[1px_1px_0px_#202020] cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => updateAccount(acc.id, { isArchived: !acc.isArchived })}
                    title={acc.isArchived ? 'Unarchive' : 'Archive Account'}
                    className="p-1.5 rounded-xl border border-[#202020] bg-white dark:bg-[#1E1E23] text-[#626262] hover:bg-[#F8F5EC] shadow-[1px_1px_0px_#202020] cursor-pointer"
                  >
                    {acc.isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteAccountCandidate(acc)}
                    title="Delete Account"
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

      {/* Account History Slide-Over / Modal */}
      {selectedAccountHistory && (
        <div
          className="fixed inset-0 z-50 bg-[#202020]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedAccountHistory(null)}
        >
          <div
            className="w-full max-w-lg bg-[#FAF7EE] dark:bg-[#18181D] rounded-3xl border-2 border-[#202020] dark:border-slate-700 shadow-[4px_4px_0px_#202020] overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b-[1.5px] border-[#202020]/15 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#202020] dark:text-white">
                  {selectedAccountHistory.name} Ledger
                </h3>
                <p className="text-xs text-[#626262]">
                  Balance: {formatMoney(accountBalances.get(selectedAccountHistory.id) ?? selectedAccountHistory.initialBalance, currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAccountHistory(null)}
                className="p-1.5 rounded-xl border-[1.5px] border-[#202020] bg-white text-[#202020] hover:bg-[#F8F5EC]"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto divide-y-[1.5px] divide-[#202020]/10 text-xs">
              {accountTransactions.length > 0 ? (
                accountTransactions.map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#202020] dark:text-white">{tx.title}</div>
                      <div className="text-[11px] text-[#626262]">{tx.date}</div>
                    </div>
                    <div
                      className={`font-serif text-sm font-bold tabular-nums ${
                        tx.type === 'income'
                          ? 'text-[#2B7A49]'
                          : tx.type === 'expense'
                          ? 'text-[#202020]'
                          : 'text-blue-600'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {formatMoney(tx.amount, currency)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-xs text-[#626262]">
                  No transactions recorded for this account.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account Add/Edit Modal */}
      {(isAddAccountOpen || editAccount) && (
        <AccountModal
          isOpen={isAddAccountOpen || !!editAccount}
          onClose={() => {
            setIsAddAccountOpen(false);
            setEditAccount(null);
          }}
          editAccount={editAccount}
        />
      )}

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        defaultSourceAccountId={transferSourceId}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteAccountCandidate)}
        title="Delete Account"
        message={`Are you sure you want to permanently delete "${deleteAccountCandidate?.name}"? Any past transactions linked to this account will remain in your database.`}
        confirmLabel="Delete Account"
        isDestructive
        onConfirm={async () => {
          if (deleteAccountCandidate) {
            await deleteAccount(deleteAccountCandidate.id);
            setDeleteAccountCandidate(null);
          }
        }}
        onCancel={() => setDeleteAccountCandidate(null)}
      />
    </div>
  );
};
