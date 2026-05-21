// lib/online.ts
// Supabase helpers for auth, profiles, friends, leaderboard, progress, and live battle rooms.

import { supabase } from './supabase';

export type PublicUser = {
  uid: string;
  displayName: string;
  email?: string | null;
  photoURL?: string | null;
  coins: number;
  totalScore: number;
  levelsCompleted: number;
  createdAt?: any;
  updatedAt?: any;
};

export type FriendRequest = {
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: any;
};

export type BattleRoom = {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected';
  categoryId: string;
  categoryKey: string;
  categoryTitle: string;
  difficulty: string;
  level: number;
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
  lastWord?: string | null;
  updatedAt?: any;
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapUser(row: any): PublicUser {
  return {
    uid: row.uid,
    displayName: row.display_name || row.email?.split('@')[0] || 'Player',
    email: row.email,
    photoURL: row.photo_url,
    coins: row.coins ?? 0,
    totalScore: row.total_score ?? 0,
    levelsCompleted: row.levels_completed ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBattleRoom(row: any): BattleRoom {
  return {
    id: row.id,
    player1Id: row.player1_id,
    player2Id: row.player2_id,
    player1Name: row.player1_name || 'Player 1',
    player2Name: row.player2_name || 'Player 2',
    status: row.status,
    categoryId: row.category_id,
    categoryKey: row.category_key,
    categoryTitle: row.category_title,
    difficulty: row.difficulty,
    level: row.level,
    winnerId: row.winner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBattlePlayer(row: any): BattlePlayerState {
  return {
    roomId: row.room_id,
    userId: row.user_id,
    displayName: row.display_name || 'Player',
    score: row.score ?? 0,
    wordsFound: row.words_found ?? 0,
    totalWords: row.total_words ?? 0,
    elapsedSeconds: row.elapsed_seconds ?? 0,
    isReady: row.is_ready === true,
    isFinished: row.is_finished === true,
    lastWord: row.last_word,
    updatedAt: row.updated_at,
  };
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function ensureUserProfile(
  uid: string,
  email: string | null | undefined,
  displayName?: string,
) {
  const safeName = displayName?.trim() || email?.split('@')[0] || `Player-${uid.slice(0, 5)}`;

  const { error } = await supabase.from('users').upsert(
    {
      uid,
      display_name: safeName,
      email: email ?? null,
      photo_url: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'uid', ignoreDuplicates: false },
  );

  if (error) throw error;
  return safeName;
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: name.trim() } },
  });

  if (error) throw new Error(error.message);

  if (data.user && !data.session) {
    throw new Error('Confirm your email first, or turn off email confirmation in Supabase Auth settings for testing.');
  }

  if (!data.user) throw new Error('Sign-up returned no user.');
  await ensureUserProfile(data.user.id, data.user.email, name.trim());
  return data.user;
}

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Login failed. Please try again.');

  await ensureUserProfile(data.user.id, data.user.email, data.user.user_metadata?.display_name);
  return data.user;
}

export async function loginAsGuest() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error('Guest login failed.');
  await ensureUserProfile(data.user.id, null, `Guest-${data.user.id.slice(0, 5)}`);
  return data.user;
}

