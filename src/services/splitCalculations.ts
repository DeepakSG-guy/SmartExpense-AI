import type {
  SplitMethod,
  SplitParticipant,
  SplitShare,
  ExpenseSplit,
  SplitSettlement,
  SplitWithDetails,
} from '../types/split';

/**
 * Calculates equal split shares in integer minor units (paise).
 * Deterministically distributes any integer remainder to the payer (or first participant)
 * so that sum(shares) is EXACTLY equal to totalAmount without any missing paise.
 */
export function calculateEqualSplit(
  totalAmount: number,
  participantIds: string[],
  payerId?: string
): Array<{ participantId: string; amount: number }> {
  if (participantIds.length === 0 || totalAmount <= 0) return [];

  const count = participantIds.length;
  const baseShare = Math.floor(totalAmount / count);
  const remainder = totalAmount - baseShare * count; // 0 <= remainder < count

  return participantIds.map((pid, idx) => {
    let extra = 0;
    if (payerId && participantIds.includes(payerId)) {
      // Give remainder to payer if payer is among participants
      if (pid === payerId) {
        extra = remainder;
      }
    } else {
      // Otherwise distribute remainder 1 paise each to the first `remainder` participants
      if (idx < remainder) {
        extra = 1;
      }
    }

    return {
      participantId: pid,
      amount: baseShare + extra,
    };
  });
}

/**
 * Calculates percentage-based split shares in integer minor units.
 * Handles rounding and adjusts remainder to ensure exact total match.
 */
export function calculatePercentageSplit(
  totalAmount: number,
  percentages: Array<{ participantId: string; percentage: number }>,
  payerId?: string
): Array<{ participantId: string; amount: number; percentage: number }> {
  if (percentages.length === 0 || totalAmount <= 0) return [];

  const totalPercentage = percentages.reduce((sum, p) => sum + p.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.1) {
    throw new Error(`Total percentage must equal 100% (currently ${totalPercentage}%)`);
  }

  const shares = percentages.map((p) => {
    const raw = Math.round((p.percentage / 100) * totalAmount);
    return {
      participantId: p.participantId,
      amount: Math.max(0, raw),
      percentage: p.percentage,
    };
  });

  // Calculate rounding discrepancy
  const currentSum = shares.reduce((sum, s) => sum + s.amount, 0);
  const diff = totalAmount - currentSum;

  if (diff !== 0 && shares.length > 0) {
    // Apply diff to payer if present, or to the largest share participant
    const targetIdx = payerId
      ? shares.findIndex((s) => s.participantId === payerId)
      : shares.reduce((maxIdx, s, i, arr) => (s.amount > arr[maxIdx].amount ? i : maxIdx), 0);

    const safeIdx = targetIdx !== -1 ? targetIdx : 0;
    shares[safeIdx].amount += diff;
  }

  return shares;
}

/**
 * Validates a custom split distribution.
 */
export function validateCustomSplit(
  totalAmount: number,
  shares: Array<{ participantId: string; amount: number }>
): { isValid: boolean; sum: number; difference: number } {
  const hasNegative = shares.some((s) => (s.amount ?? 0) < 0);
  const sum = shares.reduce((acc, s) => acc + (s.amount || 0), 0);
  const difference = totalAmount - sum;
  return {
    isValid: !hasNegative && difference === 0,
    sum,
    difference,
  };
}

/**
 * Computes split balances and receivables/payables for the current user.
 */
export function calculateSplitBalances(
  splits: ExpenseSplit[],
  shares: SplitShare[],
  settlements: SplitSettlement[],
  currentParticipantId: string
): {
  owedToUser: number; // Others owe user
  userOwes: number; // User owes others
  totalSettledForUser: number;
  activeSplitsCount: number;
} {
  let owedToUser = 0;
  let userOwes = 0;
  let totalSettledForUser = 0;
  let activeSplitsCount = 0;

  const sharesBySplit = new Map<string, SplitShare[]>();
  for (const s of shares) {
    const list = sharesBySplit.get(s.splitId) || [];
    list.push(s);
    sharesBySplit.set(s.splitId, list);
  }

  for (const split of splits) {
    if (split.status === 'archived') continue;
    const splitShares = sharesBySplit.get(split.id) || [];
    const isUserPayer = split.payerParticipantId === currentParticipantId;

    let hasActiveShare = false;

    for (const share of splitShares) {
      const remainingShare = Math.max(0, share.amount - share.settledAmount);

      if (isUserPayer && share.participantId !== currentParticipantId) {
        // User paid, this friend owes user
        owedToUser += remainingShare;
        totalSettledForUser += share.settledAmount;
        if (remainingShare > 0) hasActiveShare = true;
      } else if (!isUserPayer && share.participantId === currentParticipantId) {
        // Someone else paid, user owes them
        userOwes += remainingShare;
        totalSettledForUser += share.settledAmount;
        if (remainingShare > 0) hasActiveShare = true;
      }
    }

    if (hasActiveShare && split.status !== 'settled') {
      activeSplitsCount++;
    }
  }

  return {
    owedToUser,
    userOwes,
    totalSettledForUser,
    activeSplitsCount,
  };
}

