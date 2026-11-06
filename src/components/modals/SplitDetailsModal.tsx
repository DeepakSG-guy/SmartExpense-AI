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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-[#FBF9F2] dark:bg-[#1E1E22] border-2 border-[#202020] rounded-3xl max-w-xl w-full shadow-[5px_5px_0px_#202020] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b-2 border-[#202020] flex items-center justify-between bg-white dark:bg-[#28282D]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-[#202020] dark:text-white text-lg">
                {split.title}
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-[#202020] ${
                  split.status === 'settled'
                    ? 'bg-[#ADE0BB] text-[#202020]'
                    : 'bg-[#FFDB8A] text-[#202020]'
                }`}
              >
                {split.status}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
              Split on {split.date} • Paid upfront by{' '}
              <strong className="text-[#202020] dark:text-white font-bold">
                {split.payer.name} {split.payer.id === currentParticipantId ? '(You)' : ''}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border-2 border-[#202020] bg-white dark:bg-[#1E1E22] text-[#202020] dark:text-white flex items-center justify-center hover:bg-[#FFDB8A] transition-colors shadow-[1.5px_1.5px_0px_#202020] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Progress / Overview banner (Buttercup card) */}
          <div className="p-4.5 rounded-2xl bg-[#FFDB8A] border-2 border-[#202020] shadow-[3px_3px_0px_#202020] space-y-3 text-[#202020]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[11px]">
                Total Amount
              </span>
              <span className="font-serif text-2xl font-bold tracking-tight">
                {formatMoney(split.totalAmount, currency)}
              </span>
            </div>

            {/* Visual Progress bar */}
            <div>
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span>Settled: {formatMoney(split.totalSettled, currency)} ({percentSettled}%)</span>
                <span>Remaining: {formatMoney(split.remainingAmount, currency)}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-white border-2 border-[#202020] overflow-hidden">
                <div
                  className="h-full bg-[#ADE0BB] transition-all duration-300"
                  style={{ width: `${percentSettled}%` }}
                />
              </div>
            </div>

            {split.notes && (
              <p className="text-xs font-medium italic pt-2 border-t border-[#202020]/20">
                "{split.notes}"
              </p>
            )}
          </div>

          {/* Participant Breakdown */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider px-1">
              Participants Breakdown ({split.shares.length})
            </div>

            <div className="space-y-2">
              {split.shares.map((share) => {
                const pending = Math.max(0, share.amount - share.settledAmount);
                const isPayer = share.participantId === split.payerParticipantId;

                return (
                  <div
                    key={share.id}
                    className="p-3.5 rounded-2xl border-2 border-[#202020] bg-white dark:bg-[#28282D] shadow-[2px_2px_0px_#202020] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#202020] dark:text-white flex items-center gap-1.5">
                        <span>{share.participant.name}</span>
                        {share.participant.isCurrentUser && (
                          <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 px-1.5 rounded-full font-bold">
                            You
                          </span>
                        )}
                        {isPayer && (
                          <span className="text-[10px] bg-[#ADE0BB] text-[#202020] border border-[#202020] px-1.5 rounded-full font-bold">
                            Paid Upfront
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                        Share: {formatMoney(share.amount, currency)}
                        {share.percentage ? ` (${share.percentage}%)` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <div className="text-right">
                        {share.isPaid ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#202020] bg-[#ADE0BB] border border-[#202020] px-2.5 py-1 rounded-xl shadow-[1px_1px_0px_#202020]">
                            <Check className="w-3.5 h-3.5" />
                            <span>Settled</span>
                          </span>
                        ) : (
                          <div>
                            <div className="font-serif font-bold text-xs text-rose-600 dark:text-rose-400">
                              Owes {formatMoney(pending, currency)}
                            </div>
                            {share.settledAmount > 0 && (
                              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
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
                          className="px-3.5 py-1.5 rounded-xl bg-[#ADE0BB] hover:bg-[#97D4A6] text-[#202020] text-xs font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
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
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider px-1">
              Repayment & Settlement History ({split.settlements.length})
            </div>

            {split.settlements.length > 0 ? (
              <div className="space-y-2">
                {split.settlements.map((stl) => {
                  const fromPerson = split.shares.find((s) => s.participantId === stl.fromParticipantId)?.participant;

                  return (
                    <div
                      key={stl.id}
                      className="p-3 rounded-2xl border-2 border-[#202020] bg-white dark:bg-[#28282D] shadow-[2px_2px_0px_#202020] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#202020] dark:text-white">
                          {fromPerson?.name || 'Participant'} paid{' '}
                          <span className="font-serif font-bold text-[#202020] dark:text-[#ADE0BB]">
                            {formatMoney(stl.amount, currency)}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2 mt-0.5 font-medium">
                          <span>{stl.date}</span>
                          <span>•</span>
                          <span className="uppercase font-mono font-bold">{stl.paymentMode}</span>
                          {stl.notes && <span>• "{stl.notes}"</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleReverseSettlement(stl.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-600 hover:text-rose-600 dark:text-neutral-400 py-1 px-2.5 rounded-xl border border-[#202020] bg-[#FBF9F2] dark:bg-[#1E1E22] shadow-[1px_1px_0px_#202020] cursor-pointer"
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
              <div className="p-4.5 rounded-2xl border-2 border-dashed border-[#202020] text-center text-xs font-medium text-neutral-500 bg-white/50 dark:bg-[#28282D]/50">
                No repayments recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
