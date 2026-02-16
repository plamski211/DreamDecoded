import * as SQLite from 'expo-sqlite';
import type { Dream } from '@/types';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDB(): Promise<void> {
  db = await SQLite.openDatabaseAsync('dreamdecode.db');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS dreams (
      id TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

function getDB(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database not initialized — call initDB() first');
  return db;
}

export async function saveDream(dream: Dream): Promise<void> {
  const d = getDB();
  await d.runAsync(
    'INSERT OR REPLACE INTO dreams (id, json, created_at) VALUES (?, ?, ?)',
    dream.id,
    JSON.stringify(dream),
    dream.created_at
  );
}

export async function loadDreams(): Promise<Dream[]> {
  const d = getDB();
  const rows = await d.getAllAsync<{ json: string }>(
    'SELECT json FROM dreams ORDER BY created_at DESC'
  );
  return rows.map((r) => JSON.parse(r.json) as Dream);
}

export async function deleteDream(id: string): Promise<void> {
  const d = getDB();
  await d.runAsync('DELETE FROM dreams WHERE id = ?', id);
}

export async function savePreference(key: string, value: string): Promise<void> {
  const d = getDB();
  await d.runAsync(
    'INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)',
    key,
    value
  );
}

export async function loadPreference(key: string): Promise<string | null> {
  const d = getDB();
  const row = await d.getFirstAsync<{ value: string }>(
    'SELECT value FROM preferences WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function loadAllPreferences(): Promise<Record<string, string>> {
  const d = getDB();
  const rows = await d.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM preferences'
  );
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}
