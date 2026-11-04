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
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Overall Savings Goals Progress
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {formatMoney(totalSaved, currency)}
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-400">
              of {formatMoney(totalTarget, currency)} Target ({overallPct}%)
            </span>
          </div>

          <div className="w-48 sm:w-64 h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, overallPct)}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddGoalOpen(true)}
          className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs active:scale-95 transition-all cursor-pointer"
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
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-2xs"
                        style={{ backgroundColor: goal.color }}
                      >
                        <IconRenderer name={goal.icon || 'Target'} className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                          {goal.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>Target: {goal.targetDate}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditGoal(goal)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(goal)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts & Percentage */}
                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      {formatMoney(goal.savedAmount, currency)}
                    </span>
                    <span className="text-slate-400">
                      of {formatMoney(goal.targetAmount, currency)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span
                      className={`font-semibold ${
                        isCompleted ? 'text-emerald-600 flex items-center gap-1' : 'text-slate-500'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Goal Achieved!</span>
                        </>
                      ) : (
                        `${pct}% Saved`
                      )}
                    </span>
                    {!isCompleted && (
                      <span className="text-slate-400">
                        {diffMonths} mos left (~{formatMoney(monthlyPaceNeeded, currency)}/mo)
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions: Deposit / Withdraw & History */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGoalHistory(goal)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Logs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContributionGoal(goal)}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
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
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <Target className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Savings Goals Set Yet
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-5">
            Create goals for your emergency fund, dream vacation, tech gadget, or education.
          </p>
          <button
            type="button"
            onClick={() => setIsAddGoalOpen(true)}
            className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all"
          >
            Create Your First Goal
          </button>
        </div>
      )}

      {/* Goal History Drawer */}
      {selectedGoalHistory && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end"
          onClick={() => setSelectedGoalHistory(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedGoalHistory.name}
                  </h3>
                  <span className="text-xs text-slate-400">Contribution History</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGoalHistory(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {goalContribs.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {goalContribs.map((c) => (
                      <div key={c.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            {c.notes || 'Contribution'}
                          </span>
                          <span className="text-[10px] text-slate-400">{c.date}</span>
                        </div>
                        <span
                          className={`font-bold ${
                            c.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {c.amount >= 0 ? '+' : ''}{formatMoney(c.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    No contributions recorded yet.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedGoalHistory(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
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
