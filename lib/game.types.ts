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
    id: 'mill', name: 'Лесопилка', icon: 'Trees', image: '/buildings/woodforge.png',
    baseCost: { gold: 50, wood: 0, stone: 0, food: 20, crystals: 0 }, costMultiplier: 1.3,
    production: { wood: 5 }, description: 'Добывает дерево (+5/ур. в тик)' 
  },
  quarry: { 
    id: 'quarry', name: 'Каменоломня', icon: 'Mountain', image: '/buildings/stoneforge.png',
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

export type UnitId = 'knight' | 'archer' | 'berserk' | 'mage' | 'dragon' | 'titan' | 'goblin' | 'orc' | 'skelet' | 'vampire' | 'demon' | 'giant' | 'assassin' | 'hydra' | 'souleater';

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
  size?: number; // 1 standard, 2 for 2x2
  cost?: Resources; // For hiring
  isEnemy: boolean;
  image?: string;
  description?: string;
  combatType?: 'melee' | 'ranged';
  special?: 'double_attack' | 'counter_attack_50';
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
  knight: { 
    id: 'knight', name: 'Рыцарь', hp: 35, attack: 10, defense: 10, minDamage: 5, maxDamage: 10, speed: 2, range: 1, 
    cost: { gold: 100, food: 50, wood: 0, stone: 0, crystals: 0 }, isEnemy: false, image: '/units/knight.png',
    combatType: 'melee', description: 'Благородный воин. Ближний бой. Атака: обычная.'
  },
  archer: { 
    id: 'archer', name: 'Лучник', hp: 15, attack: 12, defense: 5, minDamage: 4, maxDamage: 8, speed: 2, range: 5, 
    cost: { gold: 150, wood: 30, food: 20, stone: 0, crystals: 0 }, isEnemy: false, image: '/units/archer.png',
    combatType: 'ranged', description: 'Мастер лука. Дальний бой. Атака: обычная.'
  },
  berserk: { 
    id: 'berserk', name: 'Берсерк', hp: 40, attack: 15, defense: 5, minDamage: 8, maxDamage: 15, speed: 2, range: 1, 
    cost: { gold: 175, food: 80, wood: 0, stone: 0, crystals: 0 }, isEnemy: false, image: '/units/berserk.png',
    combatType: 'melee', description: 'Яростный боец. Ближний бой. Атака: обычная.'
  },
  mage: { 
    id: 'mage', name: 'Маг', hp: 20, attack: 18, defense: 6, minDamage: 10, maxDamage: 18, speed: 2, range: 5, 
    cost: { gold: 250, wood: 50, stone: 10, food: 0, crystals: 0 }, isEnemy: false, image: '/units/mage.png',
    combatType: 'ranged', description: 'Повелитель огня. Дальний бой. Атака: обычная.'
  },
  dragon: { 
    id: 'dragon', name: 'Дракон', hp: 200, attack: 40, defense: 30, minDamage: 25, maxDamage: 50, speed: 6, range: 1, 
    cost: { gold: 2000, wood: 200, stone: 200, food: 500, crystals: 0 }, isEnemy: false, image: '/units/dragon.png',
    combatType: 'melee', description: 'Легендарный зверь. Ближний бой. Атака: обычная.'
  },
  titan: { 
    id: 'titan', name: 'Титан', hp: 300, attack: 50, defense: 40, minDamage: 40, maxDamage: 60, speed: 2, range: 8, size: 2, 
    cost: { gold: 4000, stone: 1000, wood: 0, food: 500, crystals: 0 }, isEnemy: false, image: '/units/titan.png',
    combatType: 'ranged', description: 'Древний гигант. Дальний бой. Атака: обычная.'
  },
  
  skelet: { id: 'skelet', name: 'Скелет', hp: 10, attack: 5, defense: 5, minDamage: 2, maxDamage: 4, speed: 2, range: 1, isEnemy: true, image: '/mobs/skeleton.png', combatType: 'melee', description: 'Оживленный мертвец. Ближний бой.' },
  goblin: { id: 'goblin', name: 'Гоблин', hp: 15, attack: 10, defense: 5, minDamage: 3, maxDamage: 6, speed: 2, range: 1, isEnemy: true, image: '/mobs/goblin.png', combatType: 'melee', description: 'Мелкий проказник. Ближний бой.' },
  orc: { id: 'orc', name: 'Орк', hp: 70, attack: 25, defense: 25, minDamage: 10, maxDamage: 18, speed: 2, range: 1, isEnemy: true, image: '/mobs/orc.png', combatType: 'melee', description: 'Могучий варвар. Ближний бой.' },
  vampire: { id: 'vampire', name: 'Вампир', hp: 150, attack: 55, defense: 30, minDamage: 25, maxDamage: 45, speed: 4, range: 1, isEnemy: true, image: '/mobs/vampire.png', combatType: 'melee', description: 'Ночной охотник. Ближний бой.' },
  demon: { id: 'demon', name: 'Демон', hp: 250, attack: 180, defense: 35, minDamage: 80, maxDamage: 120, speed: 3, range: 1, isEnemy: true, image: '/mobs/demon.png', combatType: 'melee', description: 'Создание бездны. Ближний бой.' },
  giant: { id: 'giant', name: 'Великан', hp: 400, attack: 150, defense: 40, minDamage: 60, maxDamage: 100, speed: 2, range: 8, isEnemy: true, image: '/mobs/velikan.png', combatType: 'ranged', description: 'Горный исполин. Дальний бой.' },
  
  assassin: { 
    id: 'assassin', name: 'Убийца', hp: 120, attack: 30, defense: 15, minDamage: 15, maxDamage: 30, speed: 5, range: 1, 
    cost: { gold: 500, stone: 0, wood: 0, food: 100, crystals: 5 }, isEnemy: false, image: '/units/assasin.png',
    combatType: 'melee', special: 'double_attack', description: 'Скрытный убийца. Ближний бой. Атака: двойная.'
  },
  hydra: { 
    id: 'hydra', name: 'Гидра', hp: 700, attack: 200, defense: 45, minDamage: 100, maxDamage: 200, speed: 2, range: 1, size: 2,
    isEnemy: true, image: '/mobs/hydra.png', combatType: 'melee', special: 'counter_attack_50', 
    description: 'Мифическое чудовище. Ближний бой. Атака: 50% ответный удар.'
  },
  souleater: { 
    id: 'souleater', name: 'Душеед', hp: 200, attack: 100, defense: 30, minDamage: 50, maxDamage: 100, speed: 3, range: 1,
    isEnemy: true, image: '/mobs/souleater.png', combatType: 'melee', special: 'double_attack',
    description: 'Демоническая тварь. Ближний бой. Атака: двойная.'
  },
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
  campaignLevel: string; // e.g. "1-1"
}

