import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney } from '../types/finance';
import type { SplitWithDetails } from '../types/split';
import { SplitDetailsModal } from '../components/modals/SplitDetailsModal';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  MoreVertical,
  Trash2,
  Eye,
  Check,
  Divide,
  AlertCircle,
  FolderKanban,
  Utensils,
  Home,
  Wifi,
} from 'lucide-react';

export const SplitsPage: React.FC = () => {
  const {
    enrichedSplits,
    splitBalances,
    openNewSplitModal,
    openParticipantModal,
    openSettleModal,
    deleteSplit,
    currentParticipantId,
    settings,
  } = useFinance();

  const currency = settings.currency;

  const [activeTab, setActiveTab] = useState<'all' | 'owed-to-you' | 'you-owe' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSplitForDetails, setSelectedSplitForDetails] = useState<SplitWithDetails | null>(null);

  // Filter splits according to tab and search query
  const filteredSplits = useMemo(() => {
    return enrichedSplits.filter((split) => {
      // Tab filter
      if (activeTab === 'owed-to-you') {
        if (split.status === 'settled' || split.userOwedFromOthers <= 0) return false;
      } else if (activeTab === 'you-owe') {
        if (split.status === 'settled' || split.userOwedToOthers <= 0) return false;
      } else if (activeTab === 'settled') {
        if (split.status !== 'settled') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = split.title.toLowerCase().includes(query);
        const matchesParticipant = split.shares.some((s) =>
          s.participant.name.toLowerCase().includes(query)
        );
        return matchesTitle || matchesParticipant;
      }

      return true;
    });
  }, [enrichedSplits, activeTab, searchQuery]);

  const handleDeleteSplit = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;
    await deleteSplit(id);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Split Expenses & Roommates</span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Student Hub
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Effortlessly split mess meals, PG rent, Wi-Fi, and weekend outings with zero remainder loss
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={openParticipantModal}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Roommates & Contacts</span>
          </button>

          <button
            type="button"
            onClick={openNewSplitModal}
            className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Group Split</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Owed to You */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
              Owed to You
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatMoney(splitBalances.owedToUser, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Pending from friends & roommates
          </p>
        </div>

        {/* You Owe */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider">
              You Owe Others
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatMoney(splitBalances.userOwes, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Your share paid by others
          </p>
        </div>

        {/* Total Settled */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
              Total Settled
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatMoney(splitBalances.totalSettledForUser, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Reimbursements completed
          </p>
        </div>

        {/* Active Group Splits */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider">
              Active Splits
            </span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Divide className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {splitBalances.activeSplitsCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Unsettled group ledgers
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-semibold overflow-x-auto">
          {[
            { id: 'all', label: `All (${enrichedSplits.length})` },
            { id: 'owed-to-you', label: 'Owed to You' },
            { id: 'you-owe', label: 'You Owe' },
            { id: 'settled', label: 'Settled' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title or person..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Splits Cards List */}
      {filteredSplits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSplits.map((split) => {
            const isUserPayer = split.payerParticipantId === currentParticipantId;
            const percentSettled =
              split.totalAmount > 0
                ? Math.min(100, Math.round((split.totalSettled / split.totalAmount) * 100))
                : 0;

            return (
              <div
                key={split.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top row: Title, Status badge & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {split.title}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            split.status === 'settled'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {split.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {split.date} • Paid upfront by{' '}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {isUserPayer ? 'You' : split.payer.name}
                        </strong>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-extrabold text-slate-900 dark:text-white">
                        {formatMoney(split.totalAmount, currency)}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {split.splitMethod} split
                      </div>
                    </div>
                  </div>

                  {/* Context balance pill */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="text-slate-500">
                      Your Share: <strong className="text-slate-800 dark:text-slate-200">{formatMoney(split.userShareAmount, currency)}</strong>
                    </div>

                    {isUserPayer ? (
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        {split.userOwedFromOthers > 0
                          ? `Owed ${formatMoney(split.userOwedFromOthers, currency)}`
                          : 'Fully settled'}
                      </div>
                    ) : (
                      <div className="font-bold text-rose-600 dark:text-rose-400">
                        {split.userOwedToOthers > 0
                          ? `You owe ${formatMoney(split.userOwedToOthers, currency)}`
                          : 'Your share settled'}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                      <span>Settled: {percentSettled}%</span>
                      <span>{formatMoney(split.totalSettled, currency)} / {formatMoney(split.totalAmount, currency)}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentSettled}%` }}
                      />
                    </div>
                  </div>

                  {/* Participant Chips */}
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {split.shares.map((share) => {
                      const isSelf = share.participantId === currentParticipantId;
                      const pending = Math.max(0, share.amount - share.settledAmount);

                      return (
                        <div
                          key={share.id}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                            share.isPaid
                              ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
                              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 font-semibold'
                          }`}
                        >
                          <span>{share.participant.name}</span>
                          <span>•</span>
                          <span>
                            {share.isPaid ? 'Settled' : formatMoney(pending, currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSplitForDetails(split)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1.5 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Breakdown</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {split.status !== 'settled' && (
                      <button
                        type="button"
                        onClick={() => {
                          // If user owes payer, default to user paying payer
                          // If user is payer, default to first unpaid friend
                          const unpaidShare = split.shares.find((s) => !s.isPaid && s.participantId !== split.payerParticipantId);
                          const targetPid = !isUserPayer ? currentParticipantId : unpaidShare?.participantId || split.shares[0]?.participantId;
                          openSettleModal(split.id, targetPid);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        Settle Up
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteSplit(split.id, split.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete Split"
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
        /* Empty State */
        <div className="py-16 px-4 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              No Group Splits in this View
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Record a group bill like late-night Swiggy biryani, flat rent, or shared Wi-Fi. SmartExpense AI tracks who owes what with exact paise precision.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={openNewSplitModal}
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Group Split</span>
            </button>
          </div>
        </div>
      )}

      {/* Details & History Modal */}
      {selectedSplitForDetails && (
        <SplitDetailsModal
          split={selectedSplitForDetails}
          onClose={() => setSelectedSplitForDetails(null)}
        />
      )}
    </div>
  );
};
