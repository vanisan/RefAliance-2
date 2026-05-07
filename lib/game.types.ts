export type ResourceType = 'gold' | 'stone' | 'wood' | 'food' | 'crystals';
export type Resources = Record<ResourceType, number>;

export type BuildingId = 'barracks' | 'farm' | 'mine' | 'mill' | 'quarry' | 'altar' | 'magistrat';

export interface Building {
  id: BuildingId;
  name: string;
  level: number;
}

export interface BuildingInfo {
  id: BuildingId;
  name: string;
  icon: string;
  image?: string;
  baseCost: Resources;
  costMultiplier: number; // How much cost increases per level
  production?: Partial<Resources>; // Production per level per tick (e.g. 5 sec)
  description: string;
}

export const BUILDINGS_INFO: Record<BuildingId, BuildingInfo> = {
  barracks: { 
    id: 'barracks', name: 'Казарма', icon: 'Sword', image: '/buildings/barracks.webp',
    baseCost: { gold: 200, wood: 100, stone: 100, food: 0, crystals: 0 }, costMultiplier: 1.5, 
    description: 'Позволяет нанимать войска' 
  },
  farm: { 
    id: 'farm', name: 'Ферма', icon: 'Wheat', image: '/buildings/granary.webp',
    baseCost: { gold: 50, wood: 20, stone: 0, food: 0, crystals: 0 }, costMultiplier: 1.3,
    production: { food: 5 }, description: 'Производит еду (+5/ур. в тик)' 
  },
  mine: { 
    id: 'mine', name: 'Шахта', icon: 'Coins', image: '/buildings/mine.webp',
    baseCost: { gold: 0, wood: 50, stone: 50, food: 50, crystals: 0 }, costMultiplier: 1.4,
    production: { gold: 5, stone: 5 }, description: 'Добывает золото и камень (+5/ур. в тик)' 
  },
  mill: { 
    id: 'mill', name: 'Лесопилка', icon: 'Trees', 
    baseCost: { gold: 50, wood: 0, stone: 0, food: 20, crystals: 0 }, costMultiplier: 1.3,
    production: { wood: 5 }, description: 'Добывает дерево (+5/ур. в тик)' 
  },
  quarry: { 
    id: 'quarry', name: 'Каменоломня', icon: 'Mountain', 
    baseCost: { gold: 50, wood: 20, stone: 0, food: 20, crystals: 0 }, costMultiplier: 1.3,
    production: { stone: 5 }, description: 'Добывает камень (+5/ур. в тик)' 
  },
  altar: { 
    id: 'altar', name: 'Алтарь', icon: 'Sword', image: '/buildings/Altar.webp',
    baseCost: { gold: 500, wood: 200, stone: 200, food: 0, crystals: 0 }, costMultiplier: 1.5, 
    description: 'Дает бонусы для армии' 
  },
  magistrat: { 
    id: 'magistrat', name: 'Магистрат', icon: 'Book', image: '/buildings/magistrat.webp',
    baseCost: { gold: 400, wood: 300, stone: 300, food: 0, crystals: 0 }, costMultiplier: 1.5, 
    description: 'Исследования для армии' 
  },
};

export type UnitId = 'knight' | 'archer' | 'berserk' | 'mage' | 'dragon' | 'titan' | 'goblin' | 'orc' | 'skelet' | 'vampire' | 'demon' | 'giant';

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

export type EquipmentSlot = 'chest' | 'weapon' | 'boots' | 'ring';

export interface EquipmentItem {
  id: string;
  type: EquipmentSlot;
  tier: number;
  name: string;
  image: string;
  cost: number;
  stats: {
    attackBonus: number; // %
    defenseBonus: number; // %
    hpBonus: number; // %
  };
}

const TIER_NAMES = ['Ополченца', 'Новичка', 'Солдата', 'Ветерана', 'Мастера', 'Героя', 'Легенды'];
const SLOT_NAMES: Record<EquipmentSlot, string> = {
  chest: 'Нагрудник',
  weapon: 'Оружие',
  boots: 'Сапоги',
  ring: 'Кольцо'
};

export const SHOP_ITEMS: EquipmentItem[] = [];
const TIER_COSTS = [50, 150, 400, 1000, 2000, 3500, 5000];
(['chest', 'weapon', 'boots', 'ring'] as EquipmentSlot[]).forEach(slot => {
  for (let i = 1; i <= 7; i++) {
     SHOP_ITEMS.push({
       id: `${slot}-${i}`,
       type: slot,
       tier: i,
       name: `${SLOT_NAMES[slot]} ${TIER_NAMES[i-1]}`,
       image: `/sets/${slot}-${i}.png`,
       cost: TIER_COSTS[i - 1], // Crystal cost
       stats: {
         attackBonus: ['weapon', 'ring'].includes(slot) ? i * 5 : 0,
         defenseBonus: ['chest', 'boots'].includes(slot) ? i * 3 : 0,
         hpBonus: ['chest', 'ring', 'boots'].includes(slot) ? i * 2 : 0,
       }
     });
  }
});

