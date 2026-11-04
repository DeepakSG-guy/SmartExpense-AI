import React from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { MobileNav } from './MobileNav';
import { ToastContainer } from '../common/ToastContainer';
import { TransactionModal } from '../modals/TransactionModal';
import { OnboardingModal } from '../modals/OnboardingModal';
import { LocalMigrationModal } from '../auth/LocalMigrationModal';
import { NewSplitModal } from '../modals/NewSplitModal';
import { SettleSplitModal } from '../modals/SettleSplitModal';
import { ParticipantManagerModal } from '../modals/ParticipantManagerModal';
import { useFinance } from '../../context/FinanceContext';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAddTxModalOpen,
    closeAddTxModal,
    txModalInitialData,
    isMigrationModalOpen,
    closeMigrationModal,
    localMigrationCount,
  } = useFinance();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row transition-colors">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        <TopHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Global Modals & Notifications */}
      <TransactionModal
        isOpen={isAddTxModalOpen}
        onClose={closeAddTxModal}
        initialData={txModalInitialData}
      />
      <OnboardingModal />
      <LocalMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={closeMigrationModal}
        localCount={localMigrationCount}
      />
      <NewSplitModal />
      <SettleSplitModal />
      <ParticipantManagerModal />
      <ToastContainer />
    </div>
  );
};
