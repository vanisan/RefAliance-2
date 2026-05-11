import { useState } from 'react';
import { useGame } from '../lib/game-context';
import { BuildingId, BUILDINGS_INFO } from '../lib/game.types';
import { getUpgradeCost, hasEnoughResources, deductResources, addResources, formatNumber, cn, getPalaceUpgradeCost } from '../lib/game.utils';
import { Coins, Trees, Mountain, Wheat, ArrowUpCircle, Trash2, Hammer, X, Lock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ForgeView from './ForgeView';
import AltarComponent from './AltarComponent';

export default function PalaceView() {
  const { resources, setResources, buildings, setBuildings, palaceLevel, setPalaceLevel, referrals, setReferrals } = useGame();
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [showForge, setShowForge] = useState(false);
  const [showAltar, setShowAltar] = useState(false);
  const [showPalaceUpgrade, setShowPalaceUpgrade] = useState(false);

  const handleCellClick = (index: number) => {
    // Check if cell is locked
    const isLocked = index >= 12 && (index - 11) > referrals;
    if (isLocked) {
      alert(`Эта клетка заблокирована! Она откроется за рефералов. Нужно еще ${ (index - 11) - referrals} реф.`);
      return;
    }
    setSelectedCell(index === selectedCell ? null : index);
  };

  const handleBuild = (buildingId: BuildingId) => {
    if (selectedCell === null) return;
    
    // Level cap check
    if (palaceLevel * 5 < 1) { // Current building lvl 0 -> 1. Palace lvl 1 allows up to 5.
        // Already allowed at lvl 1
    }

    const info = BUILDINGS_INFO[buildingId];
    const cost = getUpgradeCost(buildingId, 0);
    if (!hasEnoughResources(cost, resources)) {
      alert("Недостаточно ресурсов!");
      return;
    }

    setResources(deductResources(resources, cost));
    const newBuildings = [...buildings];
    newBuildings[selectedCell] = { id: buildingId, name: info.name, level: 1 };
    setBuildings(newBuildings);
    setSelectedCell(null);
  };

  const handleUpgrade = () => {
    if (selectedCell === null || !buildings[selectedCell]) return;
    
    const building = buildings[selectedCell]!;
    
    // PALACE LEVEL CAP
    if (building.level >= palaceLevel * 5) {
      alert(`Дворец ${palaceLevel} уровня позволяет улучшать здания только до ${palaceLevel * 5} уровня! Улучшите дворец.`);
      return;
    }

    const cost = getUpgradeCost(building.id, building.level);
    if (!hasEnoughResources(cost, resources)) {
       alert("Недостаточно ресурсов!");
       return;
    }

    setResources(deductResources(resources, cost));
    const newBuildings = [...buildings];
    newBuildings[selectedCell] = { ...building, level: building.level + 1 };
    setBuildings(newBuildings);
    setSelectedCell(null);
  };

  const PALACE_DESCRIPTIONS: Record<number, string> = {
    1: "Начальное укрепление власти. Позволяет организовать базовое управление поселением.",
    2: "Централизация ресурсов. Дворец становится архитектурной доминантой города. Открывает путь к имперским амбициям.",
    3: "Величественная резиденция. Потоки ресурсов текут в казну беспрерывно. Ваш авторитет неоспорим.",
    4: "Имперский собор. Стены дворца украшены золотом и рунами. Знание и сила объединяются.",
    5: "Цитадель Вечности. Дворец черпает энергию из самого мироздания. Здания могут достичь совершенства.",
    6: "Дворец Богов. Высшая точка развития. Грань между правителем и божеством стирается."
  };

  const handleUpgradePalace = () => {
    const cost = getPalaceUpgradeCost(palaceLevel);
    if (!hasEnoughResources(cost, resources)) {
      alert("Недостаточно ресурсов для улучшения дворца!");
      return;
    }
    setResources(deductResources(resources, cost));
    setPalaceLevel(palaceLevel + 1);
    setShowPalaceUpgrade(false);
    alert(`Поздравляем! Ваш Дворец теперь ${palaceLevel + 1} уровня! Лимит зданий увеличен до ${(palaceLevel + 1) * 5}.`);
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
    <div className="flex gap-2 text-xs flex-wrap justify-end">
      {cost.gold > 0 && <span className="flex items-center text-yellow-500"><Coins className="w-3 h-3 mr-1"/>{formatNumber(cost.gold)}</span>}
      {cost.wood > 0 && <span className="flex items-center text-amber-600"><Trees className="w-3 h-3 mr-1"/>{formatNumber(cost.wood)}</span>}
      {cost.stone > 0 && <span className="flex items-center text-stone-400"><Mountain className="w-3 h-3 mr-1"/>{formatNumber(cost.stone)}</span>}
      {cost.food > 0 && <span className="flex items-center text-orange-400"><Wheat className="w-3 h-3 mr-1"/>{formatNumber(cost.food)}</span>}
    </div>
  );

  const renderProduction = (prod: any, level: number = 1) => (
    <div className="flex gap-2 text-[10px] font-bold">
      {prod.gold > 0 && <span className="flex items-center text-yellow-500">+{formatNumber(prod.gold * level)} <Coins className="w-2 h-2 ml-0.5"/></span>}
      {prod.wood > 0 && <span className="flex items-center text-emerald-500">+{formatNumber(prod.wood * level)} <Trees className="w-2 h-2 ml-0.5"/></span>}
      {prod.stone > 0 && <span className="flex items-center text-stone-300">+{formatNumber(prod.stone * level)} <Mountain className="w-2 h-2 ml-0.5"/></span>}
      {prod.food > 0 && <span className="flex items-center text-rose-400">+{formatNumber(prod.food * level)} <Wheat className="w-2 h-2 ml-0.5"/></span>}
      <span className="text-stone-500 opacity-60 ml-1">/ 5сек</span>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col items-center pt-2 px-4 pb-24 relative overflow-y-auto bg-stone-900/30 bg-[radial-gradient(circle,rgba(68,64,60,0.1)_1px,transparent_1px)] bg-[size:32px_32px]">
      <div className="absolute inset-0 bg-[url('/city.png')] opacity-10 bg-cover bg-center mix-blend-overlay pointer-events-none"></div>
      
      {/* Palace Header */}
      <div className="flex flex-col items-center mb-6 mt-2 relative z-20">
        <div className="relative group" onClick={() => setShowPalaceUpgrade(true)}>
          <div className="w-24 h-24 bg-stone-800 rounded-lg wow-border-gold flex flex-col items-center justify-end cursor-pointer transition-all hover:scale-105 shadow-xl relative overflow-hidden group-hover:shadow-[0_0_20px_#f59e0b]">
            <img src="/buildings/hall.webp" alt="Дворец" className="absolute inset-0 w-full h-full object-contain z-0 p-1.5 scale-110" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 via-stone-900 to-transparent pt-4 pb-2 flex flex-col items-center">
              <p className="text-[11px] text-amber-500 font-bold uppercase tracking-widest text-shadow-glow relative z-10 shadow-black leading-none">Дворец</p>
              <p className="text-[11px] font-black text-stone-200 tracking-widest relative z-10 shadow-black mt-0.5">LVL {palaceLevel}</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-20">
               <ArrowUpCircle className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          {palaceLevel >= 10 && (
            <div className="absolute -top-2 -right-2 bg-amber-500 text-stone-900 text-[10px] px-2 py-0.5 rounded-sm border border-yellow-300 font-black shadow-lg">
              MAX
            </div>
          )}
        </div>
        <p className="text-[9px] text-stone-500 mt-2 uppercase font-bold tracking-tighter">Лимит зданий: {palaceLevel * 5} ур.</p>
        <div className="flex items-center gap-1 mt-1 bg-stone-950/50 px-2 py-0.5 rounded-full border border-stone-800">
           <Users className="w-3 h-3 text-indigo-400" />
           <span className="text-[10px] text-stone-300 font-bold">Рефералы: {referrals}</span>
        </div>
      </div>

      {/* Grid wrapper */}
      <div className="w-full flex justify-center mb-8">
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-[360px] p-2 wow-panel relative">
          {buildings.map((building, i) => {
            const isSelected = selectedCell === i;
            // 12 base cells (0-11), 4 referral cells (12-15)
            const isLocked = i >= 12 && (i - 11) > referrals;
            
            return (
              <motion.button
                key={i}
                onClick={() => handleCellClick(i)}
                whileTap={!isLocked ? { scale: 0.95 } : {}}
                className={cn(
                  "aspect-square rounded border-2 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner transition-all",
                  isLocked 
                    ? "border-stone-800 bg-stone-900/50 grayscale cursor-not-allowed opacity-40"
                    : isSelected 
                      ? "border-amber-400 bg-stone-700/80 shadow-[0_0_10px_#f59e0b,inset_0_0_10px_#f59e0b] z-10" 
                      : building ? "border-amber-900 bg-stone-800/80 hover:bg-stone-700" : "border-stone-800 border-dashed hover:border-amber-900/50"
                )}
              >
                {isLocked ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <Lock className="w-3 h-3 text-stone-700" />
                    <span className="text-[6px] text-stone-600 font-bold">REFERRAL</span>
                  </div>
                ) : building ? (
                  <>
                    <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    {BUILDINGS_INFO[building.id].image ? (
                      <img src={BUILDINGS_INFO[building.id].image} alt={building.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain z-10 mb-0.5 opacity-90 drop-shadow-md" />
                    ) : (
                      <span className="z-10 text-lg sm:text-xl mb-0.5">{BUILDINGS_INFO[building.id].icon === 'Sword' ? '⚔️' : BUILDINGS_INFO[building.id].icon === 'Wheat' ? '🌾' : BUILDINGS_INFO[building.id].icon === 'Coins' ? '🪙' : BUILDINGS_INFO[building.id].icon === 'Trees' ? '🪵' : '🪨'}</span>
                    )}
                    {isSelected && <div className="text-[8px] text-amber-300 font-bold uppercase z-10">Select</div>}
                    {!isSelected && <div className="absolute bottom-0.5 right-1 text-[8px] text-amber-400/80 font-bold z-10 font-mono">L.{building.level}</div>}
                  </>
                ) : (
                  <span className="text-stone-700 text-2xl font-light hover:text-stone-500 tracking-tighter opacity-20 group-hover:opacity-100 transition-opacity">+</span>
                )}
                {i >= 12 && !isLocked && (
                  <div className="absolute top-0.5 right-0.5 bg-indigo-500 w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(99,102,241,1)]"></div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Action Menu (Bottom Sheet style) */}
      <AnimatePresence>
        {selectedCell !== null && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-[240px] wow-panel p-4 z-50 shadow-[0_0_50px_rgba(0,0,0,0.8)] border-amber-900/50"
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
                <div className="mb-2 flex flex-col">
                  <div>
                    <span className="font-bold text-stone-100 text-sm">{buildings[selectedCell]!.name}</span> <span className="text-xs text-amber-600 font-black ml-1">LVL {buildings[selectedCell]!.level} / {palaceLevel * 5}</span>
                  </div>
                  {BUILDINGS_INFO[buildings[selectedCell]!.id].production && (
                    <div className="mt-1">
                      <p className="text-[8px] uppercase text-stone-500 font-bold mb-1">Текущая добыча:</p>
                      {renderProduction(BUILDINGS_INFO[buildings[selectedCell]!.id].production, buildings[selectedCell]!.level)}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handleUpgrade}
                  disabled={!hasEnoughResources(getUpgradeCost(buildings[selectedCell]!.id, buildings[selectedCell]!.level), resources)}
                  className="w-full text-left py-2 px-3 rounded text-xs font-bold border-l-4 border-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-between wow-panel-metal hover:bg-stone-700 group/btn"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-amber-500 group-hover/btn:text-amber-300">🔼 Улучшить</span>
                    {BUILDINGS_INFO[buildings[selectedCell]!.id].production && (
                      <span className="text-[8px] text-green-500 font-bold">Будет: +{formatNumber(Object.values(BUILDINGS_INFO[buildings[selectedCell]!.id].production!)[0] as number * (buildings[selectedCell]!.level + 1))}</span>
                    )}
                  </div>
                  <div className="flex items-center">
                    {renderCost(getUpgradeCost(buildings[selectedCell]!.id, buildings[selectedCell]!.level))}
                  </div>
                </button>
                <button 
                  onClick={handleSell}
                  className="w-full text-left py-2 px-3 rounded font-bold border-l-4 border-red-800 transition-colors flex justify-between text-xs wow-panel-metal hover:bg-stone-700"
                >
                  <span className="text-red-500">💰 Снести</span>
                  <span className="text-[9px] text-stone-500 mt-0.5">Вернет 50% базы</span>
                </button>
                {buildings[selectedCell]?.id === 'barracks' && (
                  <button className="w-full text-left py-2 px-3 rounded font-bold border-l-4 border-amber-600 transition-colors mt-1 text-xs wow-panel-metal text-stone-300">
                    <span>⚔️ Нанимайте Армию во вкладке "Армия"</span>
                  </button>
                )}
                {buildings[selectedCell]?.id === 'forge' && (
                  <button 
                    onClick={() => setShowForge(true)}
                    className="w-full text-left py-2 px-3 rounded font-bold border-l-4 border-stone-400 transition-colors mt-1 text-xs wow-panel-metal text-stone-100 hover:bg-stone-700"
                  >
                    <span>⚒️ Кузница (Осадные орудия)</span>
                  </button>
                )}
                {buildings[selectedCell]?.id === 'altar' && (
                  <button 
                    onClick={() => setShowAltar(true)}
                    className="w-full text-left py-2 px-3 rounded font-bold border-l-4 border-amber-600 transition-colors mt-1 text-xs wow-panel-metal text-stone-100 hover:bg-stone-700"
                  >
                    <span>✨ Магический Алтарь</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1 pb-4">
                {Object.values(BUILDINGS_INFO).map((info) => {
                  const cost = getUpgradeCost(info.id, 0);
                  const canAfford = hasEnoughResources(cost, resources);
                  return (
                    <button
                      key={info.id}
                      onClick={() => handleBuild(info.id)}
                      disabled={!canAfford}
                      className={cn(
                        "w-full text-left py-2 px-3 rounded text-xs border-l-4 transition-colors flex flex-col gap-1 mb-1 shadow-sm",
                        canAfford 
                          ? "wow-panel-metal border-amber-600 text-stone-200 hover:border-amber-400" 
                          : "bg-stone-800 hover:bg-stone-800 border-stone-700 opacity-60 text-stone-500 cursor-not-allowed"
                      )}
                    >
                      <span className="font-black text-sm tracking-widest uppercase text-amber-500">{info.name}</span>
                      <span className="text-[10px] text-stone-400 font-semibold">{info.description}</span>
                      <div className="mt-1 flex items-center justify-between w-full">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500">Цена</span>
                        {renderCost(cost)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Palace Upgrade Modal */}
      <AnimatePresence>
        {showPalaceUpgrade && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md wow-panel p-6 relative overflow-hidden"
            >
               <img src="/buildings/hall.webp" alt="UI" className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none translate-x-1/3 -translate-y-1/3" />
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h2 className="text-xl font-black text-amber-500 uppercase tracking-tighter">Улучшение Дворца</h2>
                   <p className="text-xs text-stone-400">Текущий уровень: <span className="text-stone-100 font-bold">{palaceLevel}</span></p>
                 </div>
                 <button onClick={() => setShowPalaceUpgrade(false)} className="bg-stone-800 p-1 rounded hover:bg-stone-700">
                    <X className="w-5 h-5 text-stone-500" />
                 </button>
               </div>

               <div className="space-y-4 mb-8">
                  <div className="p-3 bg-stone-900/80 rounded border border-amber-900/30 text-[10px] text-stone-300 italic leading-relaxed">
                     "{PALACE_DESCRIPTIONS[palaceLevel] || "Развивайте свой дворец для получения новых возможностей."}"
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-stone-900/50 rounded border border-stone-800">
                     <ArrowUpCircle className="w-10 h-10 text-green-500" />
                     <div>
                       <p className="text-sm font-bold text-stone-100">Новый лимит уровней</p>
                       <p className="text-xs text-stone-500">Позволяет качать здания до <span className="text-green-400 font-black">{(palaceLevel + 1) * 5} уровня</span></p>
                     </div>
                  </div>
               </div>

               <div className="wow-panel-metal p-4 mb-6">
                 <p className="text-[10px] uppercase font-bold text-stone-500 mb-2 tracking-widest">Стоимость улучшения:</p>
                 <div className="grid grid-cols-2 gap-3">
                    {Object.entries(getPalaceUpgradeCost(palaceLevel)).map(([res, val]) => {
                      if (val === 0) return null;
                      const current = (resources as any)[res] || 0;
                      const enough = current >= (val as number);
                      return (
                        <div key={res} className="flex items-center justify-between bg-black/20 p-2 rounded border border-stone-800">
                           <div className="flex items-center gap-1.5">
                              {res === 'gold' && <Coins className="w-4 h-4 text-yellow-500" />}
                              {res === 'wood' && <Trees className="w-4 h-4 text-amber-600" />}
                              {res === 'stone' && <Mountain className="w-4 h-4 text-stone-400" />}
                              {res === 'food' && <Wheat className="w-4 h-4 text-orange-400" />}
                              <span className="text-[10px] uppercase font-bold text-stone-400">{res === 'gold' ? 'Золото' : res === 'wood' ? 'Дерево' : res === 'stone' ? 'Камень' : 'Еда'}</span>
                           </div>
                           <div className={cn("text-xs font-black", enough ? "text-green-400" : "text-red-500")}>
                             {formatNumber(val as number)}
                           </div>
                        </div>
                      );
                    })}
                 </div>
               </div>

               <button 
                  onClick={handleUpgradePalace}
                  disabled={!hasEnoughResources(getPalaceUpgradeCost(palaceLevel), resources)}
                  className="w-full py-4 wow-button font-black uppercase text-sm tracking-widest disabled:opacity-50 disabled:grayscale"
               >
                 Улучшить Дворец
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForge && <ForgeView onClose={() => setShowForge(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showAltar && <AltarComponent onClose={() => setShowAltar(false)} />}
      </AnimatePresence>
    </div>
  );
}
