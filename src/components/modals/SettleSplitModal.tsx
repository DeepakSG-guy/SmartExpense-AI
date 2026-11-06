import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { formatMoney, toMinorUnits, fromMinorUnits } from '../../types/finance';
import type { PaymentMode } from '../../types/split';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Smartphone,
  Banknote,
  Building,
  Calendar,
} from 'lucide-react';

export const SettleSplitModal: React.FC = () => {
  const {
    isSettleModalOpen,
    closeSettleModal,
    settleModalParams,
    splits,
    splitShares,
    splitParticipants,
    recordSettlement,
    settings,
  } = useFinance();

  const currency = settings.currency;

  const [settlementType, setSettlementType] = useState<'full' | 'partial'>('full');
  const [partialAmountMajor, setPartialAmountMajor] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Target split and share
  const activeSplit = splits.find((s) => s.id === settleModalParams?.splitId);
  const targetShare = splitShares.find(
    (sh) =>
      sh.splitId === settleModalParams?.splitId &&
      sh.participantId === settleModalParams?.participantId
  );
  const participant = splitParticipants.find((p) => p.id === settleModalParams?.participantId);
  const payer = splitParticipants.find((p) => p.id === activeSplit?.payerParticipantId);

  const remainingMinor = targetShare
    ? Math.max(0, targetShare.amount - targetShare.settledAmount)
    : 0;

  useEffect(() => {
    if (isSettleModalOpen && remainingMinor > 0) {
      setSettlementType('full');
      setPartialAmountMajor((remainingMinor / 100).toFixed(2));
      setPaymentMode('upi');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('Settled via UPI');
      setErrorMessage('');
    }
  }, [isSettleModalOpen, remainingMinor]);

  if (!isSettleModalOpen || !activeSplit || !targetShare || !participant) {
    return null;
  }

  const amountToSettleMinor =
    settlementType === 'full'
      ? remainingMinor
      : toMinorUnits(parseFloat(partialAmountMajor) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (amountToSettleMinor <= 0) {
      setErrorMessage('Settlement amount must be greater than zero.');
      return;
    }

    if (amountToSettleMinor > remainingMinor) {
      setErrorMessage(
        `Amount cannot exceed the remaining balance of ${formatMoney(remainingMinor, currency)}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await recordSettlement({
        splitId: activeSplit.id,
        fromParticipantId: participant.id,
        toParticipantId: activeSplit.payerParticipantId,
        amount: amountToSettleMinor,
        paymentMode,
        date,
        notes: notes.trim() || undefined,
      });

      closeSettleModal();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record settlement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#202020]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white dark:bg-[#1E1E22] border-2 border-[#202020] shadow-[3.5px_3.5px_0px_#202020] rounded-3xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b-2 border-[#202020]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#ADE0BB] border-2 border-[#202020] text-[#202020] flex items-center justify-center font-bold shadow-[1.5px_1.5px_0px_#202020]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#202020] dark:text-white text-lg">
                Record Settlement
              </h3>
              <p className="text-xs text-[#626262] dark:text-slate-400 font-medium truncate max-w-[220px]">
                {activeSplit.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSettleModal}
            className="p-1.5 rounded-xl border border-[#202020]/20 hover:border-[#202020] text-[#202020] dark:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-[#ADE0BB]/20 dark:bg-[#141416] border-2 border-[#202020] shadow-[2px_2px_0px_#202020] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#626262] dark:text-slate-400 font-bold uppercase text-[10px]">Participant:</span>
              <span className="font-bold text-sm text-[#202020] dark:text-white">{participant.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#626262] dark:text-slate-400 font-bold uppercase text-[10px]">Total Share:</span>
              <span className="font-serif font-bold text-sm text-[#202020] dark:text-slate-200">
                {formatMoney(targetShare.amount, currency)}
              </span>
            </div>
            {targetShare.settledAmount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#626262] dark:text-slate-400 font-bold uppercase text-[10px]">Already Settled:</span>
                <span className="font-serif font-bold text-sm text-emerald-700 dark:text-emerald-400">
                  {formatMoney(targetShare.settledAmount, currency)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t-2 border-[#202020]/10 flex items-center justify-between text-xs">
              <span className="font-bold text-[#202020] dark:text-slate-200">Pending Balance:</span>
              <span className="font-serif text-lg font-bold text-[#202020] dark:text-white">
                {formatMoney(remainingMinor, currency)}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-[#FFAB83]/20 border-2 border-[#202020] text-xs font-medium text-[#202020] dark:text-white flex items-start gap-2.5 shadow-[1.5px_1.5px_0px_#202020]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Settlement Type Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-2xl">
              <button
                type="button"
                onClick={() => setSettlementType('full')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  settlementType === 'full'
                    ? 'bg-[#FFDB8A] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                    : 'text-[#626262] dark:text-slate-400'
                }`}
              >
                Full Settle ({formatMoney(remainingMinor, currency)})
              </button>
              <button
                type="button"
                onClick={() => setSettlementType('partial')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  settlementType === 'partial'
                    ? 'bg-[#CFB0E8] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                    : 'text-[#626262] dark:text-slate-400'
                }`}
              >
                Partial Amount
              </button>
            </div>

            {/* Amount input if partial */}
            {settlementType === 'partial' && (
              <div>
                <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Amount Paying (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-serif font-bold text-[#202020]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(remainingMinor / 100).toFixed(2)}
                    required
                    value={partialAmountMajor}
                    onChange={(e) => setPartialAmountMajor(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-base font-serif font-bold text-[#202020] dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'upi', label: 'UPI / GPay', icon: Smartphone },
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMode(m.id as PaymentMode)}
                    className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                      paymentMode === m.id
                        ? 'border-[#202020] bg-[#ADE0BB] text-[#202020] font-bold shadow-[1.5px_1.5px_0px_#202020]'
                        : 'border-[#202020]/30 bg-[#FBF9F2] dark:bg-[#141416] text-[#626262] dark:text-slate-300 hover:border-[#202020]'
                    }`}
                  >
                    <m.icon className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-[11px] block">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Settlement Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#626262] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs sm:text-sm font-medium text-[#202020] dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Paid via PhonePe UPI"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || amountToSettleMinor <= 0}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-[#ADE0BB] hover:bg-[#9CD3AA] text-[#202020] font-bold text-sm border-2 border-[#202020] shadow-[2.5px_2.5px_0px_#202020] transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? 'Recording...' : `Confirm Settle of ${formatMoney(amountToSettleMinor, currency)}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
