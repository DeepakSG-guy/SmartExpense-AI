import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, fromMinorUnits, type SavingsGoal, type SavingsContribution } from '../types/finance';
import { IconRenderer } from '../components/common/IconRenderer';
import { SavingsGoalModal } from '../components/modals/SavingsGoalModal';
import { ContributionModal } from '../components/modals/ContributionModal';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import {
  Target,
  Plus,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  History,
  Sparkles,
} from 'lucide-react';

export const SavingsGoalsPage: React.FC = () => {
  const {
    savingsGoals,
    savingsContributions,
    settings,
    deleteSavingsGoal,
  } = useFinance();

  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<SavingsGoal | null>(null);
  const [selectedGoalHistory, setSelectedGoalHistory] = useState<SavingsGoal | null>(null);

  const currency = settings.currency;

  const totalTarget = savingsGoals.reduce((acc: number, g: SavingsGoal) => acc + g.targetAmount, 0);
  const totalSaved = savingsGoals.reduce((acc: number, g: SavingsGoal) => acc + g.savedAmount, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  // Contributions for selected goal
  const goalContribs = selectedGoalHistory
    ? savingsContributions.filter((c: SavingsContribution) => c.goalId === selectedGoalHistory.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner: Overall Goals Progress */}
      <div className="p-6 rounded-3xl bg-[#CFB0E8] dark:bg-[#262330] border-2 border-[#202020] shadow-[3px_3px_0px_#202020] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold text-[#202020]/70 dark:text-slate-300 tracking-wider">
            Overall Savings Goals
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl sm:text-4xl font-serif font-bold text-[#202020] dark:text-white">
              {formatMoney(totalSaved, currency)}
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#202020]/80 dark:text-slate-300">
              of {formatMoney(totalTarget, currency)} Target ({overallPct}%)
            </span>
          </div>

          <div className="w-56 sm:w-72 h-3.5 bg-white/70 dark:bg-[#1E1E22] rounded-full mt-3 border-2 border-[#202020] overflow-hidden p-[1px]">
            <div
              className="h-full bg-[#FFDB8A] rounded-full transition-all duration-300 border-r border-[#202020]"
              style={{ width: `${Math.min(100, overallPct)}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddGoalOpen(true)}
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-[#FFDB8A] hover:bg-[#FCD276] text-[#202020] font-bold text-xs sm:text-sm border-2 border-[#202020] shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Goals Grid */}
      {savingsGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savingsGoals.map((goal) => {
            const pct = goal.targetAmount > 0 ? Math.round((goal.savedAmount / goal.targetAmount) * 100) : 0;
            const isCompleted = pct >= 100;
            const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);

            // Estimated months to completion based on target date
            const today = new Date();
            const target = new Date(goal.targetDate);
            const diffMonths = Math.max(
              1,
              (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth())
            );
            const monthlyPaceNeeded = Math.round(remaining / diffMonths);

            return (
              <div
                key={goal.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#1E1E22] border-2 border-[#202020] shadow-[2.5px_2.5px_0px_#202020] flex flex-col justify-between space-y-4 hover:shadow-[3px_3px_0px_#202020] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-[#202020] border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020]"
                        style={{ backgroundColor: goal.color || '#ADE0BB' }}
                      >
                        <IconRenderer name={goal.icon || 'Target'} className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-base text-[#202020] dark:text-white leading-tight">
                          {goal.name}
                        </h3>
                        <span className="text-[11px] text-[#626262] dark:text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                          <Calendar className="w-3 h-3" />
                          <span>Target: {goal.targetDate}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditGoal(goal)}
                        className="p-1.5 rounded-lg border border-[#202020]/20 hover:border-[#202020] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#202020] dark:text-slate-200 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(goal)}
                        className="p-1.5 rounded-lg border border-[#202020]/20 hover:border-[#202020] hover:bg-rose-100 text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts & Percentage */}
                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="font-serif font-bold text-[#202020] dark:text-white text-xl">
                      {formatMoney(goal.savedAmount, currency)}
                    </span>
                    <span className="text-xs font-bold text-[#626262] dark:text-slate-400">
                      of {formatMoney(goal.targetAmount, currency)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3 w-full bg-[#FBF9F2] dark:bg-[#141416] rounded-full border border-[#202020] overflow-hidden p-[1px]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-[#ADE0BB]' : 'bg-[#FFDB8A]'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span
                      className={`font-bold ${
                        isCompleted ? 'text-emerald-700 dark:text-emerald-400 flex items-center gap-1' : 'text-[#626262] dark:text-slate-300'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Goal Achieved!</span>
                        </>
                      ) : (
                        `${pct}% Saved`
                      )}
                    </span>
                    {!isCompleted && (
                      <span className="text-[#626262] dark:text-slate-400 font-medium">
                        {diffMonths} mos left (~{formatMoney(monthlyPaceNeeded, currency)}/mo)
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions: Deposit / Withdraw & History */}
                <div className="pt-3 border-t-2 border-[#202020]/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGoalHistory(goal)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#626262] dark:text-slate-400 hover:text-[#202020] dark:hover:text-white"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Logs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContributionGoal(goal)}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#ADE0BB] hover:bg-[#9CD3AA] text-[#202020] border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] text-xs font-bold active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Deposit / Withdraw</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-[#1E1E22] rounded-3xl border-2 border-[#202020] shadow-[3px_3px_0px_#202020]">
          <div className="w-16 h-16 rounded-2xl bg-[#CFB0E8] border-2 border-[#202020] flex items-center justify-center mx-auto mb-3 text-[#202020] shadow-[2px_2px_0px_#202020]">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-serif font-bold text-[#202020] dark:text-white">
            No Savings Goals Yet
          </h3>
          <p className="text-xs text-[#626262] dark:text-slate-400 mt-1 max-w-sm mx-auto mb-5">
            Create goals for your emergency fund, dream vacation, tech gadget, or education.
          </p>
          <button
            type="button"
            onClick={() => setIsAddGoalOpen(true)}
            className="py-2.5 px-5 rounded-xl bg-[#FFDB8A] hover:bg-[#FCD276] text-[#202020] font-bold text-xs border-2 border-[#202020] shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            Create Your First Goal
          </button>
        </div>
      )}

      {/* Goal History Drawer */}
      {selectedGoalHistory && (
        <div
          className="fixed inset-0 z-50 bg-[#202020]/60 backdrop-blur-xs flex justify-end"
          onClick={() => setSelectedGoalHistory(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#1E1E22] h-full p-6 shadow-2xl border-l-2 border-[#202020] flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b-2 border-[#202020]/10">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#202020] dark:text-white">
                    {selectedGoalHistory.name}
                  </h3>
                  <span className="text-xs text-[#626262] dark:text-slate-400 font-medium">Contribution History</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGoalHistory(null)}
                  className="p-1.5 rounded-xl border border-[#202020]/20 hover:border-[#202020] text-[#202020] dark:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {goalContribs.length > 0 ? (
                  <div className="divide-y divide-[#202020]/10 text-xs">
                    {goalContribs.map((c) => (
                      <div key={c.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[#202020] dark:text-slate-200 block">
                            {c.notes || 'Contribution'}
                          </span>
                          <span className="text-[10px] text-[#626262] dark:text-slate-400">{c.date}</span>
                        </div>
                        <span
                          className={`font-serif font-bold text-sm ${
                            c.amount >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'
                          }`}
                        >
                          {c.amount >= 0 ? '+' : ''}{formatMoney(c.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#626262] dark:text-slate-400 py-8 text-center">
                    No contributions recorded yet.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedGoalHistory(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-[#FBF9F2] dark:bg-[#141416] text-[#202020] dark:text-white font-bold text-xs border-2 border-[#202020] shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px]"
            >
              Close History
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Goal Modal */}
      <SavingsGoalModal
        isOpen={isAddGoalOpen || !!editGoal}
        onClose={() => {
          setIsAddGoalOpen(false);
          setEditGoal(null);
        }}
        editGoal={editGoal}
      />

      {/* Deposit / Withdraw Contribution Modal */}
      <ContributionModal
        isOpen={!!contributionGoal}
        onClose={() => setContributionGoal(null)}
        goal={contributionGoal}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (deleteCandidate) deleteSavingsGoal(deleteCandidate.id);
        }}
        title="Delete Savings Goal?"
        message={`Are you sure you want to delete "${deleteCandidate?.name}"? Its saved log history will be removed.`}
        confirmText="Delete Goal"
        confirmVariant="danger"
      />
    </div>
  );
};
