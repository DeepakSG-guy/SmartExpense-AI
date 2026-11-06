import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { cloudSyncService } from '../../services/cloudSyncService';
import { db } from '../../db';
import {
  CloudUpload,
  X,
  AlertCircle,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FBF9F2] dark:bg-[#1E1E22] w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-[5px_5px_0px_#202020] border-2 border-[#202020] my-auto space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFDB8A] border-2 border-[#202020] text-[#202020] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_#202020]">
              <CloudUpload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#202020] dark:text-white leading-tight">
                Migrate Local Data to Cloud?
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                Found {localCount} local financial records on this browser
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border-2 border-[#202020] bg-white dark:bg-[#28282D] text-[#202020] dark:text-white flex items-center justify-center hover:bg-[#FFDB8A] transition-colors shadow-[1.5px_1.5px_0px_#202020] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-[#FFAB83]/20 border-2 border-[#202020] text-xs font-bold text-[#202020] dark:text-white flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-4.5 rounded-2xl bg-white dark:bg-[#28282D] border-2 border-[#202020] shadow-[2px_2px_0px_#202020] space-y-2.5 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium">
          <p>
            You are signed in as <strong className="text-[#202020] dark:text-white">{user.email}</strong>. Would you like to upload your existing local IndexedDB accounts, categories, and transactions to your private Supabase PostgreSQL database?
          </p>
          <ul className="list-disc pl-4 space-y-1 text-neutral-600 dark:text-neutral-400">
            <li>Records are protected with Row Level Security (RLS) linked to your user ID.</li>
            <li>No duplicate transactions will be created.</li>
            <li>You will be able to access your financial data on any device or browser.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleSkip}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 text-xs font-bold cursor-pointer"
          >
            Keep Local (Skip)
          </button>
          <button
            type="button"
            disabled={isMigrating}
            onClick={handleMigrate}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FFDB8A] hover:bg-[#FCD269] text-[#202020] font-bold text-xs border-2 border-[#202020] shadow-[2.5px_2.5px_0px_#202020] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <CloudUpload className="w-4 h-4" />
            <span>{isMigrating ? 'Migrating to Cloud...' : 'Upload & Sync to Cloud'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
