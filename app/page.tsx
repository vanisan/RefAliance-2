'use client';

import React, { useState } from 'react';
import { GameProvider, useGame } from '../lib/game-context';
import AuthView from '../components/AuthView';
import Header from '../components/Header';
import BuildingsView from '../components/BuildingsView';
import MapView from '../components/MapView';
import { Loader2, Hammer, Map as MapIcon, Sword, Package } from 'lucide-react';

function GameContent() {
  const { user, authLoading, resetProgress } = useGame();
  const [activeTab, setActiveTab] = useState<'city' | 'map' | 'army' | 'inventory'>('city');

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 p-4 font-sans">
        <AuthView />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <TabButton 
            active={activeTab === 'city'} 
            onClick={() => setActiveTab('city')} 
            icon={Hammer} 
            label="Alliance City" 
          />
          <TabButton 
            active={activeTab === 'map'} 
            onClick={() => setActiveTab('map')} 
            icon={MapIcon} 
            label="World Map" 
          />
          <TabButton 
            active={activeTab === 'army'} 
            onClick={() => setActiveTab('army')} 
            icon={Sword} 
            label="Army" 
          />
          <TabButton 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')} 
            icon={Package} 
            label="Inventory" 
          />
        </div>

        <div className="flex-1">
          {activeTab === 'city' && <BuildingsView />}
          {activeTab === 'map' && <MapView />}
          {activeTab === 'army' && (
            <div className="p-12 text-center bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-500 italic">
              Army Training Grounds - Coming Soon
            </div>
          )}
          {activeTab === 'inventory' && (
            <div className="p-12 text-center bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-500 italic">
              Armory - Coming Soon
            </div>
          )}
        </div>

        <footer className="mt-auto pt-6 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
          <div>RefAlliance 2 // Build 0x02</div>
          <button 
            onClick={() => {
              if (confirm("Are you sure? This will wipe ALL progress.")) {
                resetProgress();
              }
            }}
            className="hover:text-red-500 transition-colors"
          >
            System Reset
          </button>
        </footer>
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm transition-all whitespace-nowrap
        ${active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-y-[-2px]' 
          : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
        }
      `}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

export default function Home() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
