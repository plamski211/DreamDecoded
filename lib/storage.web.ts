import type { Dream } from '@/types';

const DREAMS_KEY = 'dreamdecode_dreams';
const PREFS_PREFIX = 'dreamdecode_pref_';

export async function initDB(): Promise<void> {
  // No-op on web — localStorage is always available
}

export async function saveDream(dream: Dream): Promise<void> {
  const dreams = await loadDreams();
  const idx = dreams.findIndex((d) => d.id === dream.id);
  if (idx >= 0) dreams[idx] = dream;
  else dreams.unshift(dream);
  localStorage.setItem(DREAMS_KEY, JSON.stringify(dreams));
}

export async function loadDreams(): Promise<Dream[]> {
  const raw = localStorage.getItem(DREAMS_KEY);
  if (!raw) return [];
  try {
    const dreams = JSON.parse(raw) as Dream[];
    return dreams.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch {
    return [];
  }
}

export async function deleteDream(id: string): Promise<void> {
  const dreams = await loadDreams();
  const filtered = dreams.filter((d) => d.id !== id);
  localStorage.setItem(DREAMS_KEY, JSON.stringify(filtered));
}

export async function savePreference(key: string, value: string): Promise<void> {
  localStorage.setItem(PREFS_PREFIX + key, value);
}

export async function loadPreference(key: string): Promise<string | null> {
  return localStorage.getItem(PREFS_PREFIX + key);
}

export async function loadAllPreferences(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFS_PREFIX)) {
      result[k.slice(PREFS_PREFIX.length)] = localStorage.getItem(k) ?? '';
    }
  }
  return result;
}
