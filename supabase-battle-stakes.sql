-- ============================================================
-- BATTLE STAKES
-- Run in Supabase SQL Editor once after supabase-battle.sql.
-- Adds per-room coin stake for online Word Search battles.
-- ============================================================

ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS stake_coins INTEGER NOT NULL DEFAULT 60;

DO $$
BEGIN
  ALTER TABLE public.battle_rooms
    ADD CONSTRAINT battle_rooms_stake_coins_positive
    CHECK (stake_coins > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Existing battle rooms will use the default 60 coin stake.
