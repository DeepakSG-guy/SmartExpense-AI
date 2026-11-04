/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { AppLayout } from './components/layout/AppLayout';

import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AccountsPage } from './pages/AccountsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { RecurringPage } from './pages/RecurringPage';
import { SavingsGoalsPage } from './pages/SavingsGoalsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { SettingsPage } from './pages/SettingsPage';
import { SplitsPage } from './pages/SplitsPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <HashRouter>
          <Routes>
            {/* Standalone Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Main Application Workspace */}
            <Route
              path="/*"
              element={
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/splits" element={<SplitsPage />} />
                    <Route path="/accounts" element={<AccountsPage />} />
                    <Route path="/budgets" element={<BudgetsPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/recurring" element={<RecurringPage />} />
                    <Route path="/goals" element={<SavingsGoalsPage />} />
                    <Route path="/ai-assistant" element={<AIAssistantPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AppLayout>
              }
            />
          </Routes>
        </HashRouter>
      </FinanceProvider>
    </AuthProvider>
  );
}
