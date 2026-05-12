import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../lib/game-context';
import { X, Sparkles, Gem, Gift } from 'lucide-react';
import { UnitId, UNITS_INFO } from '../lib/game.types';

export default function SummonView({ onClose }: { onClose: () => void }) {
  const { resources, setResources, army, setArmy } = useGame();
  const [summonResult, setSummonResult] = useState<{ unitId: UnitId; count: number; type: 'normal' | 'epic' } | null>(null);

  const performSummon = (type: 'normal' | 'epic') => {
    const cost = type === 'normal' ? 10 : 30;
    
    if ((resources.crystals || 0) < cost) {
      alert('Недостатньо кристалів!');
      return;
    }

    setResources(prev => ({
      ...prev,
      crystals: (prev.crystals || 0) - cost
    }));

    const rng = Math.floor(Math.random() * 100);
    let summonedUnit: UnitId = 'dragon';
    let count = 0;

    if (type === 'normal') {
      // 10% archidruid (90-99), 20% titan (70-89), 70% dragon (0-69)
      if (rng >= 90) {
        summonedUnit = 'archidruid';
        count = Math.floor(Math.random() * 2) + 1; // 1-2
      } else if (rng >= 70) {
        summonedUnit = 'titan';
        count = Math.floor(Math.random() * 6) + 5; // 5-10
      } else {
        summonedUnit = 'dragon';
        count = Math.floor(Math.random() * 6) + 10; // 10-15
      }
    } else {
      // 20% despot (80-99), 30% archidruid (50-79), 50% titan (0-49)
      if (rng >= 80) {
        summonedUnit = 'despot';
        count = Math.floor(Math.random() * 2) + 1; // 1-2
      } else if (rng >= 50) {
        summonedUnit = 'archidruid';
        count = Math.floor(Math.random() * 3) + 1; // 1-3
      } else {
        summonedUnit = 'titan';
        count = Math.floor(Math.random() * 3) + 5; // 5-7
      }
    }

    setArmy(prev => ({
      ...prev,
      [summonedUnit]: (prev[summonedUnit] || 0) + count
    }));

    setSummonResult({ unitId: summonedUnit, count, type });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-50 bg-stone-900/90 flex flex-col items-center p-4 backdrop-blur-sm overflow-y-auto pb-20"
    >
      <div className="w-full max-w-md mt-4 relative">
        <button 
          onClick={onClose}
          className="absolute -top-2 -right-2 p-2 bg-stone-800 text-stone-400 hover:text-stone-200 rounded-full border border-stone-600 z-10 shadow-lg"
        >
          <X className="w-5 h-5"/>
        </button>

        <div className="flex items-center justify-center gap-2 mb-6 tracking-widest uppercase">
          <Sparkles className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-500 text-shadow-glow">
            Призов Еліти
          </h2>
          <Sparkles className="w-6 h-6 text-amber-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Normal Summon */}
          <div className="wow-panel p-4 flex flex-col items-center border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] relative overflow-hidden group hover:border-blue-500 transition-colors">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h3 className="text-lg font-black text-blue-400 mb-2 tracking-widest uppercase text-center">Синя Скриня</h3>
            <div className="w-20 h-20 bg-stone-900 rounded-lg flex items-center justify-center border-2 border-stone-700 shadow-inner mb-4 relative z-10">
              <Gift className="w-10 h-10 text-blue-500" />
            </div>
            
            <div className="w-full text-[10px] font-bold text-stone-300 space-y-2 mb-6">
              <div className="flex justify-between items-center bg-stone-900/50 p-1.5 px-3 rounded border border-stone-800">
                <span className="text-amber-500">10% Архідруїд</span>
                <span className="text-stone-400">1-2 шт</span>
              </div>
              <div className="flex justify-between items-center bg-stone-900/50 p-1.5 px-3 rounded border border-stone-800">
                <span className="text-emerald-400">20% Титан</span>
                <span className="text-stone-400">5-10 шт</span>
              </div>
              <div className="flex justify-between items-center bg-stone-900/50 p-1.5 px-3 rounded border border-stone-800">
                <span className="text-red-400">70% Дракон</span>
                <span className="text-stone-400">10-15 шт</span>
              </div>
            </div>

            <button 
              onClick={() => performSummon('normal')}
              disabled={(resources.crystals || 0) < 10}
              className="mt-auto w-full py-3 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 font-black text-sm uppercase tracking-widest rounded shadow-[0_0_15px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-white flex items-center justify-center gap-2 relative z-10"
            >
              Відкрити 10 <Gem className="w-4 h-4 text-cyan-300" />
            </button>
          </div>

          {/* Epic Summon */}
          <div className="wow-panel p-4 flex flex-col items-center border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] relative overflow-hidden group hover:border-purple-500 transition-colors">
            <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h3 className="text-lg font-black text-purple-400 mb-2 tracking-widest uppercase text-shadow-glow text-center">Епічна Скриня</h3>
            <div className="w-20 h-20 bg-stone-900 rounded-lg flex items-center justify-center border-2 border-stone-700 shadow-inner mb-4 relative z-10">
              <Gift className="w-10 h-10 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] rounded-full" />
            </div>
            
            <div className="w-full text-[10px] font-bold text-stone-300 space-y-2 mb-6">
              <div className="flex justify-between items-center bg-stone-900/50 p-1.5 px-3 rounded border border-stone-800">
                <span className="text-red-500">20% Деспот</span>
                <span className="text-stone-400">1-2 шт</span>
              </div>
              <div className="flex justify-between items-center bg-stone-900/50 p-1.5 px-3 rounded border border-stone-800">
                <span className="text-amber-500">30% Архідруїд</span>
                <span className="text-stone-400">1-3 шт</span>
              </div>
              <div className="flex justify-between items-center bg-stone-900/50 p-1.5 px-3 rounded border border-stone-800">
                <span className="text-emerald-400">50% Титан</span>
                <span className="text-stone-400">5-7 шт</span>
              </div>
            </div>

            <button 
              onClick={() => performSummon('epic')}
              disabled={(resources.crystals || 0) < 30}
              className="mt-auto w-full py-3 bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 font-black text-sm uppercase tracking-widest rounded shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-stone-100 flex items-center justify-center gap-2 relative z-10"
            >
              Відкрити 30 <Gem className="w-4 h-4 text-cyan-300" />
            </button>
          </div>
        </div>

      </div>

      {/* Result Output Modal Overlay */}
      <AnimatePresence>
        {summonResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.5, y: 100, rotate: -10 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.5, y: 100, rotate: 10 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="wow-panel p-6 flex flex-col items-center max-w-sm w-full relative"
            >
               <div className="absolute inset-0 bg-gradient-to-t from-transparent via-amber-500/10 to-amber-500/20 opacity-50 animate-pulse pointer-events-none rounded-lg"></div>
               <h3 className="text-2xl font-black text-amber-400 uppercase tracking-widest mb-6 text-shadow-glow">Успіх!</h3>
               
               <div className="w-32 h-32 relative mb-4 border-2 border-amber-600 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                 <img src={UNITS_INFO[summonResult.unitId].image} alt="" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 ring-inset ring-2 ring-black/50 pointer-events-none"></div>
                 <div className="absolute bottom-0 right-0 bg-stone-900/90 text-amber-400 font-mono font-black border-l border-t border-amber-600 px-2 py-1 text-lg">
                   {summonResult.count > 0 ? `x${summonResult.count}` : ''}
                 </div>
               </div>
               
               <p className="text-lg font-bold text-stone-200 mb-8 uppercase tracking-widest">
                 {UNITS_INFO[summonResult.unitId].name}
               </p>
               
               <button 
                 onClick={() => setSummonResult(null)}
                 className="wow-button w-full py-3 font-black text-sm uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.3)]"
               >
                 Чудово!
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
