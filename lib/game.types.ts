export type ResourceType = 'gold' | 'stone' | 'wood' | 'food' | 'crystals';
export interface Resources extends Record<ResourceType, number> {
  bossKeys?: number;
  lastBossKeyTime?: number;
  referrals?: number;
  siegeUnits?: (UnitId | null)[];
  ownedHeroIds?: string[];
  activeHeroId?: string | null;
}

export type BuildingId = 'barracks' | 'farm' | 'mine' | 'mill' | 'quarry' | 'altar' | 'magistrat' | 'forge' | 'tavern';

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
    baseCost: { gold: 2500, wood: 2500, stone: 2500, food: 2500, crystals: 0 }, costMultiplier: 2, 
    description: 'Дозволяє наймати війська' 
  },
  farm: { 
    id: 'farm', name: 'Ферма', icon: 'Wheat', image: '/buildings/granary.webp',
    baseCost: { gold: 50, wood: 50, stone: 0, food: 0, crystals: 0 }, costMultiplier: 2,
    production: { food: 5 }, description: 'Виробляє їжу (+5/р. за тик)' 
  },
  mine: { 
    id: 'mine', name: 'Шахта', icon: 'Coins', image: '/buildings/mine.webp',
    baseCost: { gold: 0, wood: 80, stone: 80, food: 80, crystals: 0 }, costMultiplier: 2,
    production: { gold: 5, stone: 5 }, description: 'Видобуває золото та камінь (+5/р. за тик)' 
  },
  mill: { 
    id: 'mill', name: 'Лісопилка', icon: 'Trees', image: '/buildings/woodforge.png',
    baseCost: { gold: 75, wood: 0, stone: 0, food: 50, crystals: 0 }, costMultiplier: 2,
    production: { wood: 5 }, description: 'Видобуває дерево (+5/р. за тик)' 
  },
  quarry: { 
    id: 'quarry', name: 'Каменоломня', icon: 'Mountain', image: '/buildings/stoneforge.png',
    baseCost: { gold: 50, wood: 25, stone: 0, food: 25, crystals: 0 }, costMultiplier: 2,
    production: { stone: 5 }, description: 'Видобуває камінь (+5/р. за тик)' 
  },
  altar: { 
    id: 'altar', name: 'Вівтар', icon: 'Sword', image: '/buildings/Altar.webp',
    baseCost: { gold: 100000, wood: 100000, stone: 100000, food: 100000, crystals: 200 }, costMultiplier: 0, 
    description: 'Раз на добу можна принести молитву та отримати 50 алмазів' 
  },
  magistrat: { 
    id: 'magistrat', name: 'Магістрат', icon: 'Book', image: '/buildings/magistrat.webp',
    baseCost: { gold: 400, wood: 300, stone: 300, food: 0, crystals: 0 }, costMultiplier: 2, 
    description: 'Дослідження для армії' 
  },
  forge: { 
    id: 'forge', name: 'Кузня', icon: 'Hammer', image: '/buildings/mine.webp', // Using mine placeholder if forge image missing
    baseCost: { gold: 1000, wood: 1000, stone: 1000, food: 0, crystals: 0 }, costMultiplier: 2, 
    description: 'Дозволяє купувати облогові знаряддя для захисту' 
  },
  tavern: { 
    id: 'tavern', name: 'Таверна', icon: 'Beer', image: '/buildings/barracks.webp',
    baseCost: { gold: 50000, wood: 50000, stone: 50000, food: 50000, crystals: 100 }, costMultiplier: 0, 
    description: 'Дозволяє наймати героїв' 
  },
};

export type HeroId = 'jaina' | 'arthas' | 'malfurion' | 'thrall';

export interface HeroInfo {
  id: HeroId;
  name: string;
  title: string;
  image: string;
  cost: number;
  damage: number;
  description: string;
}

export const HEROES_INFO: Record<HeroId, HeroInfo> = {
  jaina: { id: 'jaina', name: 'Джайна', title: 'Маг', image: '/heroes/jaina.png', cost: 10000, damage: 500, description: 'Легендарна чарівниця. Наносить 500 шкоди обраному загону.' },
  arthas: { id: 'arthas', name: 'Артас', title: 'Паладин', image: '/heroes/arthas.png', cost: 10000, damage: 500, description: 'Запалий принц. Наносить 500 шкоди обраному загону.' },
  malfurion: { id: 'malfurion', name: 'Малфуріон', title: 'Друїд', image: '/heroes/malfurion.png', cost: 10000, damage: 500, description: 'Верховний друїд. Наносить 500 шкоди обраному загону.' },
  thrall: { id: 'thrall', name: 'Тралл', title: 'Орк', image: '/heroes/thrall.png', cost: 10000, damage: 500, description: 'Вождь Орди. Наносить 500 шкоди обраному загону.' },
};

