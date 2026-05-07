import { GameProvider } from '../lib/game-context';
import GameClient from '../components/GameClient';

export default function Home() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  return (
    <GameProvider supabaseUrl={supabaseUrl} supabaseKey={supabaseKey}>
      <GameClient />
    </GameProvider>
  );
}
