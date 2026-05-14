"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Resources, Building, UnitId, MapNode, INITIAL_MAP_NODES, BUILDINGS_INFO, EquipmentSlot, EquipmentItem, Race } from './game.types';
import { addResources, calculateArmyPower, getEmptyArmy } from './game.utils';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

function handleSupabaseError(error: any) {
  if (error?.code === 'PGRST303' || error?.message?.includes('JWT expired')) {
      supabase.auth.refreshSession();
      return;
  }
  
  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch')) return; // Silently suppress the fetch error noise
    console.error('Supabase Error:', error.message);
  } else {
    const errorStr = JSON.stringify(error, null, 2);
    if (errorStr.includes('Failed to fetch')) return; // Silently suppress
    console.error('Supabase Error:', errorStr);
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
  ownedHeroIds: string[];
  activeHeroId: string | null;
  race: Race | null;
  user: User | null;
  authLoading: boolean;
  getLeaderboard: () => Promise<any[]>;
  resetProgress: () => Promise<void>;
  
  // Actions
  setResources: (res: Resources | ((prev: Resources) => Resources)) => void;
  setBuildings: (b: (Building | null)[] | ((prev: (Building | null)[]) => (Building | null)[]) | ((prev: (Building | null)[]) => (Building | null)[])) => void;
  setArmy: (army: Record<UnitId, number> | ((prev: Record<UnitId, number>) => Record<UnitId, number>)) => void;
  setRace: (race: Race | null) => void;
  setSiegeUnits: (units: (UnitId | null)[] | ((prev: (UnitId | null)[]) => (UnitId | null)[])) => void;
  setMapNodes: (nodes: MapNode[] | ((prev: MapNode[]) => MapNode[])) => void;
  setPalaceLevel: (lv: number | ((prev: number) => number)) => void;
  setEquipment: (eq: Record<EquipmentSlot, EquipmentItem | null> | ((prev: Record<EquipmentSlot, EquipmentItem | null>) => Record<EquipmentSlot, EquipmentItem | null>)) => void;
  setPlayerName: (name: string) => void;
  setCurrentCampaignLevel: (level: string) => void;
  setLastPrayerTime: (time: number | null) => void;
  setReferrals: (n: number | ((prev: number) => number)) => void;
  setOwnedHeroIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setActiveHeroId: (id: string | null) => void;
  attackSettlementResult: (targetId: string, won: boolean) => Promise<Resources | null>;
}

