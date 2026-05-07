import { Coins, Trees, Mountain, Wheat, Shield, Swords, Tent, User } from 'lucide-react';
import { useGame } from '../lib/game-context';

export default function Header() {
  const { playerName, resources } = useGame();

  return (
    <div className="fixed top-2 left-2 right-2 z-50">
      <header className="flex justify-between items-center wow-panel p-3 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-stone-700 wow-border-gold flex items-center justify-center text-stone-200 font-bold overflow-hidden shadow-lg">
            <User className="w-5 h-5"/>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-amber-500 font-bold tracking-widest uppercase mb-0.5">Hero</span>
            <span className="font-bold text-sm text-stone-100 leading-none">{playerName}</span>
          </div>
        </div>
        
        <div className="flex space-x-3 xs:space-x-4">
          <div className="text-center hidden xs:block">
            <p className="text-[9px] uppercase text-yellow-500 font-bold">Золото</p>
            <div className="flex items-center justify-center gap-1 font-mono wow-text-gold text-xs">
              <Coins className="w-3 h-3 md:hidden" /> {resources.gold}
            </div>
          </div>
          <div className="text-center hidden xs:block">
            <p className="text-[9px] uppercase text-emerald-500 font-bold">Дерево</p>
            <div className="flex items-center justify-center gap-1 font-mono text-emerald-400 text-xs">
              <Trees className="w-3 h-3 md:hidden" /> {resources.wood}
            </div>
          </div>
          <div className="text-center hidden xs:block">
            <p className="text-[9px] uppercase text-stone-400 font-bold">Камень</p>
            <div className="flex items-center justify-center gap-1 font-mono text-stone-300 text-xs">
              <Mountain className="w-3 h-3 md:hidden" /> {resources.stone}
            </div>
          </div>
          <div className="text-center hidden xs:block">
            <p className="text-[9px] uppercase text-rose-500 font-bold">Еда</p>
            <div className="flex items-center justify-center gap-1 font-mono text-rose-400 text-xs">
              <Wheat className="w-3 h-3 md:hidden" /> {resources.food}
            </div>
          </div>

          {/* Mobile view fallback: just icons and numbers */}
          <div className="flex xs:hidden grid grid-cols-2 gap-x-2 gap-y-1">
            <div className="flex items-center gap-1 font-mono wow-text-gold text-[10px]">
              <Coins className="w-3 h-3 text-yellow-500" /> {resources.gold}
            </div>
            <div className="flex items-center gap-1 font-mono text-emerald-400 text-[10px]">
              <Trees className="w-3 h-3 text-emerald-500" /> {resources.wood}
            </div>
            <div className="flex items-center gap-1 font-mono text-stone-300 text-[10px]">
              <Mountain className="w-3 h-3 text-stone-400" /> {resources.stone}
            </div>
            <div className="flex items-center gap-1 font-mono text-rose-400 text-[10px]">
              <Wheat className="w-3 h-3 text-rose-500" /> {resources.food}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
