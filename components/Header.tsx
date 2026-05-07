'use client';

import React from 'react';
import { useGame } from '../lib/game-context';
import { Coins, TreePine, Mountain, Gem, Zap, Users, User as PlayerIcon } from 'lucide-react';

export default function Header() {
  const { playerName, resources, armyPower, armyCapacity } = useGame();

  const ResourceItem = ({ icon: Icon, label, value, color }: any) => (
    <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg border bg-${color}-900/10 border-${color}-900/30`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon size={12} className={`text-${color}-500`} />
        <span className={`text-[10px] font-bold uppercase text-${color}-600 tracking-tighter`}>{label}</span>
      </div>
      <span className="font-mono font-black text-lg tabular-nums leading-none">{Math.floor(value)}</span>
    </div>
  );

  return (
    <header className="bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800/50 sticky top-0 z-50 p-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
            <PlayerIcon className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">{playerName || "Commander"}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                <Zap size={12} />
                Power: {armyPower}
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-blue-500">
                <Users size={12} />
                Army: 0 / {armyCapacity}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <ResourceItem icon={Coins} label="Gold" value={resources.gold} color="yellow" />
          <ResourceItem icon={TreePine} label="Wood" value={resources.wood} color="green" />
          <ResourceItem icon={Mountain} label="Ore" value={resources.ore} color="orange" />
          <ResourceItem icon={Gem} label="Gems" value={resources.gems} color="blue" />
          <ResourceItem icon={Zap} label="Crystals" value={resources.crystals} color="purple" />
        </div>
      </div>
    </header>
  );
}