export const UNITS_INFO: Record<UnitId, UnitInfo> = {
  knight: { id: 'knight', name: 'Рыцарь', hp: 35, attack: 10, defense: 10, minDamage: 5, maxDamage: 10, speed: 5, range: 1, cost: { gold: 100, food: 50, wood: 0, stone: 0, crystals: 0 }, isEnemy: false, image: '/units/knight.png' },
  archer: { id: 'archer', name: 'Лучник', hp: 15, attack: 12, defense: 5, minDamage: 4, maxDamage: 8, speed: 4, range: 8, cost: { gold: 80, wood: 30, food: 20, stone: 0, crystals: 0 }, isEnemy: false, image: '/units/archer.png' },
  berserk: { id: 'berserk', name: 'Берсерк', hp: 40, attack: 15, defense: 5, minDamage: 8, maxDamage: 15, speed: 6, range: 1, cost: { gold: 150, food: 80, wood: 0, stone: 0, crystals: 0 }, isEnemy: false, image: '/units/berserk.png' },
  mage: { id: 'mage', name: 'Маг', hp: 20, attack: 18, defense: 6, minDamage: 10, maxDamage: 18, speed: 5, range: 10, cost: { gold: 200, wood: 50, stone: 10, food: 0, crystals: 0 }, isEnemy: false, image: '/units/mage.png' },
  dragon: { id: 'dragon', name: 'Дракон', hp: 200, attack: 40, defense: 30, minDamage: 25, maxDamage: 50, speed: 10, range: 1, cost: { gold: 1000, wood: 200, stone: 200, food: 500, crystals: 0 }, isEnemy: false, image: '/units/dragon.png' },
  titan: { id: 'titan', name: 'Титан', hp: 300, attack: 50, defense: 40, minDamage: 40, maxDamage: 60, speed: 8, range: 12, cost: { gold: 2000, stone: 1000, wood: 0, food: 500, crystals: 0 }, isEnemy: false, image: '/units/titan.png' },
  
  skelet: { id: 'skelet', name: 'Скелет', hp: 10, attack: 5, defense: 5, minDamage: 2, maxDamage: 4, speed: 4, range: 1, isEnemy: true, image: '/mobs/skeleton.png' },
  goblin: { id: 'goblin', name: 'Гоблин', hp: 15, attack: 10, defense: 5, minDamage: 3, maxDamage: 6, speed: 6, range: 1, isEnemy: true, image: '/mobs/goblin.png' },
  orc: { id: 'orc', name: 'Орк', hp: 50, attack: 25, defense: 25, minDamage: 10, maxDamage: 15, speed: 4, range: 1, isEnemy: true, image: '/mobs/orc.png' },
  vampire: { id: 'vampire', name: 'Вампир', hp: 100, attack: 55, defense: 30, minDamage: 20, maxDamage: 30, speed: 7, range: 1, isEnemy: true, image: '/mobs/vampire.png' },
  demon: { id: 'demon', name: 'Демон', hp: 200, attack: 120, defense: 100, minDamage: 50, maxDamage: 80, speed: 8, range: 1, isEnemy: true, image: '/mobs/demon.png' },
  giant: { id: 'giant', name: 'Великан', hp: 300, attack: 80, defense: 220, minDamage: 40, maxDamage: 60, speed: 3, range: 1, isEnemy: true, image: '/mobs/velikan.png' },
};

export interface MapNode {
  id: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  enemies: { unitId: UnitId, count: number }[];
  reward: Partial<Resources>;
  cleared: boolean;
  name: string;
  type?: 'combat' | 'city' | 'boss';
}

export const INITIAL_MAP_NODES: MapNode[] = [
  { id: 'city', name: 'Город (Амстерград)', type: 'city', x: 50, y: 50, enemies: [], reward: {}, cleared: false },
  { id: 'camp1', name: 'Кладбище', type: 'combat', x: 25, y: 35, enemies: [{ unitId: 'skelet', count: 12 }], reward: { gold: 150, crystals: 1 }, cleared: false },
  { id: 'camp2', name: 'Лагерь Гоблинов', type: 'combat', x: 75, y: 45, enemies: [{ unitId: 'goblin', count: 20 }], reward: { gold: 500, wood: 200, crystals: 1 }, cleared: false },
  { id: 'camp3', name: 'Долина Орков', type: 'combat', x: 45, y: 75, enemies: [{ unitId: 'orc', count: 12 }], reward: { gold: 1500, food: 800, crystals: 3 }, cleared: false },
  { id: 'camp4', name: 'Замок Вампира', type: 'combat', x: 20, y: 80, enemies: [{ unitId: 'vampire', count: 8 }], reward: { gold: 4000, wood: 2000, stone: 1000, crystals: 8 }, cleared: false },
  { id: 'camp5', name: 'Врата Демона', type: 'combat', x: 80, y: 85, enemies: [{ unitId: 'demon', count: 5 }], reward: { gold: 8000, stone: 4000, wood: 4000, crystals: 15 }, cleared: false },
  { id: 'camp6', name: 'Лежбище Великана', type: 'combat', x: 20, y: 20, enemies: [{ unitId: 'giant', count: 4 }], reward: { gold: 12000, stone: 7000, food: 7000, crystals: 20 }, cleared: false },
  { id: 'boss1', name: 'Убежище Титана', type: 'boss', x: 80, y: 25, enemies: [{ unitId: 'titan', count: 2 }], reward: { gold: 25000, stone: 20000, crystals: 100 }, cleared: false },
  { id: 'camp7', name: 'Легион Тьмы', type: 'combat', x: 10, y: 55, enemies: [{ unitId: 'demon', count: 8 }, { unitId: 'vampire', count: 15 }], reward: { gold: 20000, crystals: 30 }, cleared: false },
  { id: 'camp8', name: 'Аванпост Великанов', type: 'combat', x: 90, y: 15, enemies: [{ unitId: 'giant', count: 6 }], reward: { gold: 30000, crystals: 50 }, cleared: false }
];
