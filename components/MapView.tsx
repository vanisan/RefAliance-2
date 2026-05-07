'use client';

import React, { useState } from 'react';
import { useGame } from '../lib/game-context';
import { Sword, Shield, Map as MapIcon, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function MapView() {
  const { currentCampaignLevel, updateCampaignLevel, updateResources } = useGame();
  const [victory, setVictory] = useState(false);

  const handleFight = () => {
    // Simulate battle
    setVictory(true);
    // Reward crystals only from mobs/mats
    updateResources({ crystals: Math.floor(Math.random() * 5) + 1 });
  };

  const handleNextLevel = () => {
    const [world, level] = currentCampaignLevel.split('-').map(Number);
    const nextLevel = level === 10 ? `${world + 1}-1` : `${world}-${level + 1}`;
    updateCampaignLevel(nextLevel);
    setVictory(false);
  };

  return (
    <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MapIcon className="text-blue-500" />
          Campaign: Level {currentCampaignLevel}
        </h2>
      </div>

      <div className="relative aspect-video bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden flex items-center justify-center">
        {!victory ? (
          <div className="text-center">
            <Sword className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
            <p className="text-zinc-400 mb-4">Enemy Squad Spotted!</p>
            <button
              onClick={handleFight}
              className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold shadow-lg"
            >
              FIGHT
            </button>
          </div>
        ) : (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <Shield className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-green-500 mb-2">VICTORY</h3>
            <p className="text-zinc-400 mb-6">Level Cleared! Loot collected.</p>
            
            <button
              id="next-level-btn"
              onClick={handleNextLevel}
              className="px-12 py-4 bg-green-600 hover:bg-green-500 rounded-xl font-black text-lg transition-all neon-green-pulse flex items-center gap-2 mx-auto"
            >
              NEXT LEVEL
              <ChevronRight className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