export async function logoutOnline() {
  await supabase.auth.signOut();
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<PublicUser | null> {
  const uid = await getCurrentUserId();
  if (!uid) return null;

  const { data, error } = await supabase.from('users').select('*').eq('uid', uid).maybeSingle();
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
    .from('user_progress')
    .select('completed')
    .eq('user_id', uid)
    .eq('progress_key', progressKey)
    .maybeSingle();

  const wasCompleted = existing?.completed === true;

  await supabase.from('user_progress').upsert(
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
    { onConflict: 'user_id,progress_key' },
  );

  const scoreGain = foundWords * 10 + rewardCoins;
  const { data: profile } = await supabase
    .from('users')
    .select('coins, total_score, levels_completed')
    .eq('uid', uid)
    .maybeSingle();

  if (profile) {
    await supabase
      .from('users')
      .update({
        coins: (profile.coins ?? 0) + rewardCoins,
        total_score: (profile.total_score ?? 0) + scoreGain,
        levels_completed: (profile.levels_completed ?? 0) + (wasCompleted ? 0 : 1),
        updated_at: new Date().toISOString(),
      })
      .eq('uid', uid);
  }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getGlobalLeaderboard(count = 50) {
  const { data, error } = await supabase
    .from('users')
    .select('uid, display_name, email, photo_url, coins, total_score, levels_completed')
    .order('total_score', { ascending: false })
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
    .from('users')
    .select('*')
    .or(`display_name.ilike.%${text}%,email.ilike.%${text}%,uid.ilike.%${text}%`)
    .limit(30);

  if (error) throw error;
  return (data ?? []).filter((row) => row.uid !== uid).map(mapUser);
}

// ─── Friend requests ──────────────────────────────────────────────────────────

export async function sendFriendRequest(toUser: PublicUser) {
  const uid = await getCurrentUserId();
  if (!uid) throw new Error('Please login first.');

  const myProfile = await getMyProfile();
  if (!myProfile) throw new Error('Profile not found.');

  const requestId = `${uid}_${toUser.uid}`;
  const { error } = await supabase.from('friend_requests').upsert(
    {
      id: requestId,
      from_uid: uid,
      to_uid: toUser.uid,
      from_name: myProfile.displayName,
      to_name: toUser.displayName,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) throw error;
  return requestId;
}

export async function getIncomingFriendRequests(): Promise<FriendRequest[]> {
  const uid = await getCurrentUserId();
  if (!uid) return [];

  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('to_uid', uid)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    fromUid: row.from_uid,
    toUid: row.to_uid,
    fromName: row.from_name,
    toName: row.to_name,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function acceptFriendRequest(request: FriendRequest) {
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', updated_at: now })
    .eq('id', request.id);
  if (updateError) throw updateError;

  const { error: insertOneError } = await supabase.from('friends').upsert(
    { user_id: request.fromUid, friend_id: request.toUid, friend_name: request.toName },
    { onConflict: 'user_id,friend_id' },
  );
  if (insertOneError) throw insertOneError;

  const { error: insertTwoError } = await supabase.from('friends').upsert(
    { user_id: request.toUid, friend_id: request.fromUid, friend_name: request.fromName },
    { onConflict: 'user_id,friend_id' },
  );
  if (insertTwoError) throw insertTwoError;
}

export async function rejectFriendRequest(request: FriendRequest) {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', request.id);
  if (error) throw error;
}


export async function getMyFriends(): Promise<PublicUser[]> {
  const uid = await getCurrentUserId();
  if (!uid) return [];

  const { data, error } = await supabase
    .from('friends')
    .select('friend_id, friend_name, created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.friend_id,
    uid: row.friend_id,
    displayName: row.friend_name || 'Friend',
    email: null,
    photoURL: null,
    coins: 0,
    totalScore: 0,
    levelsCompleted: 0,
    createdAt: row.created_at,
  }));
}

export async function removeFriend(friendUid: string) {
  const uid = await getCurrentUserId();
  if (!uid) return;

  await supabase.from('friends').delete().eq('user_id', uid).eq('friend_id', friendUid);
  await supabase.from('friends').delete().eq('user_id', friendUid).eq('friend_id', uid);
}

// ─── Live Battle Rooms ────────────────────────────────────────────────────────

export async function createBattleRoom({
  friend,
  categoryId,
  categoryKey,
  categoryTitle,
  difficulty,
  level,
}: {
  friend: PublicUser;
  categoryId: string;
  categoryKey: string;
  categoryTitle: string;
  difficulty: string;
  level: number;
}) {
  const me = await getMyProfile();
  if (!me) throw new Error('Please login first.');

  const { data, error } = await supabase
    .from('battle_rooms')
    .insert({
      player1_id: me.uid,
      player2_id: friend.uid,
      player1_name: me.displayName,
      player2_name: friend.displayName,
      status: 'pending',
      category_id: categoryId,
      category_key: categoryKey,
      category_title: categoryTitle,
      difficulty,
      level,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapBattleRoom(data);
}

export async function getBattleRooms(): Promise<{
  incoming: BattleRoom[];
  outgoing: BattleRoom[];
  active: BattleRoom[];
  completed: BattleRoom[];
}> {
  const uid = await getCurrentUserId();
  if (!uid) return { incoming: [], outgoing: [], active: [], completed: [] };

  const { data, error } = await supabase
    .from('battle_rooms')
    .select('*')
    .or(`player1_id.eq.${uid},player2_id.eq.${uid}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rooms = (data ?? []).map(mapBattleRoom);

  return {
    incoming:  rooms.filter((r) => r.status === 'pending'  && r.player2Id === uid),
    outgoing:  rooms.filter((r) => r.status === 'pending'  && r.player1Id === uid),
    active:    rooms.filter((r) => r.status === 'accepted' || r.status === 'in_progress'),
    completed: rooms.filter((r) => r.status === 'completed'),
  };
}

export async function getBattleRoom(roomId: string): Promise<BattleRoom | null> {
  const { data, error } = await supabase
    .from('battle_rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapBattleRoom(data) : null;
}

export async function acceptBattleRoom(room: BattleRoom) {
  const { error } = await supabase
    .from('battle_rooms')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', room.id);
  if (error) throw error;
  await ensureBattlePlayerRows(room.id);
}

export async function rejectBattleRoom(room: BattleRoom) {
  const { error } = await supabase
    .from('battle_rooms')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', room.id);
  if (error) throw error;
}

export async function ensureBattlePlayerRows(roomId: string) {
  const uid = await getCurrentUserId();
  if (!uid) throw new Error('Please login first.');

  const room = await getBattleRoom(roomId);
  if (!room) throw new Error('Battle room not found.');

  const isPlayer1 = uid === room.player1Id;
  const isPlayer2 = uid === room.player2Id;
  if (!isPlayer1 && !isPlayer2) throw new Error('You are not part of this battle room.');

  const now = new Date().toISOString();
  const displayName = isPlayer1 ? room.player1Name : room.player2Name;

  const { error } = await supabase
    .from('battle_room_players')
    .upsert(
      { room_id: room.id, user_id: uid, display_name: displayName, is_ready: true, has_quit: false, updated_at: now },
      { onConflict: 'room_id,user_id' },
    );
  if (error) throw error;

  await supabase
    .from('battle_rooms')
    .update({ status: 'in_progress', updated_at: now })
    .eq('id', room.id)
    .in('status', ['accepted', 'in_progress']);
}

export async function getBattlePlayers(roomId: string): Promise<BattlePlayerState[]> {
  const { data, error } = await supabase
    .from('battle_room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapBattlePlayer);
}

export async function updateBattleProgress({
  roomId, score, wordsFound, totalWords, elapsedSeconds, lastWord, isFinished,
}: {
  roomId: string; score: number; wordsFound: number; totalWords: number;
  elapsedSeconds: number; lastWord?: string; isFinished?: boolean;
}) {
  const uid = await getCurrentUserId();
  if (!uid) return;

  const { error } = await supabase
    .from('battle_room_players')
    .update({
      score,
      words_found:     wordsFound,
      total_words:     totalWords,
      elapsed_seconds: elapsedSeconds,
      last_word:       lastWord ?? null,
      is_ready:        true,
      is_finished:     isFinished === true,
      updated_at:      new Date().toISOString(),
    })
    .eq('room_id', roomId)
    .eq('user_id', uid);

  if (error) throw error;
  if (isFinished) await finalizeBattleRoomIfReady(roomId);
}

export async function finalizeBattleRoomIfReady(roomId: string) {
  const players = await getBattlePlayers(roomId);
  if (players.length < 2 || !players.every((p) => p.isFinished)) return null;

  const [a, b] = players;
  let winnerId: string | null = null;

  if      (a.wordsFound > b.wordsFound)         winnerId = a.userId;
  else if (b.wordsFound > a.wordsFound)         winnerId = b.userId;
  else if (a.score > b.score)                   winnerId = a.userId;
  else if (b.score > a.score)                   winnerId = b.userId;
  else if (a.elapsedSeconds < b.elapsedSeconds) winnerId = a.userId;
  else if (b.elapsedSeconds < a.elapsedSeconds) winnerId = b.userId;

  const { error } = await supabase
    .from('battle_rooms')
    .update({ status: 'completed', winner_id: winnerId, updated_at: new Date().toISOString() })
    .eq('id', roomId);
  if (error) throw error;
  return winnerId;
}

export async function finishBattleRoomNow(roomId: string, winnerId: string | null) {
  const { error } = await supabase
    .from('battle_rooms')
    .update({
      status: 'completed',
      winner_id: winnerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId);

  if (error) throw error;
  return winnerId;
}

export async function quitBattleRoom(roomId: string) {
  const uid = await getCurrentUserId();
  if (!uid) return;

  const now = new Date().toISOString();
  await supabase
    .from('battle_room_players')
    .update({ has_quit: true, updated_at: now })
    .eq('room_id', roomId)
    .eq('user_id', uid);

  const players = await getBattlePlayers(roomId);
  const bothQuit = players.length >= 2 && players.every((p: any) => p.has_quit || p.hasQuit);
  if (bothQuit) {
    await supabase.from('battle_room_players').delete().eq('room_id', roomId);
    await supabase.from('battle_rooms').delete().eq('id', roomId);
  }
}

export async function getBattleCounts() {
  const rooms = await getBattleRooms();
  return {
    incoming:  rooms.incoming.length,
    outgoing:  rooms.outgoing.length,
    active:    rooms.active.length,
    completed: rooms.completed.length,
  };
}

// ─── Realtime subscriptions ───────────────────────────────────────────────────

export function subscribeToBattleRoom(roomId: string, onChange: () => void) {
  const channel = supabase
    .channel(`battle-room-${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rooms',        filter: `id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_room_players', filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToMyBattleList(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(`battle-list-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rooms' }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
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
  reason?: 'completed' | 'timeout' | 'quit';
};

export function subscribeToBattleScore(
  roomId: string,
  onOpponentUpdate: (data: BattleBroadcastPayload) => void,
): { send: (data: BattleBroadcastPayload) => void; cleanup: () => void } {
  const channel = supabase
    .channel(`battle-score-${roomId}`, {
      config: { broadcast: { self: false } },
    })
    .on('broadcast', { event: 'score' }, ({ payload }: { payload: BattleBroadcastPayload }) => {
      onOpponentUpdate(payload);
    })
    .subscribe();

  return {
    send: (data: BattleBroadcastPayload) =>
      channel.send({ type: 'broadcast', event: 'score', payload: data }),
    cleanup: () => supabase.removeChannel(channel),
  };
}
