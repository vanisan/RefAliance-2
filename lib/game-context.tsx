"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Resources, Building, UnitId, MapNode, INITIAL_MAP_NODES, BUILDINGS_INFO } from './game.types';
import { addResources } from './game.utils';

interface GameState {
  playerName: string;
  resources: Resources;
  palaceLevel: number;
  buildings: (Building | null)[];
  army: Record<UnitId, number>;
  mapNodes: MapNode[];
  
  // Actions
  setResources: (res: Resources) => void;
  setBuildings: (b: (Building | null)[]) => void;
  setArmy: (army: Record<UnitId, number>) => void;
  setMapNodes: (nodes: MapNode[]) => void;
  setPalaceLevel: (lv: number) => void;
}

const defaultResources: Resources = { gold: 1000, wood: 500, stone: 300, food: 800 };

const GameContext = createContext<GameState | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [resources, setResources] = useState<Resources>(defaultResources);
  const [palaceLevel, setPalaceLevel] = useState(1);
  const [buildings, setBuildings] = useState<(Building | null)[]>(Array(16).fill(null));
  const [army, setArmy] = useState<Record<UnitId, number>>({ knight: 5, archer: 0, berserk: 0, mage: 0, dragon: 0, titan: 0, goblin: 0, orc: 0 });
  const [mapNodes, setMapNodes] = useState<MapNode[]>(INITIAL_MAP_NODES);
  
  // Game Loop - Production
  useEffect(() => {
    const tick = setInterval(() => {
      setResources(prev => {
        let totalProd: Partial<Resources> = {};
        buildings.forEach(b => {
          if (b && BUILDINGS_INFO[b.id].production) {
            const prod = BUILDINGS_INFO[b.id].production;
            if (prod?.gold) totalProd.gold = (totalProd.gold || 0) + prod.gold * b.level;
            if (prod?.wood) totalProd.wood = (totalProd.wood || 0) + prod.wood * b.level;
            if (prod?.stone) totalProd.stone = (totalProd.stone || 0) + prod.stone * b.level;
            if (prod?.food) totalProd.food = (totalProd.food || 0) + prod.food * b.level;
          }
        });
        
        if (Object.keys(totalProd).length === 0) return prev;
        return addResources(prev, totalProd);
      });
    }, 5000); // Resource tick every 5 seconds
    
    return () => clearInterval(tick);
  }, [buildings]);

  return (
    <GameContext.Provider value={{
      playerName: "Hero",
      resources, setResources,
      palaceLevel, setPalaceLevel,
      buildings, setBuildings,
      army, setArmy,
      mapNodes, setMapNodes
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
};
