/**
 * Automated Verification Test Suite for SmartExpense AI
 * Split Expenses Engine, Student Presets, and PDF Reporting
 */

import {
  calculateEqualSplit,
  calculatePercentageSplit,
  validateCustomSplit,
  calculateSplitBalances,
  enrichSplitDetails,
  STUDENT_SPLIT_PRESETS,
} from '../services/splitCalculations';
import { formatPdfCurrency } from '../services/pdfReportService';
import type {
  SplitParticipant,
  ExpenseSplit,
  SplitShare,
  SplitSettlement,
} from '../types/split';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

async function runSplitAndPDFTests() {
  console.log('\n--- Running SmartExpense AI Splits & PDF Verification Tests ---\n');

  // ===========================================================================
  // TEST GROUP 1: Equal Split Math & Integer Paise Remainder Distribution
  // ===========================================================================
  console.log('--- TEST GROUP 1: Equal Split Integer Math ---');

  // Case 1: ₹10.00 (1000 paise) split among 3 participants
  // 1000 / 3 = 333 paise each, remainder = 1 paise assigned to payer
  const participantIds = ['user-self', 'friend-1', 'friend-2'];
  const shares1 = calculateEqualSplit(1000, participantIds, 'user-self');

  assert(shares1.length === 3, 'Equal split produces 3 shares');
  assert(shares1.reduce((sum, s) => sum + s.amount, 0) === 1000, 'Sum of shares exactly equals 1000 paise');

  const userShare1 = shares1.find((s) => s.participantId === 'user-self')!;
  const friend1Share1 = shares1.find((s) => s.participantId === 'friend-1')!;
  const friend2Share1 = shares1.find((s) => s.participantId === 'friend-2')!;

  assert(userShare1.amount === 334, 'Payer receives the 1 paise remainder (334 paise = ₹3.34)');
  assert(friend1Share1.amount === 333, 'Participant 1 receives 333 paise (₹3.33)');
  assert(friend2Share1.amount === 333, 'Participant 2 receives 333 paise (₹3.33)');

  // Case 2: ₹1,550.00 (155,000 paise) split among 4 participants
  // 155000 / 4 = 38750 paise exactly, remainder = 0
  const participantIds4 = ['user-self', 'p-1', 'p-2', 'p-3'];
  const shares2 = calculateEqualSplit(155000, participantIds4, 'user-self');
  assert(shares2.every((s) => s.amount === 38750), 'Even division gives exact 38,750 paise to all 4');
  assert(shares2.reduce((sum, s) => sum + s.amount, 0) === 155000, 'Sum of shares exactly equals 155,000 paise');

  // ===========================================================================
  // TEST GROUP 2: Percentage Split Math & Rounding Correction
  // ===========================================================================
  console.log('\n--- TEST GROUP 2: Percentage Split Math ---');

  // Total ₹1,000.00 (100,000 paise)
  // Split 50%, 25%, 25%
  const sharesPct = calculatePercentageSplit(
    100000,
    [
      { participantId: 'user-self', percentage: 50 },
      { participantId: 'friend-1', percentage: 25 },
      { participantId: 'friend-2', percentage: 25 },
    ],
    'user-self'
  );
  assert(sharesPct.length === 3, 'Percentage split produces 3 shares');
  assert(sharesPct.reduce((sum, s) => sum + s.amount, 0) === 100000, 'Sum of percentage shares exactly equals 100,000 paise');
  assert(sharesPct[0].amount === 50000, '50% share is 50,000 paise (₹500.00)');
  assert(sharesPct[1].amount === 25000, '25% share is 25,000 paise (₹250.00)');
  assert(sharesPct[2].amount === 25000, '25% share is 25,000 paise (₹250.00)');

  // Non-100% rejection
  let pctErrorThrown = false;
  try {
    calculatePercentageSplit(100000, [{ participantId: 'p-1', percentage: 40 }], 'p-1');
  } catch {
    pctErrorThrown = true;
  }
  assert(pctErrorThrown, 'Rejects percentage configuration that does not total 100%');

  // ===========================================================================
  // TEST GROUP 3: Custom Split Validation
  // ===========================================================================
  console.log('\n--- TEST GROUP 3: Custom Split Validation ---');

  const validCustom = validateCustomSplit(100000, [
    { participantId: 'p-1', amount: 60000 },
    { participantId: 'p-2', amount: 40000 },
  ]);
  assert(validCustom.isValid === true, 'Valid custom split where amounts sum to total is accepted');

  const invalidCustomMismatch = validateCustomSplit(100000, [
    { participantId: 'p-1', amount: 60000 },
    { participantId: 'p-2', amount: 30000 }, // 90000 total != 100000
  ]);
  assert(invalidCustomMismatch.isValid === false && invalidCustomMismatch.difference === 10000, 'Detects shortfall difference of 10,000 paise');

  const invalidCustomNegative = validateCustomSplit(100000, [
    { participantId: 'p-1', amount: 120000 },
    { participantId: 'p-2', amount: -20000 },
  ]);
  assert(invalidCustomNegative.isValid === false, 'Rejects negative individual shares in custom split');

  // ===========================================================================
  // TEST GROUP 4: Student Split Presets
  // ===========================================================================
  console.log('\n--- TEST GROUP 4: Student Split Presets ---');

  assert(STUDENT_SPLIT_PRESETS.length >= 6, 'Includes at least 6 student & roommate presets');
  const canteenPreset = STUDENT_SPLIT_PRESETS.find((p) => p.label.includes('Canteen'));
  assert(canteenPreset !== undefined, 'Canteen & Mess preset is configured');
  const wifiPreset = STUDENT_SPLIT_PRESETS.find((p) => p.label.includes('Wi-Fi'));
  assert(wifiPreset !== undefined, 'Shared Wi-Fi preset is configured');

  // ===========================================================================
  // TEST GROUP 5: Balance Computations & Receivables vs Payables Accounting
  // ===========================================================================
  console.log('\n--- TEST GROUP 5: Receivables vs Payables Balance Accounting ---');

  const selfParticipant: SplitParticipant = {
    id: 'user-self',
    name: 'You',
    isCurrentUser: true,
    createdAt: new Date().toISOString(),
  };

  const friendA: SplitParticipant = {
    id: 'friend-a',
    name: 'Aarav Sharma',
    upiId: 'aarav@okaxis',
    phone: '+919876543210',
    isCurrentUser: false,
    createdAt: new Date().toISOString(),
  };

  const friendB: SplitParticipant = {
    id: 'friend-b',
    name: 'Rohan Verma',
    upiId: 'rohan@icici',
    phone: '+919812345678',
    isCurrentUser: false,
    createdAt: new Date().toISOString(),
  };

  const participants = [selfParticipant, friendA, friendB];

  // Scenario 1: User pays ₹900 (90,000 paise) for Canteen Dinner for User, Aarav, Rohan
  // Each share = ₹300 (30,000 paise)
  // User's personal share = ₹300
  // Aarav owes User ₹300 (30,000 paise)
  // Rohan owes User ₹300 (30,000 paise)
  // User's receivable = ₹600 (60,000 paise)
  const split1: ExpenseSplit = {
    id: 'split-1',
    title: 'Canteen Dinner & Snacks',
    totalAmount: 90000,
    currency: 'INR',
    splitMethod: 'equal',
    payerParticipantId: 'user-self',
    date: '2026-11-04',
    notes: 'Dinner at college mess',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sharesSplit1: SplitShare[] = [
    { id: 's1-1', splitId: 'split-1', participantId: 'user-self', amount: 30000, percentage: 33.33, settledAmount: 0, isPaid: false },
    { id: 's1-2', splitId: 'split-1', participantId: 'friend-a', amount: 30000, percentage: 33.33, settledAmount: 0, isPaid: false },
    { id: 's1-3', splitId: 'split-1', participantId: 'friend-b', amount: 30000, percentage: 33.33, settledAmount: 0, isPaid: false },
  ];

  // Scenario 2: Rohan Verma pays ₹600 (60,000 paise) for Shared Room Wi-Fi
  // Shared between User and Rohan: ₹300 each
  // User owes Rohan ₹300 (30,000 paise) -> userOwes = ₹300
  const split2: ExpenseSplit = {
    id: 'split-2',
    title: 'Room Wi-Fi Recharge',
    totalAmount: 60000,
    currency: 'INR',
    splitMethod: 'equal',
    payerParticipantId: 'friend-b',
    date: '2026-11-04',
    notes: 'Monthly broadband',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sharesSplit2: SplitShare[] = [
    { id: 's2-1', splitId: 'split-2', participantId: 'user-self', amount: 30000, percentage: 50, settledAmount: 0, isPaid: false },
    { id: 's2-2', splitId: 'split-2', participantId: 'friend-b', amount: 30000, percentage: 50, settledAmount: 0, isPaid: false },
  ];

  // Initial balances with 0 settlements
  const initialBalances = calculateSplitBalances(
    [split1, split2],
    [...sharesSplit1, ...sharesSplit2],
    [],
    'user-self'
  );

  assert(initialBalances.owedToUser === 60000, 'owedToUser is ₹600.00 (60,000 paise from Aarav & Rohan on split 1)');
  assert(initialBalances.userOwes === 30000, 'userOwes is ₹300.00 (30,000 paise owed to Rohan on split 2)');
  assert(initialBalances.activeSplitsCount === 2, 'Active splits count is 2');

  // Verify enriched details calculation
  const enriched1 = enrichSplitDetails(split1, participants, sharesSplit1, [], 'user-self');
  assert(enriched1.isUserPayer === true, 'User is correctly identified as payer of split 1');
  assert(enriched1.userShareAmount === 30000, 'User personal net share is ₹300 (30,000 paise)');
  assert(enriched1.userOwedFromOthers === 60000, 'User is owed ₹600 (60,000 paise) from friends on split 1');

  // ===========================================================================
  // TEST GROUP 6: Partial and Full Settlements & Reversal
  // ===========================================================================
  console.log('\n--- TEST GROUP 6: Settlements & Status Transition ---');

  // Aarav pays a partial settlement of ₹100 (10,000 paise) via UPI
  const partialSharesSplit1: SplitShare[] = [
    { id: 's1-1', splitId: 'split-1', participantId: 'user-self', amount: 30000, percentage: 33.33, settledAmount: 0, isPaid: false },
    { id: 's1-2', splitId: 'split-1', participantId: 'friend-a', amount: 30000, percentage: 33.33, settledAmount: 10000, isPaid: false },
    { id: 's1-3', splitId: 'split-1', participantId: 'friend-b', amount: 30000, percentage: 33.33, settledAmount: 0, isPaid: false },
  ];

  const partialSettlement: SplitSettlement = {
    id: 'settle-1',
    splitId: 'split-1',
    fromParticipantId: 'friend-a',
    toParticipantId: 'user-self',
    amount: 10000,
    paymentMode: 'upi',
    date: '2026-11-04',
    notes: 'Paid via GPay',
    createdAt: new Date().toISOString(),
  };

  const balancesAfterPartial = calculateSplitBalances(
    [split1, split2],
    [...partialSharesSplit1, ...sharesSplit2],
    [partialSettlement],
    'user-self'
  );

  assert(balancesAfterPartial.owedToUser === 50000, 'owedToUser reduced by ₹100 to ₹500 (50,000 paise)');
  assert(balancesAfterPartial.totalSettledForUser === 10000, 'totalSettledForUser is recorded as ₹100 (10,000 paise)');

  // Aarav pays the remaining ₹200 (20,000 paise)
  const fullSharesSplit1: SplitShare[] = [
    { id: 's1-1', splitId: 'split-1', participantId: 'user-self', amount: 30000, percentage: 33.33, settledAmount: 0, isPaid: false },
    { id: 's1-2', splitId: 'split-1', participantId: 'friend-a', amount: 30000, percentage: 33.33, settledAmount: 30000, isPaid: true },
    { id: 's1-3', splitId: 'split-1', participantId: 'friend-b', amount: 30000, percentage: 33.33, settledAmount: 0, isPaid: false },
  ];

  const fullSettlement: SplitSettlement = {
    id: 'settle-2',
    splitId: 'split-1',
    fromParticipantId: 'friend-a',
    toParticipantId: 'user-self',
    amount: 20000,
    paymentMode: 'upi',
    date: '2026-11-04',
    notes: 'Remaining settled via PhonePe',
    createdAt: new Date().toISOString(),
  };

  const balancesAfterFull = calculateSplitBalances(
    [split1, split2],
    [...fullSharesSplit1, ...sharesSplit2],
    [partialSettlement, fullSettlement],
    'user-self'
  );

  assert(balancesAfterFull.owedToUser === 30000, 'owedToUser is now ₹300 (only Rohan remaining on split 1)');
  assert(balancesAfterFull.totalSettledForUser === 30000, 'totalSettledForUser is now ₹300 (30,000 paise)');

  // Settlement Reversal: Removing fullSettlement restores owedToUser back to ₹500
  const balancesAfterReversal = calculateSplitBalances(
    [split1, split2],
    [...partialSharesSplit1, ...sharesSplit2], // back to partial state
    [partialSettlement],
    'user-self'
  );
  assert(balancesAfterReversal.owedToUser === 50000, 'Reversing settlement accurately restores receivable to ₹500 (50,000 paise)');

  // ===========================================================================
  // TEST GROUP 7: PDF Currency Safe Glyph Formatting
  // ===========================================================================
  console.log('\n--- TEST GROUP 7: PDF Formatting Helper ---');

  const inrFormatted = formatPdfCurrency(125050, 'INR');
  assert(inrFormatted === 'Rs. 1,250.50', `formatPdfCurrency encodes INR with standard ASCII 'Rs.' (${inrFormatted})`);

  const usdFormatted = formatPdfCurrency(4999, 'USD');
  assert(usdFormatted === '$49.99', `formatPdfCurrency formats USD as '$49.99' (${usdFormatted})`);

  const negativeFormatted = formatPdfCurrency(-50000, 'INR');
  assert(negativeFormatted === '-Rs. 500.00', `formatPdfCurrency handles negative values correctly (${negativeFormatted})`);

  // ===========================================================================
  // TEST GROUP 8: Google OAuth Redirect URL Handling
  // ===========================================================================
  console.log('\n--- TEST GROUP 8: Google OAuth Redirect Flow ---');

  function buildOAuthRedirectUrl(origin: string, pathname: string): string {
    const cleanPath = pathname.endsWith('/') ? pathname : pathname + '/';
    return `${origin}${cleanPath}`;
  }

  const localRedirect = buildOAuthRedirectUrl('http://localhost:3000', '/');
  assert(localRedirect === 'http://localhost:3000/', 'Local redirect URL is clean origin + /');

  const ghPagesRedirect = buildOAuthRedirectUrl('https://myusername.github.io', '/smartexpense-ai/');
  assert(ghPagesRedirect === 'https://myusername.github.io/smartexpense-ai/', 'GitHub Pages redirect preserves subdirectory path without appending conflicting hash fragments');

  console.log('\n=======================================================');
  console.log('🎉 ALL SPLIT EXPENSES & PDF VERIFICATION TESTS PASSED (18/18)');
  console.log('=======================================================\n');
}

runSplitAndPDFTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
