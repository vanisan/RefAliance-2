import { Coins, Trees, Mountain, Wheat, Shield, Swords, Tent, User, Users } from 'lucide-react';
import { useGame } from '../lib/game-context';
import { formatNumber } from '../lib/game.utils';

export default function Header() {
  const { playerName, resources, army, buildings } = useGame();
  
  const totalFarmLevels = buildings.reduce((sum, b) => (b?.id === 'farm' ? sum + b.level : sum), 0);
  const maxTroops = 50 + totalFarmLevels * 10;
  const currentTroops = Object.values(army).reduce((acc, count) => acc + Number(count), 0);

  return (
    <div className="fixed top-2 left-2 right-2 z-50">
      <header className="flex justify-between items-center wow-panel p-3 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-stone-700 wow-border-gold flex items-center justify-center text-stone-200 font-bold overflow-hidden shadow-lg shrink-0">
            <User className="w-5 h-5"/>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-amber-500 font-bold tracking-widest uppercase mb-0.5">Владения</span>
            <span className="font-bold text-sm text-stone-100 leading-none truncate max-w-[80px] sm:max-w-none">{playerName || '...'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex space-x-3 xs:space-x-4">
            <div className="text-center hidden xs:block">
              <p className="text-[9px] uppercase text-yellow-500 font-bold">Золото</p>
              <div className="flex items-center justify-center gap-1 font-mono wow-text-gold text-xs">
                <Coins className="w-3 h-3 md:hidden" /> {formatNumber(resources.gold)}
              </div>
            </div>
            <div className="text-center hidden xs:block">
              <p className="text-[9px] uppercase text-emerald-500 font-bold">Дерево</p>
              <div className="flex items-center justify-center gap-1 font-mono text-emerald-400 text-xs">
                <Trees className="w-3 h-3 md:hidden" /> {formatNumber(resources.wood)}
              </div>
            </div>
            <div className="text-center hidden xs:block">
              <p className="text-[9px] uppercase text-stone-400 font-bold">Камень</p>
              <div className="flex items-center justify-center gap-1 font-mono text-stone-300 text-xs">
                <Mountain className="w-3 h-3 md:hidden" /> {formatNumber(resources.stone)}
              </div>
            </div>
            <div className="text-center hidden xs:block">
              <p className="text-[9px] uppercase text-rose-500 font-bold">Еда</p>
              <div className="flex items-center justify-center gap-1 font-mono text-rose-400 text-xs">
                <Wheat className="w-3 h-3 md:hidden" /> {formatNumber(resources.food)}
              </div>
            </div>
            <div className="text-center hidden xs:block">
              <p className="text-[9px] uppercase text-indigo-400 font-bold">Алмазы</p>
              <div className="flex items-center justify-center gap-1 font-mono text-indigo-300 text-xs">
                <span className="text-[10px]">💎</span> {formatNumber(resources.crystals)}
              </div>
            </div>

            {/* Mobile view fallback: just icons and numbers */}
            <div className="flex xs:hidden grid grid-cols-2 gap-x-2 gap-y-1">
              <div className="flex items-center gap-1 font-mono wow-text-gold text-[10px]">
                <Coins className="w-3 h-3 text-yellow-500" /> {formatNumber(resources.gold)}
              </div>
              <div className="flex items-center gap-1 font-mono text-emerald-400 text-[10px]">
                <Trees className="w-3 h-3 text-emerald-500" /> {formatNumber(resources.wood)}
              </div>
              <div className="flex items-center gap-1 font-mono text-stone-300 text-[10px]">
                <Mountain className="w-3 h-3 text-stone-400" /> {formatNumber(resources.stone)}
              </div>
              <div className="flex items-center gap-1 font-mono text-rose-400 text-[10px]">
                <Wheat className="w-3 h-3 text-rose-500" /> {formatNumber(resources.food)}
              </div>
              <div className="flex items-center gap-1 font-mono text-indigo-300 text-[10px]">
                <span className="text-[10px]">💎</span> {formatNumber(resources.crystals)}
              </div>
            </div>
          </div>

          <div className="w-px h-8 bg-stone-700 mx-1 hidden sm:block"></div>
          
          <div className="text-center flex flex-col items-center shrink-0 min-w-[40px]">
             <p className="text-[9px] uppercase text-indigo-400 font-bold hidden xs:block">Войска</p>
             <div className="flex items-center justify-center gap-1 font-mono text-indigo-300 text-xs">
                <Users className="w-3 h-3" /> {formatNumber(currentTroops)}/{formatNumber(maxTroops)}
             </div>
          </div>
        </div>
      </header>
    </div>
  );
}
