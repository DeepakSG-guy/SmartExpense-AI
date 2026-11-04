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
    <div className="min-h-screen bg-[#FBF9F2] dark:bg-[#141416] text-[#202020] dark:text-[#F5F5F7] flex flex-col lg:flex-row transition-colors selection:bg-[#FFDB8A] selection:text-[#202020]">
      {/* Desktop Neo-Retro Sidebar */}
      <Sidebar />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-10">
        <TopHeader />
        <main className="flex-1 p-3.5 sm:p-5 lg:p-8 max-w-7xl w-full mx-auto">
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
