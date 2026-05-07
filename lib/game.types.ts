export type ResourceType = 'gold' | 'stone' | 'wood' | 'food';
export type Resources = Record<ResourceType, number>;

export type BuildingId = 'barracks' | 'farm' | 'mine' | 'mill' | 'quarry';

export interface Building {
  id: BuildingId;
  name: string;
  level: number;
}

export interface BuildingInfo {
  id: BuildingId;
  name: string;
  icon: string;
  baseCost: Resources;
  costMultiplier: number; // How much cost increases per level
  production?: Partial<Resources>; // Production per level per tick (e.g. 5 sec)
  description: string;
}

export const BUILDINGS_INFO: Record<BuildingId, BuildingInfo> = {
  barracks: { 
    id: 'barracks', name: 'Казарма', icon: 'Sword', 
    baseCost: { gold: 200, wood: 100, stone: 100, food: 0 }, costMultiplier: 1.5, 
    description: 'Позволяет нанимать войска' 
  },
  farm: { 
    id: 'farm', name: 'Ферма', icon: 'Wheat', 
    baseCost: { gold: 50, wood: 20, stone: 0, food: 0 }, costMultiplier: 1.3,
    production: { food: 5 }, description: 'Производит еду (+5/ур. в тик)' 
  },
  mine: { 
    id: 'mine', name: 'Шахта', icon: 'Coins', 
    baseCost: { gold: 0, wood: 50, stone: 50, food: 50 }, costMultiplier: 1.4,
    production: { gold: 5 }, description: 'Добывает золото (+5/ур. в тик)' 
  },
  mill: { 
    id: 'mill', name: 'Лесопилка', icon: 'Trees', 
    baseCost: { gold: 50, wood: 0, stone: 0, food: 20 }, costMultiplier: 1.3,
    production: { wood: 5 }, description: 'Добывает дерево (+5/ур. в тик)' 
  },
  quarry: { 
    id: 'quarry', name: 'Каменоломня', icon: 'Mountain', 
    baseCost: { gold: 50, wood: 20, stone: 0, food: 20 }, costMultiplier: 1.3,
    production: { stone: 5 }, description: 'Добывает камень (+5/ур. в тик)' 
  },
};

export type UnitId = 'knight' | 'archer' | 'berserk' | 'mage' | 'dragon' | 'titan' | 'goblin' | 'orc';

export interface UnitInfo {
  id: UnitId;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  minDamage: number;
  maxDamage: number;
  speed: number;
  range: number; // 1 for melee, >1 for ranged
  cost?: Resources; // For hiring
  isEnemy: boolean;
  image?: string;
}

export const UNITS_INFO: Record<UnitId, UnitInfo> = {
  knight: { id: 'knight', name: 'Рыцарь', hp: 35, attack: 10, defense: 10, minDamage: 5, maxDamage: 10, speed: 5, range: 1, cost: { gold: 100, food: 50, wood: 0, stone: 0 }, isEnemy: false, image: '/units/knight.png' },
  archer: { id: 'archer', name: 'Лучник', hp: 15, attack: 12, defense: 5, minDamage: 4, maxDamage: 8, speed: 4, range: 8, cost: { gold: 80, wood: 30, food: 20, stone: 0 }, isEnemy: false, image: '/units/archer.png' },
  berserk: { id: 'berserk', name: 'Берсерк', hp: 40, attack: 15, defense: 5, minDamage: 8, maxDamage: 15, speed: 6, range: 1, cost: { gold: 150, food: 80, wood: 0, stone: 0 }, isEnemy: false, image: '/units/berserk.png' },
  mage: { id: 'mage', name: 'Маг', hp: 20, attack: 18, defense: 6, minDamage: 10, maxDamage: 18, speed: 5, range: 10, cost: { gold: 200, wood: 50, stone: 10, food: 0 }, isEnemy: false, image: '/units/mage.png' },
  dragon: { id: 'dragon', name: 'Дракон', hp: 200, attack: 40, defense: 30, minDamage: 25, maxDamage: 50, speed: 10, range: 1, cost: { gold: 1000, wood: 200, stone: 200, food: 500 }, isEnemy: false, image: '/units/dragon.png' },
  titan: { id: 'titan', name: 'Титан', hp: 300, attack: 50, defense: 40, minDamage: 40, maxDamage: 60, speed: 8, range: 12, cost: { gold: 2000, stone: 1000, wood: 0, food: 500 }, isEnemy: false, image: '/units/titan.png' },
  
  goblin: { id: 'goblin', name: 'Гоблин', hp: 5, attack: 4, defense: 2, minDamage: 1, maxDamage: 2, speed: 5, range: 1, isEnemy: true },
  orc: { id: 'orc', name: 'Орк', hp: 15, attack: 7, defense: 4, minDamage: 2, maxDamage: 4, speed: 4, range: 1, isEnemy: true },
};

export interface MapNode {
  id: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  enemies: { unitId: UnitId, count: number }[];
  reward: Partial<Resources>;
  cleared: boolean;
  name: string;
}

export const INITIAL_MAP_NODES: MapNode[] = [
  { id: 'camp1', name: 'Лагерь Гоблинов', x: 20, y: 30, enemies: [{ unitId: 'goblin', count: 5 }], reward: { gold: 100, wood: 50 }, cleared: false },
  { id: 'camp2', name: 'Толпа Орков', x: 70, y: 40, enemies: [{ unitId: 'orc', count: 3 }], reward: { gold: 200, stone: 100 }, cleared: false },
  { id: 'camp3', name: 'Засада', x: 40, y: 70, enemies: [{ unitId: 'goblin', count: 10 }, { unitId: 'orc', count: 2 }], reward: { gold: 300, food: 200 }, cleared: false },
];
