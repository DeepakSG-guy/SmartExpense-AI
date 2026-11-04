import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { toMinorUnits, fromMinorUnits, formatMoney } from '../../types/finance';
import type { SplitMethod } from '../../types/split';
import { STUDENT_SPLIT_PRESETS, calculateEqualSplit } from '../../services/splitCalculations';
import {
  X,
  Users,
  Sparkles,
  Check,
  AlertCircle,
  Plus,
  ArrowRight,
  Wallet,
  Calendar,
  Tag,
  Percent,
  Coins,
  Divide,
} from 'lucide-react';

export const NewSplitModal: React.FC = () => {
  const {
    isNewSplitModalOpen,
    closeNewSplitModal,
    addSplit,
    splitParticipants,
    addParticipant,
    accounts,
    categories,
    settings,
    currentParticipantId,
    showToast,
  } = useFinance();

  const currency = settings.currency;

  const [title, setTitle] = useState('');
  const [totalAmountMajor, setTotalAmountMajor] = useState('');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [payerId, setPayerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('cat-canteen-mess');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [notes, setNotes] = useState('');

  // Selected participant IDs for this split
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);

  // For custom amounts (in major units / rupees string)
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // For percentage split
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  // Quick inline add friend state
  const [isAddingQuickFriend, setIsAddingQuickFriend] = useState(false);
  const [quickFriendName, setQuickFriendName] = useState('');
  const [quickFriendUpi, setQuickFriendUpi] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize defaults on modal open
  useEffect(() => {
    if (isNewSplitModalOpen) {
      setTitle('');
      setTotalAmountMajor('');
      setSplitMethod('equal');
      setDate(new Date().toISOString().split('T')[0]);
      setCategoryId('cat-canteen-mess');
      setLinkedAccountId('');
      setNotes('');
      setErrorMessage('');
      setIsAddingQuickFriend(false);

      // Default payer is user
      const selfId = currentParticipantId || 'part-self';
      setPayerId(selfId);

      // Default selection: user + all existing contacts (up to 4)
      const initialIds = splitParticipants.map((p) => p.id);
      setSelectedParticipantIds(initialIds.length > 0 ? initialIds : [selfId]);
    }
  }, [isNewSplitModalOpen, currentParticipantId, splitParticipants]);

  const totalAmountMinor = useMemo(() => {
    const parsed = parseFloat(totalAmountMajor);
    return isNaN(parsed) || parsed <= 0 ? 0 : toMinorUnits(parsed);
  }, [totalAmountMajor]);

  // Compute live equal split previews
  const equalSplitShares = useMemo(() => {
    if (totalAmountMinor <= 0 || selectedParticipantIds.length === 0) return [];
    return calculateEqualSplit(totalAmountMinor, selectedParticipantIds, payerId);
  }, [totalAmountMinor, selectedParticipantIds, payerId]);

  // Calculate percentage total
  const currentTotalPercentage = useMemo(() => {
    return selectedParticipantIds.reduce((sum, pid) => {
      const val = parseFloat(percentages[pid] || '0');
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [selectedParticipantIds, percentages]);

  // Calculate custom sum
  const currentCustomSumMinor = useMemo(() => {
    return selectedParticipantIds.reduce((sum, pid) => {
      const val = parseFloat(customAmounts[pid] || '0');
      return sum + (isNaN(val) || val <= 0 ? 0 : toMinorUnits(val));
    }, 0);
  }, [selectedParticipantIds, customAmounts]);

  if (!isNewSplitModalOpen) return null;

  const toggleParticipant = (id: string) => {
    if (selectedParticipantIds.includes(id)) {
      if (selectedParticipantIds.length <= 1) {
        showToast({ type: 'warning', message: 'At least one participant must be included in a split.' });
        return;
      }
      setSelectedParticipantIds((prev) => prev.filter((p) => p !== id));
    } else {
      setSelectedParticipantIds((prev) => [...prev, id]);
    }
  };

  const handleApplyPreset = (preset: typeof STUDENT_SPLIT_PRESETS[0]) => {
    setTitle(preset.defaultTitle);
    setCategoryId(preset.categoryId);
  };

  const handleQuickAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFriendName.trim()) return;

    try {
      const newPart = await addParticipant({
        name: quickFriendName.trim(),
        upiId: quickFriendUpi.trim() || undefined,
        isCurrentUser: false,
      });

      setSelectedParticipantIds((prev) => [...prev, newPart.id]);
      setQuickFriendName('');
      setQuickFriendUpi('');
      setIsAddingQuickFriend(false);
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'Failed to add friend' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Please give this split a title (e.g. Swiggy Dinner, Hostel Wi-Fi).');
      return;
    }

    if (totalAmountMinor <= 0) {
      setErrorMessage('Please enter a valid total amount.');
      return;
    }

    if (selectedParticipantIds.length === 0) {
      setErrorMessage('Please select at least one participant.');
      return;
    }

    // Validation for split methods
    let sharesData: Array<{ participantId: string; amount: number; percentage?: number }> = [];

    if (splitMethod === 'equal') {
      sharesData = selectedParticipantIds.map((pid) => ({
        participantId: pid,
        amount: 0, // calculateEqualSplit handles deterministic allocation in addSplit
      }));
    } else if (splitMethod === 'percentage') {
      if (Math.abs(currentTotalPercentage - 100) > 0.05) {
        setErrorMessage(`Percentages must total exactly 100% (currently ${currentTotalPercentage.toFixed(1)}%).`);
        return;
      }
      sharesData = selectedParticipantIds.map((pid) => ({
        participantId: pid,
        percentage: parseFloat(percentages[pid] || '0'),
        amount: 0,
      }));
    } else {
      // Custom
      const diff = totalAmountMinor - currentCustomSumMinor;
      if (diff !== 0) {
        setErrorMessage(
          `Custom amounts must match total exactly. Difference: ${formatMoney(diff, currency)}`
        );
        return;
      }
      sharesData = selectedParticipantIds.map((pid) => ({
        participantId: pid,
        amount: toMinorUnits(parseFloat(customAmounts[pid] || '0')),
      }));
    }

    setIsSubmitting(true);
    try {
      await addSplit(
        {
          title: title.trim(),
          totalAmount: totalAmountMinor,
          currency,
          splitMethod,
          payerParticipantId: payerId || currentParticipantId,
          date,
          categoryId,
          linkedAccountId: linkedAccountId || undefined,
          notes: notes.trim() || undefined,
        },
        sharesData
      );

      closeNewSplitModal();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create group split.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                New Group Expense Split
              </h3>
              <p className="text-xs text-slate-400">
                Split shared student food, rent, Wi-Fi, or travel with zero paise loss
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeNewSplitModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
          {/* Student Quick Presets */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Student & Roommate Presets</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STUDENT_SPLIT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500/80 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all active:scale-95 group"
                >
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                    {p.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {p.defaultTitle}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swiggy Dinner Feast"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Total (₹ INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={totalAmountMajor}
                    onChange={(e) => setTotalAmountMajor(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Payer and Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Who Paid Upfront? *
                </label>
                <select
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {splitParticipants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isCurrentUser ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Category & Linked Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Debit Account (Optional)
                </label>
                <select
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">None (Split only, no ledger entry)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Split Method Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Split Method
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSplitMethod('equal')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    splitMethod === 'equal'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Divide className="w-3.5 h-3.5" />
                  <span>Equally (=)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMethod('percentage')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    splitMethod === 'percentage'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>Percentage (%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMethod('custom')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    splitMethod === 'custom'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Exact Amounts (₹)</span>
                </button>
              </div>
            </div>

            {/* Participants Selector & Split Distribution */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Participants ({selectedParticipantIds.length} selected)
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingQuickFriend(!isAddingQuickFriend)}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Friend</span>
                </button>
              </div>

              {/* Inline quick friend creator */}
              {isAddingQuickFriend && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Add Roommate / Friend
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Name (e.g. Rahul)"
                      value={quickFriendName}
                      onChange={(e) => setQuickFriendName(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="UPI ID (optional)"
                      value={quickFriendUpi}
                      onChange={(e) => setQuickFriendUpi(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingQuickFriend(false)}
                      className="px-2.5 py-1 text-xs text-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickAddFriend}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Add & Select
                    </button>
                  </div>
                </div>
              )}

              {/* Participant List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                {splitParticipants.map((part) => {
                  const isSelected = selectedParticipantIds.includes(part.id);
                  const equalShare = equalSplitShares.find((s) => s.participantId === part.id);

                  return (
                    <div
                      key={part.id}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800/90'
                          : 'bg-slate-50/60 dark:bg-slate-900/60 opacity-60'
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        onClick={() => toggleParticipant(part.id)}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
                            <span>{part.name}</span>
                            {part.isCurrentUser && (
                              <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded font-normal">
                                You
                              </span>
                            )}
                            {part.id === payerId && (
                              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded font-semibold">
                                Payer
                              </span>
                            )}
                          </div>
                          {part.upiId && (
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              UPI: {part.upiId}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Method inputs */}
                      {isSelected && (
                        <div className="flex-shrink-0 text-right">
                          {splitMethod === 'equal' && (
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {equalShare ? formatMoney(equalShare.amount, currency) : '₹0.00'}
                            </div>
                          )}

                          {splitMethod === 'percentage' && (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                placeholder="0"
                                value={percentages[part.id] || ''}
                                onChange={(e) =>
                                  setPercentages({ ...percentages, [part.id]: e.target.value })
                                }
                                className="w-16 px-2 py-1 text-xs text-right font-bold bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                              />
                              <span className="text-xs font-bold text-slate-400">%</span>
                            </div>
                          )}

                          {splitMethod === 'custom' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={customAmounts[part.id] || ''}
                                onChange={(e) =>
                                  setCustomAmounts({ ...customAmounts, [part.id]: e.target.value })
                                }
                                className="w-24 px-2 py-1 text-xs text-right font-bold bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Split method balance indicator */}
              {splitMethod === 'percentage' && (
                <div
                  className={`text-xs flex items-center justify-between p-2 rounded-xl ${
                    Math.abs(currentTotalPercentage - 100) < 0.05
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  <span>Total Percentage Allocated:</span>
                  <span className="font-bold">{currentTotalPercentage.toFixed(1)}% / 100%</span>
                </div>
              )}

              {splitMethod === 'custom' && (
                <div
                  className={`text-xs flex items-center justify-between p-2 rounded-xl ${
                    totalAmountMinor === currentCustomSumMinor && totalAmountMinor > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  <span>Custom Allocated vs Total:</span>
                  <span className="font-bold">
                    {formatMoney(currentCustomSumMinor, currency)} / {formatMoney(totalAmountMinor, currency)}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Notes / Settlement Link (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Swiggy Order #89211 • Split between flatmates"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? 'Creating Group Split...' : 'Create Group Split'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
