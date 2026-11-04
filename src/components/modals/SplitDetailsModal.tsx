import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { formatMoney } from '../../types/finance';
import type { SplitWithDetails } from '../../types/split';
import {
  X,
  Users,
  CheckCircle2,
  Clock,
  RotateCcw,
  Check,
  Calendar,
  Wallet,
  Smartphone,
  Banknote,
  Building,
} from 'lucide-react';

interface SplitDetailsModalProps {
  split: SplitWithDetails | null;
  onClose: () => void;
}

export const SplitDetailsModal: React.FC<SplitDetailsModalProps> = ({ split, onClose }) => {
  const { openSettleModal, reverseSettlement, settings, currentParticipantId, showToast } = useFinance();
  const currency = settings.currency;

  if (!split) return null;

  const handleReverseSettlement = async (settlementId: string) => {
    if (!confirm('Are you sure you want to reverse this settlement? The participant’s balance will be restored.')) return;
    try {
      await reverseSettlement(settlementId);
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'Failed to reverse settlement' });
    }
  };

  const percentSettled =
    split.totalAmount > 0
      ? Math.min(100, Math.round((split.totalSettled / split.totalAmount) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {split.title}
              </h3>
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
            <p className="text-xs text-slate-400 mt-0.5">
              Split on {split.date} • Paid upfront by{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {split.payer.name} {split.payer.id === currentParticipantId ? '(You)' : ''}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Progress / Overview banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                Total Amount
              </span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                {formatMoney(split.totalAmount, currency)}
              </span>
            </div>

            {/* Visual Progress bar */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span>Settled: {formatMoney(split.totalSettled, currency)} ({percentSettled}%)</span>
                <span>Remaining: {formatMoney(split.remainingAmount, currency)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${percentSettled}%` }}
                />
              </div>
            </div>

            {split.notes && (
              <p className="text-xs text-slate-500 italic pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                "{split.notes}"
              </p>
            )}
          </div>

          {/* Participant Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Participants Breakdown ({split.shares.length})
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              {split.shares.map((share) => {
                const pending = Math.max(0, share.amount - share.settledAmount);
                const isPayer = share.participantId === split.payerParticipantId;

                return (
                  <div
                    key={share.id}
                    className="p-3.5 flex items-center justify-between gap-3 bg-white dark:bg-slate-900"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{share.participant.name}</span>
                        {share.participant.isCurrentUser && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 rounded font-normal">
                            You
                          </span>
                        )}
                        {isPayer && (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-1.5 rounded font-semibold">
                            Paid Upfront
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Share: {formatMoney(share.amount, currency)}
                        {share.percentage ? ` (${share.percentage}%)` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        {share.isPaid ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl">
                            <Check className="w-3.5 h-3.5" />
                            <span>Settled</span>
                          </span>
                        ) : (
                          <div>
                            <div className="font-bold text-xs text-rose-600 dark:text-rose-400">
                              Owes {formatMoney(pending, currency)}
                            </div>
                            {share.settledAmount > 0 && (
                              <div className="text-[10px] text-slate-400">
                                ({formatMoney(share.settledAmount, currency)} paid)
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Settle button if not fully paid */}
                      {!share.isPaid && pending > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            openSettleModal(split.id, share.participantId);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-all"
                        >
                          Settle
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Settlement History */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Repayment & Settlement History ({split.settlements.length})
            </div>

            {split.settlements.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
                {split.settlements.map((stl) => {
                  const fromPerson = split.shares.find((s) => s.participantId === stl.fromParticipantId)?.participant;

                  return (
                    <div
                      key={stl.id}
                      className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-slate-900"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {fromPerson?.name || 'Participant'} paid{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {formatMoney(stl.amount, currency)}
                          </strong>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{stl.date}</span>
                          <span>•</span>
                          <span className="uppercase font-mono">{stl.paymentMode}</span>
                          {stl.notes && <span>• "{stl.notes}"</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleReverseSettlement(stl.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-500 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Reverse / Undo Settlement"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Undo</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                No repayments recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
