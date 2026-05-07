import { useState } from 'react';
import { useGame } from '../lib/game-context';
import { BuildingId, BUILDINGS_INFO } from '../lib/game.types';
import { getUpgradeCost, hasEnoughResources, deductResources, addResources } from '../lib/game.utils';
import { Coins, Trees, Mountain, Wheat, ArrowUpCircle, Trash2, Hammer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function PalaceView() {
  const { resources, setResources, buildings, setBuildings, palaceLevel } = useGame();
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const handleCellClick = (index: number) => {
    setSelectedCell(index === selectedCell ? null : index);
  };

  const handleBuild = (buildingId: BuildingId) => {
    if (selectedCell === null) return;
    
    const info = BUILDINGS_INFO[buildingId];
    if (!hasEnoughResources(info.baseCost, resources)) {
      return; // Could add a toast here
    }

    setResources(deductResources(resources, info.baseCost));
    const newBuildings = [...buildings];
    newBuildings[selectedCell] = { id: buildingId, name: info.name, level: 1 };
    setBuildings(newBuildings);
    setSelectedCell(null);
  };

  const handleUpgrade = () => {
    if (selectedCell === null || !buildings[selectedCell]) return;
    
    const building = buildings[selectedCell]!;
    const cost = getUpgradeCost(building.id, building.level);
    
    if (!hasEnoughResources(cost, resources)) return;

    setResources(deductResources(resources, cost));
    const newBuildings = [...buildings];
    newBuildings[selectedCell] = { ...building, level: building.level + 1 };
    setBuildings(newBuildings);
    setSelectedCell(null);
  };

  const handleSell = () => {
    if (selectedCell === null || !buildings[selectedCell]) return;
    
    // Give back 50% of base cost (simple logic)
    const info = BUILDINGS_INFO[buildings[selectedCell]!.id];
    const refund = {
      gold: Math.floor(info.baseCost.gold * 0.5),
      wood: Math.floor(info.baseCost.wood * 0.5),
      stone: Math.floor(info.baseCost.stone * 0.5),
      food: Math.floor(info.baseCost.food * 0.5),
    };
    
    setResources(addResources(resources, refund));
    const newBuildings = [...buildings];
    newBuildings[selectedCell] = null;
    setBuildings(newBuildings);
    setSelectedCell(null);
  };

  const renderCost = (cost: any) => (
    <div className="flex gap-2 text-xs">
      {cost.gold > 0 && <span className="flex items-center text-yellow-500"><Coins className="w-3 h-3 mr-1"/>{cost.gold}</span>}
      {cost.wood > 0 && <span className="flex items-center text-amber-600"><Trees className="w-3 h-3 mr-1"/>{cost.wood}</span>}
      {cost.stone > 0 && <span className="flex items-center text-stone-400"><Mountain className="w-3 h-3 mr-1"/>{cost.stone}</span>}
      {cost.food > 0 && <span className="flex items-center text-orange-400"><Wheat className="w-3 h-3 mr-1"/>{cost.food}</span>}
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col items-center justify-center pt-8 px-4 relative">
      {/* Palace Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative group">
          <div className="w-24 h-24 bg-slate-800 rounded-lg neon-box-yellow flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors">
            <span className="text-3xl mb-1">🏰</span>
            <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">Дворец</p>
            <p className="text-sm font-bold text-white tracking-widest">LVL {palaceLevel}</p>
          </div>
          <div className="absolute -top-2 -right-2 bg-yellow-500 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-black flicker">
            MAX
          </div>
        </div>
      </div>

      {/* Grid 4x4 */}
      <div className="grid grid-cols-4 grid-rows-4 gap-3 w-full max-w-[500px] aspect-square p-4 bg-slate-900/40 rounded-2xl border border-slate-700/50 relative">
        {buildings.map((building, i) => {
          const isSelected = selectedCell === i;
          return (
            <motion.button
              key={i}
              onClick={() => handleCellClick(i)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "grid-cell rounded-lg flex flex-col items-center justify-center relative overflow-hidden group border",
                isSelected 
                  ? "border-cyan-500 neon-box-cyan bg-cyan-900/40" 
                  : building ? "border-cyan-500/30" : "border-slate-700/50 hover:border-cyan-500/50"
              )}
            >
              {building ? (
                <>
                  <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="z-10 text-2xl mb-1">{BUILDINGS_INFO[building.id].icon === 'Sword' ? '⚔️' : BUILDINGS_INFO[building.id].icon === 'Wheat' ? '🌾' : BUILDINGS_INFO[building.id].icon === 'Coins' ? '🪙' : BUILDINGS_INFO[building.id].icon === 'Trees' ? '🪵' : '🪨'}</span>
                  {isSelected && <div className="text-[8px] text-cyan-300 font-bold mt-1 uppercase z-10">Select</div>}
                  {!isSelected && <div className="absolute bottom-1 right-1 text-[8px] text-cyan-400 font-bold z-10">L.{building.level}</div>}
                </>
              ) : (
                <span className="text-slate-600 text-2xl font-light">+</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Action Menu (Bottom Sheet style) */}
      <AnimatePresence>
        {selectedCell !== null && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-[240px] bg-slate-900 border-2 border-pink-500 rounded-lg shadow-[0_0_20px_rgba(244,114,182,0.6)] p-3 z-50"
          >
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] text-pink-400 font-bold uppercase">
                {buildings[selectedCell] ? 'Действия здания' : 'Построить'}
              </p>
              <button onClick={() => setSelectedCell(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4"/>
              </button>
            </div>

            {buildings[selectedCell] ? (
              <div className="flex flex-col gap-2">
                <div className="mb-2">
                  <span className="font-bold text-white text-sm">{buildings[selectedCell]!.name}</span> <span className="text-xs text-slate-400">LVL {buildings[selectedCell]!.level}</span>
                </div>
                
                <button 
                  onClick={handleUpgrade}
                  disabled={!hasEnoughResources(getUpgradeCost(buildings[selectedCell]!.id, buildings[selectedCell]!.level), resources)}
                  className="w-full text-left py-2 px-3 rounded bg-pink-500/10 hover:bg-pink-500/30 text-xs font-bold border-l-2 border-pink-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-between"
                >
                  <span>🔼 Улучшить</span>
                  <span className="font-mono">{renderCost(getUpgradeCost(buildings[selectedCell]!.id, buildings[selectedCell]!.level))}</span>
                </button>
                <button 
                  onClick={handleSell}
                  className="w-full text-left py-2 px-3 rounded bg-red-500/10 hover:bg-red-500/30 text-xs font-bold border-l-2 border-red-500 transition-colors"
                >
                  <span>💰 Продать</span>
                </button>
                {buildings[selectedCell]?.id === 'barracks' && (
                  <button className="w-full text-left py-2 px-3 rounded bg-cyan-500/10 hover:bg-cyan-500/30 text-xs font-bold border-l-2 border-cyan-500 transition-colors mt-1">
                    <span>⚔️ Нанять Армию (Во вкладке Армия)</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {Object.values(BUILDINGS_INFO).map((info) => {
                  const canAfford = hasEnoughResources(info.baseCost, resources);
                  return (
                    <button
                      key={info.id}
                      onClick={() => handleBuild(info.id)}
                      disabled={!canAfford}
                      className={cn(
                        "w-full text-left py-2 px-3 rounded text-xs font-bold border-l-2 transition-colors flex flex-col gap-1 mb-1",
                        canAfford 
                          ? "bg-cyan-500/10 hover:bg-cyan-500/30 border-cyan-500 text-slate-200" 
                          : "bg-slate-800 hover:bg-slate-800 border-slate-700 opacity-60 text-slate-500 cursor-not-allowed"
                      )}
                    >
                      <span className="font-bold text-sm tracking-wider uppercase text-cyan-300">{info.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{info.description}</span>
                      <div className="mt-1 flex items-center justify-between w-full">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Стоимость</span>
                        {renderCost(info.baseCost)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