export type UnitId = 'knight' | 'archer' | 'berserk' | 'mage' | 'dragon' | 'titan' | 'goblin' | 'orc' | 'skelet' | 'vampire' | 'demon' | 'giant' | 'assassin' | 'hydra' | 'souleater' | 'driada' | 'paladin' | 'banshee' | 'arachnid' | 'frostdragon' | 'archidruid' | 'balista' | 'elven_balista' | 'archer_tower' | 'mage_tower' | 'veliar' | 'kronos' | 'archimond' | 'despot' | 'skorpidus' | 'scarbius';

export interface ArenaPlayer {
  id: string;
  name: string;
  army: Record<UnitId, number>;
  hpMod: number;
  atkMod: number;
  defMod: number;
  resources?: Resources;
  siegeUnits?: (UnitId | null)[]; // 4 slots
}

export interface ArenaMatchState {
  id: string;
  players: [ArenaPlayer, ArenaPlayer];
  turn: 0 | 1; // Index of the player whose turn it is
  activeUnitId: string | null;
  timer: number;
  status: 'waiting' | 'playing' | 'finished';
  winner: string | null;
}

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
  special?: 'double_attack' | 'counter_attack_50' | 'aura_def_20' | 'heal_resurrect' | 'splash_50' | 'double_action' | 'double_turn' | 'crit_25_x2' | 'splash_linear_40' | 'frenzy';
}

export interface MapNode {
  id: string;
  name: string;
  type: 'city' | 'combat' | 'boss' | 'daily_boss';
  x: number;
  y: number;
  enemies: { unitId: UnitId; count: number }[];
  reward: Partial<Resources>;
  cleared: boolean;
  campaignLevel: string;
  itemReward?: string;
  selectedArmy?: Record<UnitId, number>;
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

const TIER_NAMES = ['Ополченця', 'Новачка', 'Солдата', 'Ветерана', 'Майстра', 'Героя', 'Легенди'];
const SLOT_NAMES: Record<EquipmentSlot, string> = {
  chest: 'Нагрудник',
  weapon: 'Зброя',
  boots: 'Черевики',
  ring: 'Перстень'
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
    id: 'knight', name: 'Лицар', hp: 35, attack: 10, defense: 10, minDamage: 5, maxDamage: 10, speed: 2, range: 1, 
    cost: { gold: 150, food: 80, wood: 0, stone: 0, crystals: 0 }, isEnemy: false, image: '/units/knight.png',
    combatType: 'melee', description: 'Шляхетний воїн. Ближній бій. Атака: звичайна.'
  },
  archer: { 
    id: 'archer', name: 'Лучник', hp: 15, attack: 12, defense: 5, minDamage: 4, maxDamage: 8, speed: 2, range: 5, 
    cost: { gold: 200, wood: 50, food: 50, stone: 0, crystals: 0 }, isEnemy: false, image: '/units/archer.png',
    combatType: 'ranged', description: 'Майстер лука. Дальній бій. Атака: звичайна.'
  },
  berserk: { 
    id: 'berserk', name: 'Берсерк', hp: 40, attack: 15, defense: 5, minDamage: 8, maxDamage: 15, speed: 2, range: 1, 
    cost: { gold: 200, food: 50, stone: 50, wood: 0, crystals: 0 }, isEnemy: false, image: '/units/berserk.png',
    combatType: 'melee', special: 'frenzy', description: 'Лютий боєць. Ближній бій. Вміння "Лють": дозволяє зробити ще один хід (раз за бій).'
  },
  mage: { 
    id: 'mage', name: 'Маг', hp: 20, attack: 18, defense: 6, minDamage: 10, maxDamage: 18, speed: 2, range: 5, 
    cost: { gold: 300, wood: 100, stone: 100, food: 0, crystals: 0 }, isEnemy: false, image: '/units/mage.png',
    combatType: 'ranged', description: 'Повелитель вогню. Дальній бій. Атака: звичайна.'
  },
  dragon: { 
    id: 'dragon', name: 'Дракон', hp: 200, attack: 40, defense: 30, minDamage: 25, maxDamage: 50, speed: 6, range: 1, 
    cost: { gold: 3000, stone: 500, food: 1000, wood: 0, crystals: 0 }, isEnemy: false, image: '/units/dragon.png',
    combatType: 'melee', description: 'Легендарний звір. Ближній бій. Атака: звичайна.'
  },
  titan: { 
    id: 'titan', name: 'Титан', hp: 300, attack: 50, defense: 40, minDamage: 40, maxDamage: 60, speed: 2, range: 8, size: 2, 
    cost: { gold: 5000, stone: 1000, wood: 200, food: 750, crystals: 0 }, isEnemy: false, image: '/units/titan.png',
    combatType: 'ranged', description: 'Стародавній гігант. Дальній бій. Атака: звичайна.'
  },
  
