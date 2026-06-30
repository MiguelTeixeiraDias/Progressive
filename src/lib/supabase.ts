import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True only when both env vars are present. The app can still run without a
 * Supabase project configured (e.g. first checkout before `.env` is filled in) —
 * the auth gate falls back to a "configure your backend" message instead of
 * crashing on a null client.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and fill them in.',
  );
}

// supabase-js throws at construction time if the URL is empty/invalid, so an
// unconfigured client needs a syntactically valid placeholder (not '') to
// reach the "backend not configured" UI instead of a hard crash.
export const supabase = createClient(supabaseUrl || 'https://placeholder.invalid', supabaseAnonKey || 'placeholder', {
  auth: {
    // AsyncStorage is already a dependency; reuse it as the session store.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No deep-link OAuth flow — email/password only — so don't parse the URL.
    detectSessionInUrl: false,
  },
});

// Pause/resume the token auto-refresh with app foreground state, per Supabase's
// React Native guidance. Refreshing only while the app is active avoids wasted
// network churn (and warnings) in the background.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
