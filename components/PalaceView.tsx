import { useState } from 'react';
import { useGame } from '../lib/game-context';
import { BuildingId, BUILDINGS_INFO } from '../lib/game.types';
import { getUpgradeCost, hasEnoughResources, deductResources, addResources, formatNumber, cn } from '../lib/game.utils';
import { Coins, Trees, Mountain, Wheat, ArrowUpCircle, Trash2, Hammer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
      {cost.gold > 0 && <span className="flex items-center text-yellow-500"><Coins className="w-3 h-3 mr-1"/>{formatNumber(cost.gold)}</span>}
      {cost.wood > 0 && <span className="flex items-center text-amber-600"><Trees className="w-3 h-3 mr-1"/>{formatNumber(cost.wood)}</span>}
      {cost.stone > 0 && <span className="flex items-center text-stone-400"><Mountain className="w-3 h-3 mr-1"/>{formatNumber(cost.stone)}</span>}
      {cost.food > 0 && <span className="flex items-center text-orange-400"><Wheat className="w-3 h-3 mr-1"/>{formatNumber(cost.food)}</span>}
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col items-center pt-2 px-4 pb-20 relative overflow-y-auto bg-stone-900 bg-[radial-gradient(circle,rgba(68,64,60,0.1)_1px,transparent_1px)] bg-[size:32px_32px]">
      <div className="absolute inset-0 bg-[url('/city.png')] opacity-10 bg-cover bg-center mix-blend-overlay pointer-events-none"></div>
      {/* Palace Header */}
      <div className="flex flex-col items-center mb-4 mt-2 relative z-20">
        <div className="relative group">
          <div className="w-20 h-20 bg-stone-800 rounded-lg wow-border-gold flex flex-col items-center justify-end cursor-pointer transition-colors shadow-lg relative overflow-hidden">
            <img src="/buildings/hall.webp" alt="Дворец" className="absolute inset-0 w-full h-full object-contain z-0 p-1.5 scale-110" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 via-stone-900 to-transparent pt-4 pb-1 flex flex-col items-center">
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest text-shadow-glow relative z-10 shadow-black leading-none">Дворец</p>
              <p className="text-[10px] font-black text-stone-200 tracking-widest relative z-10 shadow-black mt-0.5">LVL {palaceLevel}</p>
            </div>
          </div>
          <div className="absolute -top-2 -right-2 bg-amber-500 text-stone-900 text-[10px] px-2 py-0.5 rounded-sm border border-yellow-300 font-black shadow-lg">
            MAX
          </div>
        </div>
      </div>

      {/* Grid 4x4 */}
      <div className="grid grid-cols-4 grid-rows-4 gap-2 w-full max-w-[360px] aspect-square p-2 wow-panel relative mb-4">
        {buildings.map((building, i) => {
          const isSelected = selectedCell === i;
          return (
            <motion.button
              key={i}
              onClick={() => handleCellClick(i)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "grid-cell rounded border-2 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner",
                isSelected 
                  ? "border-amber-400 bg-stone-700/80 shadow-[0_0_10px_#f59e0b,inset_0_0_10px_#f59e0b] z-10" 
                  : building ? "border-amber-900 bg-stone-800/80 hover:bg-stone-700" : "border-stone-800 border-dashed hover:border-amber-900/50"
              )}
            >
              {building ? (
                <>
                  <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {BUILDINGS_INFO[building.id].image ? (
                    <img src={BUILDINGS_INFO[building.id].image} alt={building.name} className="w-8 h-8 object-contain z-10 mb-0.5 opacity-90 drop-shadow-md" />
                  ) : (
                    <span className="z-10 text-xl mb-0.5">{BUILDINGS_INFO[building.id].icon === 'Sword' ? '⚔️' : BUILDINGS_INFO[building.id].icon === 'Wheat' ? '🌾' : BUILDINGS_INFO[building.id].icon === 'Coins' ? '🪙' : BUILDINGS_INFO[building.id].icon === 'Trees' ? '🪵' : '🪨'}</span>
                  )}
                  {isSelected && <div className="text-[8px] text-amber-300 font-bold uppercase z-10">Select</div>}
                  {!isSelected && <div className="absolute bottom-0.5 right-1 text-[8px] text-amber-400/80 font-bold z-10 font-mono">L.{building.level}</div>}
                </>
              ) : (
                <span className="text-stone-700 text-2xl font-light hover:text-stone-500">+</span>
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
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-[240px] wow-panel p-4 z-50 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest text-shadow-glow">
                {buildings[selectedCell] ? 'Действия здания' : 'Построить'}
              </p>
              <button onClick={() => setSelectedCell(null)} className="text-stone-400 hover:text-stone-200">
                <X className="w-4 h-4"/>
              </button>
            </div>

            {buildings[selectedCell] ? (
              <div className="flex flex-col gap-2">
                <div className="mb-2">
                  <span className="font-bold text-stone-100 text-sm">{buildings[selectedCell]!.name}</span> <span className="text-xs text-amber-600 font-black">LVL {buildings[selectedCell]!.level}</span>
                </div>
                
                <button 
                  onClick={handleUpgrade}
                  disabled={!hasEnoughResources(getUpgradeCost(buildings[selectedCell]!.id, buildings[selectedCell]!.level), resources)}
                  className="w-full text-left py-2 px-3 rounded text-xs font-bold border-l-2 border-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-between wow-panel-metal hover:bg-stone-700"
                >
                  <span className="text-amber-500">🔼 Улучшить</span>
                  <span className="font-mono text-[10px] flex items-center">{renderCost(getUpgradeCost(buildings[selectedCell]!.id, buildings[selectedCell]!.level))}</span>
                </button>
                <button 
                  onClick={handleSell}
                  className="w-full text-left py-2 px-3 rounded font-bold border-l-2 border-red-800 transition-colors flex justify-between text-xs wow-panel-metal hover:bg-stone-700"
                >
                  <span className="text-red-500">💰 Продать</span>
                </button>
                {buildings[selectedCell]?.id === 'barracks' && (
                  <button className="w-full text-left py-2 px-3 rounded font-bold border-l-2 border-amber-600 transition-colors mt-1 text-xs wow-panel-metal text-stone-300">
                    <span>⚔️ Нанять Армию (Во вкладке Армия)</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1 pb-4">
                {Object.values(BUILDINGS_INFO).map((info) => {
                  const canAfford = hasEnoughResources(info.baseCost, resources);
                  return (
                    <button
                      key={info.id}
                      onClick={() => handleBuild(info.id)}
                      disabled={!canAfford}
                      className={cn(
                        "w-full text-left py-2 px-3 rounded text-xs border-l-2 transition-colors flex flex-col gap-1 mb-1 shadow-sm",
                        canAfford 
                          ? "wow-panel-metal border-amber-600 text-stone-200 hover:border-amber-400" 
                          : "bg-stone-800 hover:bg-stone-800 border-stone-700 opacity-60 text-stone-500 cursor-not-allowed"
                      )}
                    >
                      <span className="font-black text-sm tracking-widest uppercase text-amber-500">{info.name}</span>
                      <span className="text-[10px] text-stone-400 font-semibold">{info.description}</span>
                      <div className="mt-1 flex items-center justify-between w-full">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500">Стоимость</span>
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