  skelet: { id: 'skelet', name: 'Скелет', hp: 10, attack: 5, defense: 5, minDamage: 2, maxDamage: 4, speed: 2, range: 1, isEnemy: true, image: '/mobs/skeleton.png', combatType: 'melee', description: 'Ожилий мрець. Ближній бій.' },
  goblin: { id: 'goblin', name: 'Гоблін', hp: 15, attack: 10, defense: 5, minDamage: 3, maxDamage: 6, speed: 2, range: 1, isEnemy: true, image: '/mobs/goblin.png', combatType: 'melee', description: 'Дрібний бешкетник. Ближній бій.' },
  orc: { id: 'orc', name: 'Орк', hp: 70, attack: 25, defense: 25, minDamage: 10, maxDamage: 18, speed: 2, range: 1, isEnemy: true, image: '/mobs/orc.png', combatType: 'melee', description: 'Могутній варвар. Ближній бій.' },
  vampire: { id: 'vampire', name: 'Вампір', hp: 150, attack: 55, defense: 30, minDamage: 25, maxDamage: 45, speed: 4, range: 1, isEnemy: true, image: '/mobs/vampire.png', combatType: 'melee', description: 'Нічний мисливець. Ближній бій.' },
  demon: { id: 'demon', name: 'Демон', hp: 250, attack: 180, defense: 35, minDamage: 80, maxDamage: 120, speed: 3, range: 1, isEnemy: true, image: '/mobs/demon.png', combatType: 'melee', description: 'Створіння безодні. Ближній бій.' },
  giant: { id: 'giant', name: 'Велетень', hp: 400, attack: 150, defense: 40, minDamage: 60, maxDamage: 100, speed: 2, range: 8, size: 2, isEnemy: true, image: '/mobs/velikan.png', combatType: 'ranged', description: 'Гірський ісполин. Дальній бій.' },
  
