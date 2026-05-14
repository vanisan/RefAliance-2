"use client";

import { motion } from "motion/react";
import { Hammer, X, Shield, Sword, Heart, Coins, Trees, Mountain } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { UnitId, UNITS_INFO, Resources } from "@/lib/game.types";
import { useState } from "react";
import { hasEnoughResources, deductResources } from "@/lib/game.utils";

export default function ForgeView({ onClose }: { onClose: () => void }) {
  const { resources, setResources, siegeUnits, setSiegeUnits, equipment } = useGame();
  
  const atkMod = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.attackBonus || 0), 0) / 100;
  const defMod = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.defenseBonus || 0), 0) / 100;
  const hpMod  = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.hpBonus || 0), 0) / 100;
  
  const [error, setError] = useState<string | null>(null);

  const siegeIds: UnitId[] = ['balista', 'elven_balista', 'archer_tower', 'mage_tower'];

  const handleBuy = (id: UnitId) => {
    const info = UNITS_INFO[id];
    setError(null);

    if (!info.cost) return;

    if (!hasEnoughResources(info.cost, resources)) {
      setError("Недостатньо ресурсів!");
      return;
    }

    // Find first empty slot
    const emptySlotIndex = siegeUnits.findIndex(s => s === null);
    if (emptySlotIndex === -1) {
      setError("Усі слоти зайняті! Продайте або замініть старе знаряддя.");
      return;
    }

    const newSiege = [...siegeUnits];
    newSiege[emptySlotIndex] = id;
    
    setResources(prev => deductResources(prev, info.cost!));
    setSiegeUnits(newSiege);
  };

  const handleSell = (index: number) => {
    const newSiege = [...siegeUnits];
    newSiege[index] = null;
    setSiegeUnits(newSiege);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="wow-panel w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-white z-10">
          <X size={24} />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center gap-4 bg-stone-900/50">
          <div className="p-3 bg-stone-800 rounded-lg border border-stone-700">
            <Hammer className="text-stone-300" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-stone-100 uppercase tracking-tighter">Кузня</h2>
            <p className="text-stone-400 text-sm">Облогові знаряддя для захисту вашого замку</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Slots */}
          <div>
            <h3 className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-4">Слоти захисту замку</h3>
            <div className="grid grid-cols-4 gap-4">
              {siegeUnits.map((unitId, idx) => (
                <div key={idx} className="aspect-square bg-stone-900 border-2 border-stone-800 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
                  {unitId ? (
                    <>
                      <img src={UNITS_INFO[unitId].image} alt={UNITS_INFO[unitId].name} className="w-full h-full object-cover p-2" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={() => handleSell(idx)}
                          className="bg-red-600 text-white text-[10px] px-2 py-1 rounded font-bold uppercase"
                        >
                          Видалити
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-0 right-0 text-[8px] text-center bg-black/40 text-stone-300 py-0.5 truncate px-1">
                        {UNITS_INFO[unitId].name}
                      </div>
                    </>
                  ) : (
                    <div className="text-stone-700 text-xs font-bold">ПОРОЖНЬО</div>
                  )}
                  <div className="absolute top-1 left-1 bg-stone-800 text-[8px] px-1 rounded text-stone-500">
                    #{idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div className="grid md:grid-cols-2 gap-4">
            {siegeIds.map((id) => {
              const info = UNITS_INFO[id];
              const cost = info.cost!;
              return (
                <div key={id} className="wow-panel p-4 flex gap-4 bg-stone-800/20 border-white/5 hover:bg-stone-800/40 transition-colors">
                  <div className="w-24 h-24 bg-stone-900 border border-stone-700 shrink-0 rounded overflow-hidden">
                    <img src={info.image} alt={info.name} className="w-full h-full object-contain p-2" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-stone-100 leading-tight">{info.name}</h4>
                      <p className="text-[10px] text-stone-400 mb-2">{info.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                         <div className="flex items-center gap-1 text-[10px] text-red-300">
                           <Sword size={10} /> {Math.floor(info.attack * atkMod)}
                         </div>
                         <div className="flex items-center gap-1 text-[10px] text-blue-300">
                           <Shield size={10} /> {Math.floor(info.defense * defMod)}
                         </div>
                         <div className="flex items-center gap-1 text-[10px] text-green-300">
                           <Heart size={10} /> {Math.floor(info.hp * hpMod)}
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {cost.gold > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-stone-200">
                            <Coins size={10} className="text-yellow-500" /> {cost.gold}
                          </div>
                        )}
                        {cost.wood > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-stone-200">
                            <Trees size={10} className="text-green-500" /> {cost.wood}
                          </div>
                        )}
                        {cost.stone > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-stone-200">
                            <Mountain size={10} className="text-stone-400" /> {cost.stone}
                          </div>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleBuy(id)}
                      disabled={!hasEnoughResources(cost, resources)}
                      className={`w-full mt-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
                        hasEnoughResources(cost, resources) 
                          ? 'bg-stone-100 text-stone-900 hover:bg-white shadow-lg' 
                          : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                      }`}
                    >
                      Купити
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-stone-900 text-center text-[10px] text-stone-500 uppercase tracking-widest border-t border-white/5">
          Облогові знаряддя автоматично з'являться в захисті при нападі на замок
        </div>
      </div>
    </motion.div>
  );
}
