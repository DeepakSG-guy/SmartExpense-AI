import { db } from '../db';
import type { RecurringRule, Transaction } from '../types/finance';

/**
 * Calculates the next due date given current date and recurrence frequency.
 */
export function getNextDate(fromDateStr: string, frequency: RecurringRule['frequency']): string {
  const [year, month, day] = fromDateStr.split('-').map((n) => parseInt(n, 10));
  const date = new Date(year, month - 1, day);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface ProcessDueResult {
  generatedCount: number;
  generatedTransactions: Transaction[];
}

/**
 * Processes due recurring transactions when the app opens or on demand.
 * Guaranteed idempotent: checks whether a transaction with the same recurringRuleId
 * and date already exists before inserting.
 */
export async function processDueRecurringRules(todayDateStr?: string): Promise<ProcessDueResult> {
  const today = todayDateStr || new Date().toISOString().split('T')[0];
  const activeRules = await db.recurringRules.filter((r) => r.isActive).toArray();

  const generatedTransactions: Transaction[] = [];

  for (const rule of activeRules) {
    let currentDue = rule.nextDueDate;

    // Check if rule is due (on or before today)
    while (currentDue <= today) {
      if (rule.endDate && currentDue > rule.endDate) {
        // Rule expired
        await db.recurringRules.update(rule.id, { isActive: false });
        break;
      }

      // Check idempotence: has this occurrence already been generated?
      const existingTx = await db.transactions
        .filter((tx) => tx.recurringRuleId === rule.id && tx.date === currentDue)
        .first();

      if (!existingTx) {
        const newTx: Transaction = {
          id: `tx-rec-${rule.id}-${currentDue}`,
          title: rule.title,
          amount: rule.amount,
          type: rule.type,
          categoryId: rule.categoryId,
          fromAccountId: rule.fromAccountId,
          toAccountId: rule.toAccountId,
          date: currentDue,
          time: '09:00',
          paymentMethod: 'AutoDebit',
          notes: `Auto-generated recurring payment (${rule.frequency})`,
          tags: ['recurring', 'auto'],
          recurringRuleId: rule.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db.transactions.put(newTx);
        generatedTransactions.push(newTx);
      }

      // Advance next due date
      const nextDate = getNextDate(currentDue, rule.frequency);
      await db.recurringRules.update(rule.id, {
        lastGeneratedDate: currentDue,
        nextDueDate: nextDate,
      });

      // Advance loop
      currentDue = nextDate;
    }
  }

  return {
    generatedCount: generatedTransactions.length,
    generatedTransactions,
  };
}

/**
 * Calculates estimated monthly cost of all active recurring rules.
 */
export function calculateMonthlyRecurringEstimate(rules: RecurringRule[]): number {
  let monthlyTotal = 0;

  for (const rule of rules) {
    if (!rule.isActive || rule.type !== 'expense') continue;

    switch (rule.frequency) {
      case 'daily':
        monthlyTotal += rule.amount * 30;
        break;
      case 'weekly':
        monthlyTotal += Math.round(rule.amount * 4.33);
        break;
      case 'monthly':
        monthlyTotal += rule.amount;
        break;
      case 'yearly':
        monthlyTotal += Math.round(rule.amount / 12);
        break;
    }
  }

  return monthlyTotal;
}
