import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Zap, Sparkles, FolderPlus, ArrowRight, ShieldCheck } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { settings, loadDemo, resetWorkspace } = useFinance();

  // Only display if user hasn't chosen an onboarding mode yet
  if (settings.hasCompletedOnboarding) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all p-6 sm:p-8">
        {/* App Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-600 items-center justify-center text-white shadow-lg shadow-emerald-600/30 mb-3">
            <Zap className="w-8 h-8 fill-current" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome to SmartExpense AI
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            Your private, modern personal finance operating system. Works offline with local IndexedDB persistence and server-side Gemini intelligence.
          </p>
        </div>

        {/* 2 Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
          {/* Option B: Explore Demo */}
          <button
            type="button"
            onClick={loadDemo}
            className="group relative p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-left hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Explore Demo Mode
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Pre-loaded with 35+ realistic Indian expense records, 5 accounts (HDFC, UPI, Cash, Cards), budgets, and savings goals.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
              <span>Launch Demo Mode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Option A: Start Fresh */}
          <button
            type="button"
            onClick={resetWorkspace}
            className="group relative p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-left hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-semibold text-slate-500 px-2 py-0.5 rounded-full">
                  Clean Slate
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Start Fresh
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Start with a clean personal workspace. Creates a primary bank account with ₹20,000 opening balance ready for your records.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:translate-x-0.5 transition-transform">
              <span>Start Blank Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* Security & Privacy note */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>100% Client-Side Privacy: Your data is stored safely in your browser’s IndexedDB.</span>
        </div>
      </div>
    </div>
  );
};
