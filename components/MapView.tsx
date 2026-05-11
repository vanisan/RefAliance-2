import { useGame } from '../lib/game-context';
import { MapNode, UNITS_INFO } from '../lib/game.types';
import { formatNumber, cn } from '../lib/game.utils';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, MapPin, Store, Hammer, BookOpen, Skull, X, Shield, Trophy, Globe } from 'lucide-react';
import { useState } from 'react';
import ShopView from './ShopView';
import ArenaView from './ArenaView';
import WorldMapView from './WorldMapView';
import TavernView from './TavernView';

interface MapViewProps {
  onStartCombat: (node: MapNode) => void;
}

import BattlePrepModal from './BattlePrepModal';

export default function MapView({ onStartCombat }: MapViewProps) {
  const { mapNodes, mapRefreshTimer, army, resources, setResources, currentCampaignLevel, setCurrentCampaignLevel } = useGame();
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [showArena, setShowArena] = useState(false);
  const [showWorldMap, setShowWorldMap] = useState(false);
  const [showTavern, setShowTavern] = useState(false);
  const [showBossesModal, setShowBossesModal] = useState(false);
  const [prepNode, setPrepNode] = useState<MapNode | null>(null);

  const currentLevelNodes = mapNodes.filter(n => (n.campaignLevel === currentCampaignLevel || n.campaignLevel === 'all') && n.type !== 'daily_boss');
  const enemyNodes = currentLevelNodes.filter(n => n.type === 'combat' || n.type === 'boss');
  
  const dailyBosses = mapNodes.filter(n => n.type === 'daily_boss');
  const allCleared = enemyNodes.length > 0 && enemyNodes.every(n => n.cleared);

  const totalArmyCount = Object.values(army).reduce((sum, count) => sum + count, 0);

  // Split into cleared and uncleared for visual stats
  const levelClearedCount = enemyNodes.filter(n => n.cleared).length;
  const levelProgress = enemyNodes.length > 0 ? Math.round((levelClearedCount / enemyNodes.length) * 100) : 100;

  const handleNextLevel = () => {
    const [chap, lev] = currentCampaignLevel.split('-').map(Number);
    
    // Check if chap-(lev+1) exists
    const nextInChap = `${chap}-${lev + 1}`;
    const nextChapFirst = `${chap + 1}-1`;
    
    if (mapNodes.some(n => n.campaignLevel === nextInChap)) {
      setCurrentCampaignLevel(nextInChap);
    } else if (mapNodes.some(n => n.campaignLevel === nextChapFirst)) {
      setCurrentCampaignLevel(nextChapFirst);
    }
    
    setSelectedNode(null);
  };

  const getNextLevelName = () => {
    const [chap, lev] = currentCampaignLevel.split('-').map(Number);
    const nextInChap = `${chap}-${lev + 1}`;
    const nextChapFirst = `${chap + 1}-1`;
    
    if (mapNodes.some(n => n.campaignLevel === nextInChap)) return nextInChap;
    if (mapNodes.some(n => n.campaignLevel === nextChapFirst)) return nextChapFirst;
    return null;
  };
  
  const nextLevelName = getNextLevelName();

  return (
    <div className="w-full h-full min-h-[calc(100vh-8rem)] relative bg-[url('/map.png')] bg-cover bg-center overflow-hidden flex flex-col items-center">
      <div className="absolute inset-0 bg-stone-950/30 backdrop-blur-[2px] z-0"></div>
      
      {/* Map Header */}
      <div className="w-full wow-panel p-2 mt-2 mb-1 max-w-[400px] relative z-20 overflow-hidden flex flex-col items-center justify-center">
        <h2 className="text-sm font-black text-amber-500 relative flex items-center gap-2 uppercase tracking-widest text-shadow-glow">
          <MapPin className="w-4 h-4"/> Кампания: Уровень {currentCampaignLevel}
        </h2>
        <div className="w-[80%] bg-stone-900/80 rounded-full h-1.5 mt-1.5 relative border border-stone-800">
          <div className="bg-amber-600 h-1.5 rounded-full shadow-[0_0_8px_#d97706]" style={{ width: `${levelProgress}%` }}></div>
        </div>
        <div className="flex gap-4 mt-1">
          <p className="text-[9px] font-black text-stone-300 relative uppercase tracking-widest">Прогресс: {levelProgress}%</p>
          {allCleared && nextLevelName && (
              <button 
               onClick={handleNextLevel}
               className="text-[9px] font-black text-green-400 relative uppercase tracking-widest animate-pulse flex items-center gap-1 bg-stone-900/80 px-2 py-0.5 rounded border border-green-500 shadow-[0_0_10px_#22c55e,inset_0_0_5px_#22c55e] transition-all hover:scale-105 active:scale-95"
             >
                Вперед к {nextLevelName}! ➔
              </button>
          )}
        </div>
      </div>

      {/* Bosses Icon */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowBossesModal(true)}
        className="absolute top-20 left-4 z-20 wow-panel-metal p-2 flex flex-col items-center shadow-2xl transition-transform border-red-600 group active:scale-95"
      >
        <div className="relative">
          <Skull className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
          <div className="absolute -top-1 -right-1 bg-amber-500 p-0.5 rounded-full border border-stone-900 z-20">
            <Swords className="w-2 h-2 text-stone-950" />
          </div>
        </div>
        <span className="text-[8px] font-black text-red-500 uppercase mt-0.5 tracking-tighter">Боссы</span>
      </motion.button>

      {/* World Map Button */}
      <button 
        onClick={() => setShowWorldMap(true)}
        className="absolute top-20 right-4 z-20 wow-panel-metal p-2 flex flex-col items-center shadow-2xl transition-transform active:scale-90 hover:scale-105 border-amber-600 group"
      >
         <div className="relative">
            <Globe className="w-6 h-6 text-amber-500 group-hover:animate-spin-slow" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
         </div>
         <span className="text-[8px] font-black text-amber-500 uppercase mt-0.5 tracking-tighter">Мир</span>
      </button>

      {/* Map Nodes Layer */}
      <div className="absolute inset-0 z-10 pt-24 pb-20 pointer-events-none">
        <div className="relative w-full h-full max-w-[500px] mx-auto pointer-events-auto">
          {currentLevelNodes.map(node => {
            const isCity = node.type === 'city';
            const isBoss = node.type === 'boss' || node.type === 'daily_boss';
            
            return (
            <motion.button
              key={node.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedNode(node)}
              className={`absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {node.cleared ? (
                <div className="w-6 h-6 rounded-full bg-stone-800 border border-stone-600 flex items-center justify-center opacity-70 shadow-inner">
                  <MapPin className="w-3 h-3 text-stone-500" />
                </div>
              ) : isCity ? (
                <div className={`w-8 h-8 rounded text-amber-300 flex items-center justify-center border-2 border-amber-600 shadow-xl ${selectedNode?.id === node.id ? 'bg-amber-900 shadow-[0_0_20px_#f59e0b]' : 'bg-stone-800'}`}>
                   <Store className="w-4 h-4" />
                </div>
              ) : isBoss ? (
                <div className={`w-10 h-10 rounded-full border-2 shadow-2xl flex items-center justify-center relative overflow-hidden ${selectedNode?.id === node.id ? 'border-amber-400 bg-amber-900/80 shadow-[0_0_25px_rgba(245,158,11,0.8)]' : 'border-red-900 bg-stone-950 shadow-[0_0_15px_rgba(153,27,27,0.5)]'}`}>
                   <div className="absolute inset-0 bg-red-900/20 animate-pulse"></div>
                   <Skull className="w-6 h-6 text-red-500 relative z-10" />
                   <div className="absolute -bottom-1 -right-1 bg-amber-500 p-0.5 rounded-full border border-stone-900 z-20">
                      <Swords className="w-2 h-2 text-stone-950" />
                   </div>
                </div>
              ) : (
                <div className={`w-7 h-7 rounded-[4px] flex items-center justify-center border-2 shadow-xl ${selectedNode?.id === node.id ? 'border-red-400 bg-red-900/80 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'border-stone-800 bg-stone-900'}`}>
                   <Skull className="w-3 h-3 text-red-700 opacity-60" />
                </div>
              )}
              <div className="mt-1 text-[7px] font-black bg-stone-950/90 px-1.5 py-0.5 rounded text-amber-500 max-w-[80px] text-center leading-tight border border-stone-700/50 uppercase tracking-tighter shadow-xl">
                {isBoss ? 'БОССЫ' : node.name}
              </div>
            </motion.button>
            );
          })}
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {showShop && <ShopView onClose={() => setShowShop(false)} />}
        {showArena && <ArenaView onClose={() => setShowArena(false)} />}
        {showWorldMap && <WorldMapView onClose={() => setShowWorldMap(false)} />}
        {showTavern && <TavernView onClose={() => setShowTavern(false)} />}
        
        {showBossesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-[340px] wow-panel p-5 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-700/50">
                <div className="flex items-center gap-2">
                  <Skull className="w-5 h-5 text-red-500" />
                  <h3 className="font-black text-lg text-red-500 uppercase tracking-widest text-shadow-glow">Выберите Босса</h3>
                </div>
                <button onClick={() => setShowBossesModal(false)} className="text-stone-400 hover:text-stone-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-stone-900/50 px-3 py-2 rounded border border-stone-800 mb-4">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Ключи боссов:</span>
                <span className={cn("text-xs font-black", resources.bossKeys ? "text-green-400" : "text-red-500")}>
                  {resources.bossKeys || 0} / 2
                </span>
              </div>

              <div className="space-y-3">
                {dailyBosses.map(boss => (
                  <button
                    key={boss.id}
                    onClick={() => {
                        setShowBossesModal(false);
                        setSelectedNode(boss);
                    }}
                    className="w-full wow-panel-metal p-3 flex flex-col gap-2 hover:bg-stone-700 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-stone-200 group-hover:text-amber-400 transition-colors">{boss.name}</span>
                      <div className="flex items-center gap-1">
                         <span className="text-[10px] text-indigo-400 font-black">+{boss.reward.crystals} 💎</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[9px] text-stone-500 font-bold uppercase tracking-tight">
                       <span className="flex items-center gap-1">HP: <span className="text-stone-300">{UNITS_INFO[boss.enemies[0].unitId].hp}</span></span>
                       <span className="flex items-center gap-1">ATK: <span className="text-stone-300">{UNITS_INFO[boss.enemies[0].unitId].attack}</span></span>
                    </div>
                  </button>
                ))}
              </div>
              
              <p className="text-[8px] text-stone-500 mt-4 italic text-center">
                * Ключи восстанавливаются раз в 24 часа. Максимум 2.
              </p>
            </motion.div>
          </motion.div>
        )}
        
        {selectedNode && !showShop && !showArena && !showWorldMap && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[320px] z-50 wow-panel p-4 shadow-2xl"
          >
            <div className="flex justify-between items-start mb-4 border-b border-stone-700/50 pb-2">
              <div>
                <h3 className="font-black text-lg text-amber-500 uppercase tracking-widest text-shadow-glow">{selectedNode.name}</h3>
                <p className="text-xs text-stone-400 mt-1 uppercase font-bold tracking-widest">
                  {selectedNode.cleared ? 'Зачищено' : selectedNode.type === 'city' ? 'Мирная локация' : 'Опасная зона'}
                </p>
              </div>
              <button onClick={() => setSelectedNode(null)} className="p-1 text-stone-400 hover:text-stone-200 transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>

            {selectedNode.type === 'city' ? (
               <div className="flex flex-col gap-2 mb-4">
                 <button 
                  onClick={() => {
                    setSelectedNode(null);
                    setShowShop(true);
                  }}
                  className="wow-panel-metal p-3 flex items-center justify-between hover:bg-stone-700 text-stone-300 transition-colors text-xs font-bold uppercase tracking-widest">
                   <div className="flex items-center gap-2"><Store className="w-4 h-4 text-amber-400"/> Магазин</div>
                 </button>
                 <button 
                  onClick={() => {
                    setSelectedNode(null);
                    setShowArena(true);
                  }}
                  className="wow-panel-metal p-3 flex items-center justify-between hover:bg-stone-700 text-stone-300 transition-colors text-xs font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                   <div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500"/> Арена</div>
                   <span className="text-[9px] text-amber-400 animate-pulse font-black">LIVE PvP</span>
                 </button>
                 {currentCampaignLevel.startsWith('3-') && (
                   <button 
                    onClick={() => {
                      setSelectedNode(null);
                      setShowTavern(true);
                    }}
                    className="wow-panel-metal p-3 flex items-center justify-between hover:bg-stone-700 text-stone-300 transition-colors text-xs font-bold uppercase tracking-widest border-l-4 border-amber-600">
                     <div className="flex items-center gap-2 font-black text-amber-500 italic">🍻 Таверна Героев</div>
                     <span className="text-[7px] text-stone-500 font-bold">НОВОЕ</span>
                   </button>
                 )}
               </div>
            ) : selectedNode.cleared ? (
              <div className="py-6 flex flex-col items-center opacity-70">
                <Shield className="w-12 h-12 text-stone-500 mb-2"/>
                <p className="text-sm font-black text-stone-400 uppercase tracking-widest">Эта земля принадлежит вам</p>
              </div>
            ) : (
              <div className="mb-4 space-y-4">
                <div className="wow-panel-metal p-3">
                  <h4 className="text-[10px] text-red-500 uppercase font-black mb-2 tracking-widest border-b border-stone-700/50 pb-1">Вражеский Гарнизон:</h4>
                  <ul className="text-xs space-y-1 font-bold">
                    {selectedNode.enemies.map((e, idx) => (
                      <li key={idx} className="flex justify-between items-center text-stone-300">
                        <span>{UNITS_INFO[e.unitId].name}</span>
                        <span className="text-red-400 font-mono bg-stone-900 border border-stone-800 px-1.5 rounded-sm">x{formatNumber(e.count)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="wow-panel-metal p-3">
                  <h4 className="text-[10px] text-amber-500 uppercase font-black mb-2 tracking-widest border-b border-stone-700/50 pb-1">Возможная Награда:</h4>
                  <div className="flex flex-wrap gap-2 text-xs font-mono font-bold">
                    {selectedNode.reward.gold && <span className="text-yellow-500 bg-stone-900 px-1.5 py-0.5 rounded border border-yellow-900/50">+{formatNumber(selectedNode.reward.gold)} Золото</span>}
                    {selectedNode.reward.crystals && <span className="text-indigo-400 bg-stone-900 px-1.5 py-0.5 rounded border border-indigo-900/50">+{formatNumber(selectedNode.reward.crystals)} 💎</span>}
                    {selectedNode.reward.wood && <span className="text-amber-600 bg-stone-900 px-1.5 py-0.5 rounded border border-amber-900/50">+{formatNumber(selectedNode.reward.wood)} Дерево</span>}
                    {selectedNode.reward.stone && <span className="text-stone-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-700/50">+{formatNumber(selectedNode.reward.stone)} Камень</span>}
                    {selectedNode.reward.food && <span className="text-orange-400 bg-stone-900 px-1.5 py-0.5 rounded border border-orange-900/50">+{formatNumber(selectedNode.reward.food)} Еда</span>}
                  </div>
                </div>
              </div>
            )}

            {!selectedNode.cleared && selectedNode.type !== 'city' && (
              <div className="flex flex-col gap-2 mt-4 text-center">
                {totalArmyCount === 0 && (
                  <p className="text-[9px] text-red-500 font-bold uppercase animate-pulse">У вас нет войск для боя!</p>
                )}
                {selectedNode.type === 'daily_boss' && (
                  <div className="text-[10px] text-stone-300 mb-2 uppercase font-bold">
                    Доступно ключей: <span className={cn(resources.bossKeys ? "text-green-400" : "text-red-500 font-black")}>{resources.bossKeys || 0} / 2</span>
                  </div>
                )}
                <button 
                  onClick={() => {
                    if (totalArmyCount > 0) {
                      if (selectedNode.type === 'daily_boss') {
                        if (!resources.bossKeys || resources.bossKeys < 1) {
                          alert('У вас нет ключей для атаки на ежедневного босса! (выдается 1 раз в сутки)');
                          return;
                        }
                      }
                      setPrepNode(selectedNode);
                      setSelectedNode(null);
                    }
                  }}
                  disabled={totalArmyCount === 0 || (selectedNode.type === 'daily_boss' && (!resources.bossKeys || resources.bossKeys < 1))}
                  className={cn(
                    "w-full py-3 wow-button font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2",
                    totalArmyCount === 0 && "opacity-50 grayscale cursor-not-allowed border-stone-700"
                  )}
                >
                  <Swords className="w-4 h-4"/> В Атаку!
                </button>
              </div>
            )}
          </motion.div>
        )}
        
        {prepNode && (
          <BattlePrepModal 
            onStart={(selectedArmy) => {
              if (prepNode.type === 'daily_boss') {
                 setResources(prev => ({
                    ...prev,
                    bossKeys: Math.max(0, (prev.bossKeys || 0) - 1),
                    lastBossKeyTime: (prev.bossKeys || 0) >= 2 ? Date.now() : prev.lastBossKeyTime
                 }));
              }
              onStartCombat({ ...prepNode, selectedArmy } as any);
              setPrepNode(null);
            }}
            onCancel={() => setPrepNode(null)}
            title={`Битва: ${prepNode.name}`}
            enemies={prepNode.enemies}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
