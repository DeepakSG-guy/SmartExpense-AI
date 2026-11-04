import { getSupabaseClient } from './supabaseClient';
import type {
  Account,
  Category,
  Transaction,
  Budget,
  RecurringRule,
  SavingsGoal,
  SavingsContribution,
} from '../types/finance';
import type {
  SplitParticipant,
  ExpenseSplit,
  SplitShare,
  SplitSettlement,
} from '../types/split';

/**
 * Model converters between TypeScript application domain and Supabase PostgreSQL schema.
 */

export function accountToDb(acc: Account, userId: string) {
  return {
    id: acc.id,
    user_id: userId,
    name: acc.name,
    type: acc.type,
    initial_balance: acc.initialBalance,
    currency: acc.currency,
    color: acc.color,
    icon: acc.icon,
    account_number_masked: acc.accountNumberMasked || null,
    is_archived: acc.isArchived,
    notes: acc.notes || null,
    created_at: acc.createdAt || new Date().toISOString(),
    updated_at: acc.updatedAt || new Date().toISOString(),
  };
}

export function accountFromDb(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    initialBalance: Number(row.initial_balance),
    currency: row.currency,
    color: row.color,
    icon: row.icon,
    accountNumberMasked: row.account_number_masked || undefined,
    isArchived: !!row.is_archived,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function categoryToDb(cat: Category, userId: string) {
  return {
    id: cat.id,
    user_id: userId,
    name: cat.name,
    type: cat.type,
    icon: cat.icon,
    color: cat.color,
    is_default: cat.isDefault,
    created_at: cat.createdAt || new Date().toISOString(),
  };
}

export function categoryFromDb(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
    isDefault: !!row.is_default,
    createdAt: row.created_at,
  };
}

export function transactionToDb(tx: Transaction, userId: string) {
  return {
    id: tx.id,
    user_id: userId,
    title: tx.title,
    amount: tx.amount,
    type: tx.type,
    category_id: tx.categoryId || null,
    from_account_id: tx.fromAccountId,
    to_account_id: tx.toAccountId || null,
    date: tx.date,
    time: tx.time || null,
    payment_method: tx.paymentMethod || null,
    notes: tx.notes || null,
    tags: tx.tags || [],
    receipt_url: tx.receiptUrl || null,
    recurring_rule_id: tx.recurringRuleId || null,
    created_at: tx.createdAt || new Date().toISOString(),
    updated_at: tx.updatedAt || new Date().toISOString(),
  };
}

export function transactionFromDb(row: any): Transaction {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    type: row.type,
    categoryId: row.category_id || '',
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id || undefined,
    date: row.date,
    time: row.time || undefined,
    paymentMethod: row.payment_method || undefined,
    notes: row.notes || undefined,
    tags: row.tags || [],
    receiptUrl: row.receipt_url || undefined,
    recurringRuleId: row.recurring_rule_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function budgetToDb(b: Budget, userId: string) {
  return {
    id: b.id,
    user_id: userId,
    category_id: b.categoryId,
    month: b.month,
    limit_amount: b.limitAmount,
    warning_threshold: b.warningThreshold || 75,
    danger_threshold: b.dangerThreshold || 90,
    created_at: b.createdAt || new Date().toISOString(),
  };
}

export function budgetFromDb(row: any): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    month: row.month,
    limitAmount: Number(row.limit_amount),
    warningThreshold: row.warning_threshold,
    dangerThreshold: row.danger_threshold,
    createdAt: row.created_at,
  };
}

export function recurringRuleToDb(r: RecurringRule, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    title: r.title,
    amount: r.amount,
    type: r.type,
    category_id: r.categoryId,
    from_account_id: r.fromAccountId,
    to_account_id: r.toAccountId || null,
    frequency: r.frequency,
    start_date: r.startDate,
    end_date: r.endDate || null,
    next_due_date: r.nextDueDate,
    last_generated_date: r.lastGeneratedDate || null,
    is_active: r.isActive,
    notes: r.notes || null,
    created_at: r.createdAt || new Date().toISOString(),
  };
}

export function recurringRuleFromDb(row: any): RecurringRule {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    type: row.type,
    categoryId: row.category_id,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id || undefined,
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    nextDueDate: row.next_due_date,
    lastGeneratedDate: row.last_generated_date || undefined,
    isActive: !!row.is_active,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function savingsGoalToDb(g: SavingsGoal, userId: string) {
  return {
    id: g.id,
    user_id: userId,
    name: g.name,
    target_amount: g.targetAmount,
    saved_amount: g.savedAmount,
    target_date: g.targetDate,
    color: g.color,
    icon: g.icon,
    notes: g.notes || null,
    created_at: g.createdAt || new Date().toISOString(),
    updated_at: g.updatedAt || new Date().toISOString(),
  };
}

export function savingsGoalFromDb(row: any): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    savedAmount: Number(row.saved_amount),
    targetDate: row.target_date,
    color: row.color,
    icon: row.icon,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function savingsContributionToDb(c: SavingsContribution, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    goal_id: c.goalId,
    amount: c.amount,
    date: c.date,
    notes: c.notes || null,
    linked_account_id: c.linkedAccountId || null,
    created_at: c.createdAt || new Date().toISOString(),
  };
}

