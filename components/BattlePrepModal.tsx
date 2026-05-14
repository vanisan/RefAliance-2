import { useState, useEffect } from 'react';
import { useGame } from '../lib/game-context';
import { UnitId, UNITS_INFO } from '../lib/game.types';
import { cn, formatNumber } from '../lib/game.utils';
import { Swords, X, Shield, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface BattlePrepModalProps {
  onStart: (selectedArmy: Record<string, number>, selectedSiegeUnits: (UnitId | null)[]) => void;
  onCancel: () => void;
  title?: string;
  enemies?: { unitId: UnitId, count: number }[];
}

export default function BattlePrepModal({ onStart, onCancel, title = "Підготовка до бою", enemies = [] }: BattlePrepModalProps) {
  const { army, siegeUnits } = useGame();
  const [selectedArmy, setSelectedArmy] = useState<Record<string, number>>({});
  const [selectedSiege, setSelectedSiege] = useState<(UnitId | null)[]>(siegeUnits || [null, null, null, null]);
  
  // Initialize with max available
  useEffect(() => {
    const initial: Record<string, number> = {};
    Object.entries(army).forEach(([id, count]) => {
      if (count > 0) {
        initial[id] = count;
      }
    });
    setSelectedArmy(initial);
  }, [army]);

  const handleSliderChange = (id: string, val: number) => {
    setSelectedArmy(prev => ({
      ...prev,
      [id]: val
    }));
  };

  const handleStart = () => {
    onStart(selectedArmy, selectedSiege);
  };

  const totalSelected = Object.values(selectedArmy).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-[150] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-stone-900 border border-stone-700 shadow-2xl rounded-lg overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950">
          <h2 className="text-amber-500 font-black uppercase tracking-widest flex items-center gap-2">
            <Swords className="w-5 h-5"/> {title}
          </h2>
          <button onClick={onCancel} className="text-stone-500 hover:text-stone-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {enemies.length > 0 && (
            <div className="bg-stone-950 p-3 rounded border border-red-900/50 mb-4">
              <h3 className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-2 border-b border-stone-800 pb-1">Ворожий загін</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {enemies.map((e, idx) => (
                  <span key={idx} className="bg-stone-900 border border-stone-800 px-2 py-1 rounded text-stone-300 flex items-center gap-1">
                    <img src={UNITS_INFO[e.unitId].image} alt="" className="w-4 h-4 object-contain" />
                    {UNITS_INFO[e.unitId].name} <span className="text-red-400 font-bold">x{e.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-[10px] text-amber-500 font-bold uppercase tracking-widest border-b border-stone-800 pb-1 mt-4">Облогові знаряддя</h3>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map(i => (
              <select 
                key={i}
                value={selectedSiege[i] || ""}
                onChange={(e) => {
                  const val = e.target.value as UnitId;
                  const newSiege = [...selectedSiege];
                  newSiege[i] = val || null;
                  setSelectedSiege(newSiege);
                }}
                className="bg-stone-800 p-2 text-xs rounded border border-stone-700 text-stone-300"
              >
                <option value="">Пустий слот</option>
                {['balista', 'elven_balista', 'archer_tower', 'mage_tower'].map(s => (
                  <option key={s} value={s}>{UNITS_INFO[s as UnitId]?.name || s}</option>
                ))}
              </select>
            ))}
          </div>

          <h3 className="text-[10px] text-amber-500 font-bold uppercase tracking-widest border-b border-stone-800 pb-1 mt-4">Призначте свої війська</h3>
          
          {Object.entries(army).map(([id, maxCount]) => {
            if (maxCount <= 0) return null;
            const current = selectedArmy[id] ?? maxCount;
            const info = UNITS_INFO[id as UnitId];
            return (
              <div key={id} className="bg-stone-800/50 p-3 rounded border border-stone-800 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <img src={info.image} alt="" className="w-6 h-6 object-contain" />
                    <span className="font-bold text-stone-300">{info.name}</span>
                  </div>
                  <div className="flex bg-stone-950 rounded border border-stone-700 overflow-hidden text-[10px] w-24 h-6">
                    <input 
                      type="number" 
                      value={current} 
                      onChange={(e) => {
                        let val = parseInt(e.target.value) || 0;
                        if (val > maxCount) val = maxCount;
                        if (val < 0) val = 0;
                        handleSliderChange(id, val);
                      }}
                      className="bg-transparent text-center w-full outline-none text-stone-300 appearance-none font-mono"
                      min={0}
                      max={maxCount}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-stone-500 w-8 text-right">0</span>
                  <input 
                    type="range" 
                    min="0" 
                    max={maxCount} 
                    value={current} 
                    onChange={(e) => handleSliderChange(id, parseInt(e.target.value))}
                    className="flex-1 accent-amber-500 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-amber-500 font-black w-8">{maxCount}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <div className="text-xs text-stone-400 font-bold uppercase tracking-widest">
            {totalSelected > 0 ? (
              <span className="text-amber-500">{formatNumber(totalSelected)} юнітів</span>
            ) : (
              <span className="text-red-500">Нікого не обрано</span>
            )}
          </div>
          <button
            onClick={handleStart}
            disabled={totalSelected === 0}
            className={cn(
              "px-4 py-2 font-black text-xs uppercase tracking-widest rounded transition-colors flex items-center gap-2",
              totalSelected > 0 
                ? "bg-amber-600 hover:bg-amber-500 text-stone-900 shadow-[0_0_15px_rgba(217,119,6,0.3)]" 
                : "bg-stone-800 text-stone-500 cursor-not-allowed"
            )}
          >
            У бій <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
