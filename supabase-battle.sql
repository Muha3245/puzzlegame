-- ============================================================
-- BATTLE ROOMS SCHEMA
-- Run this once in Supabase SQL Editor → New Query → Run
-- ============================================================

-- 1. battle_rooms table
-- Stores challenge rooms between two players
CREATE TABLE IF NOT EXISTS public.battle_rooms (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id    TEXT        NOT NULL,
  player2_id    TEXT        NOT NULL,
  player1_name  TEXT        NOT NULL DEFAULT 'Player 1',
  player2_name  TEXT        NOT NULL DEFAULT 'Player 2',
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','accepted','in_progress','completed','rejected')),
  category_id   TEXT        NOT NULL,
  category_key  TEXT        NOT NULL,
  category_title TEXT       NOT NULL,
  difficulty    TEXT        NOT NULL DEFAULT 'easy',
  level         INTEGER     NOT NULL DEFAULT 1,
  stake_coins   INTEGER     NOT NULL DEFAULT 60 CHECK (stake_coins > 0),
  winner_id     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. battle_room_players table
-- Per-player live progress inside a battle room
CREATE TABLE IF NOT EXISTS public.battle_room_players (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID        NOT NULL REFERENCES public.battle_rooms(id) ON DELETE CASCADE,
  user_id         TEXT        NOT NULL,
  display_name    TEXT        NOT NULL DEFAULT 'Player',
  score           INTEGER     DEFAULT 0,
  words_found     INTEGER     DEFAULT 0,
  total_words     INTEGER     DEFAULT 0,
  elapsed_seconds INTEGER     DEFAULT 0,
  last_word       TEXT,
  is_ready        BOOLEAN     DEFAULT FALSE,
  is_finished     BOOLEAN     DEFAULT FALSE,
  has_quit        BOOLEAN     DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (room_id, user_id)
);

-- ──────────────────────────────────────────────────────────────
-- REPLICA IDENTITY FULL
-- Required so Supabase Realtime delivers UPDATE events with all
-- column data, enabling both the room_id filter and RLS checks
-- to work correctly for live score syncing between players.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.battle_rooms        REPLICA IDENTITY FULL;
ALTER TABLE public.battle_room_players REPLICA IDENTITY FULL;

-- ──────────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.battle_rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_room_players ENABLE ROW LEVEL SECURITY;

-- battle_rooms policies
DROP POLICY IF EXISTS "battle_rooms_select" ON public.battle_rooms;
CREATE POLICY "battle_rooms_select" ON public.battle_rooms
  FOR SELECT USING (
    auth.uid()::TEXT = player1_id OR auth.uid()::TEXT = player2_id
  );

DROP POLICY IF EXISTS "battle_rooms_insert" ON public.battle_rooms;
CREATE POLICY "battle_rooms_insert" ON public.battle_rooms
  FOR INSERT WITH CHECK (auth.uid()::TEXT = player1_id);

DROP POLICY IF EXISTS "battle_rooms_update" ON public.battle_rooms;
CREATE POLICY "battle_rooms_update" ON public.battle_rooms
  FOR UPDATE USING (
    auth.uid()::TEXT = player1_id OR auth.uid()::TEXT = player2_id
  );

DROP POLICY IF EXISTS "battle_rooms_delete" ON public.battle_rooms;
CREATE POLICY "battle_rooms_delete" ON public.battle_rooms
  FOR DELETE USING (
    auth.uid()::TEXT = player1_id OR auth.uid()::TEXT = player2_id
  );

-- battle_room_players policies
DROP POLICY IF EXISTS "battle_players_select" ON public.battle_room_players;
CREATE POLICY "battle_players_select" ON public.battle_room_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.battle_rooms br
      WHERE br.id = room_id
        AND (auth.uid()::TEXT = br.player1_id OR auth.uid()::TEXT = br.player2_id)
    )
  );

DROP POLICY IF EXISTS "battle_players_insert" ON public.battle_room_players;
CREATE POLICY "battle_players_insert" ON public.battle_room_players
  FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id);

DROP POLICY IF EXISTS "battle_players_update" ON public.battle_room_players;
CREATE POLICY "battle_players_update" ON public.battle_room_players
  FOR UPDATE USING (auth.uid()::TEXT = user_id);

DROP POLICY IF EXISTS "battle_players_delete" ON public.battle_room_players;
CREATE POLICY "battle_players_delete" ON public.battle_room_players
  FOR DELETE USING (auth.uid()::TEXT = user_id);

-- ──────────────────────────────────────────────────────────────
-- Enable Realtime (so both players get live score updates)
-- ──────────────────────────────────────────────────────────────

-- Ignore "already member" errors if running this a second time
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_rooms;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_room_players;
  EXCEPTION WHEN others THEN NULL;
  END;
END
$$;

-- ──────────────────────────────────────────────────────────────
-- Helpful indexes for fast lookups
-- ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_battle_rooms_player1 ON public.battle_rooms (player1_id);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_player2 ON public.battle_rooms (player2_id);
CREATE INDEX IF NOT EXISTS idx_battle_players_room  ON public.battle_room_players (room_id);
CREATE INDEX IF NOT EXISTS idx_battle_players_user  ON public.battle_room_players (user_id);

-- ──────────────────────────────────────────────────────────────
-- Done! Both tables are ready.
-- The battle flow:
--   1. Player 1 creates a room (status: pending)
--   2. Player 2 accepts (status: accepted → both call ensureBattlePlayerRows)
--   3. Both navigate to /game?mode=battle&roomId=...
--   4. Game waits until battle_room_players has 2 rows with is_ready=true
--   5. Timer starts, realtime syncs scores live
--   6. First to finish → finalizeBattleRoomIfReady sets winner_id
-- ──────────────────────────────────────────────────────────────
