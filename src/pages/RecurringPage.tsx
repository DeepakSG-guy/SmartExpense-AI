import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, type RecurringRule, type Account, type Category } from '../types/finance';
import { calculateMonthlyRecurringEstimate } from '../services/recurringProcessor';
import { RecurringModal } from '../components/modals/RecurringModal';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import {
  Repeat,
  Plus,
  Play,
  Pause,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Zap,
} from 'lucide-react';

export const RecurringPage: React.FC = () => {
  const {
    recurringRules,
    accounts,
    categories,
    settings,
    updateRecurringRule,
    deleteRecurringRule,
    processDueRecurring,
  } = useFinance();

  const [editRule, setEditRule] = useState<RecurringRule | null>(null);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<RecurringRule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const currency = settings.currency;
  const accMap = new Map<string, Account>(accounts.map((a: Account) => [a.id, a]));
  const catMap = new Map<string, Category>(categories.map((c: Category) => [c.id, c]));

  const monthlyEstimate = calculateMonthlyRecurringEstimate(recurringRules);
  const activeRules = recurringRules.filter((r) => r.isActive);
  const pausedRules = recurringRules.filter((r) => !r.isActive);

  const handleProcessDue = async () => {
    setIsProcessing(true);
    try {
      await processDueRecurring();
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePause = async (rule: RecurringRule) => {
    await updateRecurringRule(rule.id, { isActive: !rule.isActive });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Estimated Monthly Recurring Outflow & Process Button */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Estimated Monthly Recurring Commitments
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            {formatMoney(monthlyEstimate, currency)}
            <span className="text-xs font-normal text-slate-400 ml-1.5">/ month</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {activeRules.length} active recurring rules (subscriptions, rent, utilities, SIPs)
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleProcessDue}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>{isProcessing ? 'Processing...' : 'Process Due Now'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddRuleOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Rule</span>
          </button>
        </div>
      </div>

      {/* Notice regarding client-side processing */}
      <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
        <span>
          <strong>Idempotent Local Processing:</strong> Because this app operates securely inside your browser, due recurring payments are automatically evaluated and recorded whenever you open the app. No duplicate transactions are ever created.
        </span>
      </div>

      {/* Active Rules List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Active Subscriptions & Recurring Bills ({activeRules.length})
          </h3>
        </div>

        {activeRules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeRules.map((rule) => {
              const acc = accMap.get(rule.fromAccountId);
              const cat = catMap.get(rule.categoryId);

              return (
                <div
                  key={rule.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {rule.title}
                        </span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {rule.frequency}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        Account: {acc?.name || 'Primary'} • {cat?.name || 'General'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => togglePause(rule)}
                        title="Pause Rule"
                        className="p-1 rounded-lg text-slate-400 hover:text-amber-500"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditRule(rule)}
                        title="Edit Rule"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(rule)}
                        title="Delete Rule"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Next Due Date</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {rule.nextDueDate}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">Amount</span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {formatMoney(rule.amount, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            No active recurring rules. Click &quot;New Rule&quot; to set up monthly Netflix, rent, or broadband.
          </div>
        )}
      </div>

      {/* Paused Rules (if any) */}
      {pausedRules.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-bold text-slate-500">
            Paused Subscriptions ({pausedRules.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-60">
            {pausedRules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                    {rule.title}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {formatMoney(rule.amount, currency)} • {rule.frequency}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => togglePause(rule)}
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Recurring Modal */}
      <RecurringModal
        isOpen={isAddRuleOpen || !!editRule}
        onClose={() => {
          setIsAddRuleOpen(false);
          setEditRule(null);
        }}
        editRule={editRule}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (deleteCandidate) deleteRecurringRule(deleteCandidate.id);
        }}
        title="Delete Recurring Rule?"
        message={`Are you sure you want to stop and delete the recurring rule "${deleteCandidate?.title}"? Past generated transactions will remain in your history.`}
        confirmText="Delete Rule"
        confirmVariant="danger"
      />
    </div>
  );
};
