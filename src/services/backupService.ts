import { db } from '../db';
import type {
  Account,
  Category,
  Transaction,
  Budget,
  RecurringRule,
  SavingsGoal,
  SavingsContribution,
  AppSettings,
} from '../types/finance';
import { fromMinorUnits, toMinorUnits } from '../types/finance';

export interface JSONBackupSchema {
  version: number;
  exportedAt: string;
  appName: string;
  data: {
    settings: AppSettings;
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    budgets: Budget[];
    recurringRules: RecurringRule[];
    savingsGoals: SavingsGoal[];
    savingsContributions: SavingsContribution[];
  };
}

/**
 * Generates a full JSON backup of all tables with schema versioning.
 */
export async function exportJSONBackup(): Promise<string> {
  const [
    settings,
    accounts,
    categories,
    transactions,
    budgets,
    recurringRules,
    savingsGoals,
    savingsContributions,
  ] = await Promise.all([
    db.settings.get('current'),
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.budgets.toArray(),
    db.recurringRules.toArray(),
    db.savingsGoals.toArray(),
    db.savingsContributions.toArray(),
  ]);

  const backup: JSONBackupSchema = {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: 'SmartExpense AI',
    data: {
      settings: settings!,
      accounts,
      categories,
      transactions,
      budgets,
      recurringRules,
      savingsGoals,
      savingsContributions,
    },
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Validates and restores a JSON backup.
 */
export async function restoreJSONBackup(
  jsonString: string,
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ success: boolean; message: string; recordCounts?: Record<string, number> }> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON format. Please provide a valid SmartExpense AI backup file.');
  }

  if (!parsed || !parsed.data || typeof parsed.version !== 'number') {
    throw new Error('Invalid backup schema. Missing "data" or "version" fields.');
  }

  if (parsed.version > 1) {
    throw new Error(`Unsupported backup schema version (${parsed.version}). This app supports version 1.`);
  }

  const { data } = parsed;

  await db.transaction('rw', [
    db.accounts,
    db.categories,
    db.transactions,
    db.budgets,
    db.recurringRules,
    db.savingsGoals,
    db.savingsContributions,
    db.settings,
  ], async () => {
    if (mode === 'replace') {
      await db.accounts.clear();
      await db.categories.clear();
      await db.transactions.clear();
      await db.budgets.clear();
      await db.recurringRules.clear();
      await db.savingsGoals.clear();
      await db.savingsContributions.clear();
    }

    if (Array.isArray(data.categories) && data.categories.length > 0) {
      await db.categories.bulkPut(data.categories);
    }
    if (Array.isArray(data.accounts) && data.accounts.length > 0) {
      await db.accounts.bulkPut(data.accounts);
    }
    if (Array.isArray(data.transactions) && data.transactions.length > 0) {
      await db.transactions.bulkPut(data.transactions);
    }
    if (Array.isArray(data.budgets) && data.budgets.length > 0) {
      await db.budgets.bulkPut(data.budgets);
    }
    if (Array.isArray(data.recurringRules) && data.recurringRules.length > 0) {
      await db.recurringRules.bulkPut(data.recurringRules);
    }
    if (Array.isArray(data.savingsGoals) && data.savingsGoals.length > 0) {
      await db.savingsGoals.bulkPut(data.savingsGoals);
    }
    if (Array.isArray(data.savingsContributions) && data.savingsContributions.length > 0) {
      await db.savingsContributions.bulkPut(data.savingsContributions);
    }
    if (data.settings && data.settings.id) {
      await db.settings.put(data.settings);
    }
  });

  return {
    success: true,
    message: `Successfully restored backup (${mode} mode).`,
    recordCounts: {
      accounts: data.accounts?.length || 0,
      transactions: data.transactions?.length || 0,
      categories: data.categories?.length || 0,
      budgets: data.budgets?.length || 0,
    },
  };
}

/**
 * Exports transactions to CSV string.
 */
