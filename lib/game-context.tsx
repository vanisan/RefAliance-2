'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './firebase';

// Current game version for data migrations
const CURRENT_GAME_VERSION = 2;

interface GameContextType {
  user: User | null;
  authLoading: boolean;
  playerName: string;
  resources: { gold: number; wood: number; ore: number; gems: number; crystals: number };
  palaceLevel: number;
  buildings: any[];
  army: any;
  armyPower: number;
  mapNodes: any[];
  currentCampaignLevel: string;
  equipment: any;
  armyCapacity: number;
  updateResources: (changes: Partial<GameContextType['resources']>) => void;
  updateBuildings: (newBuildings: any[]) => void;
  updatePalace: (level: number) => void;
  updateArmy: (newArmy: any) => void;
  updateCampaignLevel: (level: string) => void;
  updateEquipment: (newEquip: any) => void;
  saveGame: () => Promise<void>;
  resetProgress: () => Promise<void>;
}

const defaultResources = { gold: 1000, wood: 500, ore: 500, gems: 50, crystals: 0 };
const defaultArmy = { slots: Array(7).fill(null), reserves: [] };

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const [resources, setResources] = useState(defaultResources);
  const [palaceLevel, setPalaceLevel] = useState(1);
  const [buildings, setBuildings] = useState<any[]>(Array(16).fill(null));
  const [army, setArmy] = useState(defaultArmy);
  const [armyPower, setArmyPower] = useState(0);
  const [mapNodes, setMapNodes] = useState([]);
  const [currentCampaignLevel, setCurrentCampaignLevel] = useState("1-1");
  const [equipment, setEquipment] = useState({ weapon: null, chest: null, boots: null, ring: null });
  
  const initialLoadDone = useRef(false);

  // Derive Army Capacity from Farms
  const armyCapacity = 50 + buildings.reduce((acc, b) => {
    if (b && b.type === 'farm') return acc + (b.level * 10);
    return acc;
  }, 0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = doc(db, 'users', u.uid);
        const snap = await getDoc(userDoc);
        
        if (snap.exists()) {
          const data = snap.data();
          setPlayerName(data.playerName || u.displayName || "Warrior");
          setResources(data.resources || defaultResources);
          setPalaceLevel(data.palaceLevel || 1);
          setBuildings(data.buildings || Array(16).fill(null));
          setArmy(data.army || defaultArmy);
          setArmyPower(data.armyPower || 0);
          setMapNodes(data.mapNodes || []);
          setEquipment(data.equipment || { weapon: null, chest: null, boots: null, ring: null });
          setCurrentCampaignLevel(data.currentCampaignLevel || "1-1");
          
          if (data.version !== CURRENT_GAME_VERSION) {
            await updateDoc(userDoc, { version: CURRENT_GAME_VERSION });
          }
        } else {
          // New user
          const initName = u.displayName || "Warrior";
          const startState = {
            playerName: initName,
            resources: defaultResources,
            palaceLevel: 1,
            buildings: Array(16).fill(null),
            army: defaultArmy,
            armyPower: 0,
            mapNodes: [],
            equipment: { weapon: null, chest: null, boots: null, ring: null },
            currentCampaignLevel: "1-1",
            version: CURRENT_GAME_VERSION,
            createdAt: new Date().toISOString()
          };
          await setDoc(userDoc, startState);
          setPlayerName(initName);
        }
      }
      setAuthLoading(false);
      initialLoadDone.current = true;
    });
    return unsub;
  }, []);

  const saveGame = async () => {
    if (!user || !initialLoadDone.current) return;
    try {
      const userDoc = doc(db, 'users', user.uid);
      await updateDoc(userDoc, {
        playerName,
        resources,
        palaceLevel,
        buildings,
        army,
        armyPower,
        equipment,
        currentCampaignLevel,
        version: CURRENT_GAME_VERSION,
        lastUpdate: new Date().toISOString()
      });
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const resetProgress = async () => {
    if (!user) return;
    const userDoc = doc(db, 'users', user.uid);
    const startState = {
      playerName: playerName || user.displayName || "Warrior",
      resources: defaultResources,
      palaceLevel: 1,
      buildings: Array(16).fill(null),
      army: defaultArmy,
      armyPower: 0,
      mapNodes: [],
      equipment: { weapon: null, chest: null, boots: null, ring: null },
      currentCampaignLevel: "1-1",
      version: CURRENT_GAME_VERSION,
      updatedAt: new Date().toISOString()
    };
    await setDoc(userDoc, startState);
    setResources(defaultResources);
    setPalaceLevel(1);
    setBuildings(Array(16).fill(null));
    setArmy(defaultArmy);
    setArmyPower(0);
    setCurrentCampaignLevel("1-1");
  };

  const updateResources = (changes: Partial<GameContextType['resources']>) => {
    setResources(prev => ({ ...prev, ...changes }));
  };

  const updateBuildings = (newBuildings: any[]) => {
    setBuildings(newBuildings);
  };

  const updatePalace = (level: number) => {
    setPalaceLevel(level);
  };

  const updateArmy = (newArmy: any) => {
    setArmy(newArmy);
  };

  const updateCampaignLevel = (level: string) => {
    setCurrentCampaignLevel(level);
  };

  const updateEquipment = (newEquip: any) => {
    setEquipment(newEquip);
  };

  // Passive production (not including crystals)
  useEffect(() => {
    if (!initialLoadDone.current) return;

    const interval = setInterval(() => {
      const production: Partial<GameContextType['resources']> = { gold: 0, wood: 0, ore: 0, gems: 0 };
      buildings.forEach(b => {
        if (!b) return;
        if (b.type === 'mine_gold') production.gold! += b.level * 5;
        if (b.type === 'woodcutter') production.wood! += b.level * 3;
        if (b.type === 'mine_ore') production.ore! += b.level * 2;
        if (b.type === 'mine_gems') production.gems! += b.level * 0.5;
      });
      
      updateResources(production);
    }, 5000); // Production every 5 seconds for simulation

    return () => clearInterval(interval);
  }, [buildings]);

  // Auto-save on major state changes but throttled
  useEffect(() => {
    if (initialLoadDone.current) {
      const timer = setTimeout(() => saveGame(), 2000);
      return () => clearTimeout(timer);
    }
  }, [resources, palaceLevel, buildings, army, currentCampaignLevel, equipment]);

  return (
    <GameContext.Provider value={{
      user, authLoading, playerName, resources, palaceLevel, buildings, army, armyPower, mapNodes,
      currentCampaignLevel, equipment, armyCapacity, updateResources, updateBuildings, updatePalace, updateArmy,
      updateCampaignLevel, updateEquipment, saveGame, resetProgress
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
