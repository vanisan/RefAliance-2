"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Resources, Building, UnitId, MapNode, INITIAL_MAP_NODES, BUILDINGS_INFO, EquipmentSlot, EquipmentItem } from './game.types';
import { addResources, calculateArmyPower } from './game.utils';
import { supabase, initSupabase } from './supabase';
import { User } from '@supabase/supabase-js';

function handleSupabaseError(error: any) {
  console.error('Supabase Error: ', JSON.stringify(error, null, 2));
}

// ... GameState interfaces ...
interface GameState {
  playerName: string;
  resources: Resources;
  palaceLevel: number;
  buildings: (Building | null)[];
  army: Record<UnitId, number>;
  mapNodes: MapNode[];
  mapRefreshTimer: number;
  equipment: Record<EquipmentSlot, EquipmentItem | null>;
  currentCampaignLevel: string;
  user: User | null;
  authLoading: boolean;
  getLeaderboard: () => Promise<any[]>;
  resetProgress: () => Promise<void>;
  
  // Actions
  setResources: (res: Resources | ((prev: Resources) => Resources)) => void;
  setBuildings: (b: (Building | null)[]) => void;
  setArmy: (army: Record<UnitId, number>) => void;
  setMapNodes: (nodes: MapNode[]) => void;
  setPalaceLevel: (lv: number) => void;
  setEquipment: (eq: Record<EquipmentSlot, EquipmentItem | null> | ((prev: Record<EquipmentSlot, EquipmentItem | null>) => Record<EquipmentSlot, EquipmentItem | null>)) => void;
  setPlayerName: (name: string) => void;
  setCurrentCampaignLevel: (level: string) => void;
}

const CURRENT_GAME_VERSION = 2;
const defaultResources: Resources = { gold: 100, wood: 100, stone: 100, food: 100, crystals: 0 };
const defaultArmy: Record<UnitId, number> = { 
  knight: 1, archer: 0, berserk: 0, mage: 0, dragon: 0, titan: 0, 
  goblin: 0, orc: 0, skelet: 0, vampire: 0, demon: 0, giant: 0,
  assassin: 0, hydra: 0, souleater: 0 
};

const GameContext = createContext<GameState | null>(null);

