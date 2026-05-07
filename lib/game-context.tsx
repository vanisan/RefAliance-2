"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Resources, Building, UnitId, MapNode, INITIAL_MAP_NODES, BUILDINGS_INFO, EquipmentSlot, EquipmentItem } from './game.types';
import { addResources } from './game.utils';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

interface GameState {
  playerName: string;
  resources: Resources;
  palaceLevel: number;
  buildings: (Building | null)[];
  army: Record<UnitId, number>;
  mapNodes: MapNode[];
  mapRefreshTimer: number;
  equipment: Record<EquipmentSlot, EquipmentItem | null>;
  user: User | null;
  authLoading: boolean;
  
  // Actions
  setResources: (res: Resources | ((prev: Resources) => Resources)) => void;
  setBuildings: (b: (Building | null)[]) => void;
  setArmy: (army: Record<UnitId, number>) => void;
  setMapNodes: (nodes: MapNode[]) => void;
  setPalaceLevel: (lv: number) => void;
  setEquipment: (eq: Record<EquipmentSlot, EquipmentItem | null> | ((prev: Record<EquipmentSlot, EquipmentItem | null>) => Record<EquipmentSlot, EquipmentItem | null>)) => void;
  setPlayerName: (name: string) => void;
}

const defaultResources: Resources = { gold: 1000, wood: 500, stone: 300, food: 800, crystals: 0 };
const defaultArmy: Record<UnitId, number> = { 
  knight: 5, archer: 0, berserk: 0, mage: 0, dragon: 0, titan: 0, 
  goblin: 0, orc: 0, skelet: 0, vampire: 0, demon: 0, giant: 0 
};

const GameContext = createContext<GameState | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [resources, setResources] = useState<Resources>(defaultResources);
  const [palaceLevel, setPalaceLevel] = useState(1);
  const [buildings, setBuildings] = useState<(Building | null)[]>(Array(16).fill(null));
  const [army, setArmy] = useState<Record<UnitId, number>>(defaultArmy);
  const [mapNodes, setMapNodes] = useState<MapNode[]>(INITIAL_MAP_NODES);
  const [equipment, setEquipment] = useState<Record<EquipmentSlot, EquipmentItem | null>>({
    weapon: null, chest: null, boots: null, ring: null
  });
  const [playerName, setPlayerName] = useState("Hero");
  const [mapRefreshTimer, setMapRefreshTimer] = useState(600);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const initialLoadDone = useRef(false);

  // Auth & Sync
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      
      if (u) {
        const userDoc = doc(db, 'users', u.uid);
        try {
          const snap = await getDoc(userDoc);
          if (snap.exists()) {
            const data = snap.data();
            setResources({ ...defaultResources, ...(data.resources || {}) });
            setPalaceLevel(data.palaceLevel || 1);
            setBuildings(data.buildings || Array(16).fill(null));
            setArmy({ ...defaultArmy, ...(data.army || {}) });
            
            // Map migration/refresh: if saved nodes list is shorter than initial, or specific ids missing, update it
            const savedNodes = data.mapNodes || [];
            if (savedNodes.length < INITIAL_MAP_NODES.length) {
              setMapNodes(INITIAL_MAP_NODES);
            } else {
              setMapNodes(savedNodes);
            }

            setEquipment(data.equipment || { weapon: null, chest: null, boots: null, ring: null });
            setPlayerName(data.playerName || u.displayName || "Hero");
          } else {
            // New user, save default state
            await setDoc(userDoc, {
              playerName: u.displayName || "Hero",
              resources: defaultResources,
              palaceLevel: 1,
              buildings: Array(16).fill(null),
              army: defaultArmy,
              mapNodes: INITIAL_MAP_NODES,
              equipment: { weapon: null, chest: null, boots: null, ring: null },
              lastUpdate: new Date().toISOString()
            });
          }
          initialLoadDone.current = true;
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${u.uid}`);
        }
      }
    });
  }, []);

  // Sync to Cloud
  useEffect(() => {
    if (!user || !initialLoadDone.current) return;

    const timer = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          playerName,
          resources,
          palaceLevel,
          buildings,
          army,
          mapNodes,
          equipment,
          lastUpdate: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
      }
    }, 2000); // Debounce save 2s

    return () => clearTimeout(timer);
  }, [user, playerName, resources, palaceLevel, buildings, army, mapNodes, equipment]);
  
  // Game Loop - Production
  useEffect(() => {
    const tick = setInterval(() => {
      setMapRefreshTimer(prev => {
        if (prev <= 5) {
          setMapNodes(nodes => nodes.map(n => n.type === 'combat' ? { ...n, cleared: false } : n));
          return 600;
        }
        return prev - 5;
      });
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
      playerName, resources, setResources,
      palaceLevel, setPalaceLevel,
      buildings, setBuildings,
      army, setArmy,
      mapNodes, setMapNodes,
      mapRefreshTimer,
      equipment, setEquipment,
      user, authLoading,
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
