-- ============================================================
-- XOX ONLINE ROOMS SCHEMA
-- Run ONCE in Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- 1. xox_rooms table
CREATE TABLE IF NOT EXISTS public.xox_rooms (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id    TEXT        NOT NULL,   -- challenger (always plays X)
  player2_id    TEXT        NOT NULL,   -- challenged  (always plays O)
  player1_name  TEXT        NOT NULL DEFAULT 'Player 1',
  player2_name  TEXT        NOT NULL DEFAULT 'Player 2',
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','in_progress','completed')),
  board_size    INTEGER     NOT NULL DEFAULT 3,
  board         TEXT        NOT NULL DEFAULT '[]',   -- JSON array of marks
  current_turn  TEXT        NOT NULL DEFAULT 'X',    -- 'X' or 'O'
  winner        TEXT,                                -- 'X', 'O', 'draw', or NULL
  winner_id     TEXT,
  stake_coins   INTEGER     NOT NULL DEFAULT 60 CHECK (stake_coins > 0),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Required for Realtime UPDATE events to carry full row data
ALTER TABLE public.xox_rooms REPLICA IDENTITY FULL;

-- 3. Row Level Security
ALTER TABLE public.xox_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xox_rooms_select" ON public.xox_rooms;
CREATE POLICY "xox_rooms_select" ON public.xox_rooms
  FOR SELECT USING (
    auth.uid()::TEXT = player1_id OR auth.uid()::TEXT = player2_id
  );

DROP POLICY IF EXISTS "xox_rooms_insert" ON public.xox_rooms;
CREATE POLICY "xox_rooms_insert" ON public.xox_rooms
  FOR INSERT WITH CHECK (auth.uid()::TEXT = player1_id);

DROP POLICY IF EXISTS "xox_rooms_update" ON public.xox_rooms;
CREATE POLICY "xox_rooms_update" ON public.xox_rooms
  FOR UPDATE USING (
    auth.uid()::TEXT = player1_id OR auth.uid()::TEXT = player2_id
  );

DROP POLICY IF EXISTS "xox_rooms_delete" ON public.xox_rooms;
CREATE POLICY "xox_rooms_delete" ON public.xox_rooms
  FOR DELETE USING (
    auth.uid()::TEXT = player1_id OR auth.uid()::TEXT = player2_id
  );

-- 4. Add to Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.xox_rooms;
  EXCEPTION WHEN others THEN NULL;
  END;
END
$$;

-- 5. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_xox_rooms_p1 ON public.xox_rooms (player1_id);
CREATE INDEX IF NOT EXISTS idx_xox_rooms_p2 ON public.xox_rooms (player2_id);

-- ============================================================
-- Done! Flow:
--   1. Player 1 creates room (status: pending)
--   2. Player 2 accepts (status: in_progress)
--   3. Both navigate to /xox-room?roomId=...
--   4. Moves synced via Broadcast (instant) + postgres_changes (fallback)
--   5. Winner detected client-side, saved to winner + winner_id
-- ============================================================
