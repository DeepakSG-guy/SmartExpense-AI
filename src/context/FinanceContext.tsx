import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { db, initializeDatabase, seedDemoData, resetCleanWorkspace, DEFAULT_SETTINGS } from '../db';
import { useAuth } from './AuthContext';
import { cloudSyncService } from '../services/cloudSyncService';
import type {
  Account,
  Category,
  Transaction,
  Budget,
  RecurringRule,
  SavingsGoal,
  SavingsContribution,
  AppSettings,
  FinancialHealthMetrics,
  SpendingForecast,
  DeterministicInsight,
} from '../types/finance';
import {
  calculateAccountBalances,
  calculateNetWorth,
  calculateTotals,
  calculateBudgetStatuses,
  calculateSpendingForecast,
  generateDeterministicInsights,
  type BudgetStatus,
} from '../services/financeCalculations';
import { processDueRecurringRules } from '../services/recurringProcessor';
import { aiService, type AIHealthStatus } from '../services/aiService';
import type {
  SplitParticipant,
  ExpenseSplit,
  SplitShare,
  SplitSettlement,
  SplitWithDetails,
} from '../types/split';
import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateSplitBalances,
  enrichSplitDetails,
} from '../services/splitCalculations';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  actionText?: string;
  onAction?: () => void;
}

interface FinanceContextType {
  // State
  isLoading: boolean;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurringRules: RecurringRule[];
  savingsGoals: SavingsGoal[];
  savingsContributions: SavingsContribution[];
  settings: AppSettings;
  aiHealth: AIHealthStatus;