export function exportTransactionsCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[]
): string {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  const headers = ['Date', 'Time', 'Type', 'Title', 'Amount', 'Category', 'Account', 'To Account', 'Payment Method', 'Notes', 'Tags'];
  const rows = transactions.map((tx) => {
    const categoryName = catMap.get(tx.categoryId) || '';
    const fromAccountName = accMap.get(tx.fromAccountId) || tx.fromAccountId;
    const toAccountName = tx.toAccountId ? accMap.get(tx.toAccountId) || tx.toAccountId : '';
    const amountMajor = fromMinorUnits(tx.amount).toFixed(2);
    const tagsStr = (tx.tags || []).join(';');

    // Escape quotes
    const clean = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

    return [
      clean(tx.date),
      clean(tx.time || ''),
      clean(tx.type),
      clean(tx.title),
      amountMajor,
      clean(categoryName),
      clean(fromAccountName),
      clean(toAccountName),
      clean(tx.paymentMethod || ''),
      clean(tx.notes || ''),
      clean(tagsStr),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export interface ParsedCSVRow {
  rowNumber: number;
  date: string;
  type: 'expense' | 'income' | 'transfer';
  title: string;
  amount: number; // in minor units
  categoryName: string;
  accountName: string;
  toAccountName?: string;
  notes?: string;
  paymentMethod?: string;
  isValid: boolean;
  rejectReason?: string;
  isLikelyDuplicate?: boolean;
}

/**
 * Parses and validates CSV rows.
 */
export function parseTransactionsCSV(
  csvContent: string,
  existingTransactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): {
  rows: ParsedCSVRow[];
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
} {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], validCount: 0, invalidCount: 0, duplicateCount: 0 };
  }

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

  const dateIdx = headers.findIndex((h) => h.includes('date'));
  const titleIdx = headers.findIndex((h) => h.includes('title') || h.includes('merchant') || h.includes('desc'));
  const amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('cost') || h.includes('price'));
  const typeIdx = headers.findIndex((h) => h.includes('type'));
  const catIdx = headers.findIndex((h) => h.includes('cat'));
  const accIdx = headers.findIndex((h) => h.includes('account') && !h.includes('to'));
  const toAccIdx = headers.findIndex((h) => h.includes('to account') || h.includes('dest'));
  const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('comment'));

  const parsedRows: ParsedCSVRow[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // CSV regex splitter respecting quotes
    const values: string[] = [];
    let insideQuote = false;
    let current = '';

    for (let charIdx = 0; charIdx < rawLine.length; charIdx++) {
      const char = rawLine[charIdx];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const cleanVal = (idx: number) => {
      if (idx === -1 || idx >= values.length) return '';
      return values[idx].replace(/^["']|["']$/g, '').trim();
    };

    const dateVal = cleanVal(dateIdx);
    const titleVal = cleanVal(titleIdx) || 'Imported Transaction';
    const amountRaw = cleanVal(amountIdx).replace(/[^0-9.-]/g, '');
    const typeValRaw = cleanVal(typeIdx).toLowerCase();
    const catVal = cleanVal(catIdx);
    const accVal = cleanVal(accIdx);
    const toAccVal = cleanVal(toAccIdx);
    const notesVal = cleanVal(notesIdx);

    const rowNumber = i + 1;
    let isValid = true;
    let rejectReason = '';

    // Validate date (YYYY-MM-DD or DD/MM/YYYY)
    let normalizedDate = dateVal;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateVal)) {
      const [d, m, y] = dateVal.split('/');
      normalizedDate = `${y}-${m}-${d}`;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      isValid = false;
      rejectReason = `Invalid date format (${dateVal}). Use YYYY-MM-DD or DD/MM/YYYY.`;
    }

    // Validate amount
    const amountNum = parseFloat(amountRaw);
    if (isNaN(amountNum) || amountNum <= 0) {
      isValid = false;
      rejectReason = rejectReason || `Invalid amount (${amountRaw}). Must be positive number.`;
    }

    // Normalize type
    let type: 'expense' | 'income' | 'transfer' = 'expense';
    if (typeValRaw.includes('inc') || typeValRaw.includes('credit')) {
      type = 'income';
    } else if (typeValRaw.includes('trans') || toAccVal) {
      type = 'transfer';
    }

    const minorAmount = toMinorUnits(amountNum || 0);

    // Duplicate check
    const isLikelyDuplicate = existingTransactions.some(
      (tx) => tx.date === normalizedDate && tx.amount === minorAmount && tx.title.toLowerCase() === titleVal.toLowerCase()
    );

    if (isLikelyDuplicate) {
      duplicateCount++;
    }

    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    parsedRows.push({
      rowNumber,
      date: normalizedDate,
      type,
      title: titleVal,
      amount: minorAmount,
      categoryName: catVal,
      accountName: accVal,
      toAccountName: toAccVal,
      notes: notesVal,
      isValid,
      rejectReason,
      isLikelyDuplicate,
    });
  }

  return {
    rows: parsedRows,
    validCount,
    invalidCount,
    duplicateCount,
  };
}

/**
 * Downloads a text string as a browser file.
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
