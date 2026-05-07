import { GameProvider } from '../lib/game-context';
import GameClient from '../components/GameClient';

export default function Home() {
  return (
    <GameProvider>
      <GameClient />
    </GameProvider>
  );
}
