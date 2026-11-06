import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Sparkles, FolderPlus, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { settings, loadDemo, resetWorkspace } = useFinance();

  // Only display if user hasn't chosen an onboarding mode yet
  if (settings.hasCompletedOnboarding) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FBF9F2] dark:bg-[#1E1E22] w-full max-w-lg rounded-3xl border-2 border-[#202020] shadow-[5px_5px_0px_#202020] overflow-hidden transform transition-all p-6 sm:p-8">
        {/* Decorative Top Pill / Badge */}
        <div className="flex items-center justify-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CFB0E8] border-2 border-[#202020] text-xs font-bold text-[#1E1E1E] shadow-[2px_2px_0px_#202020]">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Welcome to SmartExpense AI</span>
          </div>
        </div>

        {/* Editorial Heading directly echoing the Dribbble screen */}
        <div className="text-center mb-6">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#202020] dark:text-white tracking-tight leading-tight">
            Track Your Spending Effortlessly
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2.5 max-w-md mx-auto leading-relaxed">
            Manage your finances using our intuitive interface and set financial goals to monitor your progress in real time.
          </p>
        </div>

        {/* 2 Options Cards */}
        <div className="space-y-3.5 my-6">
          {/* Option A: Explore Demo */}
          <button
            type="button"
            onClick={loadDemo}
            className="w-full group relative p-4.5 rounded-2xl border-2 border-[#202020] bg-[#FFDB8A] hover:bg-[#FCD269] text-left shadow-[3px_3px_0px_#202020] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1.5px_1.5px_0px_#202020] transition-all cursor-pointer flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-7 h-7 rounded-xl bg-[#202020] text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4 text-[#FFDB8A]" />
                </span>
                <span className="font-serif font-bold text-[#202020] text-base">
                  Explore Demo Mode
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#202020] bg-white border border-[#202020] px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-[#202020]/80 leading-relaxed font-medium pl-9">
                Preloaded with 35+ realistic Indian transactions, 5 accounts (HDFC, UPI, Cash), budgets, and savings goals.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#202020] flex-shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Option B: Start Clean Slate */}
          <button
            type="button"
            onClick={resetWorkspace}
            className="w-full group relative p-4.5 rounded-2xl border-2 border-[#202020] bg-white dark:bg-[#28282D] text-left shadow-[3px_3px_0px_#202020] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1.5px_1.5px_0px_#202020] transition-all cursor-pointer flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-7 h-7 rounded-xl bg-[#ADE0BB] border border-[#202020] text-[#202020] flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </span>
                <span className="font-serif font-bold text-[#202020] dark:text-white text-base">
                  Start Clean Slate
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium pl-9">
                Start with a pristine personal workspace. Creates a primary bank account with ₹20,000 opening balance ready for your records.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#202020] dark:text-white flex-shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Security & Privacy note */}
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 pt-3 border-t-2 border-[#202020]/15 dark:border-white/10">
          <ShieldCheck className="w-4 h-4 text-[#202020] dark:text-[#ADE0BB]" />
          <span>100% Client-Side Privacy: Stored locally in your browser’s IndexedDB.</span>
        </div>
      </div>
    </div>
  );
};
