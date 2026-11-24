import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in tasks-extension/.env'
  );
}

// Sessions live in chrome.storage.local so the popup and the background
// service worker (which has no localStorage) share the same sign-in.
const chromeStorage = {
  getItem: async (key) => (await chrome.storage.local.get(key))[key] ?? null,
  setItem: async (key, value) => chrome.storage.local.set({ [key]: value }),
  removeItem: async (key) => chrome.storage.local.remove(key)
};

// Only one context should refresh tokens: refresh tokens are single-use, so
// two clients refreshing at once could sign the user out.
export const createSupabaseClient = ({ autoRefreshToken }) =>
  createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: chromeStorage,
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken,
      detectSessionInUrl: false
    }
  });
