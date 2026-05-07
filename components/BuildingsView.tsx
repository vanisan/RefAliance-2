'use client';

import React from 'react';
import { useGame } from '../lib/game-context';
import { Hammer, ArrowUp, Coins, TreePine, Mountain, Gem, Wheat } from 'lucide-react';

const BUILDING_TYPES = [
  { id: 'farm', name: 'Farm', icon: Wheat, prod: 'Army Capacity', base: 10, time: 0 },
  { id: 'mine_gold', name: 'Gold Mine', icon: Coins, prod: 'Gold', base: 5, time: 5 },
  { id: 'woodcutter', name: 'Woodcutter', icon: TreePine, prod: 'Wood', base: 3, time: 5 },
  { id: 'mine_ore', name: 'Ore Mine', icon: Mountain, prod: 'Ore', base: 2, time: 5 },
  { id: 'mine_gems', name: 'Gem Mine', icon: Gem, prod: 'Gems', base: 0.5, time: 5 },
];

export default function BuildingsView() {
  const { buildings, updateBuildings, resources, updateResources } = useGame();

  const handleBuild = (slotIndex: number, typeId: string) => {
    const newBuildings = [...buildings];
    newBuildings[slotIndex] = { type: typeId, level: 1 };
    updateBuildings(newBuildings);
  };

  const handleUpgrade = (slotIndex: number) => {
    const newBuildings = [...buildings];
    if (newBuildings[slotIndex]) {
      newBuildings[slotIndex].level += 1;
      updateBuildings(newBuildings);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
      {buildings.map((b, i) => (
        <div key={i} className="aspect-square bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col relative group overflow-hidden">
          {b ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-blue-900/30 rounded text-blue-400">
                  {React.createElement(BUILDING_TYPES.find(t => t.id === b.type)?.icon || Hammer, { size: 16 })}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">{BUILDING_TYPES.find(t => t.id === b.type)?.name}</span>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-2xl font-black text-white">Lvl {b.level}</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-1">
                  {b.type === 'farm' ? (
                    `+${b.level * 10} Army Cap`
                  ) : (
                    `Produce ${b.level * (BUILDING_TYPES.find(t => t.id === b.type)?.base || 0)} ${BUILDING_TYPES.find(t => t.id === b.type)?.prod} every ${BUILDING_TYPES.find(t => t.id === b.type)?.time} seconds`
                  )}
                </p>
              </div>
              <button 
                onClick={() => handleUpgrade(i)}
                className="mt-2 w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] font-bold flex items-center justify-center gap-1"
              >
                <ArrowUp size={10} /> UPGRADE
              </button>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center text-zinc-700 mb-2 group-hover:border-zinc-600 group-hover:text-zinc-600 transition-colors">
                <Hammer size={20} />
              </div>
              <p className="text-[10px] text-zinc-700 font-bold uppercase">Empty Plot</p>
              
              <div className="absolute inset-0 bg-zinc-950/90 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col gap-1 overflow-y-auto">
                {BUILDING_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleBuild(i, type.id)}
                    className="w-full py-1 px-2 bg-zinc-800 hover:bg-zinc-700 rounded text-[9px] font-bold text-left flex items-center gap-2"
                  >
                    <type.icon size={10} /> {type.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
