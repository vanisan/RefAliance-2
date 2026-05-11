import { Building, BuildingId, BUILDINGS_INFO, Resources, UnitId, UNITS_INFO } from './game.types';
import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export const calculateArmyPower = (army: Record<string, number>): number => {
  return Object.entries(army).reduce((total, [id, count]) => {
    const info = UNITS_INFO[id as UnitId];
    if (!info) return total;
    // Power formula: (hp + attack + defense) * count
    return total + (info.hp + info.attack + info.defense) * count;
  }, 0);
};

export const getUpgradeCost = (buildingId: BuildingId, currentLevel: number): Resources => {
  const info = BUILDINGS_INFO[buildingId];
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

export const playSound = (path: string) => {
  if (typeof window === 'undefined') return;
  const audio = new Audio(path);
  audio.volume = 0.5;
  audio.play().catch(e => console.log("Audio play failed:", e));
};

export const hasEnoughResources = (cost: Partial<Resources>, wallet: Resources): boolean => {
  return (
    wallet.gold >= (cost.gold || 0) &&
    wallet.wood >= (cost.wood || 0) &&
    wallet.stone >= (cost.stone || 0) &&
    wallet.food >= (cost.food || 0) &&
    wallet.crystals >= (cost.crystals || 0)
  );
};

export const deductResources = (wallet: Resources, cost: Partial<Resources>): Resources => {
  return {
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