export const GameProvider = ({ children, supabaseUrl, supabaseKey }: { children: ReactNode, supabaseUrl: string, supabaseKey: string }) => {
  // Initialize Supabase immediately
  initSupabase(supabaseUrl, supabaseKey);

  const [resources, setResources] = useState<Resources>(defaultResources);
  const [palaceLevel, setPalaceLevel] = useState(1);
  const [buildings, setBuildings] = useState<(Building | null)[]>(Array(16).fill(null));
  const [army, setArmy] = useState<Record<UnitId, number>>(defaultArmy);
  const [mapNodes, setMapNodes] = useState<MapNode[]>(INITIAL_MAP_NODES);
  const [equipment, setEquipment] = useState<Record<EquipmentSlot, EquipmentItem | null>>({
    weapon: null, chest: null, boots: null, ring: null
  });
  const [playerName, setPlayerName] = useState("");
  const [mapRefreshTimer, setMapRefreshTimer] = useState(600);
  const [currentCampaignLevel, setCurrentCampaignLevel] = useState("1-1");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const getLeaderboard = async () => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('armyPower', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map(d => ({ ...d, uid: d.id }));
    } catch (e) {
      handleSupabaseError(e);
      return [];
    }
  };

  const resetProgress = async () => {
    if (!user) return;
    setResources(defaultResources);
    setPalaceLevel(1);
    setBuildings(Array(16).fill(null));
    setArmy(defaultArmy);
    setMapNodes(INITIAL_MAP_NODES);
    setEquipment({ weapon: null, chest: null, boots: null, ring: null });
    setCurrentCampaignLevel("1-1");
    
    try {
      const { error } = await supabase.from('users').upsert({
        id: user.id,
        playerName,
        resources: defaultResources,
        palaceLevel: 1,
        buildings: Array(16).fill(null),
        army: defaultArmy,
        armyPower: calculateArmyPower(defaultArmy),
        mapNodes: INITIAL_MAP_NODES,
        equipment: { weapon: null, chest: null, boots: null, ring: null },
        currentCampaignLevel: "1-1",
        lastUpdate: new Date().toISOString()
      });
      if (error) throw error;
    } catch (e) {
      handleSupabaseError(e);
    }
  };

  const initialLoadDone = useRef(false);

  // Auth & Sync
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUserResult(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserResult(session?.user || null);
    });
    
    return () => subscription.unsubscribe();

    async function handleUserResult(u: User | null) {
      setUser(u);
      
      if (u) {
        try {
          const { data, error } = await supabase.from('users').select('*').eq('id', u.id).single();
          
          if (data && !error) {
            const displayName = u.user_metadata?.name || u.email?.split('@')[0] || "";
            // FORCED RESET for legacy users (version mismatch or old names)
            if (data.version !== CURRENT_GAME_VERSION || data.playerName === 'Hero' || data.playerName === 'Герой') {
              console.log("Legacy user detected, resetting progress...");
              const newName = (data.playerName && data.playerName !== 'Hero' && data.playerName !== 'Герой') ? data.playerName : displayName;
              await supabase.from('users').upsert({
                id: u.id,
                playerName: newName,
                resources: defaultResources,
                palaceLevel: 1,
                buildings: Array(16).fill(null),
                army: defaultArmy,
                armyPower: calculateArmyPower(defaultArmy),
                mapNodes: INITIAL_MAP_NODES,
                equipment: { weapon: null, chest: null, boots: null, ring: null },
                currentCampaignLevel: "1-1",
                version: CURRENT_GAME_VERSION,
                lastUpdate: new Date().toISOString()
              });
              
              setResources(defaultResources);
              setPalaceLevel(1);
              setBuildings(Array(16).fill(null));
              setArmy(defaultArmy);
              setMapNodes(INITIAL_MAP_NODES);
              setEquipment({ weapon: null, chest: null, boots: null, ring: null });
              setCurrentCampaignLevel("1-1");
              setPlayerName(newName);
            } else {
              setResources({ ...defaultResources, ...(data.resources || {}) });
              setPalaceLevel(data.palaceLevel || 1);
              setBuildings(data.buildings || Array(16).fill(null));
              setArmy({ ...defaultArmy, ...(data.army || {}) });
              setCurrentCampaignLevel(data.currentCampaignLevel || "1-1");
              
              // Map migration/refresh
              const savedNodes = data.mapNodes || [];
              if (savedNodes.length < INITIAL_MAP_NODES.length) {
                setMapNodes(INITIAL_MAP_NODES);
              } else {
                setMapNodes(savedNodes);
              }

              setEquipment(data.equipment || { weapon: null, chest: null, boots: null, ring: null });
              setPlayerName(data.playerName || displayName);
            }
          } else {
            // New user, save default state
            const initialName = u.user_metadata?.name || u.email?.split('@')[0] || "";
            await supabase.from('users').upsert({
              id: u.id,
              playerName: initialName,
              resources: defaultResources,
              palaceLevel: 1,
              buildings: Array(16).fill(null),
              army: defaultArmy,
              armyPower: calculateArmyPower(defaultArmy),
              mapNodes: INITIAL_MAP_NODES,
              equipment: { weapon: null, chest: null, boots: null, ring: null },
              currentCampaignLevel: "1-1",
              version: CURRENT_GAME_VERSION,
              createdAt: new Date().toISOString()
            });
            setPlayerName(initialName);
          }
          initialLoadDone.current = true;
        } catch (e) {
          handleSupabaseError(e);
        }
      }
      setAuthLoading(false);
    }
  }, []);

  // Sync to Cloud
  useEffect(() => {
    if (!user || !initialLoadDone.current) return;

    const timer = setTimeout(async () => {
      try {
        const armyPower = calculateArmyPower(army);
        const { error } = await supabase.from('users').update({
          playerName,
          resources,
          palaceLevel,
          buildings,
          army,
          armyPower,
          mapNodes,
          equipment,
          currentCampaignLevel,
          lastUpdate: new Date().toISOString()
        }).eq('id', user.id);
        if (error) throw error;
      } catch (e) {
        handleSupabaseError(e);
      }
    }, 2000); // Debounce save 2s

    return () => clearTimeout(timer);
  }, [user, playerName, resources, palaceLevel, buildings, army, mapNodes, equipment, currentCampaignLevel]);
  
  // Game Loop - Production
  useEffect(() => {
    const tick = setInterval(() => {
      setMapRefreshTimer(prev => {
        if (prev <= 5) {
          // In campaign mode, we might not want to refresh cleared status of nodes 
          // unless it's designed for farming. For now, let's keep it but only for the current level nodes.
          setMapNodes(nodes => nodes.map(n => n.type === 'combat' && n.campaignLevel === currentCampaignLevel ? { ...n, cleared: false } : n));
          return 600;
        }
        return prev - 5;
      });
      setResources(prev => {
        const baseProd = 0.5; // 1 unit per 10s, tick is 5s
        let totalProd: Partial<Resources> = {
          gold: baseProd, wood: baseProd, stone: baseProd, food: baseProd
        };
        buildings.forEach(b => {
          if (b && BUILDINGS_INFO[b.id].production) {
            const prod = BUILDINGS_INFO[b.id].production;
            if (prod?.gold) totalProd.gold = (totalProd.gold || 0) + prod.gold * b.level;
            if (prod?.wood) totalProd.wood = (totalProd.wood || 0) + prod.wood * b.level;
            if (prod?.stone) totalProd.stone = (totalProd.stone || 0) + prod.stone * b.level;
            if (prod?.food) totalProd.food = (totalProd.food || 0) + prod.food * b.level;
          }
        });
        
        return addResources(prev, totalProd);
      });
    }, 5000); // Resource tick every 5 seconds
    
    return () => clearInterval(tick);
  }, [buildings, currentCampaignLevel]);

  return (
    <GameContext.Provider value={{
      playerName, resources, setResources,
      palaceLevel, setPalaceLevel,
      buildings, setBuildings,
      army, setArmy,
      mapNodes, setMapNodes,
      mapRefreshTimer,
      equipment, setEquipment,
      currentCampaignLevel, setCurrentCampaignLevel,
      user, authLoading,
      getLeaderboard,
      resetProgress,
      setPlayerName
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
