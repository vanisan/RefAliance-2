"use client";

import { useGame } from '../lib/game-context';
import { supabase } from '../lib/supabase';
import { useState } from 'react';
import { cn } from '../lib/game.utils';
import BottomNav, { TabType } from '../components/BottomNav';
import Header from '../components/Header';
import PalaceView from '../components/PalaceView';
import WorldMapHub from '../components/WorldMapHub';
import ArmyView from '../components/ArmyView';
import CombatView from '../components/CombatView';
import AuthView from './AuthView';
import RankingView from './RankingView';
import NameEntryView from './NameEntryView';
import RaceSelection from './RaceSelection';
import TutorialOverlay from './TutorialOverlay';
import { MapNode } from '../lib/game.types';

export default function GameClient() {
  const [activeTab, setActiveTab] = useState<TabType>('palace');
  const [combatNode, setCombatNode] = useState<MapNode | null>(null);
  
  const { buildings, authLoading, user, playerName, race, resources, setResources } = useGame();
  const hasBarracks = buildings.some(b => b?.id === 'barracks');

  const handleStartCombat = (node: MapNode) => {
    setCombatNode(node);
  };

  const handleEndCombat = () => {
    setCombatNode(null);
  };

  const completeTutorial = async () => {
    if (user?.id) {
      localStorage.setItem(`tutorial_completed_${user.id}`, 'true');
      // Direct update to Supabase for immediate persistence
      try {
        await supabase.from('users').update({
          resources: { ...resources, hasCompletedTutorial: true }
        }).eq('id', user.id);
      } catch (e) {
        console.error("Failed to save tutorial status:", e);
      }
    }
    setResources(prev => ({ ...prev, hasCompletedTutorial: true }));
  };

  if (authLoading) {
    return (
      <div className="h-[100dvh] bg-stone-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  // If user is logged in but hasn't set their name yet (or has old placeholder)
  const isDefaultName = !playerName || playerName === 'Hero' || playerName === 'Герой';
  if (user && isDefaultName) {
    return <NameEntryView />;
  }

  if (user && !race) {
    return <RaceSelection />;
  }

  const showTutorial = !authLoading && resources.hasCompletedTutorial === false;

  return (
    <div className="h-[100dvh] bg-stone-900 text-stone-200 font-sans flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/city.png')] opacity-60 bg-cover bg-center mix-blend-overlay pointer-events-none z-0"></div>
      
      {showTutorial && <TutorialOverlay onComplete={completeTutorial} />}

      {!combatNode && (
        <div className="shrink-0 relative z-[50]">
          <Header />
        </div>
      )}
      
      <main className="flex-1 overflow-hidden relative z-10 w-full mx-auto flex flex-col">
        {combatNode ? (
          <CombatView node={combatNode} onEnd={handleEndCombat} />
        ) : (
          <div className="w-full h-full relative overflow-hidden flex flex-col">
            {activeTab === 'palace' ? (
              <PalaceView />
            ) : (
              <div className="w-full h-full overflow-y-auto custom-scrollbar">
                {activeTab === 'map' && <WorldMapHub onStartCombat={handleStartCombat} />}
                {activeTab === 'army' && <ArmyView />}
                {activeTab === 'ranking' && <RankingView />}
                {activeTab === 'menu' && <AuthView />}
              </div>
            )}
          </div>
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
