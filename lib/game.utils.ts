import { Building, BuildingId, BUILDINGS_INFO, Resources, UnitId, UNITS_INFO } from './game.types';
import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNumber = (num: number): string => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  if (num > 999) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
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
  const multiplier = Math.pow(info.costMultiplier, currentLevel); // lv 0 to 1 will use multiplier^0 = 1
  return {
    gold: Math.floor(info.baseCost.gold * multiplier),
    wood: Math.floor(info.baseCost.wood * multiplier),
    stone: Math.floor(info.baseCost.stone * multiplier),
    food: Math.floor(info.baseCost.food * multiplier),
    crystals: 0,
  };
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
    gold: wallet.gold + (amount.gold || 0),
    wood: wallet.wood + (amount.wood || 0),
    stone: wallet.stone + (amount.stone || 0),
    food: wallet.food + (amount.food || 0),
    crystals: wallet.crystals + (amount.crystals || 0),
  };
};
