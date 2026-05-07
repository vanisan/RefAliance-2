"use client";

import { useGame } from '../lib/game-context';
import { useState } from 'react';
import BottomNav, { TabType } from '../components/BottomNav';
import Header from '../components/Header';
import PalaceView from '../components/PalaceView';
import MapView from '../components/MapView';
import ArmyView from '../components/ArmyView';
import CombatView from '../components/CombatView';
import { MapNode } from '../lib/game.types';

export default function GameClient() {
  const [activeTab, setActiveTab] = useState<TabType>('palace');
  const [combatNode, setCombatNode] = useState<MapNode | null>(null);
  
  const { buildings } = useGame();
  const hasBarracks = buildings.some(b => b?.id === 'barracks');

  const handleStartCombat = (node: MapNode) => {
    setCombatNode(node);
  };

  const handleEndCombat = () => {
    setCombatNode(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-16 pt-24 font-sans flex flex-col relative overflow-hidden">
      <div className="scanline"></div>
      <Header />
      
      <main className="flex-1 overflow-y-auto relative z-10 w-full mx-auto flex flex-col items-center">
        {combatNode ? (
          <CombatView node={combatNode} onEnd={handleEndCombat} />
        ) : (
          <>
            {activeTab === 'palace' && <PalaceView />}
            {activeTab === 'map' && <MapView onStartCombat={handleStartCombat} />}
            {activeTab === 'army' && <ArmyView />}
            {activeTab === 'menu' && (
              <div className="p-4 text-center text-slate-400 mt-20">
                <h2 className="text-xl font-bold mb-4 neon-text-blue">Меню</h2>
                <p>Настройки, профиль и информация</p>
                <div className="mt-8 opacity-50 text-xs">
                  (В разработке)
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {!combatNode && (
        <BottomNav 
          activeTab={activeTab} 
          onChange={setActiveTab} 
          hasBarracks={hasBarracks} 
        />
      )}
    </div>
  );
}
