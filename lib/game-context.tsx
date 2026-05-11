"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Resources, Building, UnitId, MapNode, INITIAL_MAP_NODES, BUILDINGS_INFO, EquipmentSlot, EquipmentItem } from './game.types';
import { addResources, calculateArmyPower } from './game.utils';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

function handleSupabaseError(error: any) {
  if (error instanceof Error) {
    console.error('Supabase Error:', error.message);
  } else {
    console.error('Supabase Error:', JSON.stringify(error, null, 2));
  }
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
  siegeUnits: (UnitId | null)[];
  lastPrayerTime: number | null;
  referrals: number;
  user: User | null;
  authLoading: boolean;
  getLeaderboard: () => Promise<any[]>;
  resetProgress: () => Promise<void>;
  
  // Actions
  setResources: (res: Resources | ((prev: Resources) => Resources)) => void;
  setBuildings: (b: (Building | null)[] | ((prev: (Building | null)[]) => (Building | null)[]) | ((prev: (Building | null)[]) => (Building | null)[])) => void;
  setArmy: (army: Record<UnitId, number> | ((prev: Record<UnitId, number>) => Record<UnitId, number>)) => void;
  setSiegeUnits: (units: (UnitId | null)[] | ((prev: (UnitId | null)[]) => (UnitId | null)[])) => void;
  setMapNodes: (nodes: MapNode[] | ((prev: MapNode[]) => MapNode[])) => void;
  setPalaceLevel: (lv: number | ((prev: number) => number)) => void;
  setEquipment: (eq: Record<EquipmentSlot, EquipmentItem | null> | ((prev: Record<EquipmentSlot, EquipmentItem | null>) => Record<EquipmentSlot, EquipmentItem | null>)) => void;
  setPlayerName: (name: string) => void;
  setCurrentCampaignLevel: (level: string) => void;
  setLastPrayerTime: (time: number | null) => void;
  setReferrals: (n: number | ((prev: number) => number)) => void;
}

const CURRENT_GAME_VERSION = 3;
const defaultResources: Resources = { gold: 100, wood: 100, stone: 100, food: 100, crystals: 0, bossKeys: 2, lastBossKeyTime: Date.now() };
const defaultArmy: Record<UnitId, number> = { 
  knight: 1, archer: 0, berserk: 0, mage: 0, dragon: 0, titan: 0, 
  goblin: 0, orc: 0, skelet: 0, vampire: 0, demon: 0, giant: 0,
  assassin: 0, hydra: 0, souleater: 0, driada: 0, paladin: 0,
  banshee: 0, arachnid: 0, frostdragon: 0, archidruid: 0,
  balista: 0, elven_balista: 0, archer_tower: 0, mage_tower: 0,
  veliar: 0, kronos: 0, archimond: 0, despot: 0
};
const defaultSiegeUnits: (UnitId | null)[] = [null, null, null, null];
const DEFAULT_GRID_SIZE = 16;

