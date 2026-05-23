-- ============================================================
-- FRIENDS & FRIEND REQUESTS — RLS FIX
-- Run this ONCE in Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. Make sure the tables exist (safe to run even if they do)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id          TEXT        PRIMARY KEY,
  from_uid    TEXT        NOT NULL,
  to_uid      TEXT        NOT NULL,
  from_name   TEXT        NOT NULL DEFAULT '',
  to_name     TEXT        NOT NULL DEFAULT '',
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','accepted','rejected')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.friends (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  friend_id   TEXT        NOT NULL,
  friend_name TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

-- ──────────────────────────────────────────────────────────────
-- 2. Enable RLS on both tables
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends          ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────
-- 3. friend_requests policies
--    • SELECT  — both sender and receiver can read
--    • INSERT  — only the sender (from_uid) may create a request
--    • UPDATE  — both parties may update (accept / reject / cancel)
--    • DELETE  — both parties may delete
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "friend_requests_select" ON public.friend_requests;
CREATE POLICY "friend_requests_select" ON public.friend_requests
  FOR SELECT USING (
    auth.uid()::TEXT = from_uid
    OR auth.uid()::TEXT = to_uid
  );

DROP POLICY IF EXISTS "friend_requests_insert" ON public.friend_requests;
CREATE POLICY "friend_requests_insert" ON public.friend_requests
  FOR INSERT WITH CHECK (
    auth.uid()::TEXT = from_uid
  );

DROP POLICY IF EXISTS "friend_requests_update" ON public.friend_requests;
CREATE POLICY "friend_requests_update" ON public.friend_requests
  FOR UPDATE USING (
    auth.uid()::TEXT = from_uid
    OR auth.uid()::TEXT = to_uid
  );

DROP POLICY IF EXISTS "friend_requests_delete" ON public.friend_requests;
CREATE POLICY "friend_requests_delete" ON public.friend_requests
  FOR DELETE USING (
    auth.uid()::TEXT = from_uid
    OR auth.uid()::TEXT = to_uid
  );

-- ──────────────────────────────────────────────────────────────
-- 4. friends policies
--    • SELECT  — a user can see their own friend rows
--    • INSERT  — the accepting user inserts rows for BOTH sides,
--                so allow insert if the actor is either user_id
--                OR friend_id (the accepter inserts the sender's row)
--    • UPDATE  — own rows only
--    • DELETE  — own rows only
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "friends_select" ON public.friends;
CREATE POLICY "friends_select" ON public.friends
  FOR SELECT USING (
    auth.uid()::TEXT = user_id
  );

DROP POLICY IF EXISTS "friends_insert" ON public.friends;
CREATE POLICY "friends_insert" ON public.friends
  FOR INSERT WITH CHECK (
    auth.uid()::TEXT = user_id
    OR auth.uid()::TEXT = friend_id
  );

DROP POLICY IF EXISTS "friends_update" ON public.friends;
CREATE POLICY "friends_update" ON public.friends
  FOR UPDATE USING (
    auth.uid()::TEXT = user_id
  );

DROP POLICY IF EXISTS "friends_delete" ON public.friends;
CREATE POLICY "friends_delete" ON public.friends
  FOR DELETE USING (
    auth.uid()::TEXT = user_id
    OR auth.uid()::TEXT = friend_id
  );

-- ──────────────────────────────────────────────────────────────
-- 5. Add to Realtime (optional — for live friend list updates)
-- ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friends;
  EXCEPTION WHEN others THEN NULL;
  END;
END
$$;

-- ──────────────────────────────────────────────────────────────
-- Done! Friend requests and friends RLS policies are now set.
-- ──────────────────────────────────────────────────────────────
