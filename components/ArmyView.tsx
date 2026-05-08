import { useGame } from '../lib/game-context';
import { UNITS_INFO, UnitId } from '../lib/game.types';
import { hasEnoughResources, deductResources, formatNumber } from '../lib/game.utils';
import { Coins, Trees, Mountain, Wheat, UserPlus, Shield, Users, Gem } from 'lucide-react';
import { useState } from 'react';

export default function ArmyView() {
  const { resources, setResources, army, setArmy, buildings } = useGame();
  
  // Find highest barracks level to determine allowed units or hiring speed
  const barracksLevel = buildings.reduce((max, b) => (b?.id === 'barracks' ? Math.max(max, b.level) : max), 0);
  const farms = buildings.filter(b => b?.id === 'farm');
  const farmsCount = farms.length;
  const totalFarmLevels = farms.reduce((acc, b) => acc + (b?.level || 0), 0);
  
  const maxTroops = 50 + (farmsCount * 10) + (totalFarmLevels * 20);
  const currentTroops = Object.values(army).reduce((acc, count) => acc + Number(count), 0);

  const [hireCounts, setHireCounts] = useState<Record<UnitId, number>>({
    knight: 1, archer: 1, berserk: 1, mage: 1, dragon: 1, titan: 1, assassin: 1, goblin: 0, orc: 0,
    skelet: 0, vampire: 0, demon: 0, giant: 0, hydra: 0, souleater: 0, driada: 1, paladin: 1,
    banshee: 0, arachnid: 0, frostdragon: 0, archidruid: 0,
    balista: 1, elven_balista: 1, archer_tower: 1, mage_tower: 1
  });

  const handleHire = (unitId: UnitId) => {
    const info = UNITS_INFO[unitId];
    if (!info.cost) return;

    const count = hireCounts[unitId] || 1;
    if (currentTroops + count > maxTroops) return;

    const totalCost = {
      gold: (info.cost.gold || 0) * count,
      wood: (info.cost.wood || 0) * count,
      stone: (info.cost.stone || 0) * count,
      food: (info.cost.food || 0) * count,
      crystals: (info.cost.crystals || 0) * count,
    };

    if (!hasEnoughResources(totalCost, resources)) return;

    setResources(deductResources(resources, totalCost));
    setArmy({
      ...army,
      [unitId]: Number(army[unitId] || 0) + Number(count)
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
    <div className="flex gap-2 text-[10px] font-mono mb-2">
      {cost.gold > 0 && <span className="flex items-center text-yellow-500"><Coins className="w-3 h-3 mr-0.5"/>{formatNumber(cost.gold * count)}</span>}
      {cost.wood > 0 && <span className="flex items-center text-amber-600"><Trees className="w-3 h-3 mr-0.5"/>{formatNumber(cost.wood * count)}</span>}
      {cost.stone > 0 && <span className="flex items-center text-stone-400"><Mountain className="w-3 h-3 mr-0.5"/>{formatNumber(cost.stone * count)}</span>}
      {cost.food > 0 && <span className="flex items-center text-orange-400"><Wheat className="w-3 h-3 mr-0.5"/>{formatNumber(cost.food * count)}</span>}
      {cost.crystals > 0 && <span className="flex items-center text-cyan-400"><Gem className="w-3 h-3 mr-0.5"/>{formatNumber(cost.crystals * count)}</span>}
    </div>
  );

  let recruitableUnits: UnitId[] = [];
  if (barracksLevel >= 1) recruitableUnits.push('knight', 'archer');
  if (barracksLevel >= 2) recruitableUnits.push('berserk', 'mage');
  if (barracksLevel >= 3) recruitableUnits.push('assassin');
  if (barracksLevel >= 4) recruitableUnits.push('driada', 'paladin');
  if (barracksLevel >= 5) recruitableUnits.push('dragon', 'titan');
  if (barracksLevel >= 8) recruitableUnits.push('archidruid');

  return (
    <div className="w-full h-full flex flex-col items-center p-2 space-y-3 pb-24 overflow-y-auto bg-stone-900/30">
      <div className="w-full max-w-[440px] space-y-3">
        {/* Current Army Status */}
        <div className="wow-panel p-2 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-stone-700/10 blur-xl"></div>
        <div className="flex justify-between items-center mb-2 relative z-10 px-1">
          <h3 className="font-bold text-sm text-amber-500 flex items-center gap-2 uppercase tracking-widest text-shadow-glow">
            <Shield className="w-4 h-4"/> Мои войска
          </h3>
          <div className="flex gap-2 items-center text-[9px] font-mono bg-stone-900/80 px-1.5 py-0.5 rounded border border-stone-700">
             <Users className="w-3 h-3 text-indigo-400" />
             <span className={currentTroops >= maxTroops ? "text-red-400" : "text-indigo-300"}>{formatNumber(currentTroops)} / {formatNumber(maxTroops)}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 relative z-10">
          {(Object.entries(army) as [UnitId, number][]).filter(([_, count]) => count > 0).map(([id, count]) => (
            <div key={id} className="bg-stone-900/60 p-2 rounded-lg border border-stone-700 hover:border-amber-600/50 flex justify-between items-center transition-colors">
              <div className="flex items-center gap-2 overflow-hidden">
                {UNITS_INFO[id].image ? (
                  <img src={UNITS_INFO[id].image} alt={UNITS_INFO[id].name} className="w-8 h-8 object-cover rounded-md border border-stone-600 shrink-0" />
                ) : null}
                <span className="text-stone-200 font-medium text-[10px] font-bold uppercase truncate">{UNITS_INFO[id].name}</span>
              </div>
              <span className="text-amber-400 font-mono font-bold text-xs sm:text-base flex gap-1 items-center shrink-0 ml-1"><UserPlus className="w-3 h-3 opacity-50"/> {formatNumber(count)}</span>
            </div>
          ))}
          {Object.values(army).every(v => v === 0) && (
            <div className="col-span-2 text-center text-stone-500 text-sm py-4 border border-stone-800 border-dashed rounded-lg">Казармы пустуют... Нанимайте воинов!</div>
          )}
        </div>
      </div>

      {/* Recruitment */}
      <div className="space-y-4 relative z-10 w-full pb-8">
        <h3 className="font-bold text-sm text-stone-400 mb-2 border-b border-stone-800 pb-2 uppercase tracking-widest">Найм (Ур. казармы: {barracksLevel})</h3>
        
        {recruitableUnits.map(unitId => {
          const info = UNITS_INFO[unitId];
          const count = hireCounts[unitId] || 1;
          const totalCost = {
            gold: (info.cost?.gold || 0) * count,
            wood: (info.cost?.wood || 0) * count,
            stone: (info.cost?.stone || 0) * count,
            food: (info.cost?.food || 0) * count,
            crystals: (info.cost?.crystals || 0) * count,
          };
          const canAfford = hasEnoughResources(totalCost, resources);
          const hasSpace = currentTroops + count <= maxTroops;

          return (
            <div key={unitId} className="wow-panel-metal p-3 flex flex-col relative overflow-hidden transition-all">
              <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex gap-3 items-center">
                  {info.image && (
                     <div className="w-10 h-10 bg-stone-800 rounded border border-stone-700 overflow-hidden shrink-0 flex items-center justify-center">
                       <img src={info.image} alt={info.name} className="w-full h-full object-cover" />
                     </div>
                  )}
                  <div>
                    <div className="font-black text-sm text-stone-200 uppercase tracking-widest">{info.name}</div>
                    <div className="text-[10px] text-stone-400 flex flex-wrap gap-x-2 gap-y-1 mt-1 font-mono">
                      <span className="bg-stone-950 px-1 py-0.5 rounded text-red-500">❤ {formatNumber(info.hp)}</span>
                      <span className="bg-stone-950 px-1 py-0.5 rounded text-yellow-500">⚔ {formatNumber(info.attack)}</span>
                      <span className="bg-stone-950 px-1 py-0.5 rounded text-blue-400">🛡 {formatNumber(info.defense)}</span>
                      <span className="bg-stone-950 px-1 py-0.5 rounded text-emerald-500">⚡ {info.speed}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 shrink-0">
                  <button onClick={() => updateCount(unitId, false)} className="w-6 h-6 bg-stone-800 rounded text-stone-300 font-bold hover:bg-stone-700 transition-colors">-</button>
                  <span className="font-mono font-bold w-10 text-center text-xs text-stone-200">{formatNumber(count)}</span>
                  <button onClick={() => updateCount(unitId, true)} className="w-6 h-6 bg-stone-800 rounded text-stone-300 font-bold hover:bg-stone-700 transition-colors">+</button>
                  <button onClick={() => setHireCounts(prev => ({...prev, [unitId]: (prev[unitId] || 1) * 5}))} className="w-6 h-6 bg-stone-800 rounded text-amber-500 font-bold hover:bg-stone-700 transition-colors text-[9px]">x5</button>
                </div>
              </div>

              <div className="flex items-end justify-between mt-2 pt-2 border-t border-stone-700/50 relative z-10">
                <div>
                  {renderCost(info.cost, count)}
                </div>
                <button
                  onClick={() => handleHire(unitId)}
                  disabled={!canAfford || count < 1 || !hasSpace}
                  className={`px-5 py-2 wow-button text-[10px] uppercase font-black tracking-widest ${!hasSpace && canAfford ? 'opacity-50 !bg-red-900/50' : ''}`}
                >
                  {hasSpace ? 'Нанять' : `Мест нет (${currentTroops}/${maxTroops})`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}
