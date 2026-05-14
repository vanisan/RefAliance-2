'use client';

import { useGame } from '../lib/game-context';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Map as MapIcon, 
  Globe, 
  Skull, 
  ChevronLeft,
  Users,
  Swords,
  ShieldAlert,
  ShieldCheck,
  Crown
} from 'lucide-react';
import { useState } from 'react';
import MapView from './MapView';
import WorldMapView from './WorldMapView';
import { cn } from '../lib/game.utils';
import { MapNode } from '../lib/game.types';

interface WorldMapHubProps {
  onStartCombat: (node: MapNode) => void;
}

export default function WorldMapHub({ onStartCombat }: WorldMapHubProps) {
  const { currentCampaignLevel } = useGame();
  const [view, setView] = useState<'hub' | 'campaign' | 'realms' | 'city'>('hub');

  const menuItems = [
    {
      id: 'city',
      name: 'Моє Місто',
      description: 'Магазин, Арена, Призов',
      icon: <Globe className="w-8 h-8" />,
      color: 'border-blue-500 text-blue-500',
      bg: 'bg-blue-950/20',
      active: true,
      label: 'HUB'
    },
    {
      id: 'campaign',
      name: 'Кампанія',
      description: `Рівень ${currentCampaignLevel}`,
      icon: <MapIcon className="w-8 h-8" />,
      color: 'border-amber-500 text-amber-500',
      bg: 'bg-amber-950/20',
      active: true,
      label: 'ОСНОВНЕ'
    },
    {
      id: 'realms',
      name: 'Землі Лордів',
      description: 'Карта володінь',
      icon: <Users className="w-8 h-8" />,
      color: 'border-indigo-500 text-indigo-500',
      bg: 'bg-indigo-950/20',
      active: true,
      label: 'LIVE'
    },
    {
      id: 'clans',
      name: 'Клан. фортеця',
      description: 'Незабаром у грі',
      icon: <ShieldAlert className="w-8 h-8" />,
      color: 'border-stone-600 text-stone-600',
      bg: 'bg-stone-900/40',
      active: false,
      label: 'LOCKED'
    }
  ];

  if (view === 'city') {
    return (
      <div className="w-full h-full relative">
        <button 
          onClick={() => setView('hub')}
          className="fixed top-24 left-4 z-[40] bg-stone-900/90 backdrop-blur-sm p-2 rounded border border-amber-600/50 text-amber-500 shadow-xl flex items-center gap-2 px-3 hover:bg-stone-800 transition-all active:scale-95 wow-panel-metal"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Світ</span>
        </button>
        <MapView onStartCombat={onStartCombat} forceCityOpen={true} />
      </div>
    );
  }

  if (view === 'campaign') {
    return (
      <div className="w-full h-full relative">
        <button 
          onClick={() => setView('hub')}
          className="fixed top-24 left-4 z-[40] bg-stone-900/90 backdrop-blur-sm p-2 rounded border border-amber-600/50 text-amber-500 shadow-xl flex items-center gap-2 px-3 hover:bg-stone-800 transition-all active:scale-95 wow-panel-metal"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Світ</span>
        </button>
        <MapView onStartCombat={onStartCombat} />
      </div>
    );
  }

  if (view === 'realms') {
    return <WorldMapView onClose={() => setView('hub')} onStartCombat={onStartCombat} />;
  }

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] bg-stone-950 flex flex-col p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[url('/map.png')] bg-cover bg-center opacity-10 grayscale pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-stone-950/80 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center flex-1">
        <div className="mb-6 flex flex-col items-center">
            <h2 className="text-2xl font-black text-amber-500 uppercase tracking-[0.3em] text-shadow-glow">Карта Світу</h2>
            <div className="w-32 h-1 bg-gradient-to-r from-transparent via-amber-600 to-transparent mt-1"></div>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-2 italic">Оберіть пункт призначення</p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-2xl px-2">
            {menuItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={item.active ? { scale: 1.02 } : {}}
                whileTap={item.active ? { scale: 0.98 } : {}}
                onClick={() => {
                  if (item.active) {
                    if (item.id === 'city') setView('city');
                    if (item.id === 'campaign') setView('campaign');
                    if (item.id === 'realms') setView('realms');
                  }
                }}
                className={cn(
                  "wow-panel-metal p-1 relative overflow-hidden group transition-all text-left aspect-square flex flex-col",
                  item.active ? "border-amber-900/50 cursor-pointer" : "opacity-60 cursor-not-allowed grayscale"
                )}
              >
                <div className={cn("absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20", item.bg)}></div>
                
                <div className="relative z-10 flex flex-col items-center justify-center flex-1 p-2 text-center">
                    <div className={cn("p-2 rounded bg-stone-900 border shadow-inner mb-2", item.color)}>
                        {item.icon}
                    </div>
                    <h3 className={cn("font-black uppercase tracking-tighter text-[11px] mb-1 line-clamp-1", item.active ? "text-stone-100" : "text-stone-500")}>
                        {item.name}
                    </h3>
                    <span className={cn("text-[7px] font-black px-1 py-0.5 rounded border leading-none mb-1", item.color, "bg-stone-900/80")}>
                        {item.label}
                    </span>
                    <p className="text-[8px] text-stone-500 font-bold uppercase tracking-tight line-clamp-2">
                        {item.description}
                    </p>
                </div>
              </motion.button>
            ))}
        </div>

        {/* Footer Info */}
        <div className="mt-8 wow-panel-metal p-4 max-w-md w-full bg-stone-900/40 text-center border-stone-800/50">
            <div className="flex items-center justify-center gap-3 mb-2">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <span className="text-xs font-black text-stone-200 uppercase tracking-widest">Землі під захистом</span>
            </div>
            <p className="text-[10px] text-stone-500 leading-relaxed font-medium italic">
                Досліджуйте нові території, боріться з ворогами та захоплюйте володіння інших лордів для розширення своєї імперії.
            </p>
        </div>
      </div>
    </div>
  );
}
