// lib/online.ts
// Supabase helpers for auth, profiles, friends, leaderboard, progress, and live battle rooms.

import { supabase } from "./supabase";
import { DEFAULT_BATTLE_STAKE, sanitizeBattleStake } from "./battleEconomy";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

// Required on Android/iOS so the in-app browser can hand the auth redirect
// back to the app. Safe to call at module load.
WebBrowser.maybeCompleteAuthSession();

const ONLINE_LOG_THROTTLE = new Map<string, number>();

function logOnline(step: string, data?: any) {
  try {
    const roomId = data?.roomId || data?.id || "";
    const key = `${step}:${roomId}`;
    const now = Date.now();
    const last = ONLINE_LOG_THROTTLE.get(key) || 0;

    // Prevent terminal flood from polling logs. Important errors still print below.
    if (
      (step.includes("players") ||
        step.includes("status in_progress") ||
        step.includes("start") ||
        step.includes("getBattleRooms")) &&
      now - last < 5000
    ) {
      return;
    }

    ONLINE_LOG_THROTTLE.set(key, now);
    console.log(`[BATTLE][ONLINE] ${step}`, data ?? "");
  } catch {}
}

export type PublicUser = {
  uid: string;
  displayName: string;
  email?: string | null;
  photoURL?: string | null;
  coins: number;
  totalScore: number;
  levelsCompleted: number;
  battlesWon: number;
  battlesLost: number;
  createdAt?: any;
  updatedAt?: any;
};

export type FriendRequest = {
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
  fromPhotoURL?: string | null;
  status: "pending" | "accepted" | "rejected";
  createdAt?: any;
};

export type BattleRoom = {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  status: "pending" | "accepted" | "in_progress" | "completed";
  categoryId: string;
  categoryKey: string;
  categoryTitle: string;
  difficulty: string;
  level: number;
  stakeCoins: number;
  winnerId?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

export type BattlePlayerState = {
  roomId: string;
  userId: string;
  displayName: string;
  score: number;
  wordsFound: number;
  totalWords: number;
  elapsedSeconds: number;
  isReady: boolean;
  isFinished: boolean;
  hasQuit?: boolean;
  lastWord?: string | null;
  updatedAt?: any;
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapUser(row: any): PublicUser {
  return {
    uid: row.uid,
    displayName: row.display_name || row.email?.split("@")[0] || "Player",
    email: row.email,
    photoURL: row.photo_url,
    coins: row.coins ?? 0,
    totalScore: row.total_score ?? 0,
    levelsCompleted: row.levels_completed ?? 0,
    battlesWon: row.battles_won ?? 0,
    battlesLost: row.battles_lost ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBattleRoom(row: any): BattleRoom {
  return {
    id: row.id,
    player1Id: row.player1_id,
    player2Id: row.player2_id,
    player1Name: row.player1_name || "Player 1",
    player2Name: row.player2_name || "Player 2",
    status: row.status,
    categoryId: row.category_id,
    categoryKey: row.category_key,
    categoryTitle: row.category_title,
    difficulty: row.difficulty,
    level: row.level,
    stakeCoins: sanitizeBattleStake(row.stake_coins ?? DEFAULT_BATTLE_STAKE),
    winnerId: row.winner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBattlePlayer(row: any): BattlePlayerState {
  return {
    roomId: row.room_id,
    userId: row.user_id,
    displayName: row.display_name || "Player",
    score: row.score ?? 0,
    wordsFound: row.words_found ?? 0,
    totalWords: row.total_words ?? 0,
    elapsedSeconds: row.elapsed_seconds ?? 0,
    isReady: row.is_ready === true,
    isFinished: row.is_finished === true,
    hasQuit: row.has_quit === true,
    lastWord: row.last_word,
    updatedAt: row.updated_at,
  };
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export type AuthStatus = {
  // True only for a real account (email/password or Google). Guests excluded.
  loggedIn: boolean;
  // True for an anonymous "Play as Guest" session.
  isGuest: boolean;
  uid: string | null;
};

// Online features (battle / XOX online) require a real, non-anonymous account
// so opponents, friends and stats persist. Use this to gate those entry points.
export async function getAuthStatus(): Promise<AuthStatus> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  const isGuest = user?.is_anonymous === true;
  return {
    loggedIn: !!user && !isGuest,
    isGuest,
    uid: user?.id ?? null,
  };
}

export async function ensureUserProfile(
  uid: string,
  email: string | null | undefined,
  displayName?: string,
) {
  const safeName =
    displayName?.trim() || email?.split("@")[0] || `Player-${uid.slice(0, 5)}`;

  // NOTE: do not include photo_url here. This runs on every login, and an
  // upsert would overwrite an existing uploaded avatar back to null. The
  // column keeps its existing value (or DB default on first insert).
  const { error } = await supabase.from("users").upsert(
    {
      uid,
      display_name: safeName,
      email: email ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "uid", ignoreDuplicates: false },
  );

  if (error) throw error;
  return safeName;
}

export async function updatePhotoURL(photoURL: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  const { error } = await supabase
    .from('users')
    .update({ photo_url: photoURL, updated_at: new Date().toISOString() })
    .eq('uid', session.user.id);
  if (error) throw error;
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: name.trim() } },
  });

  if (error) throw new Error(error.message);

  if (data.user && !data.session) {
    throw new Error(
      "Confirm your email first, or turn off email confirmation in Supabase Auth settings for testing.",
    );
  }

  if (!data.user) throw new Error("Sign-up returned no user.");
  await ensureUserProfile(data.user.id, data.user.email, name.trim());
  return data.user;
}

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Login failed. Please try again.");

  await ensureUserProfile(
    data.user.id,
    data.user.email,
    data.user.user_metadata?.display_name,
  );
  return data.user;
}

export async function loginAsGuest() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error("Guest login failed.");
  await ensureUserProfile(
    data.user.id,
    null,
    `Guest-${data.user.id.slice(0, 5)}`,
  );
  return data.user;
}

