import { useGame } from '../lib/game-context';
import { MapNode, INITIAL_MAP_NODES, UNITS_INFO } from '../lib/game.types';
import { Swords, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

interface MapViewProps {
  onStartCombat: (node: MapNode) => void;
}

export default function MapView({ onStartCombat }: MapViewProps) {
  const { mapNodes } = useGame();
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);

  return (
    <div className="w-full h-full min-h-[calc(100vh-8rem)] relative bg-[url('https://picsum.photos/id/1025/800/1200')] bg-cover bg-center overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-0"></div>
      
      {/* Map Nodes Layer */}
      <div className="absolute inset-0 z-10 p-4">
        {mapNodes.map(node => (
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
              <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center opacity-50">
                <MapPin className="w-4 h-4 text-slate-500" />
              </div>
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-xl ${selectedNode?.id === node.id ? 'border-red-400 neon-glow bg-red-900/80' : 'border-red-600 bg-slate-900'}`}>
                <Swords className="w-5 h-5 text-red-500 animate-pulse" />
              </div>
            )}
            <div className="mt-1 text-[10px] font-bold bg-slate-900/80 px-2 py-0.5 rounded text-white whitespace-nowrap border border-slate-700/50">
              {node.name}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Node Details Modal */}
      <AnimatePresence>
        {selectedNode && !selectedNode.cleared && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-4 left-4 right-4 z-40 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl"
          >
            <h3 className="font-bold text-lg mb-2 neon-text-blue">{selectedNode.name}</h3>
            
            <div className="mb-4">
              <h4 className="text-xs text-slate-400 uppercase font-bold mb-1 border-b border-slate-800 pb-1">Враги:</h4>
              <ul className="text-sm space-y-1">
                {selectedNode.enemies.map((e, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span className="text-slate-300">{UNITS_INFO[e.unitId].name}</span>
                    <span className="text-red-400 font-mono">x{e.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mb-4">
              <h4 className="text-xs text-slate-400 uppercase font-bold mb-1 border-b border-slate-800 pb-1">Награда:</h4>
              <div className="flex gap-3 text-sm font-mono">
                {selectedNode.reward.gold && <span className="text-yellow-500">Золото: {selectedNode.reward.gold}</span>}
                {selectedNode.reward.wood && <span className="text-amber-600">Дерево: {selectedNode.reward.wood}</span>}
                {selectedNode.reward.stone && <span className="text-stone-400">Камень: {selectedNode.reward.stone}</span>}
                {selectedNode.reward.food && <span className="text-orange-400">Еда: {selectedNode.reward.food}</span>}
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => onStartCombat(selectedNode)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors border border-red-400"
              >
                <Swords className="w-5 h-5"/> Атаковать
              </button>
              <button 
                onClick={() => setSelectedNode(null)}
                className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-colors border border-slate-600"
              >
                Отмена
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
