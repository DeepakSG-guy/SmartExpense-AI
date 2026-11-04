/**
 * Types & Domain Models for Student & Group Expense Splitting
 */

export type SplitMethod = 'equal' | 'percentage' | 'custom';
export type SplitStatus = 'active' | 'settled' | 'archived';
export type PaymentMode = 'upi' | 'cash' | 'bank_transfer' | 'card' | 'other';

export interface SplitParticipant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  upiId?: string; // e.g. "rahul@oksbi"
  isCurrentUser: boolean;
  avatarColor?: string;
  notes?: string;
  createdAt: string;
}

export interface SplitShare {
  id: string;
  splitId: string;
  participantId: string;
  amount: number; // in minor units (paise)
  percentage?: number; // for percentage split (e.g. 33.33)
  settledAmount: number; // in minor units (paise)
  isPaid: boolean;
}

export interface ExpenseSplit {
  id: string;
  title: string; // e.g. "Hostel Wi-Fi", "Swiggy Dinner", "Goa Trip Cab"
  totalAmount: number; // in minor units (paise)
  currency: string;
  splitMethod: SplitMethod;
  payerParticipantId: string; // Participant ID who paid upfront
  date: string; // YYYY-MM-DD
  categoryId?: string; // Optional link to expense category
  linkedAccountId?: string; // Optional account from which payer paid
  linkedTransactionId?: string; // Optional link to personal ledger
  notes?: string;
  status: SplitStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SplitSettlement {
  id: string;
  splitId: string;
  fromParticipantId: string; // Participant who pays back
  toParticipantId: string; // Participant receiving the payment (usually payer)
  amount: number; // in minor units (paise)
  paymentMode: PaymentMode;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface SplitWithDetails extends ExpenseSplit {
  payer: SplitParticipant;
  shares: Array<SplitShare & { participant: SplitParticipant }>;
  settlements: SplitSettlement[];
  totalSettled: number;
  remainingAmount: number;
  userShareAmount: number;
  userOwedToOthers: number;
  userOwedFromOthers: number;
  isUserPayer: boolean;
}

export interface SplitPreset {
  id: string;
  label: string;
  icon: string;
  defaultTitle: string;
  categoryId: string;
  description: string;
}
