import { createClient, SupabaseClient } from '@supabase/supabase-js';

export let supabase: SupabaseClient;

export function initSupabase(url: string, key: string) {
  if (!supabase && url && key) {
    supabase = createClient(url, key);
  }
}
