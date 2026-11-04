import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Transaction, Category, Account } from '../types/finance';
import type { BudgetStatus } from './financeCalculations';
import { fromMinorUnits, SUPPORTED_CURRENCIES } from '../types/finance';

export interface PDFReportData {
  periodLabel: string;
  startDate: string;
  endDate: string;
  currency: string;
  userName?: string;
  userEmail?: string;
  totals: {
    totalIncome: number; // minor units
    totalExpense: number; // minor units
    netSavings: number; // minor units
    savingsRate: number; // %
  };
  metrics: {
    avgDailySpend: number; // minor units
    budgetUtilization: number; // %
    momChange: number; // %
  };
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    totalAmount: number; // minor units
    percentage: number;
    transactionCount: number;
  }>;
  budgetStatuses: BudgetStatus[];
}

/**
 * Format currency safely for jsPDF Helvetica standard fonts (which do not embed unicode Rupee ₹).
 * Uses "Rs." for INR, "$" for USD, "EUR" for EUR, etc.
 */
export function formatPdfCurrency(minorUnits: number, currencyCode: string = 'INR'): string {
  const amount = fromMinorUnits(minorUnits);
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  const sign = amount < 0 ? '-' : '';
  let prefix = 'Rs. ';
  if (currencyCode === 'USD') prefix = '$';
  else if (currencyCode === 'EUR') prefix = 'EUR ';
  else if (currencyCode === 'GBP') prefix = 'GBP ';
  else if (currencyCode === 'JPY') prefix = 'JPY ';
  else if (currencyCode !== 'INR') prefix = `${currencyCode} `;

  return `${sign}${prefix}${formattedNumber}`;
}

/**
 * Generates and triggers download of a comprehensive multi-page Financial Audit PDF.
 */
