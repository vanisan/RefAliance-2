import { Building, BuildingId, BUILDINGS_INFO, Resources, UnitId, UNITS_INFO, Race } from './game.types';
import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getRaceIcon = (race: Race | null): string => {
  if (race === 'human') return '/heroico/humanrace.png';
  if (race === 'orc') return '/heroico/orcrace.png';
  if (race === 'elf') return '/heroico/elfrace.png';
  return '/heroico/humanrace.png'; // Fallback
};

export const formatNumber = (num: number): string => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  const floored = Math.floor(num);
  if (floored >= 1000000) {
    return (floored / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (floored >= 1000) {
    return (floored / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return floored.toString();
};

export const calculateArmyPower = (army: Record<string, number>, siegeUnits: (UnitId | null)[] = []): number => {
  let power = Object.entries(army).reduce((total, [id, count]) => {
    const info = UNITS_INFO[id as UnitId];
    if (!info) return total;
    return total + (info.hp + info.attack + info.defense) * (count || 0);
  }, 0);

  siegeUnits.forEach(id => {
    if (id) {
      const info = UNITS_INFO[id];
      if (info) power += (info.hp + info.attack + info.defense);
    }
  });

  return power;
};

export const getStealAmount = (targetResources: Resources): Partial<Resources> => {
  return {
    gold: Math.floor(targetResources.gold * 0.5),
    wood: Math.floor(targetResources.wood * 0.5),
    stone: Math.floor(targetResources.stone * 0.5),
    food: Math.floor(targetResources.food * 0.5),
    crystals: Math.floor((targetResources.crystals || 0) * 0.5),
  };
};

export const getEmptyArmy = (): Record<UnitId, number> => {
  return {
    h_peasant: 0, h_footman: 0, h_archer: 0, h_knight: 0, h_archmage: 0,
    o_peon: 0, o_grunt: 0, o_headhunter: 0, o_raider: 0, o_shaman: 0,
    e_wisp: 0, e_archer: 0, e_huntress: 0, e_druid: 0, e_dryad: 0,
    dragon: 0, titan: 0, archidruid: 0, despot: 0,
    knight: 0, archer: 0, berserk: 0, mage: 0, goblin: 0, orc: 0, skelet: 0, zombie: 0, sinner: 0, spider: 0, vampire: 0, demon: 0, giant: 0, morlord: 0, assassin: 0, hydra: 0, souleater: 0, driada: 0, paladin: 0, banshee: 0, arachnid: 0, frostdragon: 0, balista: 0, elven_balista: 0, archer_tower: 0, mage_tower: 0, veliar: 0, kronos: 0, archimond: 0, skorpidus: 0, scarbius: 0
  };
};

export const getUpgradeCost = (buildingId: BuildingId, currentLevel: number): Resources => {
  const info = BUILDINGS_INFO[buildingId];
  
  if (buildingId === 'barracks') {
    const barracksCosts = [
      { gold: 1200, stone: 500, wood: 500, food: 0, crystals: 0 },    // Level 1
      { gold: 3000, stone: 1000, wood: 1000, food: 0, crystals: 0 },   // Level 2
      { gold: 5000, stone: 2000, wood: 2000, food: 0, crystals: 0 },   // Level 3
      { gold: 10000, stone: 5000, wood: 5000, food: 0, crystals: 0 },  // Level 4
      { gold: 20000, stone: 12500, wood: 12500, food: 0, crystals: 0 } // Level 5
    ];
    if (currentLevel < barracksCosts.length) {
      return barracksCosts[currentLevel];
    } else {
      const last = barracksCosts[barracksCosts.length - 1];
      const mult = Math.pow(2, currentLevel - barracksCosts.length + 1);
      return {
        gold: Math.floor(last.gold * mult),
        wood: Math.floor(last.wood * mult),
        stone: Math.floor(last.stone * mult),
        food: 0,
        crystals: 0
      };
    }
  }

  // x2 cost per level: formula = baseCost * 2^(currentLevel)
  const multiplier = Math.pow(2, currentLevel);
  return {
    gold: Math.floor(info.baseCost.gold * multiplier),
    wood: Math.floor(info.baseCost.wood * multiplier),
    stone: Math.floor(info.baseCost.stone * multiplier),
    food: Math.floor(info.baseCost.food * multiplier),
    crystals: Math.floor((info.baseCost.crystals || 0) * multiplier),
  };
};

export const getCumulativeBuildingCost = (buildingId: BuildingId, level: number): Resources => {
  const total: Resources = { gold: 0, wood: 0, stone: 0, food: 0, crystals: 0 };
  for (let i = 0; i < level; i++) {
    const cost = getUpgradeCost(buildingId, i);
    total.gold += cost.gold;
    total.wood += cost.wood;
    total.stone += cost.stone;
    total.food += cost.food;
    total.crystals += cost.crystals || 0;
  }
  return total;
};

export const playSound = (path: string) => {
  if (typeof window === 'undefined') return;
  const audio = new Audio(path);
  audio.volume = 0.5;
  audio.play().catch(e => console.log("Audio play failed:", e));
};

export const hasEnoughResources = (cost: Partial<Resources>, wallet: Partial<Resources>): boolean => {
  return (
    (wallet.gold || 0) >= (cost.gold || 0) &&
    (wallet.wood || 0) >= (cost.wood || 0) &&
    (wallet.stone || 0) >= (cost.stone || 0) &&
    (wallet.food || 0) >= (cost.food || 0) &&
    (wallet.crystals || 0) >= (cost.crystals || 0)
  );
};

export const deductResources = (wallet: Resources, cost: Partial<Resources>): Resources => {
  return {
    ...wallet,
    gold: wallet.gold - (cost.gold || 0),
    wood: wallet.wood - (cost.wood || 0),
    stone: wallet.stone - (cost.stone || 0),
    food: wallet.food - (cost.food || 0),
    crystals: wallet.crystals - (cost.crystals || 0),
  };
};

export const addResources = (wallet: Resources, amount: Partial<Resources>): Resources => {
  return {
    ...wallet,
    gold: wallet.gold + (amount.gold || 0),
    wood: wallet.wood + (amount.wood || 0),
    stone: wallet.stone + (amount.stone || 0),
    food: wallet.food + (amount.food || 0),
    crystals: wallet.crystals + (amount.crystals || 0),
  };
};

export const getPalaceUpgradeCost = (currentLevel: number): Resources => {
  // Cost to upgrade FROM currentLevel TO currentLevel + 1
  if (currentLevel === 1) {
    return { gold: 50000, wood: 50000, stone: 50000, food: 50000, crystals: 0 };
  }
  if (currentLevel === 2) {
    return { gold: 10000000, wood: 10000000, stone: 10000000, food: 10000000, crystals: 0 };
  }
  if (currentLevel === 3) {
    return { gold: 100000000, wood: 100000000, stone: 100000000, food: 100000000, crystals: 0 };
  }
  if (currentLevel === 4) {
    return { gold: 1000000000, wood: 1000000000, stone: 1000000000, food: 1000000000, crystals: 0 };
  }
  if (currentLevel === 5) {
    return { gold: 5000000000, wood: 5000000000, stone: 5000000000, food: 5000000000, crystals: 0 };
  }
  
  // Exponential scaling after level 5
  const base = 5000000000;
  const multiplier = Math.pow(2, currentLevel - 5);
  return {
    gold: base * multiplier,
    wood: base * multiplier,
    stone: base * multiplier,
    food: base * multiplier,
    crystals: 0
  };
};
