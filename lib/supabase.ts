import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(JSON.stringify({
      message: "Supabase configuration is missing.",
      details: "Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your project secrets (Gear icon -> Secrets).",
      hint: "Make sure you have copied the correct URL and Anon Key from your Supabase dashboard.",
      code: "MISSING_CONFIG"
    }));
  }
  
  try {
    return await fetch(url, options);
  } catch (err: any) {
    console.error("Supabase request failed:", err);
    throw err;
  }
};

// Only initialize if keys are present to avoid crashing on startup
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, {
      global: { fetch: customFetch }
    })
  : null;
