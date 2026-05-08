import { Building, BuildingId, BUILDINGS_INFO, Resources, UnitId, UNITS_INFO } from './game.types';
import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNumber = (num: number): string => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  const floored = Math.floor(num);
  if (floored > 999) {
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
  if (buildingId === 'barracks') {
    let costAmount = 2000;
    if (currentLevel === 0) costAmount = 1000; // Unlocking level 1 could be left as baseCost, but user says 2k? "казарма теперь стоит 2к всех ресурсов. на 1 уровне она позволяет нанять... 2 ур казармы стоит 10к..."
    if (currentLevel === 0) costAmount = 2000;
    else if (currentLevel === 1) costAmount = 10000;
    else if (currentLevel === 2) costAmount = 20000;
    else if (currentLevel === 3) costAmount = 30000;
    else costAmount = 50000;

    return {
      gold: costAmount,
      wood: costAmount,
      stone: costAmount,
      food: costAmount,
      crystals: 0
    };
  }

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
