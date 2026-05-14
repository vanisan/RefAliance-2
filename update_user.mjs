
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kyetmbqrwsmdejnlcpaf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZXRtYnFyd3NtZGVqbmxjcGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDgzODcsImV4cCI6MjA5MzcyNDM4N30.rAqir4LwU19SyOtZCmTG2EwZg8GVQij_qgBDz1yW_xQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('playerName', 'dondidimon')
    .single();

  if (error || !data) {
    console.error('User dondidimon not found or error:', error);
    process.exit(1);
  }

  console.log('Found user:', data.id, data.playerName);
  
  const currentRes = data.resources || {};
  const newRes = {
    ...currentRes,
    gold: 10000000,
    wood: 10000000,
    stone: 10000000,
    food: 10000000,
    crystals: (currentRes.crystals || 0) + 10000000
  };

  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      resources: newRes,
      referrals: (data.referrals || 0) + 1
    })
    .eq('id', data.id);

  if (updateError) {
    console.error('Update failed:', updateError);
    process.exit(1);
  }

  console.log('Successfully updated dondidimon');
}

run();
