/**
 * Supabase client singleton for WILDS.
 *
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with real values from:
 *   https://app.supabase.com → Project Settings → API
 *
 * Run supabase/migrations/20250425000000_initial.sql in the SQL Editor
 * before using any online features.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});