const CURRENT_GAME_VERSION = 4;
const defaultResources: Resources = { 
  gold: 100, wood: 100, stone: 100, food: 100, crystals: 0, 
  bossKeys: 2, lastBossKeyTime: Date.now(),
  settlementKeys: 1, lastSettlementKeyTime: Date.now(),
  hasCompletedTutorial: false
};
const defaultArmy = getEmptyArmy();
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
  const [ownedHeroIds, setOwnedHeroIds] = useState<string[]>([]);
  const [activeHeroId, setActiveHeroId] = useState<string | null>(null);
  const [race, setRace] = useState<Race | null>(null);
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
    setRace(null);
    setSiegeUnits(defaultSiegeUnits);
    setMapNodes(INITIAL_MAP_NODES);
    setEquipment({ weapon: null, chest: null, boots: null, ring: null });
    setOwnedHeroIds([]);
    setActiveHeroId(null);
    setCurrentCampaignLevel("1-1");
    setReferrals(0);
    
    try {
      const { error } = await supabase.from('users').upsert({
        id: user.id,
        playerName,
        resources: { ...defaultResources, race: null, referrals: 0, siegeUnits: defaultSiegeUnits, ownedHeroIds: [], activeHeroId: null, hasCompletedTutorial: false },
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
              console.log("Migration or Legacy user detected, resetting progress...");
              const newName = (data.playerName && data.playerName !== 'Hero' && data.playerName !== 'Герой') ? data.playerName : displayName;
              
              // Only keep special units if migrating from v3 to v4
              let newArmy = { ...defaultArmy };
              if (data.version === 3 && data.army) {
                // Keep: dragon, titan, archidruid, despot
                if (data.army.dragon) newArmy.dragon = data.army.dragon;
                if (data.army.titan) newArmy.titan = data.army.titan;
                if (data.army.archidruid) newArmy.archidruid = data.army.archidruid;
                if (data.army.despot) newArmy.despot = data.army.despot;
              }

              await supabase.from('users').upsert({
                id: u.id,
                playerName: newName,
                resources: { ...defaultResources, race: null, referrals: 0, siegeUnits: defaultSiegeUnits, ownedHeroIds: [], activeHeroId: null, hasCompletedTutorial: false },
                palaceLevel: 1,
                buildings: Array(DEFAULT_GRID_SIZE).fill(null),
                army: newArmy,
                armyPower: calculateArmyPower(newArmy),
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
              setArmy(newArmy);
              setRace(null);
              setSiegeUnits(defaultSiegeUnits);
              setMapNodes(INITIAL_MAP_NODES);
              setEquipment({ weapon: null, chest: null, boots: null, ring: null });
              setCurrentCampaignLevel("1-1");
              setPlayerName(newName);
              setReferrals(0);
              setOwnedHeroIds([]);
              setActiveHeroId(null);
            } else {
              setResources({ ...defaultResources, ...(data.resources || {}) });
              setPalaceLevel(data.palaceLevel || 1);
              setRace(data.resources?.race || data.race || null);
              
              let loadedBuildings = data.buildings || Array(DEFAULT_GRID_SIZE).fill(null);
              loadedBuildings = loadedBuildings.map((b: any) => b ? { ...b, level: b.level || 1 } : null);
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
              setOwnedHeroIds(data.resources?.ownedHeroIds || data.ownedHeroIds || []);
              setActiveHeroId(data.resources?.activeHeroId || data.activeHeroId || null);

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

                      // Racial Bonuses (+5 units/sec = +25 per 5s tick)
                      const userRace = data.resources?.race || data.race;
                      if (userRace === 'human') totalProd.gold = (totalProd.gold || 0) + 25;
                      if (userRace === 'orc') totalProd.food = (totalProd.food || 0) + 25;
                      if (userRace === 'elf') totalProd.wood = (totalProd.wood || 0) + 25;

                      const userBuildings = data.buildings || [];
                      userBuildings.forEach((b: Building | null) => {
                        if (b && BUILDINGS_INFO[b.id]?.production) {
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
              resources: { ...defaultResources, race: null, referrals: 0, siegeUnits: defaultSiegeUnits, ownedHeroIds: [], activeHeroId: null, hasCompletedTutorial: false },
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
          resources: { ...resources, race, referrals, siegeUnits, ownedHeroIds, activeHeroId },
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
        const baseTickProd = 0.5; // per tick (5s), which is 0.1/s
        
        // Racial Bonuses (+5 units/sec = +25 per 5s tick)
        // We use the current race state which is fresh because the effect restarts on race change
        const goldBonus = race === 'human' ? 25 : 0;
        const woodBonus = race === 'elf' ? 25 : 0;
        const foodBonus = race === 'orc' ? 25 : 0;

        let totalProd: Resources = {
          gold: baseTickProd + goldBonus,
          wood: baseTickProd + woodBonus,
          stone: baseTickProd,
          food: baseTickProd + foodBonus,
          crystals: 0,
          bossKeys: 0,
          lastBossKeyTime: 0
        };

        buildings.forEach(b => {
          if (b && BUILDINGS_INFO[b.id]?.production) {
            const prod = BUILDINGS_INFO[b.id].production;
            if (prod?.gold) totalProd.gold += prod.gold * b.level;
            if (prod?.wood) totalProd.wood += prod.wood * b.level;
            if (prod?.stone) totalProd.stone += prod.stone * b.level;
            if (prod?.food) totalProd.food += prod.food * b.level;
          }
        });
        
        const finalProd: Resources = {
          ...totalProd,
          gold: totalProd.gold * multiplier,
          wood: totalProd.wood * multiplier,
          stone: totalProd.stone * multiplier,
          food: totalProd.food * multiplier,
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
        if (nextState.settlementKeys !== undefined && nextState.settlementKeys < 1 && nextState.lastSettlementKeyTime) {
           const timePassed = now - nextState.lastSettlementKeyTime;
           const RECHARGE_TIME = 86400000; // 24 hours
           if (timePassed >= RECHARGE_TIME) {
             nextState = {
               ...nextState,
               settlementKeys: 1,
               lastSettlementKeyTime: now
             };
           }
        }
        return nextState;
      });
    }, 5000); // Resource tick attempt every 5 seconds
    
    return () => clearInterval(tick);
  }, [buildings, currentCampaignLevel, race]);

  const attackSettlementResult = async (targetId: string, won: boolean): Promise<Resources | null> => {
    if (!user || !supabase) return null;

    try {
      // 1. Get target resources
      const { data: target, error: targetError } = await supabase.from('users').select('*').eq('id', targetId).single();
      if (targetError || !target) throw targetError;

      const targetRes = target.resources as Resources;

      if (won) {
        // Attacker won: take 100% of gold, wood, stone, food. 0% crystals.
        const stolen: Partial<Resources> = {
          gold: targetRes.gold,
          wood: targetRes.wood,
          stone: targetRes.stone,
          food: targetRes.food,
          crystals: 0,
        };

        const newTargetRes = {
          ...targetRes,
          gold: 0,
          wood: 0,
          stone: 0,
          food: 0,
        };

        await supabase.from('users').update({ resources: newTargetRes }).eq('id', targetId);
        setResources(prev => addResources(prev, stolen));
        return stolen as Resources;
      } else {
        // Attacker lost: lose 50% of ALL resources to defender
        const lost: Partial<Resources> = {
          gold: Math.floor(resources.gold * 0.5),
          wood: Math.floor(resources.wood * 0.5),
          stone: Math.floor(resources.stone * 0.5),
          food: Math.floor(resources.food * 0.5),
          crystals: Math.floor((resources.crystals || 0) * 0.5),
        };

        // Deduct from attacker locally
        setResources(prev => ({
          ...prev,
          gold: prev.gold - (lost.gold || 0),
          wood: prev.wood - (lost.wood || 0),
          stone: prev.stone - (lost.stone || 0),
          food: prev.food - (lost.food || 0),
          crystals: (prev.crystals || 0) - (lost.crystals || 0),
        }));

        // Add to defender in DB
        const newTargetRes = {
          ...targetRes,
          gold: targetRes.gold + (lost.gold || 0),
          wood: targetRes.wood + (lost.wood || 0),
          stone: targetRes.stone + (lost.stone || 0),
          food: targetRes.food + (lost.food || 0),
          crystals: (targetRes.crystals || 0) + (lost.crystals || 0),
        };
        await supabase.from('users').update({ resources: newTargetRes }).eq('id', targetId);

        return lost as Resources;
      }
    } catch (e) {
      handleSupabaseError(e);
      return null;
    }
  };

  return (
    <GameContext.Provider value={{
      playerName, resources, setResources,
      palaceLevel, setPalaceLevel,
      race, setRace,
      buildings, setBuildings,
      army, setArmy,
      siegeUnits, setSiegeUnits,
      mapNodes, setMapNodes,
      mapRefreshTimer,
      equipment, setEquipment,
      currentCampaignLevel, setCurrentCampaignLevel,
      lastPrayerTime, setLastPrayerTime,
      referrals, setReferrals,
      ownedHeroIds, setOwnedHeroIds,
      activeHeroId, setActiveHeroId,
      attackSettlementResult,
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
