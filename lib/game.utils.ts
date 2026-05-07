import { Building, BuildingId, BUILDINGS_INFO, Resources, UnitId } from './game.types';

export const getUpgradeCost = (buildingId: BuildingId, currentLevel: number): Resources => {
  const info = BUILDINGS_INFO[buildingId];
  const multiplier = Math.pow(info.costMultiplier, currentLevel); // lv 0 to 1 will use multiplier^0 = 1
  return {
    gold: Math.floor(info.baseCost.gold * multiplier),
    wood: Math.floor(info.baseCost.wood * multiplier),
    stone: Math.floor(info.baseCost.stone * multiplier),
    food: Math.floor(info.baseCost.food * multiplier),
  };
};

export const hasEnoughResources = (cost: Partial<Resources>, wallet: Resources): boolean => {
  return (
    wallet.gold >= (cost.gold || 0) &&
    wallet.wood >= (cost.wood || 0) &&
    wallet.stone >= (cost.stone || 0) &&
    wallet.food >= (cost.food || 0)
  );
};

export const deductResources = (wallet: Resources, cost: Partial<Resources>): Resources => {
  return {
    gold: wallet.gold - (cost.gold || 0),
    wood: wallet.wood - (cost.wood || 0),
    stone: wallet.stone - (cost.stone || 0),
    food: wallet.food - (cost.food || 0),
  };
};

export const addResources = (wallet: Resources, amount: Partial<Resources>): Resources => {
  return {
    gold: wallet.gold + (amount.gold || 0),
    wood: wallet.wood + (amount.wood || 0),
    stone: wallet.stone + (amount.stone || 0),
    food: wallet.food + (amount.food || 0),
  };
};
