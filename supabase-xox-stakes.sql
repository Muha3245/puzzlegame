-- ============================================================
-- XOX ONLINE STAKES
-- Run in Supabase SQL Editor once after supabase-xox.sql.
-- Adds per-room coin stake for online XOX battles.
-- ============================================================

ALTER TABLE public.xox_rooms
  ADD COLUMN IF NOT EXISTS stake_coins INTEGER NOT NULL DEFAULT 60;

DO $$
BEGIN
  ALTER TABLE public.xox_rooms
    ADD CONSTRAINT xox_rooms_stake_coins_positive
    CHECK (stake_coins > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Existing XOX rooms will use the default 60 coin stake.