// Google OAuth via the system browser. Requires the Google provider to be
// enabled in Supabase (Authentication → Providers → Google) with a Google
// Cloud OAuth client whose authorized redirect URI is
//   https://<project>.supabase.co/auth/v1/callback
// The app uses the "puzzlegame" scheme to receive the redirect back.
export async function loginWithGoogle() {
  const redirectTo = Linking.createURL("auth-callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error("Could not start Google sign-in.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success" || !result.url) {
    throw new Error("Google sign-in was cancelled.");
  }

  // Establish the session from whatever the provider returned. supabase-js
  // defaults to the PKCE flow (?code=...); older/implicit flows return tokens
  // in the URL hash (#access_token=...). Handle both.
  const parsed = Linking.parse(result.url);
  const code = parsed.queryParams?.code;

  if (typeof code === "string" && code) {
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) throw new Error(exErr.message);
  } else {
    const hash = result.url.includes("#")
      ? result.url.slice(result.url.indexOf("#") + 1)
      : "";
    const hp = new URLSearchParams(hash);
    const access_token = hp.get("access_token");
    const refresh_token = hp.get("refresh_token");
    if (!access_token || !refresh_token) {
      throw new Error("Google sign-in did not return a session.");
    }
    const { error: sErr } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sErr) throw new Error(sErr.message);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error("Google sign-in failed. Please try again.");

  await ensureUserProfile(
    user.id,
    user.email,
    user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0],
  );
  return user;
}

