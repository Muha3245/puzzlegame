// lib/notifications.ts
// In-app notification helpers — uses Alert for Expo Go compatibility.
// Switch to expo-notifications + dev build for real push notifications.

import { Alert } from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  return true;
}

export async function notifyBattleRequest(fromName: string) {
  Alert.alert('Battle Challenge!', `${fromName} has challenged you to a battle!`);
}

export async function notifyFriendRequest(fromName: string) {
  Alert.alert('Friend Request', `${fromName} wants to be your friend!`);
}