  assassin: { 
    id: 'assassin', name: 'Вбивця', hp: 120, attack: 30, defense: 15, minDamage: 15, maxDamage: 30, speed: 5, range: 1, 
    cost: { gold: 700, stone: 0, wood: 0, food: 150, crystals: 0 }, isEnemy: false, image: '/units/assasin.png',
    combatType: 'melee', special: 'double_attack', description: 'Прихований вбивця. Ближній бій. Атака: подвійна.'
  },
  paladin: {
    id: 'paladin', name: 'Паладин', hp: 200, attack: 20, defense: 50, minDamage: 15, maxDamage: 25, speed: 2, range: 1,
    cost: { gold: 1000, food: 400, stone: 100, wood: 0, crystals: 0 }, isEnemy: false, image: '/units/paladin.png',
    combatType: 'melee', special: 'aura_def_20', description: 'Святий воїн. Союзники в радіусі 1 кл. отримують +20% захисту.'
  },
  driada: {
    id: 'driada', name: 'Дріада', hp: 130, attack: 15, defense: 10, minDamage: 10, maxDamage: 20, speed: 3, range: 4,
    cost: { gold: 850, food: 150, wood: 500, stone: 0, crystals: 0 }, isEnemy: false, image: '/units/driada.png',
    combatType: 'ranged', special: 'heal_resurrect', description: 'Дитя лісу. Раз за хід може воскресити 1-3 вбитих у бою істот.'
  },
  hydra: { 
    id: 'hydra', name: 'Гідра', hp: 700, attack: 200, defense: 45, minDamage: 100, maxDamage: 200, speed: 2, range: 1, size: 2,
    isEnemy: true, image: '/mobs/hydra.png', combatType: 'melee', special: 'counter_attack_50', 
    description: 'Міфічне чудовисько. Ближній бій. Атака: 50% удар у відповідь.'
  },
  souleater: { 
    id: 'souleater', name: 'Душоїд', hp: 200, attack: 100, defense: 30, minDamage: 50, maxDamage: 100, speed: 3, range: 1,
    isEnemy: true, image: '/mobs/souleater.png', combatType: 'melee', special: 'double_attack',
    description: 'Демонічна тварюка. Ближній бій. Атака: подвійна.'
  },
  banshee: {
    id: 'banshee', name: 'Банші', hp: 200, attack: 60, defense: 20, minDamage: 50, maxDamage: 70, speed: 3, range: 1,
    isEnemy: true, image: '/units/banshee.png', combatType: 'melee', special: 'double_turn',
    description: 'Привид із жахливим криком. Може зробити два ходи за раунд. Ближній бій.'
  },
  arachnid: {
    id: 'arachnid', name: 'Арахнід', hp: 260, attack: 80, defense: 15, minDamage: 70, maxDamage: 90, speed: 5, range: 1,
    isEnemy: true, image: '/units/arachnid.png', combatType: 'melee',
    description: 'Величезний павук. Висока швидкість переміщення. Ближній бій.'
  },
  frostdragon: {
    id: 'frostdragon', name: 'Крижаний дракон', hp: 400, attack: 110, defense: 50, minDamage: 100, maxDamage: 120, speed: 10, range: 1, size: 2,
    isEnemy: true, image: '/units/frostdragon.png', combatType: 'melee',
    description: 'Повелитель холоду. Миттєво переміщується по полю бою. Ближній бій.'
  },
  archidruid: {
    id: 'archidruid', name: 'Архідруїд', hp: 500, attack: 80, defense: 50, minDamage: 100, maxDamage: 140, speed: 2, range: 5,
    cost: { gold: 10000, food: 500, crystals: 10, wood: 0, stone: 0 }, isEnemy: false, image: '/units/archiduid.png',
    combatType: 'ranged', special: 'splash_50', description: 'Верховний захисник природи. Дальній бій. Атака: сплеш-урон 50% в радіусі 1 кл.'
  },
  balista: {
    id: 'balista', name: 'Баліста', hp: 100, attack: 40, defense: 10, minDamage: 30, maxDamage: 50, speed: 0, range: 20,
    cost: { gold: 1000, wood: 200, stone: 200, food: 0, crystals: 0 }, isEnemy: false, image: '/forge/balista.png',
    combatType: 'ranged', description: 'Облогове знаряддя. Атака через все поле.'
  },
  elven_balista: {
    id: 'elven_balista', name: 'Ельфійська баліста', hp: 250, attack: 80, defense: 20, minDamage: 60, maxDamage: 100, speed: 0, range: 20,
    cost: { gold: 3000, wood: 400, stone: 400, food: 0, crystals: 0 }, isEnemy: false, image: '/forge/elvenbalista.png',
    combatType: 'ranged', description: 'Покращене облогове знаряддя ельфів. Атака через все поле.'
  },
  archer_tower: {
    id: 'archer_tower', name: 'Вежа лучників', hp: 600, attack: 200, defense: 40, minDamage: 150, maxDamage: 250, speed: 0, range: 20,
    cost: { gold: 10000, wood: 800, stone: 800, food: 0, crystals: 0 }, isEnemy: false, image: '/forge/archertower.png',
    combatType: 'ranged', description: 'Потужна оборонна вежа. Атака через все поле.'
  },
  mage_tower: {
    id: 'mage_tower', name: 'Вежа магів', hp: 1000, attack: 400, defense: 60, minDamage: 300, maxDamage: 500, speed: 0, range: 20,
    cost: { gold: 35000, wood: 2000, stone: 2000, food: 0, crystals: 0 }, isEnemy: false, image: '/forge/magetower.png',
    combatType: 'ranged', description: 'Вершина магічного захисту. Атака через все поле.'
  },
  veliar: {
    id: 'veliar', name: 'Веліар (Король ельфів)', hp: 2000, attack: 300, defense: 50, minDamage: 300, maxDamage: 300, speed: 2, range: 1, size: 2,
    isEnemy: true, image: '/bosses/veliar.png', combatType: 'melee', special: 'crit_25_x2', description: 'Король ельфів крові. Ближній бій. 25% шанс нанести x2 шкоди.'
  },
  kronos: { 
    id: 'kronos', name: 'Кронос (Повелитель ентів)', hp: 5000, attack: 400, defense: 60, minDamage: 400, maxDamage: 400, speed: 1, range: 1, size: 2,
    isEnemy: true, image: '/bosses/kronos.png', combatType: 'melee', description: 'Стародавній дух лісу. Ближній бій.'
  },
  archimond: {
    id: 'archimond', name: 'Архімонд (Верховний демон)', hp: 10000, attack: 666, defense: 66, minDamage: 666, maxDamage: 666, speed: 1, range: 5, size: 2,
    isEnemy: true, image: '/bosses/archimond.png', combatType: 'ranged', special: 'splash_50', description: 'Повелитель Палаючого Легіону. Дальній бій. Атака: сплеш-урон 50%.'
  },
  despot: {
    id: 'despot', name: 'Деспот', hp: 1000, attack: 200, defense: 40, minDamage: 100, maxDamage: 150, speed: 2, range: 1,
    cost: { gold: 20000, food: 1000, wood: 500, stone: 500, crystals: 20 },
    isEnemy: false, image: '/units/despot.png', combatType: 'melee', description: 'Безжалісний тиран. Ближній бій.'
  },
  skorpidus: {
    id: 'skorpidus', name: 'Скорпідус', hp: 300, attack: 100, defense: 20, minDamage: 50, maxDamage: 100, speed: 3, range: 1,
    isEnemy: true, image: '/mobs/skorpidus.png', combatType: 'melee', description: 'Гігантський пустельний скорпіон.'
  },
  scarbius: {
    id: 'scarbius', name: 'Скарбіус', hp: 5000, attack: 300, defense: 100, minDamage: 200, maxDamage: 300, speed: 2, range: 1, size: 2,
    isEnemy: true, image: '/bosses/scarbius.png', combatType: 'melee', description: 'Король скорпіонів. Велика броня.'
  }
};

