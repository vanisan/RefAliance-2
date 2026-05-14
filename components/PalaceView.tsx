import { useState } from 'react';
import { useGame } from '../lib/game-context';
import { BuildingId, BUILDINGS_INFO } from '../lib/game.types';
import { getUpgradeCost, getCumulativeBuildingCost, hasEnoughResources, deductResources, addResources, formatNumber, cn, getPalaceUpgradeCost, playSound } from '../lib/game.utils';
import { Coins, Trees, Mountain, Wheat, ArrowUpCircle, Trash2, Hammer, X, Lock, Users, Swords, Sparkles, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ForgeView from './ForgeView';
import AltarComponent from './AltarComponent';
import TavernView from './TavernView';

export default function PalaceView() {
  const { resources, setResources, buildings, setBuildings, palaceLevel, setPalaceLevel, referrals, setReferrals, race } = useGame();
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [showForge, setShowForge] = useState(false);
  const [showAltar, setShowAltar] = useState(false);
  const [showPalaceUpgrade, setShowPalaceUpgrade] = useState(false);
  const [showSellConfirm, setShowSellConfirm] = useState(false);
  const [movingBuildingFrom, setMovingBuildingFrom] = useState<number | null>(null);

  const raceTheme = {
    human: { name: 'Людський Замок', color: 'text-blue-400', glow: 'shadow-blue-500/20', bg: 'bg-blue-900/10' },
    orc: { name: 'Головна Цитадель', color: 'text-red-500', glow: 'shadow-red-600/20', bg: 'bg-red-950/10' },
    elf: { name: 'Древо Життя', color: 'text-emerald-400', glow: 'shadow-emerald-500/20', bg: 'bg-emerald-900/10' }
  }[race || 'human'];

  const handleCellClick = (index: number) => {
    // Check if cell is locked
    const isLocked = index >= 12 && (index - 11) > referrals;
    if (isLocked) {
      alert(`Цю клітину заблоковано! Вона відкриється за рефералів. Потрібно ще ${ (index - 11) - referrals} реф.`);
      return;
    }

    if (movingBuildingFrom !== null) {
      if (movingBuildingFrom === index) {
         setMovingBuildingFrom(null);
         return;
      }
      const newBuildings = [...buildings];
      const temp = newBuildings[index];
      newBuildings[index] = newBuildings[movingBuildingFrom];
      newBuildings[movingBuildingFrom] = temp;
      setBuildings(newBuildings);
      setMovingBuildingFrom(null);
      playSound('/sfx/soundofbuilding.mp3'); 
      return;
    }

    setShowSellConfirm(false);
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
    
    if (!showSellConfirm) {
      setShowSellConfirm(true);
      return;
    }

    const building = buildings[selectedCell]!;
    const info = BUILDINGS_INFO[building.id];
    
    if (!info) {
        const newBuildings = [...buildings];
        newBuildings[selectedCell] = null;
        setBuildings(newBuildings);
        setSelectedCell(null);
        setShowSellConfirm(false);
        return;
    }

    const totalSpent = getCumulativeBuildingCost(building.id, building.level);
    const refund = {
      gold: Math.floor(totalSpent.gold * 0.5),
      wood: Math.floor(totalSpent.wood * 0.5),
      stone: Math.floor(totalSpent.stone * 0.5),
      food: Math.floor(totalSpent.food * 0.5),
      crystals: Math.floor((totalSpent.crystals || 0) * 0.5),
    };
    
    setResources(addResources(resources, refund));
    const newBuildings = [...buildings];
    newBuildings[selectedCell] = null;
    setBuildings(newBuildings);
    setSelectedCell(null);
    setShowSellConfirm(false);
    playSound('/sfx/trash.mp3'); // Assuming there might be a trash sound or just none
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
    <div className={cn("w-full h-[calc(100vh-4rem)] flex flex-col items-center relative overflow-hidden bg-stone-900/40", raceTheme.bg)}>
      <div className="absolute inset-0 bg-[url('/city.png')] opacity-10 bg-cover bg-center mix-blend-overlay pointer-events-none transition-opacity duration-1000"></div>

      {/* Palace Header - More Compact */}
      <div className="w-full flex-col flex items-center pt-2 pb-2 bg-stone-950/60 backdrop-blur-md relative z-[60] border-b border-stone-800/50 shadow-lg">
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center relative w-full"
        >
          <div className="relative group scale-[0.75] sm:scale-95 -mb-4 sm:mb-0" onClick={() => setShowPalaceUpgrade(true)}>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn("w-16 h-16 sm:w-20 sm:h-20 bg-stone-800 rounded-xl wow-border-gold flex flex-col items-center justify-center cursor-pointer relative overflow-hidden transition-all group-hover:shadow-[0_0_30px_#f59e0b]", raceTheme.glow)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent animate-pulse pointer-events-none"></div>
              <img 
                src={race === 'human' ? '/buildings/magistrat.webp' : '/buildings/hall.webp'} 
                className={cn("absolute inset-0 w-full h-full object-contain z-0 p-1 mb-2 scale-110 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]", 
                  race === 'elf' ? 'sepia-[0.3] hue-rotate-[90deg]' : 
                  race === 'orc' ? 'sepia-[0.3] hue-rotate-[-30deg]' : 
                  ''
                )} 
                alt="Палац" 
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/80 pt-0.5 pb-0.5 flex flex-col items-center w-full border-t border-amber-900/30">
                <p className={cn("text-[7px] font-black uppercase tracking-wider text-shadow-glow relative z-10 shadow-black leading-none drop-shadow-lg text-center px-1 truncate w-full", raceTheme.color)}>
                  {raceTheme.name}
                </p>
              </div>
            </motion.div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap z-30">
               <p className="text-[9px] sm:text-[10px] font-bold text-white tracking-widest relative z-10 shadow-black px-1.5 py-0.5 bg-stone-900 border border-stone-700 rounded shadow-lg ring-1 ring-amber-500/30">Lvl {palaceLevel}</p>
            </div>
          </div>
          
          <div className="flex flex-row items-center gap-2 mt-4 sm:mt-5">
              <div className="flex items-center gap-1 bg-stone-950/80 px-2 py-0.5 rounded-md border border-stone-700/50 shadow-inner">
                 <span className="text-[9px] sm:text-[10px] text-stone-400 uppercase font-black">Буд. ліміт: <span className="text-amber-500">Lvl {palaceLevel * 5}</span></span>
              </div>
              <div className="flex items-center gap-1 bg-stone-950/80 px-2 py-0.5 rounded-md border border-stone-700/50 shadow-inner">
                 <Users className="w-3 h-3 text-indigo-400" />
                 <span className="text-[9px] sm:text-[10px] text-stone-300 font-bold uppercase">Реф: <span className="text-indigo-300">{referrals}</span></span>
              </div>
          </div>
        </motion.div>
      </div>

      <div className="w-full flex-1 flex flex-col items-center justify-start pt-4 sm:pt-10 px-2 py-0 min-h-0 bg-stone-900/30">

      <AnimatePresence>
        {movingBuildingFrom !== null && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-4 bg-blue-900/30 border-2 border-blue-500 rounded-lg p-2 px-4 shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-between min-w-[300px]"
          >
            <span className="text-blue-300 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2"><Move className="w-4 h-4"/> Клікніть клітинку для перенесення</span>
            <button 
               onClick={() => setMovingBuildingFrom(null)}
               className="bg-blue-950 px-2 py-1 rounded text-red-400 uppercase text-[9px] font-black border border-blue-900"
            >
              Скасувати
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid wrapper - moved higher */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full flex justify-center px-1 max-w-[340px] mx-auto shrink shrink-0"
      >
        <div className="grid grid-cols-4 gap-1 w-full p-2 sm:p-3 wow-panel relative bg-stone-900/90 backdrop-blur-md border border-stone-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.7)] rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl pointer-events-none"></div>
          {buildings.map((building, i) => {
            const isSelected = selectedCell === i;
            // 12 base cells (0-11), 4 referral cells (12-15)
            const isLocked = i >= 12 && (i - 11) > referrals;
            const isMovingFrom = movingBuildingFrom === i;
            const isMoveTarget = movingBuildingFrom !== null && !isLocked && movingBuildingFrom !== i;
            
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
                    : isMovingFrom
                      ? "border-blue-500 bg-blue-900/50 shadow-[0_0_15px_#3b82f6,inset_0_0_15px_rgba(59,130,246,0.5)] z-10 animate-pulse"
                    : isSelected 
                      ? "border-amber-400 bg-stone-700/80 shadow-[0_0_15px_#f59e0b,inset_0_0_15px_rgba(245,158,11,0.5)] z-10" 
                      : isMoveTarget 
                        ? building ? "border-blue-400/50 bg-blue-900/20 hover:border-blue-400 hover:bg-blue-800/50" : "border-blue-500/50 border-dashed hover:border-blue-400 hover:bg-blue-900/20 bg-stone-900/40 animate-pulse"
                        : building ? "border-amber-900/60 bg-stone-800/80 hover:bg-stone-700/90 hover:border-amber-700/80" : "border-stone-800 border-dashed hover:border-amber-900/50 bg-stone-900/40"
                )}
              >
                {isLocked ? (
                  <div className="flex flex-col items-center gap-1 opacity-50">
                    <Lock className="w-4 h-4 text-stone-600" />
                    <span className="text-[9px] text-stone-600 font-bold uppercase tracking-widest leading-none text-center px-1 border-t border-stone-800 pt-1 mt-1">Реф<br/> слот</span>
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
                        className="w-8 h-8 sm:w-10 sm:h-10 object-contain z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110 mb-2 sm:mb-0" 
                      />
                    ) : (
                      <span className="z-10 text-xl sm:text-2xl drop-shadow-md mb-2 sm:mb-0">{BUILDINGS_INFO[building.id]?.icon === 'Sword' ? '⚔️' : BUILDINGS_INFO[building.id]?.icon === 'Wheat' ? '🌾' : BUILDINGS_INFO[building.id]?.icon === 'Coins' ? '🪙' : BUILDINGS_INFO[building.id]?.icon === 'Trees' ? '🪵' : '🪨'}</span>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 border-2 border-amber-400 rounded-xl z-20 animate-pulse pointer-events-none w-full h-full"></div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-stone-900/90 py-1 shadow-sm border-t border-stone-700/50 z-20 text-center">
                      <div className="text-[10px] font-mono font-bold text-amber-400 leading-none shadow-black drop-shadow-md">
                        Lvl {building.level}
                      </div>
                    </div>
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

      </div>

      {/* Action Menu (Modal style) */}
      <AnimatePresence>
        {selectedCell !== null && (
          <div className="fixed inset-0 z-[110] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-[360px] wow-panel p-4 pb-6 rounded-xl shadow-[0_10px_60px_rgba(0,0,0,0.9)] border-amber-900/50 backdrop-blur-md bg-stone-900/98 max-h-[85vh] flex flex-col relative"
            >
              <div className="flex justify-between items-center mb-4 relative z-10 shrink-0 border-b border-stone-800 pb-3">
                <p className="text-sm text-yellow-500 font-extrabold uppercase tracking-[0.2em] text-shadow-glow">
                {buildings[selectedCell] ? 'УПРАВЛІННЯ' : 'ПОБУДУВАТИ'}
              </p>
              <button onClick={() => setSelectedCell(null)} className="text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 p-2 rounded-full transition-all active:scale-90 shadow-inner border border-stone-700/50">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="relative z-10 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent pr-1">
              {buildings[selectedCell] ? (
                <div className="flex flex-col gap-3">
                  <div className="mb-1 flex flex-col p-3 bg-stone-950/60 rounded-lg border border-stone-800 shadow-inner w-full">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-stone-800 gap-2">
                      <span className="font-black text-white text-base uppercase tracking-widest text-shadow-glow break-words">{buildings[selectedCell]!.name}</span> 
                      <span className="text-[10px] text-amber-500 font-black bg-amber-950/50 px-2 py-1 rounded border border-amber-900/50 shadow-inner whitespace-nowrap">LVL {buildings[selectedCell]!.level} / {palaceLevel * 5}</span>
                    </div>
                    {BUILDINGS_INFO[buildings[selectedCell]!.id]?.production && (
                      <div className="mt-1">
                        <p className="text-[10px] uppercase text-stone-500 font-black mb-1.5 tracking-widest opacity-70">Видобуток (кожні 5 сек):</p>
                        {renderProduction(BUILDINGS_INFO[buildings[selectedCell]!.id].production, buildings[selectedCell]!.level)}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={handleUpgrade}
                    disabled={!buildings[selectedCell] || !BUILDINGS_INFO[buildings[selectedCell]!.id] || buildings[selectedCell]!.level >= palaceLevel * 5 || !hasEnoughResources(getUpgradeCost(buildings[selectedCell]!.id, buildings[selectedCell]!.level), resources)}
                    className="w-full text-left py-4 px-4 rounded font-bold border-l-8 border-emerald-600 transition-all disabled:opacity-50 disabled:grayscale flex justify-between wow-panel-metal hover:bg-stone-700 hover:-translate-y-1 shadow-lg"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-emerald-400 font-black uppercase tracking-widest text-sm drop-shadow-md flex items-center gap-2"><ArrowUpCircle className="w-5 h-5"/> {buildings[selectedCell]!.level >= palaceLevel * 5 ? 'МАКС. ДЛЯ ПАЛАЦУ' : 'ПОКРАЩИТИ'}</span>
                      {BUILDINGS_INFO[buildings[selectedCell]!.id]?.production && buildings[selectedCell]!.level < palaceLevel * 5 && (
                        <span className="text-[9px] text-emerald-300/80 font-black bg-emerald-950/30 px-1.5 py-0.5 rounded tracking-tighter">БУДЕ: +{formatNumber(Object.values(BUILDINGS_INFO[buildings[selectedCell]!.id].production!)[0] as number * (buildings[selectedCell]!.level + 1))} / 5s</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      {buildings[selectedCell]!.level < palaceLevel * 5 && renderCost(getUpgradeCost(buildings[selectedCell]!.id, buildings[selectedCell]!.level))}
                    </div>
                  </button>
                  
                <div className="flex gap-2 w-full mt-2">
                  <button 
                    onClick={() => {
                      setMovingBuildingFrom(selectedCell);
                      setSelectedCell(null);
                    }}
                    className="flex-1 text-left py-2.5 px-4 rounded font-bold border-l-4 border-blue-900 transition-all flex flex-col gap-1 text-xs wow-panel-metal hover:bg-blue-950/20 active:bg-blue-950/40"
                  >
                    <div className="flex justify-between w-full items-center">
                      <span className="text-blue-400 font-black flex items-center gap-2 uppercase tracking-widest text-[10px]"><Move className="w-4 h-4"/> Перемістити</span>
                    </div>
                  </button>
                  <button 
                    onClick={handleSell}
                    className={cn("flex-1 text-left py-2.5 px-4 rounded font-bold border-l-4 transition-all flex flex-col gap-1 text-xs wow-panel-metal hover:bg-red-950/20 active:bg-red-950/40", showSellConfirm ? "border-red-600 bg-red-950/30 ring-2 ring-red-500 animate-pulse" : "border-red-900")}
                  >
                    <div className="flex justify-between w-full items-center">
                      <span className="text-red-500 font-black flex items-center gap-2 uppercase tracking-widest text-[10px]"><Trash2 className="w-4 h-4"/> {showSellConfirm ? "ТОЧНО?" : "Знести"}</span>
                      <span className="text-[9px] text-stone-600 font-black uppercase tracking-[0.1em]">-50%</span>
                    </div>
                    <div className="flex gap-2 items-center opacity-60">
                      {(() => {
                        const totalSpent = getCumulativeBuildingCost(buildings[selectedCell]!.id, buildings[selectedCell]!.level);
                        return (
                          <div className="flex gap-1 flex-wrap text-[9px] font-mono font-black">
                            {totalSpent.gold > 0 && <span className="text-yellow-600">+{formatNumber(totalSpent.gold * 0.5)} G</span>}
                            {totalSpent.wood > 0 && <span className="text-amber-700">+{formatNumber(totalSpent.wood * 0.5)} W</span>}
                            {totalSpent.stone > 0 && <span className="text-stone-500">+{formatNumber(totalSpent.stone * 0.5)} S</span>}
                          </div>
                        );
                      })()}
                    </div>
                  </button>
                </div>

                {buildings[selectedCell]?.id === 'barracks' && (
                  <button className="w-full py-4 px-4 rounded font-black border-l-8 border-amber-700 transition-colors mt-2 text-[10px] uppercase tracking-widest wow-panel-metal text-stone-400 flex items-center justify-center gap-2 bg-stone-800/50">
                    <Swords className="w-4 h-4 text-amber-500" />
                    <span>Наймайте Армію у вкладці "Армія"</span>
                  </button>
                )}
                {buildings[selectedCell]?.id === 'forge' && (
                  <button 
                    onClick={() => setShowForge(true)}
                    className="w-full py-4 px-4 rounded font-black border-l-8 border-stone-400 transition-all mt-2 wow-panel-metal text-stone-100 hover:bg-stone-700 flex items-center justify-center gap-2 hover:-translate-y-1 shadow-lg"
                  >
                    <Hammer className="w-5 h-5 text-stone-300" />
                    <span className="uppercase tracking-[0.2em] text-shadow-glow">КУЗНЯ</span>
                  </button>
                )}
                {buildings[selectedCell]?.id === 'altar' && (
                  <button 
                    onClick={() => setShowAltar(true)}
                    className="w-full py-4 px-4 rounded font-black border-l-8 border-fuchsia-700 transition-all mt-2 wow-panel-metal text-stone-100 hover:bg-stone-700 flex items-center justify-center gap-2 hover:-translate-y-1 shadow-lg"
                  >
                    <Sparkles className="w-5 h-5 text-fuchsia-400" />
                    <span className="uppercase tracking-[0.2em] text-shadow-glow">ВІВТАР</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 overflow-y-auto px-1 pb-6 pt-2 snap-y scrollbar-thin scrollbar-thumb-stone-600 scrollbar-track-transparent w-full">
                {Object.values(BUILDINGS_INFO).filter(b => b.id !== 'tavern').map((info) => {
                  const cost = getUpgradeCost(info.id, 0);
                  const canAfford = hasEnoughResources(cost, resources);
                  return (
                    <motion.button
                      whileHover={canAfford ? { scale: 1.02, x: 5 } : {}}
                      whileTap={canAfford ? { scale: 0.98 } : {}}
                      key={info.id}
                      onClick={() => handleBuild(info.id)}
                      disabled={!canAfford}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border-l-[12px] transition-all flex flex-col gap-3 relative overflow-hidden group shadow-xl snap-start shrink-0 min-h-[110px]",
                        canAfford 
                          ? "wow-panel-metal border-amber-600 hover:border-amber-400" 
                          : "bg-stone-800/90 border-stone-700/50 opacity-40 cursor-not-allowed grayscale"
                      )}
                    >
                      {canAfford && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-stone-950 rounded-lg p-1.5 shadow-2xl border border-amber-900/30 group-hover:border-amber-500/50 transition-colors">
                           {info.image ? (
                             <img src={info.image} alt="" className="w-full h-full object-contain" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-2xl">
                               {info.id === 'barracks' ? '⚔️' : info.id === 'farm' ? '🌾' : '🏗️'}
                             </div>
                           )}
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                           <span className="font-black text-sm sm:text-base tracking-[0.1em] uppercase text-white drop-shadow-md block truncate group-hover:text-amber-400 transition-colors">{info.name}</span>
                           <p className="text-[10px] sm:text-xs text-stone-400 font-bold leading-tight mt-1 line-clamp-2 italic opacity-80">{info.description}</p>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between w-full bg-stone-950/70 p-2.5 rounded-lg border border-stone-800 shadow-inner flex-wrap gap-2 group-hover:bg-stone-950 transition-colors">
                        <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-stone-600">Вартість:</span>
                        {renderCost(cost)}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
            </div>
            </motion.div>
          </div>
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
              className="w-full max-w-sm max-h-[90vh] overflow-y-auto wow-panel p-6 relative bg-stone-900 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.2)]"
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
                     &quot;{PALACE_DESCRIPTIONS[palaceLevel] || "Розвивайте свій палац для отримання нових можливостей."}&quot;
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
