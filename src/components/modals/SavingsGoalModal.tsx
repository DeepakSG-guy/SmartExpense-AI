import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import type { SavingsGoal } from '../../types/finance';
import { toMinorUnits, fromMinorUnits, SUPPORTED_CURRENCIES } from '../../types/finance';
import { X, Target } from 'lucide-react';

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editGoal?: SavingsGoal | null;
}

const PRESET_ICONS = ['Shield', 'Laptop', 'Plane', 'Home', 'Car', 'GraduationCap', 'Heart', 'Sparkles', 'Gift'];
const PRESET_COLORS = ['#10B981', '#6366F1', '#F43F5E', '#06B6D4', '#F59E0B', '#8B5CF6', '#EC4899'];

export const SavingsGoalModal: React.FC<SavingsGoalModalProps> = ({
  isOpen,
  onClose,
  editGoal,
}) => {
  const { addSavingsGoal, updateSavingsGoal, settings } = useFinance();
  const currencyConfig = SUPPORTED_CURRENCIES[settings.currency] || SUPPORTED_CURRENCIES.INR;

  const [name, setName] = useState('');
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#10B981');
  const [icon, setIcon] = useState('Shield');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (editGoal) {
        setName(editGoal.name);
        setTargetAmountInput(fromMinorUnits(editGoal.targetAmount, currencyConfig.minorUnitDigits).toString());
        setTargetDate(editGoal.targetDate);
        setColor(editGoal.color);
        setIcon(editGoal.icon);
        setNotes(editGoal.notes || '');
      } else {
        setName('');
        setTargetAmountInput('');
        const oneYearOut = new Date();
        oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
        setTargetDate(oneYearOut.toISOString().split('T')[0]);
        setColor('#10B981');
        setIcon('Shield');
        setNotes('');
      }
    }
  }, [isOpen, editGoal, currencyConfig.minorUnitDigits]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Goal name is required.');
      return;
    }

    const parsedTarget = parseFloat(targetAmountInput);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setErrorMsg('Please enter a valid target amount.');
      return;
    }

    const targetMinor = toMinorUnits(parsedTarget, currencyConfig.minorUnitDigits);

    setIsSubmitting(true);
    try {
      if (editGoal) {
        await updateSavingsGoal(editGoal.id, {
          name: name.trim(),
          targetAmount: targetMinor,
          targetDate,
          color,
          icon,
          notes: notes.trim(),
        });
      } else {
        await addSavingsGoal({
          name: name.trim(),
          targetAmount: targetMinor,
          targetDate,
          color,
          icon,
          notes: notes.trim(),
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#202020]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#1E1E22] w-full max-w-md rounded-3xl shadow-2xl border-2 border-[#202020] shadow-[3.5px_3.5px_0px_#202020] overflow-hidden my-auto">
        <div className="px-6 py-4 border-b-2 border-[#202020]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#CFB0E8] border-2 border-[#202020] text-[#202020] flex items-center justify-center shadow-[1.5px_1.5px_0px_#202020]">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-serif font-bold text-[#202020] dark:text-white">
              {editGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-[#202020]/20 hover:border-[#202020] text-[#202020] dark:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-[#FFAB83]/20 border-2 border-[#202020] text-[#202020] dark:text-white text-xs font-medium shadow-[1.5px_1.5px_0px_#202020]">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Goal Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Emergency Fund, New Laptop, Japan Vacation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-sm font-medium text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Target ({currencyConfig.symbol})
              </label>
              <input
                type="number"
                step="any"
                min="1"
                required
                placeholder="100000"
                value={targetAmountInput}
                onChange={(e) => setTargetAmountInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-sm font-serif font-bold text-[#202020] dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Target Date
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs sm:text-sm font-medium text-[#202020] dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Color Theme
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-xl border-2 transition-transform ${
                    color === c ? 'border-[#202020] scale-110 shadow-[1px_1px_0px_#202020]' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Notes / Motivation
            </label>
            <input
              type="text"
              placeholder="e.g. 6 months living expenses in high-yield account"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs sm:text-sm text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t-2 border-[#202020]/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-[#626262] dark:text-slate-400 font-bold text-sm hover:text-[#202020] dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#ADE0BB] hover:bg-[#9CD3AA] text-[#202020] text-sm font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : editGoal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