const GameContext = createContext<GameState | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {

  const [resources, setResources] = useState<Resources>(defaultResources);
  const [palaceLevel, setPalaceLevel] = useState(1);
  const [buildings, setBuildings] = useState<(Building | null)[]>(Array(DEFAULT_GRID_SIZE).fill(null));
  const [army, setArmy] = useState<Record<UnitId, number>>(defaultArmy);
  const [siegeUnits, setSiegeUnits] = useState<(UnitId | null)[]>(defaultSiegeUnits);
  const [lastPrayerTime, setLastPrayerTime] = useState<number | null>(null);
  const [referrals, setReferrals] = useState(0);
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
    if (!user || !supabase) return [];
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
    if (!user || !supabase) return;
    setResources(defaultResources);
    setPalaceLevel(1);
    setBuildings(Array(DEFAULT_GRID_SIZE).fill(null));
    setArmy(defaultArmy);
    setSiegeUnits(defaultSiegeUnits);
    setMapNodes(INITIAL_MAP_NODES);
    setEquipment({ weapon: null, chest: null, boots: null, ring: null });
    setCurrentCampaignLevel("1-1");
    setReferrals(0);
    
    try {
      const { error } = await supabase.from('users').upsert({
        id: user.id,
        playerName,
        resources: { ...defaultResources, referrals: 0, siegeUnits: defaultSiegeUnits },
        palaceLevel: 1,
        buildings: Array(DEFAULT_GRID_SIZE).fill(null),
        army: defaultArmy,
        armyPower: calculateArmyPower(defaultArmy),
        mapNodes: INITIAL_MAP_NODES,
        equipment: { weapon: null, chest: null, boots: null, ring: null },
        currentCampaignLevel: "1-1",
        lastUpdate: new Date().toISOString()
      });
      if (error) throw error;
      localStorage.setItem(`siegeUnits_${user.id}`, JSON.stringify(defaultSiegeUnits));
    } catch (e) {
      handleSupabaseError(e);
    }
  };

  const initialLoadDone = useRef(false);

  // Auth & Sync
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUserResult(session?.user || null);
    }).catch(err => {
      handleSupabaseError(err);
      setAuthLoading(false);
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
                resources: { ...defaultResources, referrals: 0, siegeUnits: defaultSiegeUnits },
                palaceLevel: 1,
                buildings: Array(DEFAULT_GRID_SIZE).fill(null),
                army: defaultArmy,
                armyPower: calculateArmyPower(defaultArmy),
                mapNodes: INITIAL_MAP_NODES,
                equipment: { weapon: null, chest: null, boots: null, ring: null },
                currentCampaignLevel: "1-1",
                version: CURRENT_GAME_VERSION,
                lastUpdate: new Date().toISOString()
              });
              
              localStorage.setItem(`siegeUnits_${u.id}`, JSON.stringify(defaultSiegeUnits));
              setResources(defaultResources);
              setPalaceLevel(1);
              setBuildings(Array(DEFAULT_GRID_SIZE).fill(null));
              setArmy(defaultArmy);
              setSiegeUnits(defaultSiegeUnits);
              setMapNodes(INITIAL_MAP_NODES);
              setEquipment({ weapon: null, chest: null, boots: null, ring: null });
              setCurrentCampaignLevel("1-1");
              setPlayerName(newName);
              setReferrals(0);
            } else {
              setResources({ ...defaultResources, ...(data.resources || {}) });
              setPalaceLevel(data.palaceLevel || 1);
              
              let loadedBuildings = data.buildings || Array(DEFAULT_GRID_SIZE).fill(null);
              // Migrate buildings if old size or larger
              if (loadedBuildings.length !== DEFAULT_GRID_SIZE) {
                if (loadedBuildings.length < DEFAULT_GRID_SIZE) {
                  const diff = DEFAULT_GRID_SIZE - loadedBuildings.length;
                  loadedBuildings = [...loadedBuildings, ...Array(diff).fill(null)];
                } else {
                  loadedBuildings = loadedBuildings.slice(0, DEFAULT_GRID_SIZE);
                }
              }
              setBuildings(loadedBuildings);
              setArmy({ ...defaultArmy, ...(data.army || {}) });
              setReferrals(data.resources?.referrals || data.referrals || 0);
              
              const dbSiege = data.resources?.siegeUnits || data.siegeUnits;
              const localSiegeStr = localStorage.getItem(`siegeUnits_${u.id}`);
              const localSiege = localSiegeStr ? JSON.parse(localSiegeStr) : null;
              setSiegeUnits(dbSiege || localSiege || defaultSiegeUnits);
              
              setCurrentCampaignLevel(data.currentCampaignLevel || "1-1");
              
              // Map migration/refresh
              const savedNodes = data.mapNodes || [];
              let mergedNodes = [...INITIAL_MAP_NODES];
              
              if (savedNodes.length > 0) {
                mergedNodes = mergedNodes.map((n) => {
                  const savedNode = savedNodes.find((s: MapNode) => s.id === n.id);
                  if (savedNode) {
                    return { ...n, cleared: savedNode.cleared };
                  }
                  return n;
                });
              }
              setMapNodes(mergedNodes);

              setEquipment(data.equipment || { weapon: null, chest: null, boots: null, ring: null });
              setPlayerName(data.playerName || displayName);

              // Offline resource generation
              if (data.lastUpdate) {
                const lastUpdate = new Date(data.lastUpdate).getTime();
                const now = Date.now();
                const diffMs = now - lastUpdate;
                
                if (diffMs > 60000) { // More than 1 minute offline
                  const ticksMissed = Math.floor(diffMs / 5000); // 1 tick = 5s
                  // Cap offline progress to 24 hours (17280 ticks) to prevent infinity/bugs
                  const actualTicks = Math.min(ticksMissed, 17280);
                  
                  if (actualTicks > 0) {
                    setResources(prev => {
                      const baseProd = 0.5;
                      let totalProd: Partial<Resources> = {
                        gold: baseProd, wood: baseProd, stone: baseProd, food: baseProd
                      };
                      const userBuildings = data.buildings || [];
                      userBuildings.forEach((b: Building | null) => {
                        if (b && BUILDINGS_INFO[b.id].production) {
                          const prod = BUILDINGS_INFO[b.id].production;
                          if (prod?.gold) totalProd.gold = (totalProd.gold || 0) + prod.gold * b.level;
                          if (prod?.wood) totalProd.wood = (totalProd.wood || 0) + prod.wood * b.level;
                          if (prod?.stone) totalProd.stone = (totalProd.stone || 0) + prod.stone * b.level;
                          if (prod?.food) totalProd.food = (totalProd.food || 0) + prod.food * b.level;
                        }
                      });
                      
                      const offlineGains: Partial<Resources> = {
                        gold: (totalProd.gold || 0) * actualTicks,
                        wood: (totalProd.wood || 0) * actualTicks,
                        stone: (totalProd.stone || 0) * actualTicks,
                        food: (totalProd.food || 0) * actualTicks,
                        crystals: 0
                      };
                      
                      console.log(`Earned offline resources for ${actualTicks} ticks`);
                      return addResources(prev, offlineGains);
                    });
                  }
                }
              }
            }
          } else {
            // New user, save default state
            const initialName = u.user_metadata?.name || u.email?.split('@')[0] || "";
            await supabase.from('users').upsert({
              id: u.id,
              playerName: initialName,
              resources: { ...defaultResources, referrals: 0, siegeUnits: defaultSiegeUnits },
              palaceLevel: 1,
              buildings: Array(DEFAULT_GRID_SIZE).fill(null),
              army: defaultArmy,
              armyPower: calculateArmyPower(defaultArmy),
              mapNodes: INITIAL_MAP_NODES,
              equipment: { weapon: null, chest: null, boots: null, ring: null },
              currentCampaignLevel: "1-1",
              version: CURRENT_GAME_VERSION,
              createdAt: new Date().toISOString()
            });
            localStorage.setItem(`siegeUnits_${u.id}`, JSON.stringify(defaultSiegeUnits));
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
    if (!user || !initialLoadDone.current || !supabase) return;

    const timer = setTimeout(async () => {
      if (!supabase) return;
      try {
        const armyPower = calculateArmyPower(army);
        const { error } = await supabase.from('users').update({
          playerName,
          resources: { ...resources, referrals, siegeUnits },
          palaceLevel,
          buildings,
          army,
          armyPower,
          mapNodes,
          equipment,
          currentCampaignLevel,
          lastUpdate: new Date().toISOString()
        }).eq('id', user.id);

        localStorage.setItem(`siegeUnits_${user.id}`, JSON.stringify(siegeUnits));
        if (error) throw error;
      } catch (e) {
        handleSupabaseError(e);
      }
    }, 2000); // Debounce save 2s

    return () => clearTimeout(timer);
  }, [user, playerName, resources, palaceLevel, buildings, army, mapNodes, equipment, currentCampaignLevel, referrals]);
  
  // Game Loop - Production
  const lastTickRef = useRef<number>(Date.now());
  useEffect(() => {
    lastTickRef.current = Date.now();
    const tick = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - lastTickRef.current;
      lastTickRef.current = now;
      
      const multiplier = elapsedMs / 5000;
      
      setMapRefreshTimer(prev => {
        if (prev <= 5 * multiplier) {
          return 600;
        }
        return prev - 5 * multiplier;
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
        
        const finalProd: Partial<Resources> = {
          gold: (totalProd.gold || 0) * multiplier,
          wood: (totalProd.wood || 0) * multiplier,
          stone: (totalProd.stone || 0) * multiplier,
          food: (totalProd.food || 0) * multiplier,
        };
        
        let nextState = addResources(prev, finalProd);

        if (nextState.bossKeys !== undefined && nextState.bossKeys < 2 && nextState.lastBossKeyTime) {
           const timePassed = now - nextState.lastBossKeyTime;
           const RECHARGE_TIME = 86400000; // 24 hours
           if (timePassed >= RECHARGE_TIME) {
             const keysToAdd = Math.floor(timePassed / RECHARGE_TIME);
             const newKeys = Math.min(2, (nextState.bossKeys || 0) + keysToAdd);
             nextState = {
               ...nextState,
               bossKeys: newKeys,
               lastBossKeyTime: newKeys >= 2 ? now : (nextState.lastBossKeyTime + keysToAdd * RECHARGE_TIME)
             };
           }
        }
        return nextState;
      });
    }, 5000); // Resource tick attempt every 5 seconds
    
    return () => clearInterval(tick);
  }, [buildings, currentCampaignLevel]);

  return (
    <GameContext.Provider value={{
      playerName, resources, setResources,
      palaceLevel, setPalaceLevel,
      buildings, setBuildings,
      army, setArmy,
      siegeUnits, setSiegeUnits,
      mapNodes, setMapNodes,
      mapRefreshTimer,
      equipment, setEquipment,
      currentCampaignLevel, setCurrentCampaignLevel,
      lastPrayerTime, setLastPrayerTime,
      referrals, setReferrals,
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