/**
 * Formats a Split with all participant details and computed share status.
 */
export function enrichSplitDetails(
  split: ExpenseSplit,
  participants: SplitParticipant[],
  shares: SplitShare[],
  settlements: SplitSettlement[],
  currentUserId: string
): SplitWithDetails {
  const participantMap = new Map<string, SplitParticipant>(
    participants.map((p) => [p.id, p])
  );

  const fallbackParticipant = (id: string): SplitParticipant => ({
    id,
    name: 'Unknown Member',
    isCurrentUser: id === currentUserId,
    createdAt: new Date().toISOString(),
  });

  const payer = participantMap.get(split.payerParticipantId) || fallbackParticipant(split.payerParticipantId);
  const splitShares = shares.filter((s) => s.splitId === split.id);
  const splitSettlements = settlements.filter((s) => s.splitId === split.id);

  const enrichedShares = splitShares.map((s) => ({
    ...s,
    participant: participantMap.get(s.participantId) || fallbackParticipant(s.participantId),
  }));

  const totalSettled = splitSettlements.reduce((sum, s) => sum + s.amount, 0);
  const remainingAmount = Math.max(0, split.totalAmount - totalSettled);

  const userShare = enrichedShares.find((s) => s.participantId === currentUserId);
  const userShareAmount = userShare ? userShare.amount : 0;

  const isUserPayer = split.payerParticipantId === currentUserId;
  let userOwedToOthers = 0;
  let userOwedFromOthers = 0;

  if (isUserPayer) {
    userOwedFromOthers = enrichedShares
      .filter((s) => s.participantId !== currentUserId)
      .reduce((sum, s) => sum + Math.max(0, s.amount - s.settledAmount), 0);
  } else if (userShare) {
    userOwedToOthers = Math.max(0, userShare.amount - userShare.settledAmount);
  }

  return {
    ...split,
    payer,
    shares: enrichedShares,
    settlements: splitSettlements,
    totalSettled,
    remainingAmount,
    userShareAmount,
    userOwedToOthers,
    userOwedFromOthers,
    isUserPayer,
  };
}

/**
 * Student Quick Split Presets
 */
export const STUDENT_SPLIT_PRESETS = [
  {
    id: 'preset-food',
    label: 'Canteen / Mess / Food Delivery',
    icon: 'Utensils',
    defaultTitle: 'Hostel Dinner / Food Order',
    categoryId: 'cat-canteen-mess',
    description: 'Evenly split midnight Swiggy/Zomato or mess food with roommates',
  },
  {
    id: 'preset-rent',
    label: 'Hostel / PG Room Rent',
    icon: 'Home',
    defaultTitle: 'Monthly PG / Hostel Rent',
    categoryId: 'cat-hostel-rent',
    description: 'Shared flat or PG accommodation monthly charges',
  },
  {
    id: 'preset-wifi',
    label: 'Shared Wi-Fi & Electricity',
    icon: 'Wifi',
    defaultTitle: 'Room Wi-Fi & Power Bill',
    categoryId: 'cat-wifi-recharge',
    description: 'Split broadband connection, router, or electricity bill',
  },
  {
    id: 'preset-project',
    label: 'Project Materials & Printing',
    icon: 'FolderKanban',
    defaultTitle: 'Semester Project Lab & Printing',
    categoryId: 'cat-project-expenses',
    description: 'Lab components, thesis binding, poster printing, or software',
  },
  {
    id: 'preset-trip',
    label: 'Group Trip / Weekend Travel',
    icon: 'Plane',
    defaultTitle: 'Weekend Trip Cab & Stay',
    categoryId: 'cat-travel',
    description: 'Outing fuel, toll charges, rental cars, and resort booking',
  },
  {
    id: 'preset-movie',
    label: 'Movie Tickets & Outing',
    icon: 'Film',
    defaultTitle: 'Cinema Tickets & Snacks',
    categoryId: 'cat-entertainment',
    description: 'Group cinema tickets, bowling, or fest entry passes',
  },
];
