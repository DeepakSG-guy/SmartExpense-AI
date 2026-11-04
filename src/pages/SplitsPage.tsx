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
  const [selectedSplitDetails, setSelectedSplitDetails] = useState<SplitWithDetails | null>(null);

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
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#202020] dark:text-white tracking-tight flex items-center gap-2">
            <span>Split Expenses & Roommates</span>
            <span className="text-[10px] font-sans font-bold text-[#202020] bg-[#ADE0BB] px-2 py-0.5 rounded-lg border border-[#202020] uppercase tracking-wider">
              Student Hub
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-400 mt-0.5">
            Effortlessly split mess meals, PG rent, Wi-Fi, and weekend outings with zero remainder loss
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={openParticipantModal}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl border-[1.5px] border-[#202020] bg-white dark:bg-[#1E1E23] hover:bg-[#F8F5EC] text-xs sm:text-sm font-bold text-[#202020] dark:text-white shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#202020] dark:text-white" />
            <span>Roommates</span>
          </button>

          <button
            type="button"
            onClick={openNewSplitModal}
            className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] text-[#202020] text-xs sm:text-sm font-bold shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Group Split</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Balance Cards in Soft Pastels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Owed to You (Pastel Mint) */}
        <div className="card-mint p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Owed to You
            </span>
            <div className="w-7 h-7 rounded-lg bg-white border border-[#202020] text-[#202020] flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-[#2B7A49]" />
            </div>
          </div>
          <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight tabular-nums">
            {formatMoney(splitBalances.owedToUser, currency)}
          </div>
          <p className="text-[11px] font-medium opacity-80 mt-0.5">
            Pending from friends & roommates
          </p>
        </div>

        {/* You Owe Others (Pastel Peach) */}
        <div className="card-peach p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              You Owe Others
            </span>
            <div className="w-7 h-7 rounded-lg bg-white border border-[#202020] text-[#202020] flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-[#E25C38]" />
            </div>
          </div>
          <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight tabular-nums">
            {formatMoney(splitBalances.userOwes, currency)}
          </div>
          <p className="text-[11px] font-medium opacity-80 mt-0.5">
            Your share paid by others
          </p>
        </div>

        {/* Total Settled (Pastel Lavender) */}
        <div className="card-lavender p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Total Settled
            </span>
            <div className="w-7 h-7 rounded-lg bg-white border border-[#202020] text-[#202020] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#5F3D8C]" />
            </div>
          </div>
          <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight tabular-nums">
            {formatMoney(splitBalances.totalSettledForUser, currency)}
          </div>
          <p className="text-[11px] font-medium opacity-80 mt-0.5">
            Reimbursements completed
          </p>
        </div>

        {/* Active Group Splits (Pastel Yellow) */}
        <div className="card-yellow p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Active Splits
            </span>
            <div className="w-7 h-7 rounded-lg bg-white border border-[#202020] text-[#202020] flex items-center justify-center">
              <Divide className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight tabular-nums">
            {splitBalances.activeSplitsCount} Group Bills
          </div>
          <p className="text-[11px] font-medium opacity-80 mt-0.5">
            In progress across your flat/mess
          </p>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="card-retro p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Filter Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-[#F6F4EB] dark:bg-[#18181D] border-[1.5px] border-[#202020] dark:border-slate-700 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All Splits' },
              { id: 'owed-to-you', label: 'Owed to You' },
              { id: 'you-owe', label: 'You Owe' },
              { id: 'settled', label: 'Settled' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#FFDB8A] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                    : 'text-[#626262] dark:text-slate-400 hover:text-[#202020]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#626262] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title or member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border-[1.5px] border-[#202020] dark:border-slate-700 bg-white dark:bg-[#1E1E23] text-xs font-bold text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
            />
          </div>
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
                className="card-retro p-5 flex flex-col justify-between space-y-4"
              >
                {/* Header Row: Title, Date, Category */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#FFDB8A] border-[1.5px] border-[#202020] text-[#202020] flex items-center justify-center font-bold text-base flex-shrink-0 shadow-[1.5px_1.5px_0px_#202020]">
                        <Divide className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-base text-[#202020] dark:text-white line-clamp-1">
                          {split.title}
                        </h4>
                        <div className="text-[11px] font-medium text-[#626262] dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{split.date}</span>
                          <span>·</span>
                          <span className="capitalize">{split.splitMethod} split</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-serif text-lg font-bold text-[#202020] dark:text-white tabular-nums">
                        {formatMoney(split.totalAmount, currency)}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#202020] uppercase tracking-wider ${
                          split.status === 'settled'
                            ? 'bg-[#ADE0BB] text-[#202020]'
                            : 'bg-[#FFAB83] text-[#202020]'
                        }`}
                      >
                        {split.status === 'settled' ? 'Settled' : 'Active'}
                      </span>
                    </div>
                  </div>

                  {/* Payer and User Net Status */}
                  <div className="mt-3 p-2.5 rounded-xl bg-[#F6F4EB] dark:bg-[#18181D] border border-[#202020] dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-[#626262] dark:text-slate-400 font-medium">
                      Paid by: <strong className="text-[#202020] dark:text-white">{isUserPayer ? 'You' : split.payer.name}</strong>
                    </span>
                    <div className="font-bold">
                      {isUserPayer ? (
                        <span className="text-[#2B7A49] dark:text-[#7BD39A]">
                          +{formatMoney(split.userOwedFromOthers, currency)} to receive
                        </span>
                      ) : split.userOwedToOthers > 0 ? (
                        <span className="text-[#E25C38] dark:text-[#FFA07A]">
                          You owe {formatMoney(split.userOwedToOthers, currency)}
                        </span>
                      ) : (
                        <span className="text-[#2B7A49] dark:text-[#7BD39A]">Your share settled</span>
                      )}
                    </div>
                  </div>

                  {/* Settlement Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#626262] dark:text-slate-400">
                      <span>Progress</span>
                      <span>{percentSettled}% settled</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full border border-[#202020] bg-white dark:bg-[#1E1E23] overflow-hidden p-[1px]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percentSettled === 100 ? 'bg-[#ADE0BB]' : 'bg-[#FFDB8A]'
                        }`}
                        style={{ width: `${percentSettled}%` }}
                      />
                    </div>
                  </div>

                  {/* Participants Avatars Strip */}
                  <div className="flex items-center justify-between pt-2 border-t-[1.5px] border-[#202020]/10 dark:border-slate-800 text-xs">
                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                      {split.shares.map((share) => (
                        <div
                          key={share.id}
                          title={`${share.participant.name} (${formatMoney(share.amount, currency)})`}
                          className="w-7 h-7 rounded-lg border border-[#202020] bg-[#ADE0BB] text-[#202020] flex items-center justify-center font-bold text-xs"
                        >
                          {share.participant.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      <span className="text-xs font-semibold text-[#626262] ml-3">
                        {split.shares.length} members
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {split.status !== 'settled' && (
                        <button
                          type="button"
                          onClick={() => {
                            const unsettledShare = split.shares.find(
                              (s) => s.participantId !== split.payerParticipantId && !s.isPaid
                            );
                            if (unsettledShare) {
                              openSettleModal(split.id, unsettledShare.participantId);
                            } else {
                              setSelectedSplitDetails(split);
                            }
                          }}
                          className="py-1 px-2.5 rounded-lg bg-[#FFDB8A] hover:bg-[#FFE099] border border-[#202020] text-xs font-bold text-[#202020] shadow-[1px_1px_0px_#202020] cursor-pointer"
                        >
                          Settle
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedSplitDetails(split)}
                        className="p-1 rounded-lg border border-[#202020] bg-white dark:bg-[#1E1E23] text-[#202020] dark:text-white hover:bg-[#F8F5EC] cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSplit(split.id, split.title)}
                        className="p-1 rounded-lg border border-[#202020] bg-white dark:bg-[#1E1E23] text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete Split"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-retro p-12 text-center">
          <Divide className="w-10 h-10 text-[#626262]/40 mx-auto mb-2" />
          <h3 className="font-serif text-lg font-bold text-[#202020] dark:text-white">
            No splits found
          </h3>
          <p className="text-xs text-[#626262] dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No splits match your search query.'
              : 'Add your first group bill to effortlessly track shared hostel, mess, or trip expenses!'}
          </p>
          <button
            type="button"
            onClick={openNewSplitModal}
            className="mt-4 py-2 px-4 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-[1.5px] border-[#202020] text-[#202020] font-bold text-xs shadow-[2px_2px_0px_#202020] cursor-pointer"
          >
            Create New Split
          </button>
        </div>
      )}

      {/* Split Details Modal */}
      {selectedSplitDetails && (
        <SplitDetailsModal
          split={selectedSplitDetails}
          onClose={() => setSelectedSplitDetails(null)}
        />
      )}
    </div>
  );
};
