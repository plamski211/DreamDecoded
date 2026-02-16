import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Dream } from '@/types';

const WebStorageAdapter = {
  getItem: (key: string) => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
};

const ExpoSecureStoreAdapter = Platform.OS === 'web'
  ? WebStorageAdapter
  : {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    };

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const hasCredentials = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'implicit',
      // Explicitly provide a noop lock to prevent the navigator lock
      // timeout error that occurs on web when the Supabase project is
      // unreachable or not fully configured.
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
        return await fn();
      },
    },
  }
);

export async function fetchDreams(userId: string): Promise<Dream[]> {
  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Dream[];
}

export async function upsertDream(dream: Dream): Promise<void> {
  // Strip art_style which has no DB column
  const { art_style, ...row } = dream as Dream & { art_style?: string };
  console.log('[supabase] upserting dream:', row.id, 'user:', row.user_id);
  const { error } = await supabase.from('dreams').upsert(row);
  if (error) {
    console.error('[supabase] upsert error:', error.message, error.details, error.hint);
    throw error;
  }
  console.log('[supabase] dream upserted successfully');
}

export async function deleteDreamRemote(id: string): Promise<void> {
  const { error } = await supabase.from('dreams').delete().eq('id', id);
  if (error) throw error;
}

export async function updateProfile(id: string, updates: Record<string, any>): Promise<void> {
  const { error } = await supabase.from('profiles').update(updates).eq('id', id);
  if (error) throw error;
}
