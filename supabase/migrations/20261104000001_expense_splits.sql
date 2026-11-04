-- ==============================================================================
-- SMARTEXPENSE AI — EXPENSE SPLITS & STUDENT GROUP EXPENSES SCHEMA
-- Migration: 20261104000001_expense_splits.sql
-- ==============================================================================

-- 1. Split Participants (Friends, Roommates, Group members)
CREATE TABLE IF NOT EXISTS public.split_participants (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  upi_id TEXT,
  is_current_user BOOLEAN NOT NULL DEFAULT false,
  avatar_color TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Expense Splits
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  total_amount BIGINT NOT NULL, -- in minor currency units (paise)
  currency TEXT NOT NULL DEFAULT 'INR',
  split_method TEXT NOT NULL DEFAULT 'equal', -- 'equal', 'percentage', 'custom'
  payer_participant_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id TEXT,
  linked_account_id TEXT,
  linked_transaction_id TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'settled', 'archived'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Split Shares (Individual allocation per participant)
CREATE TABLE IF NOT EXISTS public.split_shares (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  split_id TEXT NOT NULL REFERENCES public.expense_splits(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  amount BIGINT NOT NULL, -- in minor units (paise)
  percentage NUMERIC(5,2),
  settled_amount BIGINT NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false
);

-- 4. Split Settlements (Full or partial repayments)
CREATE TABLE IF NOT EXISTS public.split_settlements (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  split_id TEXT NOT NULL REFERENCES public.expense_splits(id) ON DELETE CASCADE,
  from_participant_id TEXT NOT NULL,
  to_participant_id TEXT NOT NULL,
  amount BIGINT NOT NULL, -- in minor units (paise)
  payment_mode TEXT NOT NULL DEFAULT 'upi', -- 'upi', 'cash', 'bank_transfer', 'card', 'other'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_split_participants_user ON public.split_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON public.expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_date ON public.expense_splits(date DESC);
CREATE INDEX IF NOT EXISTS idx_split_shares_split ON public.split_shares(split_id);
CREATE INDEX IF NOT EXISTS idx_split_settlements_split ON public.split_settlements(split_id);

-- Enable Row Level Security (RLS) on all split tables
ALTER TABLE public.split_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_settlements ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
CREATE POLICY "Users can manage their split participants"
  ON public.split_participants FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their expense splits"
  ON public.expense_splits FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their split shares"
  ON public.split_shares FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their split settlements"
  ON public.split_settlements FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
