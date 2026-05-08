import { useGame } from '../lib/game-context';
import { MapNode, UNITS_INFO } from '../lib/game.types';
import { formatNumber, cn } from '../lib/game.utils';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, MapPin, Store, Hammer, BookOpen, Skull, X, Shield, Trophy } from 'lucide-react';
import { useState } from 'react';
import ShopView from './ShopView';
import ArenaView from './ArenaView';

interface MapViewProps {
  onStartCombat: (node: MapNode) => void;
}

export default function MapView({ onStartCombat }: MapViewProps) {
  const { mapNodes, mapRefreshTimer, army, currentCampaignLevel, setCurrentCampaignLevel } = useGame();
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [showShop, setShowShop] = useState(false);

  const [showArena, setShowArena] = useState(false);

  const currentLevelNodes = mapNodes.filter(n => n.campaignLevel === currentCampaignLevel || n.campaignLevel === 'all');
  const enemyNodes = currentLevelNodes.filter(n => n.type === 'combat' || n.type === 'boss');
  const allCleared = enemyNodes.length > 0 && enemyNodes.every(n => n.cleared);

  const totalArmyCount = Object.values(army).reduce((sum, count) => sum + count, 0);

  // Split into cleared and uncleared for visual stats
  const levelClearedCount = enemyNodes.filter(n => n.cleared).length;
  const levelProgress = enemyNodes.length > 0 ? Math.round((levelClearedCount / enemyNodes.length) * 100) : 100;

  const handleNextLevel = () => {
    const [chap, lev] = currentCampaignLevel.split('-').map(Number);
    let nextLev = lev + 1;
    if (nextLev > 7) return; // Cap at 1-7
    setCurrentCampaignLevel(`${chap}-${nextLev}`);
    setSelectedNode(null);
  };

  return (
    <div className="w-full h-full min-h-[calc(100vh-8rem)] relative bg-[url('/map.png')] bg-cover bg-center overflow-hidden flex flex-col items-center">
      <div className="absolute inset-0 bg-stone-950/30 backdrop-blur-[2px] z-0"></div>
      
      {/* Map Header */}
      <div className="w-full wow-panel p-2 mt-2 mb-1 max-w-[400px] relative z-10 overflow-hidden flex flex-col items-center justify-center">
        <h2 className="text-sm font-black text-amber-500 relative flex items-center gap-2 uppercase tracking-widest text-shadow-glow">
          <MapPin className="w-4 h-4"/> Кампания: Уровень {currentCampaignLevel}
        </h2>
        <div className="w-[80%] bg-stone-900/80 rounded-full h-1.5 mt-1.5 relative border border-stone-800">
          <div className="bg-amber-600 h-1.5 rounded-full shadow-[0_0_8px_#d97706]" style={{ width: `${levelProgress}%` }}></div>
        </div>
        <div className="flex gap-4 mt-1">
          <p className="text-[9px] font-black text-stone-300 relative uppercase tracking-widest">Прогресс: {levelProgress}%</p>
          {allCleared && currentCampaignLevel !== '1-7' && (
              <button 
               onClick={handleNextLevel}
               className="text-[9px] font-black text-green-400 relative uppercase tracking-widest animate-pulse flex items-center gap-1 bg-stone-900/80 px-2 py-0.5 rounded border border-green-500 shadow-[0_0_10px_#22c55e,inset_0_0_5px_#22c55e] transition-all hover:scale-105 active:scale-95"
             >
                Вперед к {currentCampaignLevel === '1-7' ? 'Финалу' : `1-${parseInt(currentCampaignLevel.split('-')[1]) + 1}`}! ➔
              </button>
          )}
        </div>
      </div>

      {/* Map Nodes Layer */}
      <div className="absolute inset-0 z-10 pt-24 pb-20 pointer-events-none">
        <div className="relative w-full h-full max-w-[500px] mx-auto pointer-events-auto">
          {currentLevelNodes.map(node => {
            const isCity = node.type === 'city';
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
              ) : (
                <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center border-2 shadow-xl ${selectedNode?.id === node.id ? 'border-red-400 bg-red-900/80 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'border-red-800 bg-stone-900'}`}>
                   <Skull className="w-4 h-4 text-red-500 animate-pulse" />
                </div>
              )}
              <div className="mt-1 text-[7px] font-black bg-stone-950/90 px-1.5 py-0.5 rounded text-amber-500 max-w-[80px] text-center leading-tight border border-stone-700/50 uppercase tracking-tighter shadow-xl">
                {node.name}
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
        
        {selectedNode && !showShop && !showArena && (
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
                 <button className="wow-panel-metal p-3 flex items-center justify-between hover:bg-stone-700 text-stone-300 transition-colors text-xs font-bold uppercase tracking-widest">
                   <div className="flex items-center gap-2"><Hammer className="w-4 h-4 text-stone-400"/> Кузня</div>
                   <span className="text-[9px] text-stone-500">(В разработке)</span>
                 </button>
                 <button className="wow-panel-metal p-3 flex items-center justify-between hover:bg-stone-700 text-stone-300 transition-colors text-xs font-bold uppercase tracking-widest">
                   <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-400"/> Библиотека</div>
                   <span className="text-[9px] text-stone-500">(В разработке)</span>
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
                <button 
                  onClick={() => {
                    if (totalArmyCount > 0) {
                      onStartCombat(selectedNode);
                      setSelectedNode(null);
                    }
                  }}
                  disabled={totalArmyCount === 0}
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
      </AnimatePresence>
    </div>
  );
}
