import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) {
    throw new Error('Photo library permission denied. Please enable it in Settings.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.75,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const rawExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
  const contentType = asset.mimeType ?? (ext === 'png' ? 'image/png' : 'image/jpeg');
  const filePath = `${userId}/avatar.${ext}`;

  const arraybuffer = await fetch(asset.uri).then((r) => r.arrayBuffer());

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, arraybuffer, { contentType, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return `${data.publicUrl}?cb=${Date.now()}`;
}
