import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'smartexpense_supabase_url';
const STORAGE_ANON_KEY = 'smartexpense_supabase_anon_key';

/**
 * Gets configured Supabase URL (prioritizing custom user setting from localStorage, then env var).
 */
export function getSupabaseUrl(): string {
  const custom = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) : null;
  if (custom && custom.trim().length > 0) return custom.trim();
  return (import.meta.env.VITE_SUPABASE_URL || '').trim();
}

/**
 * Gets configured Supabase Anon Key (prioritizing custom user setting from localStorage, then env var).
 */
export function getSupabaseAnonKey(): string {
  const custom = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_ANON_KEY) : null;
  if (custom && custom.trim().length > 0) return custom.trim();
  return (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
}

/**
 * Validates if the currently provided Supabase configuration is usable.
 */
export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return false;
  if (url.includes('your-project-id') || key.includes('your-anon-public-key')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

let cachedClient: SupabaseClient | null = null;

/**
 * Returns the Supabase client instance or null if unconfigured.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!cachedClient) {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'smartexpense_supabase_auth_session',
      },
    });
  }

  return cachedClient;
}

/**
 * Saves custom Supabase credentials from Settings and resets the client.
 */
export function saveCustomSupabaseConfig(url: string, anonKey: string): boolean {
  if (typeof window === 'undefined') return false;
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
  cachedClient = null; // force re-instantiation
  return isSupabaseConfigured();
}

/**
 * Clears custom credentials.
 */
export function clearCustomSupabaseConfig() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_ANON_KEY);
  cachedClient = null;
}
