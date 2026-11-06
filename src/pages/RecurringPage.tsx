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
      <div className="p-6 rounded-3xl bg-[#FFDB8A] dark:bg-[#25252A] border-2 border-[#202020] shadow-[3px_3px_0px_#202020] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold text-[#202020]/70 dark:text-slate-400 tracking-wider">
            Estimated Monthly Commitments
          </span>
          <div className="text-3xl sm:text-4xl font-serif font-bold text-[#202020] dark:text-white mt-0.5">
            {formatMoney(monthlyEstimate, currency)}
            <span className="text-xs font-sans font-medium text-[#202020]/70 dark:text-slate-400 ml-2">/ month</span>
          </div>
          <p className="text-xs font-medium text-[#202020]/80 dark:text-slate-300 mt-1">
            {activeRules.length} active recurring rules (subscriptions, rent, utilities, SIPs)
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleProcessDue}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white dark:bg-[#1E1E22] hover:bg-[#FBF9F2] text-[#202020] dark:text-white text-xs sm:text-sm font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-600 fill-current" />
            <span>{isProcessing ? 'Processing...' : 'Process Due'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddRuleOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#ADE0BB] hover:bg-[#9CD3AA] text-[#202020] text-xs sm:text-sm font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Rule</span>
          </button>
        </div>
      </div>

      {/* Notice regarding client-side processing */}
      <div className="p-4 rounded-2xl bg-[#E5EAFB] dark:bg-[#1E1E2A] border-2 border-[#202020] shadow-[2px_2px_0px_#202020] text-xs text-[#202020] dark:text-slate-200 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
        <span>
          <strong className="font-bold">Idempotent Local Processing:</strong> Because this app operates securely inside your browser, due recurring payments are automatically evaluated and recorded whenever you open the app. No duplicate transactions are ever created.
        </span>
      </div>

      {/* Active Rules List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-serif font-bold text-[#202020] dark:text-white">
            Active Subscriptions & Recurring Bills ({activeRules.length})
          </h3>
        </div>

        {activeRules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRules.map((rule) => {
              const acc = accMap.get(rule.fromAccountId);
              const cat = catMap.get(rule.categoryId);

              return (
                <div
                  key={rule.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#1E1E22] border-2 border-[#202020] shadow-[2.5px_2.5px_0px_#202020] flex flex-col justify-between space-y-4 hover:shadow-[3px_3px_0px_#202020] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-[#202020] dark:text-white">
                          {rule.title}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#CFB0E8] text-[#202020] border border-[#202020]">
                          {rule.frequency}
                        </span>
                      </div>
                      <span className="text-xs text-[#626262] dark:text-slate-400 mt-1 block">
                        Account: <strong className="text-[#202020] dark:text-slate-200">{acc?.name || 'Primary'}</strong> • {cat?.name || 'General'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => togglePause(rule)}
                        title="Pause Rule"
                        className="p-1.5 rounded-lg border border-[#202020]/20 hover:border-[#202020] hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-700 transition-colors cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditRule(rule)}
                        title="Edit Rule"
                        className="p-1.5 rounded-lg border border-[#202020]/20 hover:border-[#202020] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#202020] dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(rule)}
                        title="Delete Rule"
                        className="p-1.5 rounded-lg border border-[#202020]/20 hover:border-[#202020] hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t-2 border-[#202020]/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#626262] dark:text-slate-400 text-[10px] uppercase font-bold block">Next Due Date</span>
                      <span className="font-bold text-sm text-[#202020] dark:text-slate-200">
                        {rule.nextDueDate}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#626262] dark:text-slate-400 text-[10px] uppercase font-bold block">Amount</span>
                      <span className="font-serif font-bold text-lg text-[#202020] dark:text-white">
                        {formatMoney(rule.amount, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-white dark:bg-[#1E1E22] rounded-2xl border-2 border-[#202020] shadow-[2.5px_2.5px_0px_#202020] text-xs text-[#626262] dark:text-slate-400">
            No active recurring rules. Click &quot;New Rule&quot; to set up monthly Netflix, rent, or broadband.
          </div>
        )}
      </div>

      {/* Paused Rules (if any) */}
      {pausedRules.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-[#626262] uppercase tracking-wider">
            Paused Subscriptions ({pausedRules.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pausedRules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl bg-white/70 dark:bg-[#1E1E22]/60 border-2 border-dashed border-[#202020]/50 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-sm text-[#202020] dark:text-slate-300">
                    {rule.title}
                  </span>
                  <span className="text-xs text-[#626262] dark:text-slate-400 block mt-0.5">
                    {formatMoney(rule.amount, currency)} • {rule.frequency}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => togglePause(rule)}
                  className="py-1.5 px-3 rounded-xl bg-[#ADE0BB] hover:bg-[#9CD3AA] text-[#202020] border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] text-xs font-bold flex items-center gap-1 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
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
