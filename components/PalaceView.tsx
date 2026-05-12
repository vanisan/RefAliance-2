import { useState } from 'react';
import { useGame } from '../lib/game-context';
import { BuildingId, BUILDINGS_INFO } from '../lib/game.types';
import { getUpgradeCost, hasEnoughResources, deductResources, addResources, formatNumber, cn, getPalaceUpgradeCost, playSound } from '../lib/game.utils';
import { Coins, Trees, Mountain, Wheat, ArrowUpCircle, Trash2, Hammer, X, Lock, Users, Swords, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ForgeView from './ForgeView';
import AltarComponent from './AltarComponent';
import TavernView from './TavernView';

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
      alert(`Цю клітину заблоковано! Вона відкриється за рефералів. Потрібно ще ${ (index - 11) - referrals} реф.`);
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
      alert("Недостатньо ресурсів!");
      return;
    }

    setResources(deductResources(resources, cost));
    const newBuildings = [...buildings];
    newBuildings[selectedCell] = { id: buildingId, name: info.name, level: 1 };
    setBuildings(newBuildings);
    setSelectedCell(null);
    playSound('/sfx/soundofbuilding.mp3');
  };

  const handleUpgrade = () => {
    if (selectedCell === null || !buildings[selectedCell]) return;
    
    const building = buildings[selectedCell]!;
    
    // PALACE LEVEL CAP
    if (building.level >= palaceLevel * 5) {
      alert(`Палац ${palaceLevel} рівня дозволяє покращувати будівлі тільки до ${palaceLevel * 5} рівня! Покращте палац.`);
      return;
    }

    const cost = getUpgradeCost(building.id, building.level);
    if (!hasEnoughResources(cost, resources)) {
       alert("Недостатньо ресурсів!");
       return;
    }

    setResources(deductResources(resources, cost));
    const newBuildings = [...buildings];
    newBuildings[selectedCell] = { ...building, level: building.level + 1 };
    setBuildings(newBuildings);
    setSelectedCell(null);
    playSound('/sfx/lvlupbuilding.mp3');
  };

  const PALACE_DESCRIPTIONS: Record<number, string> = {
    1: "Початкове зміцнення влади. Дозволяє організувати базове управління поселенням.",
    2: "Централізація ресурсів. Палац стає архітектурною домінантою міста. Відкриває шлях до імперських амбіцій.",
    3: "Велична резиденція. Потоки ресурсів течуть у скарбницю безперервно. Ваш авторитет незаперечний.",
    4: "Імперський собор. Стіни палацу прикрашені золотом та рунами. Знання та сила об'єднуються.",
    5: "Цитадель Вічності. Палац черпає енергію із самого світобудови. Будівлі можуть досягти досконалості.",
    6: "Палац Богів. Вища точка розвитку. Межа між правителем і божеством стирається."
  };

  const handleUpgradePalace = () => {
    const cost = getPalaceUpgradeCost(palaceLevel);
    if (!hasEnoughResources(cost, resources)) {
      alert("Недостатньо ресурсів для покращення палацу!");
      return;
    }
    setResources(deductResources(resources, cost));
    setPalaceLevel(palaceLevel + 1);
    setShowPalaceUpgrade(false);
    playSound('/sfx/lvlupbuilding.mp3');
    alert(`Вітаємо! Ваш Палац тепер ${palaceLevel + 1} рівня! Ліміт будівель збільшено до ${(palaceLevel + 1) * 5}.`);
  };

  const handleSell = () => {
    if (selectedCell === null || !buildings[selectedCell]) return;
    
    // Give back 50% of base cost (simple logic)
    const info = BUILDINGS_INFO[buildings[selectedCell]!.id];
    if (!info) { // Fallback for removed buildings
        const newBuildings = [...buildings];
        newBuildings[selectedCell] = null;
        setBuildings(newBuildings);
        setSelectedCell(null);
        return;
    }
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
      <div className="absolute inset-0 bg-[url('/city.png')] opacity-10 bg-cover bg-center mix-blend-overlay pointer-events-none transition-opacity duration-1000"></div>
      
      {/* Palace Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col items-center mb-6 mt-16 sm:mt-4 relative z-20 w-full"
      >
        <div className="relative group" onClick={() => setShowPalaceUpgrade(true)}>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-32 h-32 sm:w-36 sm:h-36 bg-stone-800 rounded-xl wow-border-gold flex flex-col items-center justify-end cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.2)] relative overflow-hidden group-hover:shadow-[0_0_30px_#f59e0b] transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent animate-pulse pointer-events-none"></div>
            <img src="/buildings/hall.webp" alt="Палац" className="absolute inset-0 w-full h-full object-contain z-0 p-3 scale-110 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-8 pb-3 flex flex-col items-center w-full">
              <p className="text-sm sm:text-base text-yellow-400 font-black uppercase tracking-widest text-shadow-glow relative z-10 shadow-black leading-none drop-shadow-lg mb-1">Головний Палац</p>
              <p className="text-[11px] sm:text-[13px] font-bold text-stone-300 tracking-widest relative z-10 shadow-black px-3 py-0.5 bg-black/50 border border-stone-800 rounded-lg">Рівень <span className="text-white text-shadow-glow ml-1">{palaceLevel}</span></p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 z-20 backdrop-blur-sm">
               <ArrowUpCircle className="w-12 h-12 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
            </div>
          </motion.div>
          {palaceLevel >= 10 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-3 -right-3 bg-gradient-to-br from-amber-400 to-amber-600 text-stone-900 text-[10px] sm:text-xs px-2.5 py-0.5 rounded shadow-[0_0_15px_rgba(245,158,11,0.5)] font-black border border-yellow-200"
            >
              MAX
            </motion.div>
          )}
        </div>
        <div className="flex flex-col items-center gap-1 mt-4">
            <div className="flex items-center gap-1.5 bg-stone-950/70 px-3 py-1 rounded-full border border-stone-700/50 shadow-inner backdrop-blur-sm">
               <span className="text-[10px] sm:text-xs text-stone-400 uppercase font-black tracking-widest">Ліміт ур: <span className="text-amber-500">{palaceLevel * 5}</span></span>
            </div>
            <div className="flex items-center gap-1.5 bg-stone-950/70 px-3 py-1 rounded-full border border-stone-700/50 shadow-inner backdrop-blur-sm">
               <Users className="w-3.5 h-3.5 text-indigo-400 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]" />
               <span className="text-[10px] sm:text-xs text-stone-300 font-bold tracking-wider">Реферали: <span className="text-indigo-300">{referrals}</span></span>
            </div>
        </div>
      </motion.div>

      {/* Grid wrapper */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full flex justify-center mb-8 px-2 max-w-[420px] mx-auto"
      >
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-[420px] p-3 sm:p-4 wow-panel relative bg-stone-900/80 backdrop-blur-md border border-stone-700/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-stone-800/20 to-transparent rounded-2xl pointer-events-none"></div>
          {buildings.map((building, i) => {
            const isSelected = selectedCell === i;
            // 12 base cells (0-11), 4 referral cells (12-15)
            const isLocked = i >= 12 && (i - 11) > referrals;
            
            return (
              <motion.button
                key={i}
                onClick={() => handleCellClick(i)}
                whileHover={!isLocked ? { scale: 1.05 } : {}}
                whileTap={!isLocked ? { scale: 0.95 } : {}}
                className={cn(
                  "aspect-square rounded-xl border flex flex-col items-center justify-center relative overflow-hidden group shadow-lg transition-all",
                  isLocked 
                     ? "border-stone-800/50 bg-stone-900/30 grayscale cursor-not-allowed opacity-30"
                    : isSelected 
                      ? "border-amber-400 bg-stone-700/80 shadow-[0_0_15px_#f59e0b,inset_0_0_15px_rgba(245,158,11,0.5)] z-10" 
                      : building ? "border-amber-900/60 bg-stone-800/80 hover:bg-stone-700/90 hover:border-amber-700/80" : "border-stone-800 border-dashed hover:border-amber-900/50 bg-stone-900/40"
                )}
              >
                {isLocked ? (
                  <div className="flex flex-col items-center gap-1 opacity-50">
                    <Lock className="w-4 h-4 text-stone-600" />
                    <span className="text-[7px] text-stone-600 font-bold uppercase tracking-widest leading-none text-center px-1 border-t border-stone-800 pt-1 mt-1">Реф<br/> слот</span>
                  </div>
                ) : building ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    {BUILDINGS_INFO[building.id]?.image ? (
                      <motion.img 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        src={BUILDINGS_INFO[building.id].image} 
                        alt={building.name} 
                        className="w-10 h-10 sm:w-12 sm:h-12 object-contain z-10 mb-1 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110" 
                      />
                    ) : (
                      <span className="z-10 text-2xl sm:text-3xl mb-1 drop-shadow-md">{BUILDINGS_INFO[building.id]?.icon === 'Sword' ? '⚔️' : BUILDINGS_INFO[building.id]?.icon === 'Wheat' ? '🌾' : BUILDINGS_INFO[building.id]?.icon === 'Coins' ? '🪙' : BUILDINGS_INFO[building.id]?.icon === 'Trees' ? '🪵' : '🪨'}</span>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 border-2 border-amber-400 rounded-xl z-20 animate-pulse pointer-events-none w-full h-full"></div>
                    )}
                    {!isSelected && (
                      <div className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 bg-stone-900/80 px-1 py-0.5 rounded shadow-sm border border-stone-700/50">
                        <div className="text-[8px] sm:text-[9px] text-amber-400/90 font-bold z-10 font-mono leading-none shadow-black drop-shadow-md">
                          L.{building.level}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-stone-700 text-3xl font-light hover:text-stone-500 tracking-tighter opacity-30 group-hover:opacity-100 transition-opacity">+</span>
                    {i >= 12 && !isLocked && (
                      <div className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 bg-indigo-500 w-2 h-2 rounded-full shadow-[0_0_8px_rgba(99,102,241,1)]"></div>
                    )}
                  </>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Action Menu (Bottom Sheet style) */}
      <AnimatePresence>
        {selectedCell !== null && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-[95%] max-w-[400px] wow-panel p-5 z-50 shadow-[0_0_50px_rgba(0,0,0,0.8)] border-amber-900/50 backdrop-blur-md bg-stone-900/95"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-lg"></div>
            <div className="flex justify-between items-center mb-4 relative z-10">
              <p className="text-xs sm:text-sm text-yellow-500 font-black uppercase tracking-widest text-shadow-glow">
                {buildings[selectedCell] ? 'Дії з будівлею' : 'Побудувати'}
              </p>
              <button onClick={() => setSelectedCell(null)} className="text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 p-1 rounded-full transition-colors shadow-inner border border-stone-700/50">
                <X className="w-4 h-4 sm:w-5 sm:h-5"/>
              </button>
            </div>

            <div className="relative z-10">
              {buildings[selectedCell] ? (
                <div className="flex flex-col gap-3">
                  <div className="mb-2 flex flex-col p-3 bg-stone-950/50 rounded-lg border border-stone-800 shadow-inner w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 pb-2 border-b border-stone-800 gap-2">
                      <span className="font-black text-white text-base uppercase tracking-widest text-shadow-glow break-words w-full sm:w-auto">{buildings[selectedCell]!.name}</span> 
                      <span className="text-[10px] sm:text-xs text-amber-500 font-black bg-amber-950/50 px-2 py-0.5 rounded border border-amber-900/50 shadow-inner whitespace-nowrap">LVL {buildings[selectedCell]!.level} / {palaceLevel * 5}</span>
                    </div>
                    {BUILDINGS_INFO[buildings[selectedCell]!.id]?.production && (
                      <div className="mt-1">
                        <p className="text-[9px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Видобуток (кожні 5 сек):</p>
                        {renderProduction(BUILDINGS_INFO[buildings[selectedCell]!.id].production, buildings[selectedCell]!.level)}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={handleUpgrade}
                    disabled={!buildings[selectedCell] || !BUILDINGS_INFO[buildings[selectedCell]!.id] || !hasEnoughResources(getUpgradeCost(buildings[selectedCell]!.id, buildings[selectedCell]!.level), resources)}
                    className="w-full text-left py-3 px-4 rounded font-bold border-l-4 border-emerald-500 transition-all disabled:opacity-50 disabled:grayscale flex justify-between wow-panel-metal hover:bg-stone-700 hover:-translate-y-0.5"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-emerald-400 font-black uppercase tracking-widest text-sm drop-shadow-md flex items-center gap-2"><ArrowUpCircle className="w-5 h-5"/> Покращити</span>
                      {BUILDINGS_INFO[buildings[selectedCell]!.id]?.production && (
                        <span className="text-[10px] text-emerald-300/80 font-bold bg-emerald-950/30 px-1.5 py-0.5 rounded">Буде: +{formatNumber(Object.values(BUILDINGS_INFO[buildings[selectedCell]!.id].production!)[0] as number * (buildings[selectedCell]!.level + 1))} / 5s</span>
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
                  <span className="text-red-500">💰 Знести</span>
                  <span className="text-[9px] text-stone-500 mt-0.5">Поверне 50% бази</span>
                </button>
                {buildings[selectedCell]?.id === 'barracks' && (
                  <button className="w-full py-3 px-4 rounded font-bold border-l-4 border-amber-600 transition-colors mt-2 text-xs wow-panel-metal text-stone-300 flex items-center justify-center gap-2 bg-stone-800">
                    <Swords className="w-4 h-4 text-amber-500" />
                    <span>Наймайте Армію у вкладці "Армія"</span>
                  </button>
                )}
                {buildings[selectedCell]?.id === 'forge' && (
                  <button 
                    onClick={() => setShowForge(true)}
                    className="w-full py-3 px-4 rounded font-bold border-l-4 border-stone-400 transition-all mt-2 wow-panel-metal text-stone-100 hover:bg-stone-700 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                  >
                    <Hammer className="w-5 h-5 text-stone-300" />
                    <span className="uppercase tracking-widest text-shadow-glow">Кузня</span>
                  </button>
                )}
                {buildings[selectedCell]?.id === 'altar' && (
                  <button 
                    onClick={() => setShowAltar(true)}
                    className="w-full py-3 px-4 rounded font-bold border-l-4 border-fuchsia-600 transition-all mt-2 wow-panel-metal text-stone-100 hover:bg-stone-700 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                  >
                    <Sparkles className="w-5 h-5 text-fuchsia-400" />
                    <span className="uppercase tracking-widest text-shadow-glow">Вівтар</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto px-2 pb-4 pt-1 snap-y scrollbar-thin scrollbar-thumb-stone-600 scrollbar-track-stone-900 w-full mb-1">
                {Object.values(BUILDINGS_INFO).filter(b => b.id !== 'tavern').map((info) => {
                  const cost = getUpgradeCost(info.id, 0);
                  const canAfford = hasEnoughResources(cost, resources);
                  return (
                    <motion.button
                      whileHover={canAfford ? { scale: 1.02 } : {}}
                      whileTap={canAfford ? { scale: 0.98 } : {}}
                      key={info.id}
                      onClick={() => handleBuild(info.id)}
                      disabled={!canAfford}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border-l-4 transition-all flex flex-col gap-2 relative overflow-hidden group shadow-lg snap-start shrink-0",
                        canAfford 
                          ? "wow-panel-metal border-amber-500 hover:border-amber-400" 
                          : "bg-stone-800/80 border-stone-700/50 opacity-60 cursor-not-allowed"
                      )}
                    >
                      {canAfford && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-stone-900 rounded p-1 shadow-inner border border-stone-700">
                              {info.image ? (
                                <img src={info.image} alt="" className="w-full h-full object-contain" />
                              ) : null}
                           </div>
                           <div className="flex-1 min-w-0 pr-2">
                              <span className="font-black text-sm tracking-widest uppercase text-amber-500 drop-shadow-md block truncate">{info.name}</span>
                              <p className="text-[9px] sm:text-[10px] text-stone-400 font-semibold leading-tight mt-0.5 line-clamp-2">{info.description}</p>
                           </div>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between w-full bg-stone-950/50 p-2 rounded-md border border-stone-800 shadow-inner flex-wrap gap-1">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500">Вартість:</span>
                        {renderCost(cost)}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Palace Upgrade Modal */}
      <AnimatePresence>
        {showPalaceUpgrade && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm wow-panel p-6 relative overflow-hidden bg-stone-900 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.2)]"
            >
               <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
               <img src="/buildings/hall.webp" alt="UI" className="absolute top-0 right-0 w-40 h-40 opacity-5 pointer-events-none translate-x-1/4 -translate-y-1/4 mix-blend-screen" />
               
               <div className="flex justify-between items-start mb-6 relative z-10">
                 <div>
                   <h2 className="text-2xl font-black text-amber-400 uppercase tracking-widest text-shadow-glow">Покращення</h2>
                   <p className="text-xs text-stone-400 uppercase tracking-widest mt-1 font-bold">Палац рівня <span className="text-white text-sm bg-stone-800 px-2 py-0.5 rounded border border-stone-700 ml-1 shadow-inner">{palaceLevel}</span></p>
                 </div>
                 <button onClick={() => setShowPalaceUpgrade(false)} className="bg-stone-950 p-1.5 rounded-full hover:bg-stone-800 border border-stone-800 transition-colors shadow-inner text-stone-400 hover:text-white">
                    <X className="w-5 h-5" />
                 </button>
               </div>

               <div className="space-y-4 mb-6 relative z-10">
                  <div className="p-4 bg-stone-950/80 rounded-lg border border-amber-900/40 text-xs text-stone-300 italic leading-relaxed shadow-inner relative overflow-hidden">
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-600/50"></div>
                     "{PALACE_DESCRIPTIONS[palaceLevel] || "Розвивайте свій палац для отримання нових можливостей."}"
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-stone-800/80 rounded-lg border border-green-900/30 shadow-lg">
                     <div className="bg-green-900/40 p-2 rounded-full border border-green-700/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                        <ArrowUpCircle className="w-8 h-8 text-green-400" />
                     </div>
                     <div>
                       <p className="text-sm font-black text-white uppercase tracking-widest text-shadow-glow mb-0.5">Новий ліміт</p>
                       <p className="text-[11px] text-stone-400 font-bold uppercase">Будівлі до <span className="text-green-400 font-black text-sm ml-1 px-1.5 py-0.5 bg-green-950/50 border border-green-900/50 rounded drop-shadow-md">{(palaceLevel + 1) * 5} LVL</span></p>
                     </div>
                  </div>
               </div>

               <div className="wow-panel-metal p-5 mb-8 relative z-10">
                 <p className="text-[10px] uppercase font-black text-stone-400 mb-3 tracking-widest border-b border-stone-700/50 pb-2">Вартість покращення</p>
                 <div className="flex flex-col gap-2.5">
                    {Object.entries(getPalaceUpgradeCost(palaceLevel)).map(([res, val]) => {
                      if (val === 0) return null;
                      const current = (resources as any)[res] || 0;
                      const enough = current >= (val as number);
                      return (
                        <div key={res} className="flex items-center justify-between bg-stone-900/80 p-2.5 rounded-lg border border-stone-800 shadow-inner">
                           <div className="flex items-center gap-2">
                              {res === 'gold' && <Coins className="w-4 h-4 text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />}
                              {res === 'wood' && <Trees className="w-4 h-4 text-amber-600 drop-shadow-[0_0_5px_rgba(217,119,6,0.5)]" />}
                              {res === 'stone' && <Mountain className="w-4 h-4 text-stone-400 drop-shadow-[0_0_5px_rgba(168,162,158,0.5)]" />}
                              {res === 'food' && <Wheat className="w-4 h-4 text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]" />}
                              <span className="text-[11px] uppercase font-bold text-stone-300 tracking-wider flex-1 min-w-[60px]">{res === 'gold' ? 'Золото' : res === 'wood' ? 'Дерево' : res === 'stone' ? 'Камінь' : 'Їжа'}</span>
                           </div>
                           <div className={cn("text-sm font-black flex items-center gap-2 tracking-wider", enough ? "text-green-400" : "text-red-500")}>
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
                  className="w-full py-5 wow-button font-black uppercase text-sm tracking-widest disabled:opacity-50 disabled:grayscale relative z-10 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:-translate-y-0.5 transition-transform"
               >
                 Заплатити та Покращити
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
