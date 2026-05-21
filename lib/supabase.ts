// lib/supabase.ts
// Supabase client for Expo / React Native.
//
// IMPORTANT:
// Run the SQL from `supabase-fix.sql` in Supabase SQL Editor once.
// That SQL creates/repairs public.users, friends, friend_requests, RLS policies,
// and an auth trigger so every registered user is automatically added to public.users.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kwemeqdlipfzlstpwcrd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ykIUz_k85iFnbaGxddg-3A_qu5TXuTR';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
