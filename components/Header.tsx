import { Coins, Trees, Mountain, Wheat, Users } from 'lucide-react';
import { useGame } from '../lib/game-context';
import { formatNumber, getRaceIcon } from '../lib/game.utils';

export default function Header() {
  const { playerName, resources, army, buildings, race } = useGame();
  
  const farms = buildings.filter(b => b?.id === 'farm');
  const farmsCount = farms.length;
  const totalFarmLevels = farms.reduce((sum, b) => sum + (b?.level || 0), 0);
  const maxTroops = 50 + (farmsCount * 10) + (totalFarmLevels * 20);
  const currentTroops = Object.values(army).reduce((acc, count) => acc + Number(count), 0);

  return (
    <div className="w-full bg-stone-950/95 border-b border-stone-800 backdrop-blur-md relative z-[40] shrink-0">
      <header className="flex justify-between items-center p-2.5 max-w-7xl mx-auto w-full gap-4">
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-stone-800 wow-border-gold flex items-center justify-center text-stone-200 font-bold overflow-hidden shadow-xl shrink-0">
            <img src={getRaceIcon(race)} alt="Race" className="w-full h-full object-cover p-1" />
          </div>
          <div className="hidden sm:flex flex-col min-w-0">
            <span className="text-[9px] text-amber-500 font-black uppercase tracking-[0.2em] mb-0.5 opacity-80">Володіння</span>
            <span className="font-black text-sm text-stone-100 leading-none truncate max-w-[150px]">{playerName || '...'}</span>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center gap-2 sm:gap-6 overflow-hidden">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5 font-mono group">
              <Coins className="w-3.5 h-3.5 text-yellow-500 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-black wow-text-gold">{formatNumber(resources.gold)}</span>
                <span className="text-[8px] text-stone-500 font-black text-center -mt-1 hidden sm:block">ЗОЛОТО</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono group">
              <Trees className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-black text-emerald-400">{formatNumber(resources.wood)}</span>
                <span className="text-[8px] text-stone-500 font-black text-center -mt-1 hidden sm:block">ДЕРЕВО</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono group">
              <Mountain className="w-3.5 h-3.5 text-stone-400 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-black text-stone-300">{formatNumber(resources.stone)}</span>
                <span className="text-[8px] text-stone-500 font-black text-center -mt-1 hidden sm:block">КАМІНЬ</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono group">
              <Wheat className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-black text-rose-400">{formatNumber(resources.food)}</span>
                <span className="text-[8px] text-stone-500 font-black text-center -mt-1 hidden sm:block">ЇЖА</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono group">
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-black text-indigo-300">💎 {formatNumber(resources.crystals)}</span>
                <span className="text-[8px] text-stone-500 font-black text-center -mt-1 hidden sm:block">АЛМАЗИ</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-stone-900/90 p-1.5 px-2.5 rounded-lg border border-stone-800 shadow-xl group shrink-0">
           <Users className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
           <div className="flex flex-col items-start leading-none min-w-[45px]">
             <span className="text-xs font-mono font-black text-indigo-300">{formatNumber(currentTroops)}</span>
             <span className="text-[9px] font-mono text-stone-600 font-black uppercase">/ {formatNumber(maxTroops)}</span>
           </div>
        </div>
      </header>
    </div>
  );
}
