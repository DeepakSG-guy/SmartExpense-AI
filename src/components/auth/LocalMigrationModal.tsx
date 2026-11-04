import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { cloudSyncService } from '../../services/cloudSyncService';
import { db } from '../../db';
import {
  CloudUpload,
  Database,
  ArrowRight,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface LocalMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  localCount: number;
}

export const LocalMigrationModal: React.FC<LocalMigrationModalProps> = ({
  isOpen,
  onClose,
  localCount,
}) => {
  const { user } = useAuth();
  const { refreshData, showToast } = useFinance();

  const [isMigrating, setIsMigrating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !user) return null;

  const handleMigrate = async () => {
    setIsMigrating(true);
    setErrorMsg('');

    try {
      const [
        accounts,
        categories,
        transactions,
        budgets,
        recurringRules,
        savingsGoals,
        savingsContributions,
      ] = await Promise.all([
        db.accounts.toArray(),
        db.categories.toArray(),
        db.transactions.toArray(),
        db.budgets.toArray(),
        db.recurringRules.toArray(),
        db.savingsGoals.toArray(),
        db.savingsContributions.toArray(),
      ]);

      const result = await cloudSyncService.migrateLocalToCloud(user.id, {
        accounts,
        categories,
        transactions,
        budgets,
        recurringRules,
        savingsGoals,
        savingsContributions,
      });

      showToast({
        type: 'success',
        message: `Successfully migrated ${result.migratedTransactions} transactions and ${result.migratedAccounts} accounts to Supabase!`,
      });

      await refreshData();
      onClose();
    } catch (err: any) {
      console.error('Migration error:', err);
      setErrorMsg(err.message || 'Failed to migrate local records to the cloud database.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CloudUpload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                Migrate Local Data to Cloud?
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Found {localCount} local financial records on this browser
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            You are signed in as <strong>{user.email}</strong>. Would you like to upload your existing local IndexedDB accounts, categories, and transactions to your private Supabase PostgreSQL database?
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400">
            <li>Records are protected with Row Level Security (RLS) linked to your user ID.</li>
            <li>No duplicate transactions will be created.</li>
            <li>You will be able to access your financial data on any device or browser.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleSkip}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            Keep Local (Skip)
          </button>
          <button
            type="button"
            disabled={isMigrating}
            onClick={handleMigrate}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <CloudUpload className="w-4 h-4" />
            <span>{isMigrating ? 'Migrating to Cloud...' : 'Upload & Sync to Cloud'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