export async function logoutOnline() {
  await supabase.auth.signOut();
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<PublicUser | null> {
  const uid = await getCurrentUserId();
  if (!uid) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", uid)
    .maybeSingle();
  if (error) throw error;
  return data ? mapUser(data) : null;
}

// ─── Level progress ───────────────────────────────────────────────────────────

export async function completeOnlineLevel({
  categoryKey,
  difficulty,
  level,
  foundWords,
  rewardCoins,
}: {
  categoryKey: string;
  difficulty: string;
  level: number;
  foundWords: number;
  rewardCoins: number;
}) {
  const uid = await getCurrentUserId();
  if (!uid) return;

  const progressKey = `${categoryKey}-${difficulty}-level-${level}`;

  const { data: existing } = await supabase
    .from("user_progress")
    .select("completed")
    .eq("user_id", uid)
    .eq("progress_key", progressKey)
    .maybeSingle();

  const wasCompleted = existing?.completed === true;

  await supabase.from("user_progress").upsert(
    {
      user_id: uid,
      progress_key: progressKey,
      category_key: categoryKey,
      difficulty,
      level,
      found_words: foundWords,
      completed: true,
      reward_coins: rewardCoins,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,progress_key" },
  );

  const scoreGain = foundWords * 10 + rewardCoins;
  const { data: profile } = await supabase
    .from("users")
    .select("coins, total_score, levels_completed")
    .eq("uid", uid)
    .maybeSingle();

  if (profile) {
    await supabase
      .from("users")
      .update({
        coins: (profile.coins ?? 0) + rewardCoins,
        total_score: (profile.total_score ?? 0) + scoreGain,
        levels_completed:
          (profile.levels_completed ?? 0) + (wasCompleted ? 0 : 1),
        updated_at: new Date().toISOString(),
      })
      .eq("uid", uid);
  }
}

export async function applyOnlineCoinDelta(delta: number) {
  if (!Number.isFinite(delta) || delta === 0) return;

  const uid = await getCurrentUserId();
  if (!uid) return;

  const { data: profile, error: fetchError } = await supabase
    .from("users")
    .select("coins")
    .eq("uid", uid)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!profile) return;

  const { error } = await supabase
    .from("users")
    .update({
      coins: Math.max(0, (profile.coins ?? 0) + delta),
      updated_at: new Date().toISOString(),
    })
    .eq("uid", uid);

  if (error) throw error;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getGlobalLeaderboard(count = 50) {
  const { data, error } = await supabase
    .from("users")
    .select(
      "uid, display_name, email, photo_url, coins, total_score, levels_completed",
    )
    .order("total_score", { ascending: false })
    .limit(count);

  if (error) throw error;

  return (data ?? []).map((row, index) => ({
    rank: index + 1,
    ...mapUser(row),
  }));
}

// ─── Player search ────────────────────────────────────────────────────────────

export async function searchPlayers(searchText: string): Promise<PublicUser[]> {
  const text = searchText.trim();
  if (!text) return [];

  const uid = await getCurrentUserId();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .or(
      `display_name.ilike.%${text}%,email.ilike.%${text}%,uid.ilike.%${text}%`,
    )
    .limit(30);

  if (error) throw error;
  return (data ?? []).filter((row) => row.uid !== uid).map(mapUser);
}

// Default list shown in the Friends screen when the search box is empty:
// the top players by score (excluding yourself). Lets users discover and add
// friends without having to type anything first.
export async function getSuggestedPlayers(limit = 20): Promise<PublicUser[]> {
  const uid = await getCurrentUserId();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("total_score", { ascending: false })
    .limit(limit + 1);

  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.uid !== uid)
    .slice(0, limit)
    .map(mapUser);
}

// ─── Friend requests ──────────────────────────────────────────────────────────

export async function sendFriendRequest(toUser: PublicUser) {
  const uid = await getCurrentUserId();
  if (!uid) throw new Error("Please login first.");

  const myProfile = await getMyProfile();
  if (!myProfile) throw new Error("Profile not found.");

  const requestId = `${uid}_${toUser.uid}`;
  const { error } = await supabase.from("friend_requests").upsert(
    {
      id: requestId,
      from_uid: uid,
      to_uid: toUser.uid,
      from_name: myProfile.displayName,
      to_name: toUser.displayName,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) throw error;
  return requestId;
}

export async function getIncomingFriendRequests(): Promise<FriendRequest[]> {
  const uid = await getCurrentUserId();
  if (!uid) return [];

  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("to_uid", uid)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const requests = (data ?? []).map((row) => ({
    id: row.id,
    fromUid: row.from_uid,
    toUid: row.to_uid,
    fromName: row.from_name,
    toName: row.to_name,
    status: row.status,
    createdAt: row.created_at,
  }));

  const senderIds = [...new Set(requests.map((request) => request.fromUid).filter(Boolean))];
  if (senderIds.length === 0) return requests;

  const { data: senders } = await supabase
    .from("users")
    .select("uid, photo_url")
    .in("uid", senderIds);

  const photosByUid = new Map((senders ?? []).map((row) => [row.uid, row.photo_url ?? null]));
  return requests.map((request) => ({
    ...request,
    fromPhotoURL: photosByUid.get(request.fromUid) ?? null,
  }));
}

function mapFriendRequest(row: any): FriendRequest {
  return {
    id: row.id,
    fromUid: row.from_uid,
    toUid: row.to_uid,
    fromName: row.from_name,
    toName: row.to_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function subscribeToIncomingFriendRequests(
  userId: string,
  onNewRequest: (request: FriendRequest) => void,
) {
  const channel = supabase
    .channel(`friend-incoming-${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "friend_requests" },
      (payload: any) => {
        if (
          payload.new?.to_uid === userId &&
          payload.new?.status === "pending"
        ) {
          onNewRequest(mapFriendRequest(payload.new));
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToFriendRequestChanges(
  userId: string,
  onChange: () => void,
) {
  const channel = supabase
    .channel(`friend-request-count-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "friend_requests",
        filter: `to_uid=eq.${userId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function acceptFriendRequest(request: FriendRequest) {
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("friend_requests")
    .update({ status: "accepted", updated_at: now })
    .eq("id", request.id);
  if (updateError) throw updateError;

  const { error: insertOneError } = await supabase
    .from("friends")
    .upsert(
      {
        user_id: request.fromUid,
        friend_id: request.toUid,
        friend_name: request.toName,
      },
      { onConflict: "user_id,friend_id" },
    );
  if (insertOneError) throw insertOneError;

  const { error: insertTwoError } = await supabase
    .from("friends")
    .upsert(
      {
        user_id: request.toUid,
        friend_id: request.fromUid,
        friend_name: request.fromName,
      },
      { onConflict: "user_id,friend_id" },
    );
  if (insertTwoError) throw insertTwoError;
}

export async function rejectFriendRequest(request: FriendRequest) {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", request.id);
  if (error) throw error;
}

export async function getMyFriends(): Promise<PublicUser[]> {
  const uid = await getCurrentUserId();
  if (!uid) return [];

  const { data, error } = await supabase
    .from("friends")
    .select("friend_id, friend_name, created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const friendIds = [...new Set(rows.map((row) => row.friend_id).filter(Boolean))];
  const { data: profiles } = friendIds.length
    ? await supabase
        .from("users")
        .select("uid, display_name, email, photo_url, coins, total_score, levels_completed, battles_won, battles_lost, created_at, updated_at")
        .in("uid", friendIds)
    : { data: [] };

  const profilesByUid = new Map((profiles ?? []).map((profile) => [profile.uid, profile]));

  return rows.map((row) => {
    const profile = profilesByUid.get(row.friend_id);
    return {
      id: row.friend_id,
      uid: row.friend_id,
      displayName: profile?.display_name || row.friend_name || "Friend",
      email: profile?.email ?? null,
      photoURL: profile?.photo_url ?? null,
      coins: profile?.coins ?? 0,
      totalScore: profile?.total_score ?? 0,
      levelsCompleted: profile?.levels_completed ?? 0,
      battlesWon: profile?.battles_won ?? 0,
      battlesLost: profile?.battles_lost ?? 0,
      createdAt: row.created_at,
      updatedAt: profile?.updated_at,
    };
  });
}

export async function removeFriend(friendUid: string) {
  const uid = await getCurrentUserId();
  if (!uid) return;

  await supabase
    .from("friends")
    .delete()
    .eq("user_id", uid)
    .eq("friend_id", friendUid);
  await supabase
    .from("friends")
    .delete()
    .eq("user_id", friendUid)
    .eq("friend_id", uid);
}

// ─── Live Battle Rooms ────────────────────────────────────────────────────────

export async function createBattleRoom({
  friend,
  categoryId,
  categoryKey,
  categoryTitle,
  difficulty,
  level,
  stakeCoins = DEFAULT_BATTLE_STAKE,
}: {
  friend: PublicUser;
  categoryId: string;
  categoryKey: string;
  categoryTitle: string;
  difficulty: string;
  level: number;
  stakeCoins?: number;
}) {
  const me = await getMyProfile();
  if (!me) throw new Error("Please login first.");

  const safeDifficulty = String(difficulty || "easy")
    .toLowerCase()
    .trim();
  const payload = {
    player1_id: me.uid,
    player2_id: friend.uid,
    player1_name: me.displayName,
    player2_name: friend.displayName,
    status: "pending",
    category_id: categoryId,
    category_key: categoryKey || categoryId,
    category_title: categoryTitle || categoryKey || categoryId,
    difficulty: ["easy", "medium", "hard", "pro"].includes(safeDifficulty)
      ? safeDifficulty
      : "easy",
    level: Math.min(Math.max(Number(level || 1) || 1, 1), 8),
    stake_coins: sanitizeBattleStake(stakeCoins),
    updated_at: new Date().toISOString(),
  };

  logOnline("createBattleRoom insert", payload);

  let { data, error } = await supabase
    .from("battle_rooms")
    .insert(payload)
    .select("*")
    .single();

  if (error && String(error.message ?? "").toLowerCase().includes("stake_coins")) {
    const { stake_coins: _stakeCoins, ...fallbackPayload } = payload;
    const retry = await supabase
      .from("battle_rooms")
      .insert(fallbackPayload)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    logOnline("createBattleRoom error", error);
    throw error;
  }

  const room = mapBattleRoom(data);
  logOnline("createBattleRoom success", room);
  return room;
}

// Removes finished ("completed") rooms the user is part of so played games and
// accepted-then-played challenges don't pile up in their lists. A short grace
// window keeps a just-finished room around briefly so the opponent's screen can
// still read the final result before it disappears. Win/loss records are saved
// separately (battle stats / coins) before the room is ever removed.
async function purgeFinishedRooms(
  table: "battle_rooms" | "xox_rooms",
  uid: string,
) {
  try {
    const cutoff = new Date(Date.now() - 10_000).toISOString();
    await supabase
      .from(table)
      .delete()
      .eq("status", "completed")
      .or(`player1_id.eq.${uid},player2_id.eq.${uid}`)
      .lt("updated_at", cutoff);
  } catch {
    // Non-fatal: list still renders, cleanup retries on the next load.
  }
}

export async function getBattleRooms(): Promise<{
  incoming: BattleRoom[];
  outgoing: BattleRoom[];
  active: BattleRoom[];
  completed: BattleRoom[];
}> {
  const uid = await getCurrentUserId();
  if (!uid) return { incoming: [], outgoing: [], active: [], completed: [] };

  await purgeFinishedRooms("battle_rooms", uid);

  const { data, error } = await supabase
    .from("battle_rooms")
    .select("*")
    .or(`player1_id.eq.${uid},player2_id.eq.${uid}`)
    .order("created_at", { ascending: false });

  if (error) {
    logOnline("getBattleRooms error", error);
    throw error;
  }
  const rooms = (data ?? []).map(mapBattleRoom);
  logOnline("getBattleRooms", { uid, count: rooms.length });

  return {
    incoming: rooms.filter(
      (r) => r.status === "pending" && r.player2Id === uid,
    ),
    outgoing: rooms.filter(
      (r) => r.status === "pending" && r.player1Id === uid,
    ),
    active: rooms.filter(
      (r) => r.status === "accepted" || r.status === "in_progress",
    ),
    completed: rooms.filter((r) => r.status === "completed"),
  };
}

export async function getBattleRoom(
  roomId: string,
): Promise<BattleRoom | null> {
  const { data, error } = await supabase
    .from("battle_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapBattleRoom(data) : null;
}

export async function acceptBattleRoom(room: BattleRoom): Promise<BattleRoom> {
  logOnline("acceptBattleRoom start", { id: room.id, status: room.status });

  const { data, error } = await supabase
    .from("battle_rooms")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", room.id)
    .in("status", ["pending", "accepted", "in_progress"])
    .select("*")
    .single();

  if (error) {
    logOnline("acceptBattleRoom update error", error);
    throw error;
  }

  await ensureBattlePlayerRows(room.id);

  const fresh = await getBattleRoom(room.id);
  const accepted = fresh ?? mapBattleRoom(data);
  logOnline("acceptBattleRoom success", accepted);
  return accepted;
}

export async function rejectBattleRoom(room: BattleRoom) {
  // Delete instead of setting status='rejected' — the DB check constraint only allows
  // pending/accepted/in_progress/completed. Deletion also cleans up cleanly and fires
  // subscribeToMyBattleList so both players' lists refresh automatically.
  await supabase.from("battle_room_players").delete().eq("room_id", room.id);
  const { error } = await supabase
    .from("battle_rooms")
    .delete()
    .eq("id", room.id);
  if (error) throw error;
}

export async function ensureBattlePlayerRows(roomId: string) {
  const uid = await getCurrentUserId();
  if (!uid) throw new Error("Please login first.");

  const room = await getBattleRoom(roomId);
  if (!room) throw new Error("Battle room not found.");

  const isPlayer1 = uid === room.player1Id;
  const isPlayer2 = uid === room.player2Id;
  if (!isPlayer1 && !isPlayer2)
    throw new Error("You are not part of this battle room.");

  const now = new Date().toISOString();
  const displayName = isPlayer1 ? room.player1Name : room.player2Name;
  logOnline("ensureBattlePlayerRows start", {
    roomId,
    uid,
    isPlayer1,
    isPlayer2,
    status: room.status,
  });

  // Important for rematch: never revive or keep touching an old completed room.
  // The game screen can briefly keep old polling alive during router.replace().
  if (room.status === "completed") {
    logOnline("ensureBattlePlayerRows skip completed room", { roomId });
    return;
  }

  const { error } = await supabase
    .from("battle_room_players")
    .upsert(
      {
        room_id: room.id,
        user_id: uid,
        display_name: displayName,
        is_ready: true,
        has_quit: false,
        updated_at: now,
      },
      { onConflict: "room_id,user_id" },
    );
  if (error) {
    logOnline("ensureBattlePlayerRows upsert error", error);
    throw error;
  }

  const players = await getBattlePlayers(room.id).catch((e) => {
    logOnline("ensureBattlePlayerRows get players error", e);
    return [];
  });

  logOnline("ensureBattlePlayerRows players", {
    roomId,
    count: players.length,
    players: players.map((p) => ({
      userId: p.userId,
      ready: p.isReady,
      name: p.displayName,
    })),
  });

  // Keep pending rooms visible to the invited opponent until they accept.
  // Only switch to in_progress after both player rows exist.
  if (players.length >= 2) {
    const { data: updatedRows, error: updateError } = await supabase
      .from("battle_rooms")
      .update({ status: "in_progress", updated_at: now })
      .eq("id", room.id)
      .in("status", ["accepted", "in_progress"])
      .select("id,status");

    if (updateError) {
      logOnline("ensureBattlePlayerRows status update error", updateError);
      throw updateError;
    }

    if ((updatedRows ?? []).length > 0) {
      logOnline("ensureBattlePlayerRows status in_progress", { roomId });
    }
  }
}

export async function getBattlePlayers(
  roomId: string,
): Promise<BattlePlayerState[]> {
  const { data, error } = await supabase
    .from("battle_room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapBattlePlayer);
}

// Fetch public profiles (incl. photo_url) for a set of user ids.
// Used in-game to show opponent/self avatars without storing photos on the
// battle_room_players rows. Returns a uid -> photoURL map.
export async function getPhotosByIds(
  ids: (string | null | undefined)[],
): Promise<Record<string, string | null>> {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (!unique.length) return {};

  const { data, error } = await supabase
    .from("users")
    .select("uid, photo_url")
    .in("uid", unique);
  if (error) throw error;

  const map: Record<string, string | null> = {};
  (data ?? []).forEach((row: any) => {
    map[row.uid] = row.photo_url ?? null;
  });
  return map;
}

export async function updateBattleProgress({
  roomId,
  score,
  wordsFound,
  totalWords,
  elapsedSeconds,
  lastWord,
  isFinished,
}: {
  roomId: string;
  score: number;
  wordsFound: number;
  totalWords: number;
  elapsedSeconds: number;
  lastWord?: string;
  isFinished?: boolean;
}) {
  const uid = await getCurrentUserId();
  if (!uid) return;

  const { error } = await supabase
    .from("battle_room_players")
    .update({
      score,
      words_found: wordsFound,
      total_words: totalWords,
      elapsed_seconds: elapsedSeconds,
      last_word: lastWord ?? null,
      is_ready: true,
      is_finished: isFinished === true,
      updated_at: new Date().toISOString(),
    })
    .eq("room_id", roomId)
    .eq("user_id", uid);

  if (error) throw error;
  if (isFinished) await finalizeBattleRoomIfReady(roomId);
}

export async function finalizeBattleRoomIfReady(roomId: string) {
  const players = await getBattlePlayers(roomId);
  if (players.length < 2 || !players.every((p) => p.isFinished)) return null;

  const [a, b] = players;
  let winnerId: string | null = null;

  if (a.wordsFound > b.wordsFound) winnerId = a.userId;
  else if (b.wordsFound > a.wordsFound) winnerId = b.userId;
  else if (a.score > b.score) winnerId = a.userId;
  else if (b.score > a.score) winnerId = b.userId;
  else if (a.elapsedSeconds < b.elapsedSeconds) winnerId = a.userId;
  else if (b.elapsedSeconds < a.elapsedSeconds) winnerId = b.userId;

  const { error } = await supabase
    .from("battle_rooms")
    .update({
      status: "completed",
      winner_id: winnerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", roomId);
  if (error) throw error;
  return winnerId;
}

export async function finishBattleRoomNow(
  roomId: string,
  winnerId: string | null,
) {
  // Records the result into both players' lifetime stats (battles_won /
  // battles_lost) and DELETES the room + its player rows in one atomic,
  // idempotent step — so finished matches never accumulate in the DB.
  // Both clients may call this; the SECURITY DEFINER RPC ensures the stats
  // are counted exactly once (the first caller wins the delete race).
  const { error } = await supabase.rpc("record_battle_result", {
    p_room_id: roomId,
    p_winner_id: winnerId,
  });

  if (error) throw error;
  return winnerId;
}

export async function quitBattleRoom(roomId: string) {
  const uid = await getCurrentUserId();
  if (!uid) return;

  const now = new Date().toISOString();
  await supabase
    .from("battle_room_players")
    .update({ has_quit: true, updated_at: now })
    .eq("room_id", roomId)
    .eq("user_id", uid);

  const players = await getBattlePlayers(roomId);
  const bothQuit =
    players.length >= 2 && players.every((p: any) => p.has_quit || p.hasQuit);
  if (bothQuit) {
    await supabase.from("battle_room_players").delete().eq("room_id", roomId);
    await supabase.from("battle_rooms").delete().eq("id", roomId);
  }
}

export async function getBattleCounts() {
  const rooms = await getBattleRooms();
  return {
    incoming: rooms.incoming.length,
    outgoing: rooms.outgoing.length,
    active: rooms.active.length,
    completed: rooms.completed.length,
  };
}

// ─── Realtime subscriptions ───────────────────────────────────────────────────

export function subscribeToBattleRoom(roomId: string, onChange: () => void) {
  const channel = supabase
    .channel(`battle-room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "battle_rooms",
        filter: `id=eq.${roomId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "battle_room_players",
        filter: `room_id=eq.${roomId}`,
      },
      onChange,
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToMyBattleList(userId: string, onChange: () => void) {
  // Append a timestamp so each call gets a fresh channel name — prevents the
  // "cannot add callbacks after subscribe()" error when useFocusEffect fires
  // multiple times with the same userId.
  const channel = supabase
    .channel(`battle-list-${userId}-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "battle_rooms" },
      onChange,
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Fires when a new battle room targets this user as player2.
// We deliberately skip the server-side filter (player2_id=eq.${userId}) because
// Supabase postgres_changes column filters are unreliable with certain RLS
// configurations — the event fires but is silently dropped before delivery.
// Instead we subscribe to ALL inserts (RLS still limits which rows are visible)
// and check player2_id client-side, which is 100% reliable.
export function subscribeToIncomingBattles(
  userId: string,
  onNewRoom: (room: BattleRoom) => void,
) {
  const channel = supabase
    .channel(`battle-incoming-${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "battle_rooms" },
      (payload: any) => {
        if (payload.new?.player2_id === userId)
          onNewRoom(mapBattleRoom(payload.new));
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Battle Broadcast (gameplay score sync) ───────────────────────────────────
// Uses Supabase Broadcast which bypasses RLS entirely — instant and reliable.
// postgres_changes + complex RLS JOIN policies are unreliable for live updates.

export type BattleBroadcastPayload = {
  userId: string;
  score: number;
  wordsFound: number;
  totalWords: number;
  lastWord?: string;
  foundEntry?: any;
  isFinished?: boolean;
  gameOver?: boolean;
  winnerId?: string | null;
  reason?: "completed" | "timeout" | "quit";
};

export type BattleChatMessage = {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: number;
};

export function subscribeToBattleScore(
  roomId: string,
  onOpponentUpdate: (data: BattleBroadcastPayload) => void,
): { send: (data: BattleBroadcastPayload) => void; cleanup: () => void } {
  const channel = supabase
    .channel(`battle-score-${roomId}`, {
      config: { broadcast: { self: false } },
    })
    .on(
      "broadcast",
      { event: "score" },
      ({ payload }: { payload: BattleBroadcastPayload }) => {
        onOpponentUpdate(payload);
      },
    )
    .subscribe();

  return {
    send: (data: BattleBroadcastPayload) =>
      channel.send({ type: "broadcast", event: "score", payload: data }),
    cleanup: () => supabase.removeChannel(channel),
  };
}

// ─── XOX Online Types ────────────────────────────────────────────────────────

export type XoxRoom = {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  status: 'pending' | 'in_progress' | 'completed';
  boardSize: number;
  board: (null | 'X' | 'O')[];
  currentTurn: 'X' | 'O';
  winner: 'X' | 'O' | 'draw' | null;
  winnerId: string | null;
  stakeCoins: number;
  createdAt?: any;
  updatedAt?: any;
};

function mapXoxRoom(row: any): XoxRoom {
  let board: (null | 'X' | 'O')[] = [];
  try { board = JSON.parse(row.board || '[]'); } catch {}
  if (!board.length) {
    const n = row.board_size || 3;
    board = Array(n * n).fill(null);
  }
  return {
    id: row.id,
    player1Id: row.player1_id,
    player2Id: row.player2_id,
    player1Name: row.player1_name || 'Player 1',
    player2Name: row.player2_name || 'Player 2',
    status: row.status,
    boardSize: row.board_size || 3,
    board,
    currentTurn: (row.current_turn as 'X' | 'O') || 'X',
    winner: row.winner || null,
    winnerId: row.winner_id || null,
    stakeCoins: sanitizeBattleStake(row.stake_coins ?? DEFAULT_BATTLE_STAKE),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── XOX CRUD ────────────────────────────────────────────────────────────────

export async function createXoxRoom({
  friend,
  stakeCoins = DEFAULT_BATTLE_STAKE,
}: {
  friend: PublicUser;
  boardSize?: number;
  stakeCoins?: number;
}): Promise<XoxRoom> {
  const me = await getMyProfile();
  if (!me) throw new Error('Please login first.');

  const n = 3;
  const payload = {
    player1_id: me.uid,
    player2_id: friend.uid,
    player1_name: me.displayName,
    player2_name: friend.displayName,
    status: 'pending',
    board_size: n,
    board: JSON.stringify(Array(n * n).fill(null)),
    current_turn: 'X',
    winner: null,
    winner_id: null,
    stake_coins: sanitizeBattleStake(stakeCoins),
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await supabase
    .from('xox_rooms')
    .insert(payload)
    .select('*')
    .single();

  if (error && String(error.message ?? '').toLowerCase().includes('stake_coins')) {
    const { stake_coins: _stakeCoins, ...fallbackPayload } = payload;
    const retry = await supabase
      .from('xox_rooms')
      .insert(fallbackPayload)
      .select('*')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return mapXoxRoom(data);
}

export async function getXoxRooms(): Promise<{
  incoming: XoxRoom[];
  outgoing: XoxRoom[];
  active: XoxRoom[];
  completed: XoxRoom[];
}> {
  const uid = await getCurrentUserId();
  if (!uid) return { incoming: [], outgoing: [], active: [], completed: [] };

  await purgeFinishedRooms('xox_rooms', uid);

  const { data, error } = await supabase
    .from('xox_rooms')
    .select('*')
    .or(`player1_id.eq.${uid},player2_id.eq.${uid}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rooms = (data ?? []).map(mapXoxRoom);

  return {
    incoming: rooms.filter((r) => r.status === 'pending' && r.player2Id === uid),
    outgoing: rooms.filter((r) => r.status === 'pending' && r.player1Id === uid),
    active: rooms.filter((r) => r.status === 'in_progress'),
    completed: rooms.filter((r) => r.status === 'completed'),
  };
}

export async function getXoxRoom(roomId: string): Promise<XoxRoom | null> {
  const { data, error } = await supabase
    .from('xox_rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapXoxRoom(data) : null;
}

export async function acceptXoxRoom(room: XoxRoom): Promise<XoxRoom> {
  // Split update + fetch: some RLS setups allow the UPDATE but filter out the
  // RETURNING rows, which makes .select('*').single() throw PGRST116.
  const { error } = await supabase
    .from('xox_rooms')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', room.id);
  if (error) throw error;
  const updated = await getXoxRoom(room.id);
  if (!updated) throw new Error('Room not found after accept.');
  return updated;
}

export async function rejectXoxRoom(room: XoxRoom): Promise<void> {
  const { error } = await supabase.from('xox_rooms').delete().eq('id', room.id);
  if (error) throw error;
}

export async function makeXoxMove({
  roomId,
  board,
  nextTurn,
  winner,
  winnerId,
}: {
  roomId: string;
  board: (null | 'X' | 'O')[];
  nextTurn: 'X' | 'O';
  winner: 'X' | 'O' | 'draw' | null;
  winnerId: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('xox_rooms')
    .update({
      board: JSON.stringify(board),
      current_turn: nextTurn,
      winner: winner ?? null,
      winner_id: winnerId,
      status: winner ? 'completed' : 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId);
  if (error) throw error;
}

// ─── XOX Realtime ─────────────────────────────────────────────────────────────

/** postgres_changes — fires when the room row is updated in DB */
export function subscribeToXoxRoom(
  roomId: string,
  onChange: (room: XoxRoom) => void,
) {
  const channel = supabase
    .channel(`xox-room-${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'xox_rooms', filter: `id=eq.${roomId}` },
      (payload: any) => onChange(mapXoxRoom(payload.new)),
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** All inserts/deletes — for lobby list refresh */
export function subscribeToMyXoxList(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(`xox-list-${userId}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'xox_rooms' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** Fires when a new XOX room targets this user as player2 */
export function subscribeToIncomingXox(
  userId: string,
  onNewRoom: (room: XoxRoom) => void,
) {
  const channel = supabase
    .channel(`xox-incoming-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'xox_rooms' },
      (payload: any) => {
        if (payload.new?.player2_id === userId) onNewRoom(mapXoxRoom(payload.new));
      },
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ─── XOX Broadcast (instant move sync, bypasses RLS) ─────────────────────────

export type XoxMoveBroadcast = {
  index: number;
  mark: 'X' | 'O';
  board: (null | 'X' | 'O')[];
  nextTurn: 'X' | 'O';
  winner: 'X' | 'O' | 'draw' | null;
  winnerId: string | null;
};

export function subscribeToXoxBroadcast(
  roomId: string,
  onMove: (data: XoxMoveBroadcast) => void,
): { send: (data: XoxMoveBroadcast) => void; cleanup: () => void } {
  const channel = supabase
    .channel(`xox-broadcast-${roomId}`, { config: { broadcast: { self: false } } })
    .on(
      'broadcast',
      { event: 'move' },
      ({ payload }: { payload: XoxMoveBroadcast }) => onMove(payload),
    )
    .subscribe();

  return {
    send: (data: XoxMoveBroadcast) =>
      channel.send({ type: 'broadcast', event: 'move', payload: data }),
    cleanup: () => supabase.removeChannel(channel),
  };
}

export function subscribeToXoxChat(
  roomId: string,
  onMessage: (message: BattleChatMessage) => void,
): { send: (message: BattleChatMessage) => void; cleanup: () => void } {
  const channel = supabase
    .channel(`xox-chat-${roomId}`, {
      config: { broadcast: { self: false } },
    })
    .on(
      'broadcast',
      { event: 'chat' },
      ({ payload }: { payload: BattleChatMessage }) => {
        onMessage(payload);
      },
    )
    .subscribe();

  return {
    send: (message: BattleChatMessage) =>
      channel.send({ type: 'broadcast', event: 'chat', payload: message }),
    cleanup: () => supabase.removeChannel(channel),
  };
}

// ─── Battle Chat Broadcast (ephemeral, NOT stored in DB) ─────────────────────
// Uses Supabase Realtime Broadcast only. Messages disappear when the screen
// reloads/unmounts and are never inserted into any table.
export function subscribeToBattleChat(
  roomId: string,
  onMessage: (message: BattleChatMessage) => void,
): { send: (message: BattleChatMessage) => void; cleanup: () => void } {
  const channel = supabase
    .channel(`battle-chat-${roomId}`, {
      config: { broadcast: { self: false } },
    })
    .on(
      "broadcast",
      { event: "chat" },
      ({ payload }: { payload: BattleChatMessage }) => {
        onMessage(payload);
      },
    )
    .subscribe();

  return {
    send: (message: BattleChatMessage) =>
      channel.send({ type: "broadcast", event: "chat", payload: message }),
    cleanup: () => supabase.removeChannel(channel),
  };
}

