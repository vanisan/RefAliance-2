import { useGame } from '../lib/game-context';
import { MapNode, UNITS_INFO } from '../lib/game.types';
import { formatNumber } from '../lib/game.utils';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, MapPin, Store, Hammer, BookOpen, Skull, X, Shield } from 'lucide-react';
import { useState } from 'react';
import ShopView from './ShopView';

interface MapViewProps {
  onStartCombat: (node: MapNode) => void;
}

export default function MapView({ onStartCombat }: MapViewProps) {
  const { mapNodes, mapRefreshTimer } = useGame();
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [showShop, setShowShop] = useState(false);

  // Split into cleared and uncleared for visual stats
  const clearedCount = mapNodes.filter(n => n.cleared).length;
  const progress = Math.round((clearedCount / mapNodes.length) * 100);

  return (
    <div className="w-full h-full min-h-[calc(100vh-8rem)] relative bg-[url('https://picsum.photos/id/1025/800/1200')] bg-cover bg-center overflow-hidden flex flex-col items-center">
      <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-[2px] z-0"></div>
      
      {/* Map Header */}
      <div className="w-full wow-panel p-4 mt-4 mb-2 max-w-[500px] relative z-10 overflow-hidden flex flex-col items-center justify-center">
        <h2 className="text-lg font-black text-amber-500 relative flex items-center gap-2 uppercase tracking-widest text-shadow-glow">
          <MapPin className="w-5 h-5"/> Карта Мира
        </h2>
        <div className="w-full bg-stone-900/80 rounded-full h-2 mt-2 relative border border-stone-800">
          <div className="bg-amber-600 h-2 rounded-full shadow-[0_0_10px_#d97706]" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="text-[10px] font-black text-stone-300 mt-1 relative uppercase tracking-widest">Освоено: {progress}%</p>
        <p className="text-[9px] font-bold text-amber-500/70 mt-1 relative uppercase tracking-widest">
          Мобы обновятся через: {Math.floor(mapRefreshTimer / 60)}:{(mapRefreshTimer % 60).toString().padStart(2, '0')}
        </p>
      </div>

      {/* Map Nodes Layer */}
      <div className="absolute inset-0 z-10 pt-24 pb-20 pointer-events-none">
        <div className="relative w-full h-full max-w-[500px] mx-auto pointer-events-auto">
          {mapNodes.map(node => {
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
                <div className="w-8 h-8 rounded-full bg-stone-800 border-2 border-stone-600 flex items-center justify-center opacity-70 shadow-inner">
                  <MapPin className="w-4 h-4 text-stone-500" />
                </div>
              ) : isCity ? (
                <div className={`w-10 h-10 rounded text-amber-300 flex items-center justify-center border-2 border-amber-600 shadow-xl ${selectedNode?.id === node.id ? 'bg-amber-900 shadow-[0_0_20px_#f59e0b]' : 'bg-stone-800'}`}>
                   <Store className="w-5 h-5" />
                </div>
              ) : (
                <div className={`w-10 h-10 rounded-[4px] flex items-center justify-center border-2 shadow-xl ${selectedNode?.id === node.id ? 'border-red-400 bg-red-900/80 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'border-red-800 bg-stone-900'}`}>
                  <Skull className="w-5 h-5 text-red-500 animate-pulse" />
                </div>
              )}
              <div className="mt-1 text-[9px] font-black bg-stone-900 px-2 py-0.5 rounded text-amber-500 whitespace-nowrap border border-stone-700/50 uppercase tracking-widest shadow-md">
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
        
        {selectedNode && !showShop && (
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
                    {selectedNode.reward.wood && <span className="text-amber-600 bg-stone-900 px-1.5 py-0.5 rounded border border-amber-900/50">+{formatNumber(selectedNode.reward.wood)} Дерево</span>}
                    {selectedNode.reward.stone && <span className="text-stone-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-700/50">+{formatNumber(selectedNode.reward.stone)} Камень</span>}
                    {selectedNode.reward.food && <span className="text-orange-400 bg-stone-900 px-1.5 py-0.5 rounded border border-orange-900/50">+{formatNumber(selectedNode.reward.food)} Еда</span>}
                  </div>
                </div>
              </div>
            )}

            {!selectedNode.cleared && selectedNode.type !== 'city' && (
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => {
                    onStartCombat(selectedNode);
                    setSelectedNode(null);
                  }}
                  className="w-full py-3 wow-button font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
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
