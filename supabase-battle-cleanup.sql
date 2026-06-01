-- ============================================================
-- BATTLE CLEANUP + LIFETIME STATS
-- Run this once in Supabase SQL Editor → New Query → Run
--
-- Goal: keep the DB light. Finished or abandoned battle rooms are
-- DELETED immediately, but each player's lifetime win/loss totals are
-- preserved on public.users (battles_won / battles_lost).
-- ============================================================

-- 1. Lifetime battle stat columns on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS battles_won  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS battles_lost INTEGER NOT NULL DEFAULT 0;

-- 2. record_battle_result(room_id, winner_id)
--    - Atomically deletes the battle room (player rows cascade away).
--    - Increments winner.battles_won and loser.battles_lost.
--    - SECURITY DEFINER so it can update the *opponent's* row (which the
--      caller's RLS would otherwise forbid).
--    - Idempotent: only the first caller's DELETE returns rows, so stats
--      are counted exactly once even though both clients call it.
CREATE OR REPLACE FUNCTION public.record_battle_result(
  p_room_id   UUID,
  p_winner_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT := auth.uid()::TEXT;
  v_p1     TEXT;
  v_p2     TEXT;
  v_loser  TEXT;
BEGIN
  -- Claim + remove the room. Only a participant may do this, and only the
  -- first caller gets the player ids back (the row is gone afterwards).
  DELETE FROM public.battle_rooms
   WHERE id = p_room_id
     AND (player1_id = v_caller OR player2_id = v_caller)
  RETURNING player1_id, player2_id INTO v_p1, v_p2;

  -- Already cleaned up by the other player, or caller not a participant.
  IF v_p1 IS NULL THEN
    RETURN;
  END IF;

  -- Only record a result when there is a decisive winner. A draw (NULL)
  -- removes the room without touching anyone's win/loss totals.
  IF p_winner_id IS NOT NULL AND (p_winner_id = v_p1 OR p_winner_id = v_p2) THEN
    v_loser := CASE WHEN p_winner_id = v_p1 THEN v_p2 ELSE v_p1 END;

    UPDATE public.users
       SET battles_won = battles_won + 1, updated_at = now()
     WHERE uid = p_winner_id;

    UPDATE public.users
       SET battles_lost = battles_lost + 1, updated_at = now()
     WHERE uid = v_loser;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_battle_result(UUID, TEXT)
  TO authenticated, anon;

-- ============================================================
-- AVATARS STORAGE POLICIES
-- The 'avatars' bucket is Public (anyone can read), but uploads/updates
-- still need RLS policies on storage.objects. Files are stored at
-- "<uid>/avatar.<ext>", so each user may only write inside their own folder.
-- ============================================================

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Done. After this:
--   • finishBattleRoomNow() calls record_battle_result → room deleted,
--     stats updated once.
--   • A player who quits mid-match → opponent's client finishes the room
--     by quit (win recorded, room deleted).
--   • If BOTH players quit, quitBattleRoom() already deletes the room
--     (no winner, no stat change).
-- ============================================================
