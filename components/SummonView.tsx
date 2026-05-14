import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../lib/game-context';
import { X, Sparkles, Gem, Gift, Shield, Sword } from 'lucide-react';
import { UnitId, UNITS_INFO } from '../lib/game.types';
import { cn } from '../lib/game.utils';

export default function SummonView({ onClose }: { onClose: () => void }) {
  const { resources, setResources, army, setArmy, buildings } = useGame();
  const [summonResult, setSummonResult] = useState<{ unitId: UnitId | 'crystals'; count: number; type: 'normal' | 'epic' | 'legendary' } | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinPool, setSpinPool] = useState<(UnitId | 'crystals')[]>([]);

  const farms = buildings.filter(b => b?.id === 'farm');
  const farmsCount = farms.length;
  const totalFarmLevels = farms.reduce((acc, b) => acc + (b?.level || 0), 0);
  const maxTroops = 50 + (farmsCount * 10) + (totalFarmLevels * 20);
  const currentTroops = Object.values(army).reduce((acc, count) => acc + Number(count), 0);
  const freeSpace = maxTroops - currentTroops;

  const performSummon = (type: 'normal' | 'epic' | 'legendary') => {
    if (isSpinning) return;
    
    // Ensure numeric values
    const safeCrystals = Number(resources.crystals) || 0;
    
    if (freeSpace < 10) {
      alert(`Недостатньо місця в армії! У вас ${freeSpace} вільних місць, а потрібно мінімум 10. Побудуйте або покращіть Ферми.`);
      return;
    }

    const cost = type === 'normal' ? 50 : type === 'epic' ? 100 : 200;
    
    if (safeCrystals < cost) {
      alert(`Недостатньо кристалів! Потрібно ${cost}, а у вас ${safeCrystals}.`);
      return;
    }

    // Determine result first
    const rng = Math.floor(Math.random() * 100);
    let summonedUnit: UnitId | 'crystals' = 'dragon';
    let count = 0;

    if (type === 'normal') {
      if (rng >= 90) {
        summonedUnit = 'archidruid';
        count = Math.floor(Math.random() * 2) + 1;
      } else if (rng >= 70) {
        summonedUnit = 'titan';
        count = Math.floor(Math.random() * 6) + 5;
      } else {
        summonedUnit = 'dragon';
        count = Math.floor(Math.random() * 6) + 10;
      }
    } else if (type === 'epic') {
      if (rng >= 80) {
        summonedUnit = 'despot';
        count = Math.floor(Math.random() * 2) + 1;
      } else if (rng >= 50) {
        summonedUnit = 'archidruid';
        count = Math.floor(Math.random() * 3) + 1;
      } else {
        summonedUnit = 'titan';
        count = Math.floor(Math.random() * 3) + 5;
      }
    } else {
       if (rng >= 90) {
         summonedUnit = 'crystals';
         count = 250;
       } else if (rng >= 50) {
         summonedUnit = 'despot';
         count = Math.floor(Math.random() * 3) + 1;
       } else {
         summonedUnit = 'archidruid';
         count = Math.floor(Math.random() * 3) + 5;
       }
    }

    // Deduct cost immediately
    setResources(prev => ({
      ...prev,
      crystals: (prev.crystals || 0) - cost
    }));

    // Start spin
    const poolSize = 50; // Increased pool for better effect
    const pool: (UnitId | 'crystals')[] = [];
    const possibleUnits: (UnitId | 'crystals')[] = ['dragon', 'titan', 'archidruid', 'despot'];
    
    for (let i = 0; i < poolSize; i++) {
        if (i === poolSize - 5) { // The winner is at index poolSize-5
            pool.push(summonedUnit);
        } else if (i % 7 === 0) {
            pool.push('crystals');
        } else {
            pool.push(possibleUnits[Math.floor(Math.random() * possibleUnits.length)]);
        }
    }
    
    setSpinPool(pool);
    setIsSpinning(true);

    // After animation (4.5s)
    setTimeout(() => {
        setIsSpinning(false);
        setSummonResult({ unitId: summonedUnit, count, type });
    }, 5000); // 5s to be safe with 4.5s animation
  };

  const handleCollect = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!summonResult) return;
    
    const { unitId, count } = summonResult;
    console.log("Collecting reward:", unitId, count);
    
    if (unitId === 'crystals') {
      setResources(prev => ({
        ...prev,
        crystals: (prev.crystals || 0) + count
      }));
    } else {
      setArmy(prev => ({
        ...prev,
        [unitId as UnitId]: (prev[unitId as UnitId] || 0) + count
      }));
    }
    
    setSummonResult(null);
  };

  const eliteStats = [
    { id: 'dragon', name: 'Дракон', hp: 1000, atk: 150, def: 50, color: 'text-red-400' },
    { id: 'titan', name: 'Титан', hp: 1500, atk: 200, def: 60, color: 'text-blue-400' },
    { id: 'archidruid', name: 'Архідруїд', hp: 1200, atk: 180, def: 40, color: 'text-amber-400' },
    { id: 'despot', name: 'Деспот', hp: 2000, atk: 250, def: 80, color: 'text-purple-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-stone-950 flex flex-col items-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('/city.png')] opacity-20 grayscale bg-cover bg-center mix-blend-overlay pointer-events-none"></div>

      {/* Header */}
      <div className="w-full bg-stone-900 border-b border-stone-800 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500/20 to-purple-500/20 rounded border border-amber-500/30">
            <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-amber-500 uppercase tracking-[0.2em] text-shadow-glow leading-none">Призов Еліти</h2>
            <p className="text-[10px] text-stone-500 font-bold uppercase mt-1 tracking-widest italic">Покличте найсильніших воїнів світу</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          disabled={isSpinning}
          className={cn(
            "p-2 transition-colors bg-stone-800 rounded-full border border-stone-700",
            isSpinning ? "opacity-30 cursor-not-allowed" : "text-stone-400 hover:text-white"
          )}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center gap-6 custom-scrollbar relative z-10">
        {/* Wallet & Space */}
        <div className="w-full max-w-lg grid grid-cols-2 gap-3">
          <div className="bg-stone-900/80 p-3 rounded-xl border border-cyan-900/50 flex flex-col items-center shadow-inner">
             <div className="flex items-center gap-2 mb-1">
                <Gem className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] text-stone-500 uppercase font-black">Алмази</span>
             </div>
             <span className="text-lg font-black text-white leading-none">{resources.crystals || 0}</span>
          </div>
          <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800 flex flex-col items-center shadow-inner relative overflow-hidden">
             {freeSpace < 20 && <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none"></div>}
             <div className="flex items-center gap-2 mb-1">
                <Gift className={cn("w-4 h-4", freeSpace < 20 ? "text-red-500" : "text-stone-500")} />
                <span className={cn("text-[10px] uppercase font-black", freeSpace < 20 ? "text-red-500" : "text-stone-500")}>Вільні місця</span>
             </div>
             <span className={cn("text-lg font-black leading-none", freeSpace < 20 ? "text-red-500" : "text-emerald-500")}>{freeSpace}</span>
             {freeSpace < 20 && <span className="text-[7px] text-red-500 font-bold uppercase mt-1 tracking-tighter animate-bounce">Місць мало!</span>}
          </div>
        </div>

        {/* Chests */}
        <div className="w-full max-w-4xl space-y-4">
          {[
            { id: 'normal', name: 'Скриня Найманця', cost: 50, chance: 'Дракони та Титани', color: 'from-blue-600 to-blue-900', border: 'border-blue-500' },
            { id: 'epic', name: 'Епічна Скриня', cost: 100, chance: 'Титани та Архідруїди', color: 'from-purple-600 to-purple-900', border: 'border-purple-500' },
            { id: 'legendary', name: 'Королівський Призов', cost: 200, chance: 'Деспоти та Кристали', color: 'from-amber-500 to-amber-700', border: 'border-amber-500' }
          ].map(chest => (
            <motion.button
              key={chest.id}
              whileHover={!isSpinning ? { scale: 1.01, x: 5 } : {}}
              whileTap={!isSpinning ? { scale: 0.98 } : {}}
              onClick={() => performSummon(chest.id as any)}
              disabled={isSpinning}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all relative overflow-hidden shadow-xl",
                chest.border,
                "bg-stone-900",
                isSpinning ? "opacity-50 cursor-not-allowed" : ""
              )}
            >
              <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-r", chest.color)}></div>
              <div className="w-16 h-16 bg-stone-950 rounded-xl flex items-center justify-center border border-white/10 shrink-0 shadow-2xl relative z-10">
                <Gift className={cn("w-10 h-10", chest.id === 'normal' ? 'text-blue-500' : chest.id === 'epic' ? 'text-purple-500' : 'text-amber-500')} />
              </div>
              <div className="flex-1 text-left relative z-10">
                <h3 className="font-black text-white uppercase tracking-widest text-sm mb-1">{chest.name}</h3>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tight opacity-70">Шанс: {chest.chance}</p>
              </div>
              <div className="relative z-10 flex flex-col items-end gap-1">
                <span className="text-xs font-black text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                  {chest.cost} <Gem className="w-3.5 h-3.5 text-cyan-400" />
                </span>
                <span className="text-[8px] text-stone-500 font-black uppercase tracking-tighter">ВІДКРИТИ</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Elite Stats Table */}
        <div className="w-full max-w-lg mt-4 wow-panel p-4 bg-stone-900/60 border-stone-800">
           <h4 className="text-xs font-black text-stone-300 uppercase tracking-[0.2em] mb-4 text-center border-b border-stone-800 pb-2">Характеристики Еліти</h4>
           <div className="space-y-3">
             {eliteStats.map(unit => (
               <div key={unit.id} className="flex items-center gap-3 bg-stone-950/50 p-2 rounded-lg border border-stone-800/50">
                  <div className="w-10 h-10 rounded bg-stone-900 border border-stone-700 p-1 shrink-0 overflow-hidden">
                     <img src={UNITS_INFO[unit.id as UnitId]?.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                     <div className="flex justify-between items-center mb-1">
                        <span className={cn("text-[11px] font-black uppercase tracking-widest", unit.color)}>{unit.name}</span>
                        <span className="text-[9px] text-stone-500 font-mono">ID: {unit.id}</span>
                     </div>
                     <div className="flex gap-4 text-[9px] font-bold text-stone-400 uppercase tracking-tighter">
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-600" /> HP: <span className="text-stone-200">{unit.hp}</span></span>
                        <span className="flex items-center gap-1"><Sword className="w-3 h-3 text-red-600" /> ATK: <span className="text-stone-200">{unit.atk}</span></span>
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-blue-600" /> DEF: <span className="text-stone-200">{unit.def}</span></span>
                     </div>
                  </div>
               </div>
             ))}
           </div>
        </div>

        <div className="h-20 shrink-0"></div>
      </div>

      {/* Roulette Spinner */}
      <AnimatePresence>
        {isSpinning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
          >
             <h3 className="text-2xl font-black text-amber-500 uppercase tracking-[0.4em] mb-12 text-shadow-glow">Призов триває...</h3>
             
             <div className="w-full max-w-4xl relative">
                {/* Marker */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-amber-500 z-20 shadow-[0_0_25px_rgba(245,158,11,1)]"></div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500 z-20">
                   <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[20px] border-t-amber-500"></div>
                </div>

                <div className="w-full h-48 bg-stone-900 border-y-4 border-stone-800 overflow-hidden relative flex items-center shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
                   <motion.div
                     initial={{ x: 0 }}
                     animate={{ x: -(45 * 160 + 72) }}
                     transition={{ duration: 4.5, ease: [0.12, 0, 0, 1] }}
                     className="flex gap-4 px-[50%]"
                     style={{ marginLeft: -72 }}
                   >
                      {spinPool.map((id, idx) => (
                        <div key={idx} className={cn(
                            "w-36 h-36 shrink-0 bg-stone-950 border-2 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-1 transition-colors relative",
                            idx === spinPool.length - 5 ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] bg-stone-900" : "border-stone-800"
                        )}>
                           {id === 'crystals' ? (
                               <div className="flex flex-col items-center">
                                  <Gem className="w-16 h-16 text-cyan-400" />
                                  <span className="text-[10px] font-black text-cyan-400 uppercase mt-1">Алмази</span>
                               </div>
                           ) : (
                               <>
                                 <img 
                                   src={UNITS_INFO[id as UnitId]?.image} 
                                   alt="" 
                                   className="w-full h-full object-cover"
                                   onError={(e) => {
                                      e.currentTarget.src = "/units/dragon.png"; // Fallback to dragon if image fails
                                   }}
                                 />
                                 <div className="absolute top-1 right-1 bg-black/60 px-1 rounded">
                                    <span className="text-[8px] font-bold text-white uppercase">{UNITS_INFO[id as UnitId]?.name.slice(0,3)}</span>
                                 </div>
                               </>
                           )}
                        </div>
                      ))}
                   </motion.div>
                </div>
                
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-amber-500 z-20 rotate-180">
                   <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[20px] border-t-amber-500"></div>
                </div>
             </div>
             
             <div className="mt-12 flex items-center gap-4 text-stone-500">
                <div className="w-12 h-1 bg-stone-800 rounded-full"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Зв`язок з потойбіччям...</p>
                <div className="w-12 h-1 bg-stone-800 rounded-full"></div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Backdrop */}
      <AnimatePresence>
        {summonResult && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="w-full max-w-sm wow-panel p-8 flex flex-col items-center relative overflow-hidden bg-stone-900 border-amber-500 shadow-[0_0_100px_rgba(245,158,11,0.2)]"
              onClick={e => e.stopPropagation()}
            >
               <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent opacity-50"></div>
               <Sparkles className="w-16 h-16 text-amber-500 mb-6 animate-pulse" />
               <h3 className="text-3xl font-black text-white uppercase tracking-[0.2em] mb-6 text-shadow-glow text-center">ЛЕГЕНДАРНИЙ ПРИЗОВ!</h3>
               
               <div className="relative w-40 h-40 mb-6 group">
                  <div className="absolute inset-0 bg-amber-500/20 blur-3xl group-hover:bg-amber-500/40 transition-colors"></div>
                  <div className="relative w-full h-full rounded-2xl border-4 border-amber-500 bg-stone-950 overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.4)] flex items-center justify-center">
                    {summonResult.unitId === 'crystals' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-cyan-950/20">
                           <Gem className="w-20 h-20 text-cyan-400 mb-2" />
                           <span className="text-2xl font-black text-cyan-400">+{summonResult.count}</span>
                        </div>
                    ) : (
                      <>
                        <img 
                          src={UNITS_INFO[summonResult.unitId as UnitId]?.image} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/units/dragon.png";
                          }}
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-black/80 py-2 border-t border-amber-500/50 flex justify-center">
                          <span className="text-2xl font-black text-amber-400">+{summonResult.count} шт</span>
                        </div>
                      </>
                    )}
                  </div>
               </div>

               <p className="text-xl font-black text-amber-500 uppercase tracking-widest mb-8 text-center px-4 leading-tight">
                 {summonResult.unitId === 'crystals' ? '💎 КОШТОВНІ КРИСТАЛИ' : `✨ ${UNITS_INFO[summonResult.unitId as UnitId]?.name.toUpperCase()}`}
               </p>

               <button 
                onClick={() => handleCollect()}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-lg uppercase tracking-widest rounded-xl transition-all shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95 relative z-50 cursor-pointer mb-2"
               >
                 ЗАБРАТИ
               </button>
               <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">натисніть щоб забрати нагороду</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