export function savingsContributionFromDb(row: any): SavingsContribution {
  return {
    id: row.id,
    goalId: row.goal_id,
    amount: Number(row.amount),
    date: row.date,
    notes: row.notes || undefined,
    linkedAccountId: row.linked_account_id || undefined,
    createdAt: row.created_at,
  };
}

export function splitParticipantToDb(p: SplitParticipant, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    email: p.email || null,
    phone: p.phone || null,
    upi_id: p.upiId || null,
    is_current_user: p.isCurrentUser,
    avatar_color: p.avatarColor || null,
    notes: p.notes || null,
    created_at: p.createdAt || new Date().toISOString(),
  };
}

export function splitParticipantFromDb(row: any): SplitParticipant {
  return {
    id: row.id,
    name: row.name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    upiId: row.upi_id || undefined,
    isCurrentUser: !!row.is_current_user,
    avatarColor: row.avatar_color || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function expenseSplitToDb(s: ExpenseSplit, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    title: s.title,
    total_amount: s.totalAmount,
    currency: s.currency,
    split_method: s.splitMethod,
    payer_participant_id: s.payerParticipantId,
    date: s.date,
    category_id: s.categoryId || null,
    linked_account_id: s.linkedAccountId || null,
    linked_transaction_id: s.linkedTransactionId || null,
    notes: s.notes || null,
    status: s.status,
    created_at: s.createdAt || new Date().toISOString(),
    updated_at: s.updatedAt || new Date().toISOString(),
  };
}

export function expenseSplitFromDb(row: any): ExpenseSplit {
  return {
    id: row.id,
    title: row.title,
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    splitMethod: row.split_method,
    payerParticipantId: row.payer_participant_id,
    date: row.date,
    categoryId: row.category_id || undefined,
    linkedAccountId: row.linked_account_id || undefined,
    linkedTransactionId: row.linked_transaction_id || undefined,
    notes: row.notes || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function splitShareToDb(sh: SplitShare, userId: string) {
  return {
    id: sh.id,
    user_id: userId,
    split_id: sh.splitId,
    participant_id: sh.participantId,
    amount: sh.amount,
    percentage: sh.percentage || null,
    settled_amount: sh.settledAmount,
    is_paid: sh.isPaid,
  };
}

export function splitShareFromDb(row: any): SplitShare {
  return {
    id: row.id,
    splitId: row.split_id,
    participantId: row.participant_id,
    amount: Number(row.amount),
    percentage: row.percentage ? Number(row.percentage) : undefined,
    settledAmount: Number(row.settled_amount),
    isPaid: !!row.is_paid,
  };
}

export function splitSettlementToDb(st: SplitSettlement, userId: string) {
  return {
    id: st.id,
    user_id: userId,
    split_id: st.splitId,
    from_participant_id: st.fromParticipantId,
    to_participant_id: st.toParticipantId,
    amount: st.amount,
    payment_mode: st.paymentMode,
    date: st.date,
    notes: st.notes || null,
    created_at: st.createdAt || new Date().toISOString(),
  };
}

export function splitSettlementFromDb(row: any): SplitSettlement {
  return {
    id: row.id,
    splitId: row.split_id,
    fromParticipantId: row.from_participant_id,
    toParticipantId: row.to_participant_id,
    amount: Number(row.amount),
    paymentMode: row.payment_mode,
    date: row.date,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Cloud Data Access & Synchronization Engine
 */
export class CloudSyncService {
  /**
   * Loads all records belonging to the authenticated user from Supabase.
   */
  async loadUserData(userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not available');

    const [
      accountsRes,
      categoriesRes,
      transactionsRes,
      budgetsRes,
      recurringRes,
      goalsRes,
      contribsRes,
    ] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at', { ascending: true }),
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('budgets').select('*'),
      supabase.from('recurring_rules').select('*'),
      supabase.from('savings_goals').select('*'),
      supabase.from('savings_contributions').select('*'),
    ]);

    if (accountsRes.error) throw accountsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;
    if (transactionsRes.error) throw transactionsRes.error;

    // Optional fetch for splits (gracefully handles if migration isn't run yet)
    let splitParticipants: SplitParticipant[] = [];
    let expenseSplits: ExpenseSplit[] = [];
    let splitShares: SplitShare[] = [];
    let splitSettlements: SplitSettlement[] = [];

    try {
      const [partRes, splitRes, shareRes, stlRes] = await Promise.all([
        supabase.from('split_participants').select('*'),
        supabase.from('expense_splits').select('*'),
        supabase.from('split_shares').select('*'),
        supabase.from('split_settlements').select('*'),
      ]);
      if (!partRes.error && partRes.data) splitParticipants = partRes.data.map(splitParticipantFromDb);
      if (!splitRes.error && splitRes.data) expenseSplits = splitRes.data.map(expenseSplitFromDb);
      if (!shareRes.error && shareRes.data) splitShares = shareRes.data.map(splitShareFromDb);
      if (!stlRes.error && stlRes.data) splitSettlements = stlRes.data.map(splitSettlementFromDb);
    } catch (e) {
      console.warn('Remote splits sync check:', e);
    }

    return {
      accounts: (accountsRes.data || []).map(accountFromDb),
      categories: (categoriesRes.data || []).map(categoryFromDb),
      transactions: (transactionsRes.data || []).map(transactionFromDb),
      budgets: (budgetsRes.data || []).map(budgetFromDb),
      recurringRules: (recurringRes.data || []).map(recurringRuleFromDb),
      savingsGoals: (goalsRes.data || []).map(savingsGoalFromDb),
      savingsContributions: (contribsRes.data || []).map(savingsContributionFromDb),
      splitParticipants,
      expenseSplits,
      splitShares,
      splitSettlements,
    };
  }

  /**
   * Migrates local IndexedDB records to Supabase PostgreSQL for the signed-in user.
   * Avoids duplicate records by checking existing remote IDs.
   */
  async migrateLocalToCloud(
    userId: string,
    localData: {
      accounts: Account[];
      categories: Category[];
      transactions: Transaction[];
      budgets: Budget[];
      recurringRules: RecurringRule[];
      savingsGoals: SavingsGoal[];
      savingsContributions: SavingsContribution[];
    }
  ): Promise<{
    migratedAccounts: number;
    migratedCategories: number;
    migratedTransactions: number;
    migratedBudgets: number;
    migratedRecurring: number;
    migratedGoals: number;
  }> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not available');

    // 1. Migrate Categories
    if (localData.categories.length > 0) {
      const catRows = localData.categories.map((c) => categoryToDb(c, userId));
      await supabase.from('categories').upsert(catRows, { onConflict: 'id' });
    }

    // 2. Migrate Accounts
    if (localData.accounts.length > 0) {
      const accRows = localData.accounts.map((a) => accountToDb(a, userId));
      await supabase.from('accounts').upsert(accRows, { onConflict: 'id' });
    }

    // 3. Migrate Transactions
    if (localData.transactions.length > 0) {
      const txRows = localData.transactions.map((t) => transactionToDb(t, userId));
      // Chunk transactions in batches of 100 to avoid payload size limits
      for (let i = 0; i < txRows.length; i += 100) {
        const chunk = txRows.slice(i, i + 100);
        await supabase.from('transactions').upsert(chunk, { onConflict: 'id' });
      }
    }

    // 4. Migrate Budgets
    if (localData.budgets.length > 0) {
      const bgtRows = localData.budgets.map((b) => budgetToDb(b, userId));
      await supabase.from('budgets').upsert(bgtRows, { onConflict: 'id' });
    }

    // 5. Migrate Recurring Rules
    if (localData.recurringRules.length > 0) {
      const recRows = localData.recurringRules.map((r) => recurringRuleToDb(r, userId));
      await supabase.from('recurring_rules').upsert(recRows, { onConflict: 'id' });
    }

    // 6. Migrate Savings Goals & Contributions
    if (localData.savingsGoals.length > 0) {
      const goalRows = localData.savingsGoals.map((g) => savingsGoalToDb(g, userId));
      await supabase.from('savings_goals').upsert(goalRows, { onConflict: 'id' });
    }
    if (localData.savingsContributions.length > 0) {
      const contribRows = localData.savingsContributions.map((c) => savingsContributionToDb(c, userId));
      await supabase.from('savings_contributions').upsert(contribRows, { onConflict: 'id' });
    }

    return {
      migratedAccounts: localData.accounts.length,
      migratedCategories: localData.categories.length,
      migratedTransactions: localData.transactions.length,
      migratedBudgets: localData.budgets.length,
      migratedRecurring: localData.recurringRules.length,
      migratedGoals: localData.savingsGoals.length,
    };
  }

  // Real-time Single Entity Operations
  async insertTransaction(tx: Transaction, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('transactions').insert(transactionToDb(tx, userId));
    if (error) throw error;
  }

  async updateTransaction(tx: Transaction, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from('transactions')
      .update(transactionToDb(tx, userId))
      .eq('id', tx.id);
    if (error) throw error;
  }

  async deleteTransaction(id: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }

  async insertAccount(acc: Account, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('accounts').insert(accountToDb(acc, userId));
    if (error) throw error;
  }

  async updateAccount(acc: Account, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('accounts').update(accountToDb(acc, userId)).eq('id', acc.id);
    if (error) throw error;
  }

  async deleteAccount(id: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) throw error;
  }

  async insertBudget(b: Budget, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('budgets').insert(budgetToDb(b, userId));
    if (error) throw error;
  }

  async updateBudget(b: Budget, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('budgets').update(budgetToDb(b, userId)).eq('id', b.id);
    if (error) throw error;
  }

  async deleteBudget(id: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw error;
  }

  async insertRecurringRule(r: RecurringRule, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('recurring_rules').insert(recurringRuleToDb(r, userId));
    if (error) throw error;
  }

  async updateRecurringRule(r: RecurringRule, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('recurring_rules').update(recurringRuleToDb(r, userId)).eq('id', r.id);
    if (error) throw error;
  }

  async deleteRecurringRule(id: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('recurring_rules').delete().eq('id', id);
    if (error) throw error;
  }

  async insertSavingsGoal(g: SavingsGoal, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('savings_goals').insert(savingsGoalToDb(g, userId));
    if (error) throw error;
  }

  async updateSavingsGoal(g: SavingsGoal, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('savings_goals').update(savingsGoalToDb(g, userId)).eq('id', g.id);
    if (error) throw error;
  }

  async deleteSavingsGoal(id: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (error) throw error;
  }

  async insertSavingsContribution(c: SavingsContribution, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('savings_contributions').insert(savingsContributionToDb(c, userId));
    if (error) throw error;
  }

  async insertCategory(cat: Category, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('categories').insert(categoryToDb(cat, userId));
    if (error) throw error;
  }

  async updateCategory(cat: Category, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('categories').update(categoryToDb(cat, userId)).eq('id', cat.id);
    if (error) throw error;
  }

  async deleteCategory(id: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  }

  // Split Expense Operations
  async insertExpenseSplit(split: ExpenseSplit, shares: SplitShare[], userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('expense_splits').insert(expenseSplitToDb(split, userId));
      if (shares.length > 0) {
        await supabase.from('split_shares').insert(shares.map((sh) => splitShareToDb(sh, userId)));
      }
    } catch (e) {
      console.warn('Sync insertExpenseSplit error:', e);
    }
  }

  async updateExpenseSplit(split: ExpenseSplit, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('expense_splits').update(expenseSplitToDb(split, userId)).eq('id', split.id);
    } catch (e) {
      console.warn('Sync updateExpenseSplit error:', e);
    }
  }

  async deleteExpenseSplit(splitId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('split_settlements').delete().eq('split_id', splitId);
      await supabase.from('split_shares').delete().eq('split_id', splitId);
      await supabase.from('expense_splits').delete().eq('id', splitId);
    } catch (e) {
      console.warn('Sync deleteExpenseSplit error:', e);
    }
  }

  async updateSplitShare(share: SplitShare, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('split_shares').update(splitShareToDb(share, userId)).eq('id', share.id);
    } catch (e) {
      console.warn('Sync updateSplitShare error:', e);
    }
  }

  async insertSplitSettlement(settlement: SplitSettlement, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('split_settlements').insert(splitSettlementToDb(settlement, userId));
    } catch (e) {
      console.warn('Sync insertSplitSettlement error:', e);
    }
  }

  async deleteSplitSettlement(settlementId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('split_settlements').delete().eq('id', settlementId);
    } catch (e) {
      console.warn('Sync deleteSplitSettlement error:', e);
    }
  }

  async insertSplitParticipant(participant: SplitParticipant, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('split_participants').insert(splitParticipantToDb(participant, userId));
    } catch (e) {
      console.warn('Sync insertSplitParticipant error:', e);
    }
  }

  async updateSplitParticipant(participant: SplitParticipant, userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('split_participants').update(splitParticipantToDb(participant, userId)).eq('id', participant.id);
    } catch (e) {
      console.warn('Sync updateSplitParticipant error:', e);
    }
  }

  async deleteSplitParticipant(participantId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('split_participants').delete().eq('id', participantId);
    } catch (e) {
      console.warn('Sync deleteSplitParticipant error:', e);
    }
  }
}

export const cloudSyncService = new CloudSyncService();
