'use client';

import { useGame } from '../lib/game-context';
import { HEROES_INFO, HeroId, HeroInfo } from '../lib/game.types';
import { formatNumber, cn, hasEnoughResources, deductResources, playSound } from '../lib/game.utils';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Shield, Sword, Sparkles, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

interface TavernViewProps {
  onClose: () => void;
}

export default function TavernView({ onClose }: TavernViewProps) {
  const { resources, setResources, ownedHeroIds, setOwnedHeroIds, activeHeroId, setActiveHeroId } = useGame();

  const handleHire = (hero: HeroInfo) => {
    if (ownedHeroIds.includes(hero.id)) return;
    
    const cost = { crystals: hero.cost };
    if (!hasEnoughResources(cost, resources)) {
      alert('Недостаточно алмазов!');
      return;
    }

    setResources(prev => deductResources(prev, cost));
    setOwnedHeroIds(prev => [...prev, hero.id]);
    if (!activeHeroId) {
      setActiveHeroId(hero.id);
    }
    playSound('/sfx/lvlupbuilding.mp3');
    alert(`Герой ${hero.name} нанят!`);
  };

  const handleSelect = (id: string) => {
    setActiveHeroId(id);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-[600px] wow-panel p-6 relative flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-stone-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/30 rounded border border-amber-600/30">
               <User className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="font-black text-2xl text-amber-500 uppercase tracking-widest text-shadow-glow">Таверна Героев</h2>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Наймите легендарного защитника вашего королевства</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-stone-700">
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.values(HEROES_INFO) as HeroInfo[]).map(hero => {
                const isOwned = ownedHeroIds.includes(hero.id);
                const isActive = activeHeroId === hero.id;

                return (
                  <div key={hero.id} className={cn(
                    "wow-panel-metal p-0.5 relative flex flex-col group transition-all h-full",
                    isActive ? "border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "border-stone-800"
                  )}>
                    <div className="relative aspect-square w-full bg-stone-900 overflow-hidden rounded-t-[2px]">
                       <Image 
                        src={hero.image} 
                        alt={hero.name} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform" 
                        referrerPolicy="no-referrer"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent"></div>
                       
                       {isActive && (
                         <div className="absolute top-1 left-1 bg-amber-600 text-stone-950 text-[6px] font-black px-1 py-0.5 rounded shadow-lg uppercase tracking-tighter z-10">
                            Активен
                         </div>
                       )}

                       <div className="absolute bottom-1 left-1.5 right-1.5">
                         <h3 className="font-black text-amber-400 uppercase tracking-tighter text-[10px] leading-none mb-0.5">{hero.name}</h3>
                         <p className="text-[7px] text-stone-400 font-bold uppercase tracking-tighter opacity-80 leading-none truncate">{hero.title}</p>
                       </div>
                    </div>

                    <div className="p-1.5 space-y-1.5 bg-stone-900/50 flex-1 flex flex-col justify-between">
                       <p className="text-[7px] text-stone-500 leading-tight line-clamp-2 h-[18px]">{hero.description}</p>
                       
                       <div className="flex items-center justify-between text-[7px] font-black uppercase">
                          <div className="flex items-center gap-0.5 text-red-500">
                             <Sword className="w-2 h-2" />
                             <span>{hero.damage}</span>
                          </div>
                          {!isOwned && (
                            <div className="flex items-center gap-0.5 text-indigo-400">
                               <span>{formatNumber(hero.cost)}</span>
                               <Sparkles className="w-2 h-2" />
                            </div>
                          )}
                       </div>

                       {isOwned ? (
                         <button 
                          onClick={() => handleSelect(hero.id)}
                          disabled={isActive}
                          className={cn(
                            "w-full py-1 rounded font-black text-[7px] uppercase tracking-tighter transition-all",
                            isActive 
                              ? "bg-stone-800 text-stone-500 cursor-default border border-stone-700" 
                              : "bg-stone-700 text-amber-500 hover:bg-stone-600 border border-amber-600/30"
                          )}
                         >
                           {isActive ? "Выбран" : "Выбрать"}
                         </button>
                       ) : (
                         <button 
                          onClick={() => handleHire(hero)}
                          className="w-full py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded font-black text-[7px] uppercase tracking-widest transition-all shadow-[0_2px_0_#92400e] active:translate-y-0.5 active:shadow-none"
                         >
                           Нанять
                         </button>
                       )}
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-700/50 flex justify-between items-center bg-stone-950/50 p-3 rounded">
           <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] text-stone-400 font-bold uppercase">Ваши алмазы:</span>
              <span className="text-sm font-black text-indigo-400">{formatNumber(resources.crystals)}</span>
           </div>
           <div className="text-[9px] text-stone-500 italic">
              * Герои помогают в бою дальними атаками
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