  // Computed
  accountBalances: Map<string, number>;
  netWorth: number;
  currentMonthTotals: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number;
  };
  budgetStatuses: BudgetStatus[];
  spendingForecast: SpendingForecast;
  deterministicInsights: DeterministicInsight[];

  // Action methods
  refreshData: () => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string, withUndo?: boolean) => Promise<void>;
  bulkAddTransactions: (txs: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<number>;

  addAccount: (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Account>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  transferMoney: (fromId: string, toId: string, amountMinor: number, notes?: string, date?: string) => Promise<Transaction>;

  addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => Promise<Budget>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  addRecurringRule: (rule: Omit<RecurringRule, 'id' | 'createdAt'>) => Promise<RecurringRule>;
  updateRecurringRule: (id: string, updates: Partial<RecurringRule>) => Promise<void>;
  deleteRecurringRule: (id: string) => Promise<void>;
  processDueRecurring: () => Promise<number>;

  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'savedAmount'>) => Promise<SavingsGoal>;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  addContribution: (goalId: string, amountMinor: number, notes?: string, linkedAccountId?: string) => Promise<void>;

  addCategory: (cat: Omit<Category, 'id' | 'createdAt'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  loadDemo: () => Promise<void>;
  resetWorkspace: () => Promise<void>;

  // Split Expenses State
  splitParticipants: SplitParticipant[];
  splits: ExpenseSplit[];
  splitShares: SplitShare[];
  splitSettlements: SplitSettlement[];
  enrichedSplits: SplitWithDetails[];
  splitBalances: {
    owedToUser: number;
    userOwes: number;
    totalSettledForUser: number;
    activeSplitsCount: number;
  };
  currentParticipantId: string;

  // Split Action Methods
  addSplit: (
    split: Omit<ExpenseSplit, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
    sharesData?: Array<{ participantId: string; amount: number; percentage?: number }>
  ) => Promise<ExpenseSplit>;
  updateSplit: (id: string, updates: Partial<ExpenseSplit>) => Promise<void>;
  deleteSplit: (id: string) => Promise<void>;
  recordSettlement: (data: Omit<SplitSettlement, 'id' | 'createdAt'>) => Promise<SplitSettlement>;
  reverseSettlement: (settlementId: string) => Promise<void>;
  addParticipant: (data: Omit<SplitParticipant, 'id' | 'createdAt'>) => Promise<SplitParticipant>;
  updateParticipant: (id: string, updates: Partial<SplitParticipant>) => Promise<void>;
  deleteParticipant: (id: string) => Promise<void>;

  // Split Modals
  isNewSplitModalOpen: boolean;
  openNewSplitModal: () => void;
  closeNewSplitModal: () => void;
  isParticipantModalOpen: boolean;
  openParticipantModal: () => void;
  closeParticipantModal: () => void;
  isSettleModalOpen: boolean;
  openSettleModal: (splitId: string, participantId: string) => void;
  closeSettleModal: () => void;
  settleModalParams?: { splitId: string; participantId: string };

  // Global modals & toasts
  isAddTxModalOpen: boolean;
  openAddTxModal: (initialData?: Partial<Transaction>) => void;
  closeAddTxModal: () => void;
  txModalInitialData?: Partial<Transaction>;

  // Cloud Sync & Storage
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'local_only' | 'error';
  isMigrationModalOpen: boolean;
  localMigrationCount: number;
  openMigrationModal: () => void;
  closeMigrationModal: () => void;
  syncFromCloud: () => Promise<void>;

  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'local_only' | 'error'>('local_only');
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [localMigrationCount, setLocalMigrationCount] = useState(0);
  const prevUserIdRef = useRef<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [savingsContributions, setSavingsContributions] = useState<SavingsContribution[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Split Expenses State
  const [splitParticipants, setSplitParticipants] = useState<SplitParticipant[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [splitShares, setSplitShares] = useState<SplitShare[]>([]);
  const [splitSettlements, setSplitSettlements] = useState<SplitSettlement[]>([]);

  // Split Modals State
  const [isNewSplitModalOpen, setIsNewSplitModalOpen] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleModalParams, setSettleModalParams] = useState<{ splitId: string; participantId: string } | undefined>();

  const openNewSplitModal = useCallback(() => setIsNewSplitModalOpen(true), []);
  const closeNewSplitModal = useCallback(() => setIsNewSplitModalOpen(false), []);
  const openParticipantModal = useCallback(() => setIsParticipantModalOpen(true), []);
  const closeParticipantModal = useCallback(() => setIsParticipantModalOpen(false), []);
  const openSettleModal = useCallback((splitId: string, participantId: string) => {
    setSettleModalParams({ splitId, participantId });
    setIsSettleModalOpen(true);
  }, []);
  const closeSettleModal = useCallback(() => {
    setIsSettleModalOpen(false);
    setSettleModalParams(undefined);
  }, []);

  const [aiHealth, setAiHealth] = useState<AIHealthStatus>({
    isAvailable: false,
    hasGeminiKey: false,
    message: 'Checking...',
  });

  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [txModalInitialData, setTxModalInitialData] = useState<Partial<Transaction> | undefined>();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openAddTxModal = useCallback((initialData?: Partial<Transaction>) => {
    setTxModalInitialData(initialData);
    setIsAddTxModalOpen(true);
  }, []);

  const closeAddTxModal = useCallback(() => {
    setIsAddTxModalOpen(false);
    setTxModalInitialData(undefined);
  }, []);

  // Fetch all tables from IndexedDB
  const refreshData = useCallback(async () => {
    try {
      const [accs, cats, txs, bgts, recs, goals, contribs, setts, parts, spls, shrs, stls] = await Promise.all([
        db.accounts.toArray(),
        db.categories.toArray(),
        db.transactions.reverse().sortBy('date'), // latest date first
        db.budgets.toArray(),
        db.recurringRules.toArray(),
        db.savingsGoals.toArray(),
        db.savingsContributions.toArray(),
        db.settings.get('current'),
        db.splitParticipants.toArray(),
        db.expenseSplits.reverse().sortBy('date'),
        db.splitShares.toArray(),
        db.splitSettlements.toArray(),
      ]);

      setAccounts(accs);
      setCategories(cats);
      setTransactions(txs);
      setBudgets(bgts);
      setRecurringRules(recs);
      setSavingsGoals(goals);
      setSavingsContributions(contribs);
      setSplitParticipants(parts);
      setSplits(spls);
      setSplitShares(shrs);
      setSplitSettlements(stls);
      if (setts) setSettings(setts);
    } catch (err) {
      console.error('Failed to load data from IndexedDB:', err);
      showToast({ type: 'error', message: 'Failed to access local browser database.' });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Initial startup: init DB, process recurring due, check AI status
  useEffect(() => {
    let mounted = true;

    async function startup() {
      try {
        const loadedSettings = await initializeDatabase();
        if (mounted) {
          setSettings(loadedSettings);
          if (loadedSettings.aiBackendUrl) {
            aiService.setBaseUrl(loadedSettings.aiBackendUrl);
          }
        }

        // Apply theme class to document
        const theme = loadedSettings.theme || 'light';
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', isDark);

        await refreshData();

        // Process any due recurring transactions
        const recurringResult = await processDueRecurringRules();
        if (recurringResult.generatedCount > 0) {
          await refreshData();
          showToast({
            type: 'info',
            message: `Processed ${recurringResult.generatedCount} due recurring transaction${recurringResult.generatedCount > 1 ? 's' : ''}.`,
          });
        }

        // Check AI backend health
        const health = await aiService.checkHealth();
        if (mounted) setAiHealth(health);
      } catch (err) {
        console.error('Startup error:', err);
      }
    }

    startup();

    return () => {
      mounted = false;
    };
  }, [refreshData, showToast]);

  // Handle Theme switching dynamically
  useEffect(() => {
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  }, [settings.theme]);

  const openMigrationModal = useCallback(() => setIsMigrationModalOpen(true), []);
  const closeMigrationModal = useCallback(() => setIsMigrationModalOpen(false), []);

  const syncFromCloud = useCallback(async () => {
    if (!user) {
      setCloudSyncStatus('local_only');
      return;
    }
    setCloudSyncStatus('syncing');
    try {
      const cloudData = await cloudSyncService.loadUserData(user.id);
      await db.transaction('rw', [
        db.accounts, db.categories, db.transactions, db.budgets, db.recurringRules, db.savingsGoals, db.savingsContributions,
        db.splitParticipants, db.expenseSplits, db.splitShares, db.splitSettlements
      ], async () => {
        await db.accounts.clear();
        await db.categories.clear();
        await db.transactions.clear();
        await db.budgets.clear();
        await db.recurringRules.clear();
        await db.savingsGoals.clear();
        await db.savingsContributions.clear();
        await db.splitParticipants.clear();
        await db.expenseSplits.clear();
        await db.splitShares.clear();
        await db.splitSettlements.clear();

        if (cloudData.accounts.length) await db.accounts.bulkPut(cloudData.accounts);
        if (cloudData.categories.length) await db.categories.bulkPut(cloudData.categories);
        if (cloudData.transactions.length) await db.transactions.bulkPut(cloudData.transactions);
        if (cloudData.budgets.length) await db.budgets.bulkPut(cloudData.budgets);
        if (cloudData.recurringRules.length) await db.recurringRules.bulkPut(cloudData.recurringRules);
        if (cloudData.savingsGoals.length) await db.savingsGoals.bulkPut(cloudData.savingsGoals);
        if (cloudData.savingsContributions.length) await db.savingsContributions.bulkPut(cloudData.savingsContributions);
        if (cloudData.splitParticipants?.length) await db.splitParticipants.bulkPut(cloudData.splitParticipants);
        if (cloudData.expenseSplits?.length) await db.expenseSplits.bulkPut(cloudData.expenseSplits);
        if (cloudData.splitShares?.length) await db.splitShares.bulkPut(cloudData.splitShares);
        if (cloudData.splitSettlements?.length) await db.splitSettlements.bulkPut(cloudData.splitSettlements);

        const selfExists = await db.splitParticipants.get('part-self');
        if (!selfExists) {
          await db.splitParticipants.put({
            id: 'part-self',
            name: 'You (Me)',
            isCurrentUser: true,
            avatarColor: '#10B981',
            createdAt: new Date().toISOString(),
          });
        }
      });
      await refreshData();
      setCloudSyncStatus('synced');
      showToast({ type: 'success', message: 'Cloud database synchronized!' });
    } catch (err: any) {
      console.error('Failed to sync cloud data:', err);
      setCloudSyncStatus('error');
      showToast({ type: 'error', message: 'Failed to sync with cloud: ' + (err.message || 'Network error') });
    }
  }, [user, refreshData, showToast]);

  // Handle User Auth State Changes (Login / Logout data isolation)
  useEffect(() => {
    const currentUserId = user?.id || null;
    const prevUserId = prevUserIdRef.current;
    if (prevUserId === currentUserId) return;
    prevUserIdRef.current = currentUserId;

    async function handleAuthChange() {
      if (currentUserId) {
        // User just logged in
        setCloudSyncStatus('syncing');
        try {
          const localTxCount = await db.transactions.count();
          const localAccCount = await db.accounts.count();
          const cloudData = await cloudSyncService.loadUserData(currentUserId);

          if (cloudData.transactions.length > 0 || cloudData.accounts.length > 0 || cloudData.expenseSplits?.length > 0) {
            // Populate cloud records into local Dexie cache
            await db.transaction('rw', [
              db.accounts, db.categories, db.transactions, db.budgets, db.recurringRules, db.savingsGoals, db.savingsContributions,
              db.splitParticipants, db.expenseSplits, db.splitShares, db.splitSettlements
            ], async () => {
              await db.accounts.clear();
              await db.categories.clear();
              await db.transactions.clear();
              await db.budgets.clear();
              await db.recurringRules.clear();
              await db.savingsGoals.clear();
              await db.savingsContributions.clear();
              await db.splitParticipants.clear();
              await db.expenseSplits.clear();
              await db.splitShares.clear();
              await db.splitSettlements.clear();

              if (cloudData.accounts.length) await db.accounts.bulkPut(cloudData.accounts);
              if (cloudData.categories.length) await db.categories.bulkPut(cloudData.categories);
              if (cloudData.transactions.length) await db.transactions.bulkPut(cloudData.transactions);
              if (cloudData.budgets.length) await db.budgets.bulkPut(cloudData.budgets);
              if (cloudData.recurringRules.length) await db.recurringRules.bulkPut(cloudData.recurringRules);
              if (cloudData.savingsGoals.length) await db.savingsGoals.bulkPut(cloudData.savingsGoals);
              if (cloudData.savingsContributions.length) await db.savingsContributions.bulkPut(cloudData.savingsContributions);
              if (cloudData.splitParticipants?.length) await db.splitParticipants.bulkPut(cloudData.splitParticipants);
              if (cloudData.expenseSplits?.length) await db.expenseSplits.bulkPut(cloudData.expenseSplits);
              if (cloudData.splitShares?.length) await db.splitShares.bulkPut(cloudData.splitShares);
              if (cloudData.splitSettlements?.length) await db.splitSettlements.bulkPut(cloudData.splitSettlements);

              const selfExists = await db.splitParticipants.get('part-self');
              if (!selfExists) {
                await db.splitParticipants.put({
                  id: 'part-self',
                  name: 'You (Me)',
                  isCurrentUser: true,
                  avatarColor: '#10B981',
                  createdAt: new Date().toISOString(),
                });
              }
            });
            await refreshData();
            setCloudSyncStatus('synced');
          } else if (localTxCount > 0 || localAccCount > 0) {
            // Cloud has 0 items, but local has items -> Offer migration
            setLocalMigrationCount(localTxCount + localAccCount);
            setIsMigrationModalOpen(true);
            setCloudSyncStatus('synced');
          } else {
            // New user with no records anywhere
            await resetCleanWorkspace();
            await refreshData();
            setCloudSyncStatus('synced');
          }
        } catch (err: any) {
          console.warn('Initial cloud sync error:', err);
          setCloudSyncStatus('offline');
        }
      } else if (prevUserId && !currentUserId) {
        // User logged out: clear memory & IndexedDB to isolate data
        await resetCleanWorkspace();
        await refreshData();
        setCloudSyncStatus('local_only');
      } else {
        setCloudSyncStatus('local_only');
      }
    }

    handleAuthChange();
  }, [user, refreshData, showToast]);

  // Computations
  const accountBalances = useMemo(() => {
    return calculateAccountBalances(accounts, transactions);
  }, [accounts, transactions]);

  const netWorth = useMemo(() => {
    return calculateNetWorth(accounts, accountBalances);
  }, [accounts, accountBalances]);

  const currentMonthTotals = useMemo(() => {
    const today = new Date();
    const curMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const daysInCurMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const curMonthStart = `${curMonthStr}-01`;
    const curMonthEnd = `${curMonthStr}-${String(daysInCurMonth).padStart(2, '0')}`;

    const monthTxs = transactions.filter((t) => t.date >= curMonthStart && t.date <= curMonthEnd);
    return calculateTotals(monthTxs);
  }, [transactions]);

  const budgetStatuses = useMemo(() => {
    const today = new Date();
    const curMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    return calculateBudgetStatuses(budgets, transactions, categories, curMonthStr);
  }, [budgets, transactions, categories]);

  const spendingForecast = useMemo(() => {
    return calculateSpendingForecast(transactions, recurringRules);
  }, [transactions, recurringRules]);

  const deterministicInsights = useMemo(() => {
    return generateDeterministicInsights(transactions, categories, budgets, accounts);
  }, [transactions, categories, budgets, accounts]);

  const currentParticipantId = useMemo(() => {
    const self = splitParticipants.find((p) => p.isCurrentUser);
    return self?.id || 'part-self';
  }, [splitParticipants]);

  const splitBalances = useMemo(() => {
    return calculateSplitBalances(splits, splitShares, splitSettlements, currentParticipantId);
  }, [splits, splitShares, splitSettlements, currentParticipantId]);

  const enrichedSplits = useMemo(() => {
    return splits.map((s) => enrichSplitDetails(s, splitParticipants, splitShares, splitSettlements, currentParticipantId));
  }, [splits, splitParticipants, splitShares, splitSettlements, currentParticipantId]);

  // CRUD Implementations

  const addTransaction = useCallback(
    async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
      // Validate
      if (!data.title?.trim()) throw new Error('Transaction description/title is required.');
      if (data.amount <= 0) throw new Error('Transaction amount must be greater than zero.');
      if (!data.fromAccountId) throw new Error('Source account is required.');
      if (data.type === 'transfer') {
        if (!data.toAccountId) throw new Error('Destination account is required for transfers.');
        if (data.toAccountId === data.fromAccountId) throw new Error('Cannot transfer money to the same account.');
      }

      const id = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const newTx: Transaction = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      };

      await db.transactions.put(newTx);
      if (user) {
        cloudSyncService.insertTransaction(newTx, user.id).catch((err) => {
          console.warn('Cloud sync insertTransaction error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Transaction recorded successfully.' });
      return newTx;
    },
    [refreshData, showToast, user]
  );

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      const existing = await db.transactions.get(id);
      if (!existing) throw new Error('Transaction not found');

      if (updates.amount !== undefined && updates.amount <= 0) {
        throw new Error('Amount must be positive');
      }

      const updatedTx = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await db.transactions.put(updatedTx);
      if (user) {
        cloudSyncService.updateTransaction(updatedTx, user.id).catch((err) => {
          console.warn('Cloud sync updateTransaction error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Transaction updated.' });
    },
    [refreshData, showToast, user]
  );

  const deleteTransaction = useCallback(
    async (id: string, withUndo: boolean = true) => {
      const existing = await db.transactions.get(id);
      if (!existing) return;

      await db.transactions.delete(id);
      if (user) {
        cloudSyncService.deleteTransaction(id).catch((err) => {
          console.warn('Cloud sync deleteTransaction error:', err);
        });
      }
      await refreshData();

      if (withUndo) {
        showToast({
          type: 'info',
          message: `Deleted "${existing.title}".`,
          actionText: 'Undo',
          onAction: async () => {
            await db.transactions.put(existing);
            if (user) {
              cloudSyncService.insertTransaction(existing, user.id).catch(console.warn);
            }
            await refreshData();
            showToast({ type: 'success', message: 'Transaction restored.' });
          },
        });
      }
    },
    [refreshData, showToast, user]
  );

  const bulkAddTransactions = useCallback(
    async (txs: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> => {
      const now = new Date().toISOString();
      const newRecords: Transaction[] = txs.map((t, idx) => ({
        ...t,
        id: `tx-bulk-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      }));

      await db.transactions.bulkPut(newRecords);
      if (user) {
        for (const t of newRecords) {
          cloudSyncService.insertTransaction(t, user.id).catch(console.warn);
        }
      }
      await refreshData();
      showToast({ type: 'success', message: `Imported ${newRecords.length} transactions.` });
      return newRecords.length;
    },
    [refreshData, showToast, user]
  );

  const addAccount = useCallback(
    async (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> => {
      if (!data.name?.trim()) throw new Error('Account name is required.');
      const id = `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const newAcc: Account = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      };

      await db.accounts.put(newAcc);
      if (user) {
        cloudSyncService.insertAccount(newAcc, user.id).catch((err) => {
          console.warn('Cloud sync insertAccount error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: `Account "${newAcc.name}" created.` });
      return newAcc;
    },
    [refreshData, showToast, user]
  );

  const updateAccount = useCallback(
    async (id: string, updates: Partial<Account>) => {
      const existing = await db.accounts.get(id);
      if (!existing) return;
      const updatedAcc = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await db.accounts.put(updatedAcc);
      if (user) {
        cloudSyncService.updateAccount(updatedAcc, user.id).catch((err) => {
          console.warn('Cloud sync updateAccount error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Account updated.' });
    },
    [refreshData, showToast, user]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      // Check if account has transactions
      const txCount = await db.transactions
        .filter((tx) => tx.fromAccountId === id || tx.toAccountId === id)
        .count();

      if (txCount > 0) {
        // Archive instead of destructive cascade to preserve history
        const existing = await db.accounts.get(id);
        if (!existing) return;
        const updatedAcc = { ...existing, isArchived: true, updatedAt: new Date().toISOString() };
        await db.accounts.put(updatedAcc);
        if (user) {
          cloudSyncService.updateAccount(updatedAcc, user.id).catch(console.warn);
        }
        await refreshData();
        showToast({
          type: 'info',
          message: `Account has ${txCount} transactions. It has been safely archived to preserve financial records.`,
        });
      } else {
        await db.accounts.delete(id);
        if (user) {
          cloudSyncService.deleteAccount(id).catch((err) => {
            console.warn('Cloud sync deleteAccount error:', err);
          });
        }
        await refreshData();
        showToast({ type: 'success', message: 'Account deleted.' });
      }
    },
    [refreshData, showToast, user]
  );

  const transferMoney = useCallback(
    async (fromId: string, toId: string, amountMinor: number, notes?: string, date?: string): Promise<Transaction> => {
      if (fromId === toId) throw new Error('Source and destination accounts must be different.');
      if (amountMinor <= 0) throw new Error('Transfer amount must be positive.');

      const fromAcc = await db.accounts.get(fromId);
      const toAcc = await db.accounts.get(toId);
      if (!fromAcc || !toAcc) throw new Error('Account not found.');

      return await addTransaction({
        title: `Transfer to ${toAcc.name}`,
        amount: amountMinor,
        type: 'transfer',
        categoryId: '',
        fromAccountId: fromId,
        toAccountId: toId,
        date: date || new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().substring(0, 5),
        paymentMethod: 'Transfer',
        notes: notes || `Funds transferred from ${fromAcc.name} to ${toAcc.name}`,
        tags: ['transfer'],
      });
    },
    [addTransaction]
  );

  const addBudget = useCallback(
    async (budget: Omit<Budget, 'id' | 'createdAt'>): Promise<Budget> => {
      if (budget.limitAmount <= 0) throw new Error('Budget limit must be greater than zero.');
      const id = `bgt-${budget.categoryId}-${budget.month}-${Date.now().toString(36)}`;
      const newBudget: Budget = {
        ...budget,
        id,
        createdAt: new Date().toISOString(),
      };
      await db.budgets.put(newBudget);
      if (user) {
        cloudSyncService.insertBudget(newBudget, user.id).catch((err) => {
          console.warn('Cloud sync insertBudget error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Budget saved.' });
      return newBudget;
    },
    [refreshData, showToast, user]
  );

  const updateBudget = useCallback(
    async (id: string, updates: Partial<Budget>) => {
      const existing = await db.budgets.get(id);
      if (!existing) return;
      const updatedBudget = { ...existing, ...updates };
      await db.budgets.put(updatedBudget);
      if (user) {
        cloudSyncService.updateBudget(updatedBudget, user.id).catch((err) => {
          console.warn('Cloud sync updateBudget error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Budget updated.' });
    },
    [refreshData, showToast, user]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      await db.budgets.delete(id);
      if (user) {
        cloudSyncService.deleteBudget(id).catch((err) => {
          console.warn('Cloud sync deleteBudget error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Budget removed.' });
    },
    [refreshData, showToast, user]
  );

  const addRecurringRule = useCallback(
    async (rule: Omit<RecurringRule, 'id' | 'createdAt'>): Promise<RecurringRule> => {
      const id = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newRule: RecurringRule = {
        ...rule,
        id,
        createdAt: new Date().toISOString(),
      };
      await db.recurringRules.put(newRule);
      if (user) {
        cloudSyncService.insertRecurringRule(newRule, user.id).catch((err) => {
          console.warn('Cloud sync insertRecurringRule error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Recurring payment rule created.' });
      return newRule;
    },
    [refreshData, showToast, user]
  );

  const updateRecurringRule = useCallback(
    async (id: string, updates: Partial<RecurringRule>) => {
      const existing = await db.recurringRules.get(id);
      if (!existing) return;
      const updatedRule = { ...existing, ...updates };
      await db.recurringRules.put(updatedRule);
      if (user) {
        cloudSyncService.updateRecurringRule(updatedRule, user.id).catch((err) => {
          console.warn('Cloud sync updateRecurringRule error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Recurring rule updated.' });
    },
    [refreshData, showToast, user]
  );

  const deleteRecurringRule = useCallback(
    async (id: string) => {
      await db.recurringRules.delete(id);
      if (user) {
        cloudSyncService.deleteRecurringRule(id).catch((err) => {
          console.warn('Cloud sync deleteRecurringRule error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Recurring rule deleted.' });
    },
    [refreshData, showToast, user]
  );

  const processDueRecurring = useCallback(async (): Promise<number> => {
    const res = await processDueRecurringRules();
    await refreshData();
    if (res.generatedCount > 0) {
      showToast({ type: 'success', message: `Processed ${res.generatedCount} due transactions.` });
    } else {
      showToast({ type: 'info', message: 'No recurring payments are currently due.' });
    }
    return res.generatedCount;
  }, [refreshData, showToast]);

  const addSavingsGoal = useCallback(
    async (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'savedAmount'>): Promise<SavingsGoal> => {
      const id = `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const newGoal: SavingsGoal = {
        ...goal,
        id,
        savedAmount: 0,
        createdAt: now,
        updatedAt: now,
      };
      await db.savingsGoals.put(newGoal);
      if (user) {
        cloudSyncService.insertSavingsGoal(newGoal, user.id).catch((err) => {
          console.warn('Cloud sync insertSavingsGoal error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: `Savings goal "${newGoal.name}" created.` });
      return newGoal;
    },
    [refreshData, showToast, user]
  );

  const updateSavingsGoal = useCallback(
    async (id: string, updates: Partial<SavingsGoal>) => {
      const existing = await db.savingsGoals.get(id);
      if (!existing) return;
      const updatedGoal = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await db.savingsGoals.put(updatedGoal);
      if (user) {
        cloudSyncService.updateSavingsGoal(updatedGoal, user.id).catch((err) => {
          console.warn('Cloud sync updateSavingsGoal error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Savings goal updated.' });
    },
    [refreshData, showToast, user]
  );

  const deleteSavingsGoal = useCallback(
    async (id: string) => {
      await db.savingsContributions.where('goalId').equals(id).delete();
      await db.savingsGoals.delete(id);
      if (user) {
        cloudSyncService.deleteSavingsGoal(id).catch((err) => {
          console.warn('Cloud sync deleteSavingsGoal error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Savings goal removed.' });
    },
    [refreshData, showToast, user]
  );

  const addContribution = useCallback(
    async (goalId: string, amountMinor: number, notes?: string, linkedAccountId?: string) => {
      const goal = await db.savingsGoals.get(goalId);
      if (!goal) throw new Error('Goal not found');

      const id = `contrib-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const contrib: SavingsContribution = {
        id,
        goalId,
        amount: amountMinor,
        date: new Date().toISOString().split('T')[0],
        notes,
        linkedAccountId,
        createdAt: new Date().toISOString(),
      };

      await db.savingsContributions.put(contrib);
      if (user) {
        cloudSyncService.insertSavingsContribution(contrib, user.id).catch(console.warn);
      }

      // Recalculate goal savedAmount
      const allContribs = await db.savingsContributions.where('goalId').equals(goalId).toArray();
      const newSaved = allContribs.reduce((sum, c) => sum + c.amount, 0);

      const updatedGoal = {
        ...goal,
        savedAmount: Math.max(0, newSaved),
        updatedAt: new Date().toISOString(),
      };
      await db.savingsGoals.put(updatedGoal);
      if (user) {
        cloudSyncService.updateSavingsGoal(updatedGoal, user.id).catch(console.warn);
      }

      if (linkedAccountId && amountMinor > 0) {
        await addTransaction({
          title: `Goal Savings: ${goal.name}`,
          amount: amountMinor,
          type: 'expense',
          categoryId: 'cat-investments',
          fromAccountId: linkedAccountId,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().substring(0, 5),
          notes: `Linked contribution to ${goal.name}`,
          tags: ['savings-goal'],
        });
      }

      await refreshData();
      showToast({ type: 'success', message: `Added contribution to ${goal.name}!` });
    },
    [refreshData, showToast, addTransaction, user]
  );

  const addCategory = useCallback(
    async (cat: Omit<Category, 'id' | 'createdAt'>): Promise<Category> => {
      const id = `cat-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newCat: Category = {
        ...cat,
        id,
        isDefault: false,
        createdAt: new Date().toISOString(),
      };
      await db.categories.put(newCat);
      if (user) {
        cloudSyncService.insertCategory(newCat, user.id).catch((err) => {
          console.warn('Cloud sync insertCategory error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: `Category "${newCat.name}" added.` });
      return newCat;
    },
    [refreshData, showToast, user]
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Category>) => {
      const existing = await db.categories.get(id);
      if (!existing) return;
      const updatedCat = { ...existing, ...updates };
      await db.categories.put(updatedCat);
      if (user) {
        cloudSyncService.updateCategory(updatedCat, user.id).catch((err) => {
          console.warn('Cloud sync updateCategory error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Category updated.' });
    },
    [refreshData, showToast, user]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const txCount = await db.transactions.where('categoryId').equals(id).count();
      if (txCount > 0) {
        throw new Error(`Cannot delete category because it is used by ${txCount} transactions.`);
      }
      await db.categories.delete(id);
      if (user) {
        cloudSyncService.deleteCategory(id).catch((err) => {
          console.warn('Cloud sync deleteCategory error:', err);
        });
      }
      await refreshData();
      showToast({ type: 'success', message: 'Category removed.' });
    },
    [refreshData, showToast, user]
  );

  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      const updated = { ...settings, ...updates };
      await db.settings.put(updated);
      setSettings(updated);
      if (updates.aiBackendUrl !== undefined) {
        aiService.setBaseUrl(updates.aiBackendUrl);
        const health = await aiService.checkHealth();
        setAiHealth(health);
      }
      await refreshData();
      showToast({ type: 'success', message: 'Preferences updated.' });
    },
    [settings, refreshData, showToast]
  );

  const loadDemo = useCallback(async () => {
    setIsLoading(true);
    await seedDemoData();
    await refreshData();
    showToast({ type: 'success', message: 'Loaded realistic demo finance workspace!' });
  }, [refreshData, showToast]);

  const resetWorkspace = useCallback(async () => {
    setIsLoading(true);
    await resetCleanWorkspace();
    await refreshData();
    showToast({ type: 'info', message: 'Workspace reset to a clean slate.' });
  }, [refreshData, showToast]);

  // Split Expense Action Methods
  const addSplit = useCallback(
    async (
      splitData: Omit<ExpenseSplit, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
      sharesData?: Array<{ participantId: string; amount: number; percentage?: number }>
    ): Promise<ExpenseSplit> => {
      if (!splitData.title?.trim()) throw new Error('Split title is required.');
      if (splitData.totalAmount <= 0) throw new Error('Total split amount must be greater than zero.');
      if (!splitData.payerParticipantId) throw new Error('Payer must be selected.');

      const splitId = `split-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      let finalShares: SplitShare[] = [];

      if (splitData.splitMethod === 'equal') {
        const participantIds = sharesData?.map((s) => s.participantId) || [];
        const calculated = calculateEqualSplit(splitData.totalAmount, participantIds, splitData.payerParticipantId);
        finalShares = calculated.map((c, idx) => ({
          id: `sh-${splitId}-${idx}`,
          splitId,
          participantId: c.participantId,
          amount: c.amount,
          settledAmount: c.participantId === splitData.payerParticipantId ? c.amount : 0,
          isPaid: c.participantId === splitData.payerParticipantId,
        }));
      } else if (splitData.splitMethod === 'percentage') {
        const pctData = (sharesData || []).map((s) => ({
          participantId: s.participantId,
          percentage: s.percentage || 0,
        }));
        const calculated = calculatePercentageSplit(splitData.totalAmount, pctData, splitData.payerParticipantId);
        finalShares = calculated.map((c, idx) => ({
          id: `sh-${splitId}-${idx}`,
          splitId,
          participantId: c.participantId,
          amount: c.amount,
          percentage: c.percentage,
          settledAmount: c.participantId === splitData.payerParticipantId ? c.amount : 0,
          isPaid: c.participantId === splitData.payerParticipantId,
        }));
      } else {
        // Custom distribution
        finalShares = (sharesData || []).map((s, idx) => ({
          id: `sh-${splitId}-${idx}`,
          splitId,
          participantId: s.participantId,
          amount: s.amount,
          settledAmount: s.participantId === splitData.payerParticipantId ? s.amount : 0,
          isPaid: s.participantId === splitData.payerParticipantId,
        }));
      }

      const allSettled = finalShares.every((s) => s.isPaid);

      const newSplit: ExpenseSplit = {
        ...splitData,
        id: splitId,
        status: allSettled ? 'settled' : 'active',
        createdAt: now,
        updatedAt: now,
      };

      await db.transaction('rw', [db.expenseSplits, db.splitShares], async () => {
        await db.expenseSplits.put(newSplit);
        await db.splitShares.bulkPut(finalShares);
      });

      // Upfront payment linked transaction
      if (splitData.linkedAccountId && splitData.payerParticipantId === currentParticipantId) {
        try {
          await addTransaction({
            title: `Split: ${splitData.title}`,
            amount: splitData.totalAmount,
            type: 'expense',
            categoryId: splitData.categoryId || 'cat-canteen-mess',
            fromAccountId: splitData.linkedAccountId,
            date: splitData.date,
            notes: `Upfront group payment for "${splitData.title}". Remaining friends will reimburse.`,
            tags: ['split-expense'],
          });
        } catch (e) {
          console.warn('Failed to link upfront split transaction:', e);
        }
      }

      if (user) {
        cloudSyncService.insertExpenseSplit(newSplit, finalShares, user.id).catch(console.warn);
      }

      await refreshData();
      showToast({ type: 'success', message: `Split "${newSplit.title}" created successfully!` });
      return newSplit;
    },
    [currentParticipantId, addTransaction, user, refreshData, showToast]
  );

  const updateSplit = useCallback(
    async (id: string, updates: Partial<ExpenseSplit>) => {
      const existing = await db.expenseSplits.get(id);
      if (!existing) return;
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      await db.expenseSplits.put(updated);
      if (user) cloudSyncService.updateExpenseSplit(updated, user.id).catch(console.warn);
      await refreshData();
      showToast({ type: 'success', message: 'Split updated.' });
    },
    [user, refreshData, showToast]
  );

  const deleteSplit = useCallback(
    async (id: string) => {
      await db.transaction('rw', [db.expenseSplits, db.splitShares, db.splitSettlements], async () => {
        await db.splitSettlements.where('splitId').equals(id).delete();
        await db.splitShares.where('splitId').equals(id).delete();
        await db.expenseSplits.delete(id);
      });
      if (user) cloudSyncService.deleteExpenseSplit(id).catch(console.warn);
      await refreshData();
      showToast({ type: 'info', message: 'Split deleted.' });
    },
    [user, refreshData, showToast]
  );

  const recordSettlement = useCallback(
    async (data: Omit<SplitSettlement, 'id' | 'createdAt'>): Promise<SplitSettlement> => {
      if (data.amount <= 0) throw new Error('Settlement amount must be positive.');
      const settlementId = `stl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newSettlement: SplitSettlement = {
        ...data,
        id: settlementId,
        createdAt: new Date().toISOString(),
      };

      await db.transaction('rw', [db.expenseSplits, db.splitShares, db.splitSettlements], async () => {
        await db.splitSettlements.put(newSettlement);

        // Find the matching share to update settledAmount
        const targetShare = await db.splitShares
          .where('splitId')
          .equals(data.splitId)
          .and((sh) => sh.participantId === data.fromParticipantId)
          .first();

        if (targetShare) {
          const newSettled = (targetShare.settledAmount || 0) + data.amount;
          const isNowPaid = newSettled >= targetShare.amount;
          const updatedShare = { ...targetShare, settledAmount: newSettled, isPaid: isNowPaid };
          await db.splitShares.put(updatedShare);
          if (user) cloudSyncService.updateSplitShare(updatedShare, user.id).catch(console.warn);
        }

        // Check if all shares are now fully paid
        const allShares = await db.splitShares.where('splitId').equals(data.splitId).toArray();
        const allPaid = allShares.every((s) =>
          s.participantId === data.fromParticipantId
            ? (s.settledAmount + data.amount) >= s.amount
            : s.isPaid
        );

        if (allPaid) {
          const split = await db.expenseSplits.get(data.splitId);
          if (split) {
            const updatedSplit = { ...split, status: 'settled' as const, updatedAt: new Date().toISOString() };
            await db.expenseSplits.put(updatedSplit);
            if (user) cloudSyncService.updateExpenseSplit(updatedSplit, user.id).catch(console.warn);
          }
        }
      });

      if (user) {
        cloudSyncService.insertSplitSettlement(newSettlement, user.id).catch(console.warn);
      }

      await refreshData();
      showToast({ type: 'success', message: 'Settlement recorded successfully!' });
      return newSettlement;
    },
    [user, refreshData, showToast]
  );

  const reverseSettlement = useCallback(
    async (settlementId: string) => {
      const settlement = await db.splitSettlements.get(settlementId);
      if (!settlement) return;

      await db.transaction('rw', [db.expenseSplits, db.splitShares, db.splitSettlements], async () => {
        // Revert share
        const targetShare = await db.splitShares
          .where('splitId')
          .equals(settlement.splitId)
          .and((sh) => sh.participantId === settlement.fromParticipantId)
          .first();

        if (targetShare) {
          const newSettled = Math.max(0, (targetShare.settledAmount || 0) - settlement.amount);
          const updatedShare = { ...targetShare, settledAmount: newSettled, isPaid: false };
          await db.splitShares.put(updatedShare);
          if (user) cloudSyncService.updateSplitShare(updatedShare, user.id).catch(console.warn);
        }

        // Revert split status to active
        const split = await db.expenseSplits.get(settlement.splitId);
        if (split && split.status === 'settled') {
          const updatedSplit = { ...split, status: 'active' as const, updatedAt: new Date().toISOString() };
          await db.expenseSplits.put(updatedSplit);
          if (user) cloudSyncService.updateExpenseSplit(updatedSplit, user.id).catch(console.warn);
        }

        await db.splitSettlements.delete(settlementId);
      });

      if (user) cloudSyncService.deleteSplitSettlement(settlementId).catch(console.warn);
      await refreshData();
      showToast({ type: 'info', message: 'Settlement reversed and undone.' });
    },
    [user, refreshData, showToast]
  );

  const addParticipant = useCallback(
    async (data: Omit<SplitParticipant, 'id' | 'createdAt'>): Promise<SplitParticipant> => {
      if (!data.name?.trim()) throw new Error('Participant name is required.');
      const id = `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newPart: SplitParticipant = {
        ...data,
        id,
        createdAt: new Date().toISOString(),
      };
      await db.splitParticipants.put(newPart);
      if (user) cloudSyncService.insertSplitParticipant(newPart, user.id).catch(console.warn);
      await refreshData();
      showToast({ type: 'success', message: `Added "${newPart.name}" to contacts.` });
      return newPart;
    },
    [user, refreshData, showToast]
  );

  const updateParticipant = useCallback(
    async (id: string, updates: Partial<SplitParticipant>) => {
      const existing = await db.splitParticipants.get(id);
      if (!existing) return;
      const updated = { ...existing, ...updates };
      await db.splitParticipants.put(updated);
      if (user) cloudSyncService.updateSplitParticipant(updated, user.id).catch(console.warn);
      await refreshData();
      showToast({ type: 'success', message: 'Contact updated.' });
    },
    [user, refreshData, showToast]
  );

  const deleteParticipant = useCallback(
    async (id: string) => {
      const existing = await db.splitParticipants.get(id);
      if (existing?.isCurrentUser) throw new Error('Cannot delete your own user profile.');
      const count = await db.splitShares.where('participantId').equals(id).count();
      if (count > 0) {
        throw new Error(`Cannot delete this contact because they are part of ${count} split records.`);
      }
      await db.splitParticipants.delete(id);
      if (user) cloudSyncService.deleteSplitParticipant(id).catch(console.warn);
      await refreshData();
      showToast({ type: 'info', message: 'Contact removed.' });
    },
    [user, refreshData, showToast]
  );

  const value = useMemo(
    () => ({
      isLoading,
      accounts,
      categories,
      transactions,
      budgets,
      recurringRules,
      savingsGoals,
      savingsContributions,
      settings,
      aiHealth,
      accountBalances,
      netWorth,
      currentMonthTotals,
      budgetStatuses,
      spendingForecast,
      deterministicInsights,
      refreshData,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      bulkAddTransactions,
      addAccount,
      updateAccount,
      deleteAccount,
      transferMoney,
      addBudget,
      updateBudget,
      deleteBudget,
      addRecurringRule,
      updateRecurringRule,
      deleteRecurringRule,
      processDueRecurring,
      addSavingsGoal,
      updateSavingsGoal,
      deleteSavingsGoal,
      addContribution,
      addCategory,
      updateCategory,
      deleteCategory,
      updateSettings,
      loadDemo,
      resetWorkspace,
      // Splits
      splitParticipants,
      splits,
      splitShares,
      splitSettlements,
      enrichedSplits,
      splitBalances,
      currentParticipantId,
      addSplit,
      updateSplit,
      deleteSplit,
      recordSettlement,
      reverseSettlement,
      addParticipant,
      updateParticipant,
      deleteParticipant,
      isNewSplitModalOpen,
      openNewSplitModal,
      closeNewSplitModal,
      isParticipantModalOpen,
      openParticipantModal,
      closeParticipantModal,
      isSettleModalOpen,
      openSettleModal,
      closeSettleModal,
      settleModalParams,
      // Modals
      isAddTxModalOpen,
      openAddTxModal,
      closeAddTxModal,
      txModalInitialData,
      cloudSyncStatus,
      isMigrationModalOpen,
      localMigrationCount,
      openMigrationModal,
      closeMigrationModal,
      syncFromCloud,
      toasts,
      showToast,
      dismissToast,
    }),
    [
      isLoading,
      accounts,
      categories,
      transactions,
      budgets,
      recurringRules,
      savingsGoals,
      savingsContributions,
      settings,
      aiHealth,
      accountBalances,
      netWorth,
      currentMonthTotals,
      budgetStatuses,
      spendingForecast,
      deterministicInsights,
      refreshData,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      bulkAddTransactions,
      addAccount,
      updateAccount,
      deleteAccount,
      transferMoney,
      addBudget,
      updateBudget,
      deleteBudget,
      addRecurringRule,
      updateRecurringRule,
      deleteRecurringRule,
      processDueRecurring,
      addSavingsGoal,
      updateSavingsGoal,
      deleteSavingsGoal,
      addContribution,
      addCategory,
      updateCategory,
      deleteCategory,
      updateSettings,
      loadDemo,
      resetWorkspace,
      splitParticipants,
      splits,
      splitShares,
      splitSettlements,
      enrichedSplits,
      splitBalances,
      currentParticipantId,
      addSplit,
      updateSplit,
      deleteSplit,
      recordSettlement,
      reverseSettlement,
      addParticipant,
      updateParticipant,
      deleteParticipant,
      isNewSplitModalOpen,
      openNewSplitModal,
      closeNewSplitModal,
      isParticipantModalOpen,
      openParticipantModal,
      closeParticipantModal,
      isSettleModalOpen,
      openSettleModal,
      closeSettleModal,
      settleModalParams,
      isAddTxModalOpen,
      openAddTxModal,
      closeAddTxModal,
      txModalInitialData,
      cloudSyncStatus,
      isMigrationModalOpen,
      localMigrationCount,
      openMigrationModal,
      closeMigrationModal,
      syncFromCloud,
      toasts,
      showToast,
      dismissToast,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
