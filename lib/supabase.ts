import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kyetmbqrwsmdejnlcpaf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dby3kLx_hNiyD1WXaPDCxQ_PzVxhklj';

const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  try {
    return await fetch(url, options);
  } catch (err: any) {
    if (err.message && err.message.includes('Failed to fetch')) {
      console.error("Supabase connection failed. If you are using the default placeholder URL, it may have been shut down.");
      console.error("Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your AI Studio Secrets (gear icon).");
    }
    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: customFetch }
});