export const INITIAL_MAP_NODES: MapNode[] = [
  { id: 'city', name: 'Город (Амстерград)', type: 'city', x: 50, y: 50, enemies: [], reward: {}, cleared: false, campaignLevel: 'all' },
  
  // Level 1-1
  { id: '1-1-1', name: 'Лесной патруль', type: 'combat', x: 25, y: 35, enemies: [{ unitId: 'goblin', count: 10 }, { unitId: 'orc', count: 10 }], reward: { gold: 100, crystals: 1 }, cleared: false, campaignLevel: '1-1' },
  { id: '1-1-2', name: 'Разведчики орков', type: 'combat', x: 75, y: 45, enemies: [{ unitId: 'goblin', count: 20 }, { unitId: 'orc', count: 25 }], reward: { gold: 200, crystals: 1 }, cleared: false, campaignLevel: '1-1' },

  // Level 1-2
  { id: '1-2-1', name: 'Кладбищенский дозор', type: 'combat', x: 30, y: 25, enemies: [{ unitId: 'skelet', count: 15 }, { unitId: 'goblin', count: 10 }], reward: { gold: 150, crystals: 1 }, cleared: false, campaignLevel: '1-2' },
  { id: '1-2-2', name: 'Орда скелетов', type: 'combat', x: 70, y: 70, enemies: [{ unitId: 'skelet', count: 25 }, { unitId: 'goblin', count: 20 }], reward: { gold: 300, crystals: 2 }, cleared: false, campaignLevel: '1-2' },

  // Level 1-3
  { id: '1-3-1', name: 'Скелеты-налетчики', type: 'combat', x: 20, y: 50, enemies: [{ unitId: 'skelet', count: 20 }, { unitId: 'orc', count: 10 }, { unitId: 'goblin', count: 10 }], reward: { gold: 400, crystals: 2 }, cleared: false, campaignLevel: '1-3' },
  { id: '1-3-2', name: 'Засада в руинах', type: 'combat', x: 50, y: 80, enemies: [{ unitId: 'skelet', count: 30 }, { unitId: 'orc', count: 15 }, { unitId: 'goblin', count: 20 }], reward: { gold: 600, crystals: 2 }, cleared: false, campaignLevel: '1-3' },
  { id: '1-3-3', name: 'Черная стража', type: 'combat', x: 80, y: 20, enemies: [{ unitId: 'orc', count: 30 }, { unitId: 'skelet', count: 40 }], reward: { gold: 800, crystals: 3 }, cleared: false, campaignLevel: '1-3' },

  // Level 1-4
  { id: '1-4-1', name: 'Ночные охотники', type: 'combat', x: 15, y: 30, enemies: [{ unitId: 'vampire', count: 5 }, { unitId: 'skelet', count: 30 }], reward: { gold: 1000, crystals: 3 }, cleared: false, campaignLevel: '1-4' },
  { id: '1-4-2', name: 'Гвардия вампиров', type: 'combat', x: 85, y: 60, enemies: [{ unitId: 'vampire', count: 10 }, { unitId: 'orc', count: 25 }], reward: { gold: 1500, crystals: 4 }, cleared: false, campaignLevel: '1-4' },
  { id: '1-4-3', name: 'Армия крови', type: 'combat', x: 40, y: 15, enemies: [{ unitId: 'vampire', count: 15 }, { unitId: 'orc', count: 40 }], reward: { gold: 2000, crystals: 5 }, cleared: false, campaignLevel: '1-4' },
  { id: '1-4-boss', name: 'Логово Палача', type: 'boss', x: 55, y: 45, enemies: [{ unitId: 'titan', count: 1 }, { unitId: 'vampire', count: 20 }], reward: { gold: 5000, crystals: 20 }, cleared: false, campaignLevel: '1-4' },

  // Level 1-5
  { id: '1-5-1', name: 'Демонические псы', type: 'combat', x: 25, y: 75, enemies: [{ unitId: 'demon', count: 3 }, { unitId: 'vampire', count: 10 }], reward: { gold: 3000, crystals: 10 }, cleared: false, campaignLevel: '1-5' },
  { id: '1-5-2', name: 'Легион ада', type: 'combat', x: 75, y: 25, enemies: [{ unitId: 'souleater', count: 5 }, { unitId: 'demon', count: 2 }], reward: { gold: 4000, crystals: 12 }, cleared: false, campaignLevel: '1-5' },
  { id: '1-5-3', name: 'Теневые жатвы', type: 'combat', x: 10, y: 10, enemies: [{ unitId: 'souleater', count: 8 }, { unitId: 'vampire', count: 15 }], reward: { gold: 5000, crystals: 15 }, cleared: false, campaignLevel: '1-5' },
  { id: '1-5-4', name: 'Пожиратели душ', type: 'combat', x: 90, y: 90, enemies: [{ unitId: 'souleater', count: 12 }, { unitId: 'skelet', count: 100 }], reward: { gold: 7000, crystals: 20 }, cleared: false, campaignLevel: '1-5' },

  // Level 1-6
  { id: '1-6-1', name: 'Озеро Гидр', type: 'combat', x: 35, y: 15, enemies: [{ unitId: 'hydra', count: 1 }, { unitId: 'vampire', count: 10 }], reward: { gold: 8000, crystals: 25 }, cleared: false, campaignLevel: '1-6' },
  { id: '1-6-2', name: 'Пещерные головы', type: 'combat', x: 65, y: 85, enemies: [{ unitId: 'hydra', count: 2 }, { unitId: 'demon', count: 5 }], reward: { gold: 10000, crystals: 30 }, cleared: false, campaignLevel: '1-6' },
  { id: '1-6-3', name: 'Разрушители гор', type: 'combat', x: 15, y: 65, enemies: [{ unitId: 'hydra', count: 3 }, { unitId: 'souleater', count: 10 }], reward: { gold: 12000, crystals: 35 }, cleared: false, campaignLevel: '1-6' },
  { id: '1-6-4', name: 'Осадный корпус', type: 'combat', x: 85, y: 35, enemies: [{ unitId: 'giant', count: 8 }, { unitId: 'hydra', count: 2 }], reward: { gold: 15000, crystals: 40 }, cleared: false, campaignLevel: '1-6' },
  { id: '1-6-5', name: 'Великаны-лорды', type: 'combat', x: 50, y: 20, enemies: [{ unitId: 'giant', count: 10 }, { unitId: 'hydra', count: 3 }], reward: { gold: 18000, crystals: 50 }, cleared: false, campaignLevel: '1-6' },

  // Level 1-7
  { id: '1-7-1', name: 'Железная поступь', type: 'combat', x: 20, y: 20, enemies: [{ unitId: 'giant', count: 12 }, { unitId: 'hydra', count: 5 }], reward: { gold: 20000, crystals: 60 }, cleared: false, campaignLevel: '1-7' },
  { id: '1-7-2', name: 'Темный альянс', type: 'combat', x: 80, y: 80, enemies: [{ unitId: 'hydra', count: 8 }, { unitId: 'souleater', count: 20 }], reward: { gold: 25000, crystals: 70 }, cleared: false, campaignLevel: '1-7' },
  { id: '1-7-3', name: 'Гнев бездны', type: 'combat', x: 20, y: 80, enemies: [{ unitId: 'hydra', count: 10 }, { unitId: 'demon', count: 20 }, { unitId: 'vampire', count: 60 }], reward: { gold: 30000, crystals: 80 }, cleared: false, campaignLevel: '1-7' },
  { id: '1-7-4', name: 'Пепельный легион', type: 'combat', x: 80, y: 20, enemies: [{ unitId: 'hydra', count: 12 }, { unitId: 'souleater', count: 30 }, { unitId: 'skelet', count: 200 }], reward: { gold: 35000, crystals: 90 }, cleared: false, campaignLevel: '1-7' },
  { id: '1-7-5', name: 'Последний рубеж', type: 'combat', x: 50, y: 10, enemies: [{ unitId: 'hydra', count: 15 }, { unitId: 'demon', count: 30 }, { unitId: 'orc', count: 100 }], reward: { gold: 40000, crystals: 100 }, cleared: false, campaignLevel: '1-7' },
  { id: '1-7-boss', name: 'Ужас Света', type: 'boss', x: 50, y: 55, enemies: [{ unitId: 'titan', count: 3 }, { unitId: 'hydra', count: 5 }, { unitId: 'souleater', count: 20 }], reward: { gold: 100000, crystals: 500 }, cleared: false, campaignLevel: '1-7' }
];
