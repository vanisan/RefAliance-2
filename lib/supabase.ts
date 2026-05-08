import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kyetmbqrwsmdejnlcpaf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZXRtYnFyd3NtZGVqbmxjcGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDgzODcsImV4cCI6MjA5MzcyNDM4N30.rAqir4LwU19SyOtZCmTG2EwZg8GVQij_qgBDz1yW_xQ';

const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  try {
    return await fetch(url, options);
  } catch (err: any) {
    console.error("Supabase request failed:", err);
    throw err;
  }
};

// Always initialize now that we have fallbacks
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: customFetch }
});
