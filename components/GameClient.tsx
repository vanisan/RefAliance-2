"use client";

import { useGame } from '../lib/game-context';
import { useState } from 'react';
import BottomNav, { TabType } from '../components/BottomNav';
import Header from '../components/Header';
import PalaceView from '../components/PalaceView';
import MapView from '../components/MapView';
import ArmyView from '../components/ArmyView';
import CombatView from '../components/CombatView';
import AuthView from './AuthView';
import RankingView from './RankingView';
import { MapNode } from '../lib/game.types';

export default function GameClient() {
  const [activeTab, setActiveTab] = useState<TabType>('palace');
  const [combatNode, setCombatNode] = useState<MapNode | null>(null);
  
  const { buildings, authLoading } = useGame();
  const hasBarracks = buildings.some(b => b?.id === 'barracks');

  const handleStartCombat = (node: MapNode) => {
    setCombatNode(node);
  };

  const handleEndCombat = () => {
    setCombatNode(null);
  };

  return (
    <div className="h-[100dvh] bg-stone-900 text-stone-200 pb-16 pt-24 font-sans flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/city.png')] opacity-60 bg-cover bg-center mix-blend-overlay pointer-events-none z-0"></div>
      <header className="fixed top-2 left-2 right-2 z-50">
        <Header />
      </header>
      
      <main className="flex-1 overflow-y-auto relative z-10 w-full mx-auto flex flex-col items-center">
        {authLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        ) : combatNode ? (
          <CombatView node={combatNode} onEnd={handleEndCombat} />
        ) : (
          <>
            {activeTab === 'palace' && <PalaceView />}
            {activeTab === 'map' && <MapView onStartCombat={handleStartCombat} />}
            {activeTab === 'army' && <ArmyView />}
            {activeTab === 'ranking' && <RankingView />}
            {activeTab === 'menu' && <AuthView />}
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
