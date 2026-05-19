// lib/online.ts
// Online login, leaderboard, friend requests, and level progress helpers.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  signOut,
  User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';

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

export function currentUser() {
  return auth.currentUser;
}

export async function ensureUserProfile(user: User, displayName?: string) {
  const safeName =
    displayName ||
    user.displayName ||
    user.email?.split('@')[0] ||
    `Player-${user.uid.slice(0, 5)}`;

  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: safeName,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      coins: 0,
      totalScore: 0,
      levelsCompleted: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(userRef, {
      displayName: safeName,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      updatedAt: serverTimestamp(),
    });
  }

  return safeName;
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name.trim() });
  await ensureUserProfile(cred.user, name.trim());
  return cred.user;
}

export async function loginWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function loginAsGuest() {
  const cred = await signInAnonymously(auth);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function logoutOnline() {
  await signOut(auth);
}

export async function getMyProfile() {
  const user = auth.currentUser;

  if (!user) return null;

  const snap = await getDoc(doc(db, 'users', user.uid));
  return snap.exists() ? (snap.data() as PublicUser) : null;
}

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
  const user = auth.currentUser;

  if (!user) return;

  await ensureUserProfile(user);

  const progressKey = `${categoryKey}-${difficulty}-level-${level}`;
  const progressRef = doc(db, 'users', user.uid, 'progress', progressKey);

  const oldProgress = await getDoc(progressRef);
  const wasCompleted = oldProgress.exists() && oldProgress.data()?.completed === true;

  await setDoc(
    progressRef,
    {
      categoryKey,
      difficulty,
      level,
      foundWords,
      completed: true,
      rewardCoins,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const scoreGain = foundWords * 10 + rewardCoins;

  await updateDoc(doc(db, 'users', user.uid), {
    coins: increment(rewardCoins),
    totalScore: increment(scoreGain),
    levelsCompleted: increment(wasCompleted ? 0 : 1),
    updatedAt: serverTimestamp(),
  });
}

export async function getGlobalLeaderboard(count = 50) {
  const q = query(collection(db, 'users'), orderBy('totalScore', 'desc'), limit(count));
  const snap = await getDocs(q);

  return snap.docs.map((item, index) => ({
    rank: index + 1,
    ...(item.data() as PublicUser),
  }));
}

export async function searchPlayers(searchText: string) {
  const text = searchText.trim();

  if (!text) return [];

  // Firestore prefix search. Works best when users search exact display-name start.
  const q = query(
    collection(db, 'users'),
    where('displayName', '>=', text),
    where('displayName', '<=', text + '\uf8ff'),
    limit(20)
  );

  const snap = await getDocs(q);
  const myUid = auth.currentUser?.uid;

  return snap.docs
    .map((item) => item.data() as PublicUser)
    .filter((player) => player.uid !== myUid);
}

export async function sendFriendRequest(toUser: PublicUser) {
  const me = auth.currentUser;

  if (!me) throw new Error('Please login first.');

  await ensureUserProfile(me);

  const myProfile = await getMyProfile();

  if (!myProfile) throw new Error('Profile not found.');

  const requestId = `${me.uid}_${toUser.uid}`;
  const requestRef = doc(db, 'friendRequests', requestId);

  await setDoc(requestRef, {
    id: requestId,
    fromUid: me.uid,
    toUid: toUser.uid,
    fromName: myProfile.displayName,
    toName: toUser.displayName,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  return requestId;
}

export async function getIncomingFriendRequests() {
  const me = auth.currentUser;

  if (!me) return [];

  const q = query(
    collection(db, 'friendRequests'),
    where('toUid', '==', me.uid),
    where('status', '==', 'pending')
  );

  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<FriendRequest, 'id'>),
  })) as FriendRequest[];
}

export async function acceptFriendRequest(request: FriendRequest) {
  const me = auth.currentUser;

  if (!me) throw new Error('Please login first.');

  const requestRef = doc(db, 'friendRequests', request.id);

  await updateDoc(requestRef, {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'users', request.fromUid, 'friends', request.toUid), {
    uid: request.toUid,
    displayName: request.toName,
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'users', request.toUid, 'friends', request.fromUid), {
    uid: request.fromUid,
    displayName: request.fromName,
    createdAt: serverTimestamp(),
  });
}

export async function rejectFriendRequest(request: FriendRequest) {
  await updateDoc(doc(db, 'friendRequests', request.id), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
}

export async function getMyFriends() {
  const me = auth.currentUser;

  if (!me) return [];

  const snap = await getDocs(collection(db, 'users', me.uid, 'friends'));

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function removeFriend(friendUid: string) {
  const me = auth.currentUser;

  if (!me) return;

  await deleteDoc(doc(db, 'users', me.uid, 'friends', friendUid));
  await deleteDoc(doc(db, 'users', friendUid, 'friends', me.uid));
}