export function generateFinancialReportPDF(data: PDFReportData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  const accountMap = new Map<string, string>(data.accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map<string, string>(data.categories.map((c) => [c.id, c.name]));

  // Brand Colors
  const emeraldPrimary = [16, 185, 129] as [number, number, number]; // #10B981
  const darkNavy = [15, 23, 42] as [number, number, number]; // #0F172A
  const slateMuted = [100, 116, 139] as [number, number, number]; // #64748B
  const slateLightBg = [248, 250, 252] as [number, number, number]; // #F8FAFC
  const slateBorder = [226, 232, 240] as [number, number, number]; // #E2E8F0

  // 1. Header Banner
  doc.setFillColor(...slateLightBg);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 26, 3, 3, 'F');
  doc.setDrawColor(...slateBorder);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 26, 3, 3, 'S');

  // Brand Accent Pill
  doc.setFillColor(...emeraldPrimary);
  doc.roundedRect(margin + 4, currentY + 4, 3, 18, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...darkNavy);
  doc.text('SmartExpense AI', margin + 11, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...slateMuted);
  doc.text('Personal Wealth Audit & Financial Health Report', margin + 11, currentY + 17);

  // Top right metadata
  doc.setFontSize(8.5);
  doc.setTextColor(...slateMuted);
  const genDateStr = `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  doc.text(genDateStr, pageWidth - margin - 4, currentY + 11, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(`Period: ${data.periodLabel} (${data.startDate} to ${data.endDate})`, pageWidth - margin - 4, currentY + 17, { align: 'right' });

  currentY += 32;

  // 2. Executive Summary Cards (4 Columns)
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 22;

  const summaryCards = [
    {
      label: 'TOTAL INCOME',
      value: formatPdfCurrency(data.totals.totalIncome, data.currency),
      color: [16, 185, 129] as [number, number, number],
    },
    {
      label: 'TOTAL EXPENSES',
      value: formatPdfCurrency(data.totals.totalExpense, data.currency),
      color: [225, 29, 72] as [number, number, number],
    },
    {
      label: 'NET SAVINGS',
      value: formatPdfCurrency(data.totals.netSavings, data.currency),
      color: [14, 165, 233] as [number, number, number],
    },
    {
      label: 'SAVINGS RATE',
      value: `${data.totals.savingsRate}%`,
      color: [139, 92, 246] as [number, number, number],
    },
  ];

  summaryCards.forEach((card, index) => {
    const cardX = margin + index * (cardWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...slateBorder);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...slateMuted);
    doc.text(card.label, cardX + 4, currentY + 6);

    // Value
    doc.setFontSize(11);
    doc.setTextColor(...card.color);
    doc.text(card.value, cardX + 4, currentY + 14);

    // Accent bottom line
    doc.setFillColor(...card.color);
    doc.rect(cardX, currentY + cardHeight - 1.5, cardWidth, 1.5, 'F');
  });

  currentY += cardHeight + 6;

  // 2b. Secondary Health Metrics strip
  doc.setFillColor(...slateLightBg);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkNavy);

  const metricsText = [
    `Avg Daily Spend: ${formatPdfCurrency(data.metrics.avgDailySpend, data.currency)}`,
    `Budget Utilization: ${data.metrics.budgetUtilization}%`,
    `Period Outflow Change: ${data.metrics.momChange > 0 ? '+' : ''}${data.metrics.momChange}%`,
    `Transactions Audited: ${data.transactions.length}`,
  ].join('   |   ');

  doc.text(metricsText, pageWidth / 2, currentY + 7, { align: 'center' });

  currentY += 16;

  // 3. Category Breakdown Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkNavy);
  doc.text('Expense Breakdown by Category', margin, currentY);
  currentY += 3;

  const categoryRows = data.categoryBreakdown.map((cat, idx) => [
    `#${idx + 1}`,
    cat.categoryName,
    `${cat.transactionCount} txn${cat.transactionCount > 1 ? 's' : ''}`,
    formatPdfCurrency(cat.totalAmount, data.currency),
    `${cat.percentage}%`,
  ]);

  if (categoryRows.length === 0) {
    categoryRows.push(['-', 'No recorded expenses for this period', '0', formatPdfCurrency(0, data.currency), '0%']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Rank', 'Category Name', 'Volume', 'Total Outflow', 'Share %']],
    body: categoryRows,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      font: 'helvetica',
      textColor: darkNavy,
      lineColor: slateBorder,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: darkNavy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 4. Budgets vs Actual Spend (if budgets exist)
  if (data.budgetStatuses.length > 0) {
    if (currentY + 40 > pageHeight) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...darkNavy);
    doc.text('Active Budgets vs Actual Spend', margin, currentY);
    currentY += 3;

    const budgetRows = data.budgetStatuses.map((b) => {
      const remaining = b.limitAmount - b.spentAmount;
      return [
        b.categoryName,
        formatPdfCurrency(b.limitAmount, data.currency),
        formatPdfCurrency(b.spentAmount, data.currency),
        formatPdfCurrency(Math.max(0, remaining), data.currency),
        `${b.percentageUsed}%`,
        b.state.toUpperCase(),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Budget Category', 'Limit', 'Spent', 'Remaining', '% Used', 'Status']],
      body: budgetRows,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        font: 'helvetica',
        textColor: darkNavy,
        lineColor: slateBorder,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 5. Detailed Transaction Log
  if (currentY + 50 > pageHeight) {
    doc.addPage();
    currentY = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkNavy);
  doc.text('Detailed Transaction Ledger', margin, currentY);
  currentY += 3;

  const txRows = data.transactions.map((tx) => {
    const catName = tx.categoryId ? categoryMap.get(tx.categoryId) || 'Uncategorized' : 'Transfer';
    const accName = accountMap.get(tx.fromAccountId) || 'Account';
    const amountPrefix = tx.type === 'income' ? '+ ' : tx.type === 'expense' ? '- ' : '';
    const formattedAmt = `${amountPrefix}${formatPdfCurrency(tx.amount, data.currency)}`;

    return [
      tx.date,
      tx.title,
      tx.type.toUpperCase(),
      catName,
      accName,
      formattedAmt,
    ];
  });

  if (txRows.length === 0) {
    txRows.push(['-', 'No transactions recorded in this period', '-', '-', '-', formatPdfCurrency(0, data.currency)]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Description / Payee', 'Type', 'Category', 'Account', 'Amount']],
    body: txRows,
    margin: { left: margin, right: margin },
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      textColor: darkNavy,
      lineColor: slateBorder,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: darkNavy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 32 },
      4: { cellWidth: 32 },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
  });

  // 6. Page Numbers and Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...slateBorder);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slateMuted);
    doc.text('SmartExpense AI — Confidential Personal Financial Statement', margin, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  // Trigger download in browser
  const sanitizedPeriod = data.periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const filename = `SmartExpense-Report-${sanitizedPeriod}-${data.startDate}-to-${data.endDate}.pdf`;
  doc.save(filename);

  return doc;
}