/**
 * INITIAL MAP NODES
 */
export const INITIAL_MAP_NODES: MapNode[] = [
  { id: 'city', name: 'Місто (Амстерград)', type: 'city', x: 42, y: 42, enemies: [], reward: {}, cleared: false, campaignLevel: 'all' },
  { id: 'daily-veliar', name: 'Веліар', type: 'daily_boss', x: 15, y: 35, enemies: [{ unitId: 'veliar', count: 1 }], reward: { crystals: 20 }, cleared: false, campaignLevel: 'all' },
  { id: 'daily-kronos', name: 'Кронос', type: 'daily_boss', x: 45, y: 85, enemies: [{ unitId: 'kronos', count: 1 }], reward: { crystals: 100 }, cleared: false, campaignLevel: 'all' },
  { id: 'daily-archimond', name: 'Архімонд', type: 'daily_boss', x: 80, y: 45, enemies: [{ unitId: 'archimond', count: 1 }], reward: { crystals: 200 }, cleared: false, campaignLevel: 'all' },
  
  // Level 1-1
  { id: '1-1-1', name: 'Лісовий патруль', type: 'combat', x: 25, y: 25, enemies: [{ unitId: 'goblin', count: 10 }, { unitId: 'orc', count: 10 }], reward: { gold: 100, crystals: 1 }, cleared: false, campaignLevel: '1-1' },
  { id: '1-1-2', name: 'Розвідники орків', type: 'combat', x: 70, y: 20, enemies: [{ unitId: 'goblin', count: 20 }, { unitId: 'orc', count: 25 }], reward: { gold: 200, crystals: 1 }, cleared: false, campaignLevel: '1-1' },

  // Level 1-2
  { id: '1-2-1', name: 'Цвинтарний дозор', type: 'combat', x: 30, y: 25, enemies: [{ unitId: 'skelet', count: 15 }, { unitId: 'goblin', count: 10 }], reward: { gold: 150, crystals: 1 }, cleared: false, campaignLevel: '1-2' },
  { id: '1-2-2', name: 'Орда скелетів', type: 'combat', x: 70, y: 70, enemies: [{ unitId: 'skelet', count: 25 }, { unitId: 'goblin', count: 20 }], reward: { gold: 300, crystals: 1 }, cleared: false, campaignLevel: '1-2' },

  // Level 1-3
  { id: '1-3-1', name: 'Скелети-нальотчики', type: 'combat', x: 20, y: 50, enemies: [{ unitId: 'skelet', count: 20 }, { unitId: 'orc', count: 10 }, { unitId: 'goblin', count: 10 }], reward: { gold: 400, crystals: 1 }, cleared: false, campaignLevel: '1-3' },
  { id: '1-3-2', name: 'Засідка в руїнах', type: 'combat', x: 50, y: 80, enemies: [{ unitId: 'skelet', count: 30 }, { unitId: 'orc', count: 15 }, { unitId: 'goblin', count: 20 }], reward: { gold: 600, crystals: 1 }, cleared: false, campaignLevel: '1-3' },
  { id: '1-3-3', name: 'Чорна варта', type: 'combat', x: 80, y: 20, enemies: [{ unitId: 'orc', count: 30 }, { unitId: 'skelet', count: 40 }], reward: { gold: 800, crystals: 2 }, cleared: false, campaignLevel: '1-3' },

  // Level 1-4
  { id: '1-4-1', name: 'Нічні мисливці', type: 'combat', x: 15, y: 30, enemies: [{ unitId: 'vampire', count: 5 }, { unitId: 'skelet', count: 30 }], reward: { gold: 1000, crystals: 2 }, cleared: false, campaignLevel: '1-4' },
  { id: '1-4-2', name: 'Гвардія вампірів', type: 'combat', x: 85, y: 60, enemies: [{ unitId: 'orc', count: 30 }, { unitId: 'vampire', count: 15 }, { unitId: 'vampire', count: 15 }], reward: { gold: 1500, crystals: 2 }, cleared: false, campaignLevel: '1-4' },
  { id: '1-4-3', name: 'Армія крові', type: 'combat', x: 40, y: 15, enemies: [{ unitId: 'vampire', count: 15 }, { unitId: 'orc', count: 40 }], reward: { gold: 2000, crystals: 3 }, cleared: false, campaignLevel: '1-4' },
  { id: '1-4-boss', name: 'Лігво Ката', type: 'boss', x: 65, y: 65, enemies: [{ unitId: 'titan', count: 1 }, { unitId: 'vampire', count: 20 }], reward: { gold: 5000, crystals: 10 }, cleared: false, campaignLevel: '1-4' },

  // Level 1-5
  { id: '1-5-1', name: 'Демонічні пси', type: 'combat', x: 25, y: 75, enemies: [{ unitId: 'vampire', count: 20 }, { unitId: 'demon', count: 5 }, { unitId: 'demon', count: 5 }, { unitId: 'demon', count: 5 }, { unitId: 'demon', count: 5 }], reward: { gold: 3000, crystals: 5 }, cleared: false, campaignLevel: '1-5' },
  { id: '1-5-2', name: 'Легіон пекла', type: 'combat', x: 75, y: 25, enemies: [{ unitId: 'souleater', count: 4 }, { unitId: 'demon', count: 4 }, { unitId: 'souleater', count: 4 }, { unitId: 'demon', count: 4 }], reward: { gold: 4000, crystals: 6 }, cleared: false, campaignLevel: '1-5' },
  { id: '1-5-3', name: 'Тіньові жнива', type: 'combat', x: 10, y: 10, enemies: [{ unitId: 'souleater', count: 8 }, { unitId: 'vampire', count: 15 }], reward: { gold: 5000, crystals: 8 }, cleared: false, campaignLevel: '1-5' },
  { id: '1-5-4', name: 'Пожирачі душ', type: 'combat', x: 90, y: 90, enemies: [{ unitId: 'souleater', count: 8 }, { unitId: 'souleater', count: 8 }, { unitId: 'skelet', count: 80 }, { unitId: 'skelet', count: 80 }], reward: { gold: 7000, crystals: 10 }, cleared: false, campaignLevel: '1-5' },

  // Level 1-6
  { id: '1-6-1', name: 'Озеро Гідр', type: 'combat', x: 35, y: 15, enemies: [{ unitId: 'hydra', count: 1 }, { unitId: 'vampire', count: 10 }], reward: { gold: 8000, crystals: 15 }, cleared: false, campaignLevel: '1-6' },
  { id: '1-6-2', name: 'Печерні голови', type: 'combat', x: 65, y: 85, enemies: [{ unitId: 'hydra', count: 2 }, { unitId: 'demon', count: 5 }], reward: { gold: 10000, crystals: 15 }, cleared: false, campaignLevel: '1-6' },
  { id: '1-6-3', name: 'Руйнівники гір', type: 'combat', x: 15, y: 65, enemies: [{ unitId: 'hydra', count: 2 }, { unitId: 'hydra', count: 2 }, { unitId: 'giant', count: 2 }, { unitId: 'giant', count: 2 }], reward: { gold: 12000, crystals: 20 }, cleared: false, campaignLevel: '1-6' },
  { id: '1-6-4', name: 'Облоговий корпус', type: 'combat', x: 85, y: 35, enemies: [{ unitId: 'giant', count: 8 }, { unitId: 'hydra', count: 2 }, { unitId: 'skelet', count: 100 }, { unitId: 'skelet', count: 100 }], reward: { gold: 15000, crystals: 25 }, cleared: false, campaignLevel: '1-6' },
  { id: '1-6-5', name: 'Велетні-лорди', type: 'combat', x: 50, y: 20, enemies: [{ unitId: 'giant', count: 10 }, { unitId: 'hydra', count: 3 }], reward: { gold: 18000, crystals: 30 }, cleared: false, campaignLevel: '1-6' },

  // Level 1-7
  { id: '1-7-1', name: 'Залізна хода', type: 'combat', x: 20, y: 20, enemies: [{ unitId: 'giant', count: 12 }, { unitId: 'hydra', count: 5 }], reward: { gold: 20000, crystals: 40 }, cleared: false, campaignLevel: '1-7' },
  { id: '1-7-2', name: 'Темний альянс', type: 'combat', x: 80, y: 80, enemies: [{ unitId: 'hydra', count: 8 }, { unitId: 'souleater', count: 20 }], reward: { gold: 25000, crystals: 50 }, cleared: false, campaignLevel: '1-7' },
  { id: '1-7-3', name: 'Гнів безодні', type: 'combat', x: 20, y: 80, enemies: [{ unitId: 'hydra', count: 10 }, { unitId: 'demon', count: 20 }, { unitId: 'vampire', count: 60 }], reward: { gold: 30000, crystals: 60 }, cleared: false, campaignLevel: '1-7' },
  { id: '1-7-4', name: 'Попелястий легіон', type: 'combat', x: 80, y: 20, enemies: [{ unitId: 'hydra', count: 12 }, { unitId: 'souleater', count: 30 }, { unitId: 'skelet', count: 200 }], reward: { gold: 35000, crystals: 70 }, cleared: false, campaignLevel: '1-7' },
  { id: '1-7-5', name: 'Останній рубіж', type: 'combat', x: 50, y: 10, enemies: [{ unitId: 'hydra', count: 15 }, { unitId: 'demon', count: 30 }, { unitId: 'orc', count: 100 }], reward: { gold: 40000, crystals: 80 }, cleared: false, campaignLevel: '1-7' },
  
  // Level 1-8
  { id: '1-8-preboss', name: 'Варта темряви', type: 'boss', x: 40, y: 70, enemies: [{ unitId: 'vampire', count: 100 }, { unitId: 'hydra', count: 33 }, { unitId: 'vampire', count: 100 }], reward: { gold: 50000, crystals: 100 }, cleared: false, campaignLevel: '1-8' },
  { id: '1-8-finalboss', name: 'Повелитель темряви', type: 'boss', x: 60, y: 30, enemies: [{ unitId: 'skelet', count: 666 }, { unitId: 'hydra', count: 66 }, { unitId: 'giant', count: 66 }, { unitId: 'hydra', count: 66 }, { unitId: 'skelet', count: 666 }], reward: { gold: 250000, crystals: 350 }, itemReward: 'weapon-legend', cleared: false, campaignLevel: '1-8' },

  // World 2
  { id: '2-1-1', name: 'Брама Другого Світу', type: 'combat', x: 20, y: 30, enemies: [{ unitId: 'banshee', count: 40 }, { unitId: 'skelet', count: 200 }], reward: { gold: 50000, crystals: 50 }, cleared: false, campaignLevel: '2-1' },
  { id: '2-1-2', name: 'Тіні порожнечі', type: 'combat', x: 80, y: 70, enemies: [{ unitId: 'banshee', count: 80 }, { unitId: 'vampire', count: 120 }], reward: { gold: 60000, crystals: 50 }, cleared: false, campaignLevel: '2-1' },

  // Level 2-2
  { id: '2-2-1', name: 'Гніздо Арахнідів', type: 'combat', x: 15, y: 20, enemies: [{ unitId: 'frostdragon', count: 15 }, { unitId: 'arachnid', count: 150 }, { unitId: 'arachnid', count: 150 }, { unitId: 'arachnid', count: 150 }, { unitId: 'arachnid', count: 150 }], reward: { gold: 75000, crystals: 5 }, cleared: false, campaignLevel: '2-2' },
  { id: '2-2-2', name: 'Павучий шепіт', type: 'combat', x: 50, y: 55, enemies: [{ unitId: 'frostdragon', count: 20 }, { unitId: 'banshee', count: 100 }, { unitId: 'banshee', count: 100 }, { unitId: 'arachnid', count: 333 }, { unitId: 'arachnid', count: 333 }], reward: { gold: 85000, crystals: 5 }, cleared: false, campaignLevel: '2-2' },
  { id: '2-2-3', name: 'Серце павутини', type: 'boss', x: 80, y: 20, enemies: [{ unitId: 'banshee', count: 80 }, { unitId: 'banshee', count: 80 }, { unitId: 'arachnid', count: 100 }, { unitId: 'arachnid', count: 100 }, { unitId: 'arachnid', count: 100 }, { unitId: 'arachnid', count: 100 }], reward: { gold: 120000, crystals: 10 }, cleared: false, campaignLevel: '2-2' },
  
  // Level 2-3
  { id: '2-3-1', name: 'Коаліція', type: 'combat', x: 25, y: 30, enemies: [
    { unitId: 'giant', count: 30 },
    { unitId: 'arachnid', count: 125 },
    { unitId: 'arachnid', count: 125 },
    { unitId: 'arachnid', count: 125 },
    { unitId: 'arachnid', count: 125 }
  ], reward: { gold: 150000, crystals: 10 }, cleared: false, campaignLevel: '2-3' },
  { id: '2-3-2', name: 'Гвардія темряви', type: 'combat', x: 75, y: 40, enemies: [
    { unitId: 'vampire', count: 300 },
    { unitId: 'vampire', count: 300 },
    { unitId: 'banshee', count: 200 },
    { unitId: 'banshee', count: 200 },
    { unitId: 'arachnid', count: 100 },
    { unitId: 'arachnid', count: 100 }
  ], reward: { gold: 200000, crystals: 15 }, cleared: false, campaignLevel: '2-3' },
  { id: '2-3-3', name: 'Арахнофобія', type: 'boss', x: 50, y: 80, enemies: [
    { unitId: 'arachnid', count: 1000 },
    { unitId: 'souleater', count: 66 },
    { unitId: 'souleater', count: 66 },
    { unitId: 'souleater', count: 66 },
    { unitId: 'souleater', count: 66 }
  ], reward: { gold: 300000, crystals: 25 }, cleared: false, campaignLevel: '2-3' },

  // Level 2-4
  { id: '2-4-1', name: 'Печери некромантів', type: 'combat', x: 20, y: 25, enemies: [
    { unitId: 'souleater', count: 100 },
    { unitId: 'banshee', count: 100 },
    { unitId: 'banshee', count: 100 },
    { unitId: 'skorpidus', count: 50 },
    { unitId: 'skorpidus', count: 50 }
  ], reward: { crystals: 50 }, cleared: false, campaignLevel: '2-4' },
  { id: '2-4-2', name: 'Павуча скеля', type: 'combat', x: 80, y: 35, enemies: [
    { unitId: 'arachnid', count: 300 },
    { unitId: 'arachnid', count: 300 },
    { unitId: 'skorpidus', count: 66 },
    { unitId: 'skorpidus', count: 66 },
    { unitId: 'skorpidus', count: 66 }
  ], reward: { crystals: 60 }, cleared: false, campaignLevel: '2-4' },
  { id: '2-4-3', name: 'Охорона драконів', type: 'combat', x: 50, y: 60, enemies: [
    { unitId: 'frostdragon', count: 50 },
    { unitId: 'skorpidus', count: 100 },
    { unitId: 'skorpidus', count: 100 },
    { unitId: 'skorpidus', count: 100 }
  ], reward: { crystals: 80 }, cleared: false, campaignLevel: '2-4' },
  { id: '2-4-boss', name: 'Скарбіус', type: 'boss', x: 50, y: 15, enemies: [
    { unitId: 'scarbius', count: 333 },
    { unitId: 'skorpidus', count: 333 },
    { unitId: 'skorpidus', count: 333 },
    { unitId: 'arachnid', count: 666 },
    { unitId: 'arachnid', count: 666 }
  ], reward: { crystals: 333 }, cleared: false, campaignLevel: '2-4' },

  // World 3-1
  { id: '3-1-1', name: 'Таверна велетнів', type: 'combat', x: 50, y: 80, enemies: [
    { unitId: 'giant', count: 10 }
  ], reward: { gold: 1, stone: 1, wood: 1, food: 1, crystals: 10 }, cleared: false, campaignLevel: '3-1' }
];

export const LEGENDARY_WEAPON: EquipmentItem = {
  id: 'weapon-legend',
  type: 'weapon',
  tier: 8,
  name: 'Зброя легенди',
  image: '/sets/weapon-8.png',
  cost: 0,
  stats: {
    attackBonus: 100, // 100% bonus
    defenseBonus: 20,
    hpBonus: 20
  }
};
