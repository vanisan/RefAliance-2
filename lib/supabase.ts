import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kyetmbqrwsmdejnlcpaf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dby3kLx_hNiyD1WXaPDCxQ_PzVxhklj';

export const supabase = createClient(supabaseUrl, supabaseKey);
