import { useGame } from '../lib/game-context';
import { UNITS_INFO, UnitId } from '../lib/game.types';
import { hasEnoughResources, deductResources } from '../lib/game.utils';
import { Coins, Trees, Mountain, Wheat, UserPlus, Shield } from 'lucide-react';
import { useState } from 'react';

export default function ArmyView() {
  const { resources, setResources, army, setArmy, buildings } = useGame();
  
  // Find highest barracks level to determine allowed units or hiring speed
  const barracksLevel = buildings.reduce((max, b) => (b?.id === 'barracks' ? Math.max(max, b.level) : max), 0);

  const [hireCounts, setHireCounts] = useState<Record<UnitId, number>>({
    knight: 1, archer: 1, berserk: 1, mage: 1, dragon: 1, titan: 1, goblin: 0, orc: 0
  });

  const handleHire = (unitId: UnitId) => {
    const info = UNITS_INFO[unitId];
    if (!info.cost) return;

    const count = hireCounts[unitId] || 1;
    const totalCost = {
      gold: (info.cost.gold || 0) * count,
      wood: (info.cost.wood || 0) * count,
      stone: (info.cost.stone || 0) * count,
      food: (info.cost.food || 0) * count,
    };

    if (!hasEnoughResources(totalCost, resources)) return;

    setResources(deductResources(resources, totalCost));
    setArmy({
      ...army,
      [unitId]: (army[unitId] || 0) + count
    });
  };

  const updateCount = (unitId: UnitId, increment: boolean) => {
    setHireCounts(prev => {
      const current = prev[unitId] || 1;
      const next = increment ? current + 1 : Math.max(1, current - 1);
      return { ...prev, [unitId]: next };
    });
  };

  const renderCost = (cost: any, count: number) => (
    <div className="flex gap-2 text-xs font-mono mb-2">
      {cost.gold > 0 && <span className="flex items-center text-yellow-500"><Coins className="w-3 h-3 mr-1"/>{cost.gold * count}</span>}
      {cost.wood > 0 && <span className="flex items-center text-amber-600"><Trees className="w-3 h-3 mr-1"/>{cost.wood * count}</span>}
      {cost.stone > 0 && <span className="flex items-center text-stone-400"><Mountain className="w-3 h-3 mr-1"/>{cost.stone * count}</span>}
      {cost.food > 0 && <span className="flex items-center text-orange-400"><Wheat className="w-3 h-3 mr-1"/>{cost.food * count}</span>}
    </div>
  );

  const recruitableUnits: UnitId[] = ['knight', 'archer', 'berserk', 'mage', 'dragon', 'titan'];

  return (
    <div className="p-4 space-y-6">
      {/* Current Army Status */}
      <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 neon-box-cyan flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-cyan-500/10 blur-xl"></div>
        <h3 className="font-bold text-lg mb-4 text-cyan-400 flex items-center gap-2 relative z-10 uppercase tracking-widest text-shadow-glow">
          <Shield className="w-5 h-5"/> Мои войска
        </h3>
        <div className="grid grid-cols-2 gap-3 relative z-10">
          {(Object.entries(army) as [UnitId, number][]).filter(([_, count]) => count > 0).map(([id, count]) => (
            <div key={id} className="bg-slate-900/60 p-2 rounded-lg border border-slate-700 hover:border-cyan-500/50 flex justify-between items-center transition-colors">
              <div className="flex items-center gap-2">
                {UNITS_INFO[id].image ? (
                  <img src={UNITS_INFO[id].image} alt={UNITS_INFO[id].name} className="w-8 h-8 object-cover rounded-md border border-slate-600" />
                ) : null}
                <span className="text-slate-200 font-medium text-xs font-bold uppercase">{UNITS_INFO[id].name}</span>
              </div>
              <span className="text-cyan-400 font-mono font-bold text-base flex gap-1 items-center"><UserPlus className="w-3 h-3 opacity-50"/> {count}</span>
            </div>
          ))}
          {Object.values(army).every(v => v === 0) && (
            <div className="col-span-2 text-center text-slate-500 text-sm py-4 border border-slate-800 border-dashed rounded-lg">Казармы пустуют... Нанимайте воинов!</div>
          )}
        </div>
      </div>

      {/* Recruitment */}
      <div className="space-y-4 relative z-10 w-full pb-8">
        <h3 className="font-bold text-sm text-slate-400 mb-2 border-b border-slate-800 pb-2 uppercase tracking-widest">Найм (Ур. казармы: {barracksLevel})</h3>
        
        {recruitableUnits.map(unitId => {
          const info = UNITS_INFO[unitId];
          const count = hireCounts[unitId] || 1;
          const totalCost = {
            gold: (info.cost?.gold || 0) * count,
            wood: (info.cost?.wood || 0) * count,
            stone: (info.cost?.stone || 0) * count,
            food: (info.cost?.food || 0) * count,
          };
          const canAfford = hasEnoughResources(totalCost, resources);

          return (
            <div key={unitId} className="bg-slate-900 border border-slate-700/50 hover:border-slate-600 rounded-xl p-3 flex flex-col relative overflow-hidden transition-all shadow-lg">
              <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex gap-3 items-center">
                  {info.image && (
                     <div className="w-14 h-14 bg-slate-800 rounded border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                       <img src={info.image} alt={info.name} className="w-full h-full object-cover" />
                     </div>
                  )}
                  <div>
                    <div className="font-black text-sm text-slate-200 uppercase tracking-widest">{info.name}</div>
                    <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-1 mt-1 font-mono">
                      <span className="bg-slate-950 px-1 py-0.5 rounded text-red-400">❤ {info.hp}</span>
                      <span className="bg-slate-950 px-1 py-0.5 rounded text-yellow-400">⚔ {info.attack}</span>
                      <span className="bg-slate-950 px-1 py-0.5 rounded text-blue-400">🛡 {info.defense}</span>
                      <span className="bg-slate-950 px-1 py-0.5 rounded text-emerald-400">⚡ {info.speed}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
                  <button onClick={() => updateCount(unitId, false)} className="w-6 h-6 bg-slate-800 rounded text-slate-300 font-bold hover:bg-slate-700 transition-colors">-</button>
                  <span className="font-mono font-bold w-5 text-center text-xs text-slate-200">{count}</span>
                  <button onClick={() => updateCount(unitId, true)} className="w-6 h-6 bg-slate-800 rounded text-slate-300 font-bold hover:bg-slate-700 transition-colors">+</button>
                </div>
              </div>

              <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-800/50 relative z-10">
                <div>
                  {renderCost(info.cost, count)}
                </div>
                <button
                  onClick={() => handleHire(unitId)}
                  disabled={!canAfford || count < 1}
                  className={`px-5 py-2 rounded font-black text-[10px] uppercase tracking-widest transition-all ${
                    canAfford 
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white neon-box-cyan' 
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  Нанять
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
