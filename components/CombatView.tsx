import { useState, useEffect, useRef } from 'react';
import { useGame } from '../lib/game-context';
import { MapNode, UNITS_INFO, UnitId, HEROES_INFO, HeroId, Resources } from '../lib/game.types';
import { addResources, cn } from '../lib/game.utils';
import { getRandomId, getRandomDamage } from '../lib/combat.utils';
import { Skull, Shield, Sword, BookOpen, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CombatViewProps {
  node: MapNode;
  onEnd: () => void;
}

// Minimal HoMM3 logic:
// Hex grid replaced with 6x5 square grid for simplicity.
// Player left side, Enemy right side
type CombatUnit = {
  id: string; // unique instance id
  unitId: UnitId;
  count: number;
  startCount: number;
  hp: number; // HP of the top unit in stack
  isEnemy: boolean;
  x: number;
  y: number;
  hasActed: boolean;
  hasRetaliated: boolean;
  movedThisTurn?: boolean;
  extraTurnUsed?: boolean;
  frenzyUsed?: boolean;
  curses?: { attackCurse: number; defenseCurse: number };
};

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;

interface Projectile {
  id: string;
  type: 'arrow' | 'fireball' | 'lightning' | 'bite' | 'slash' | 'nature';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface AttackEffect {
  id: string;
  type: 'slash' | 'hit' | 'fire' | 'lightning_hit' | 'heal' | 'ice';
  x: number;
  y: number;
  size: number;
}

// Helper to calculate Manhattan distance between rectangular units
const getManhattanDist = (u1x: number, u1y: number, u1s: number, u2x: number, u2y: number, u2s: number) => {
  const dx = Math.max(0, u1x - (u2x + u2s - 1), u2x - (u1x + u1s - 1));
  const dy = Math.max(0, u1y - (u2y + u2s - 1), u2y - (u1y + u1s - 1));
  return dx + dy;
};

export default function CombatView({ node, onEnd }: CombatViewProps) {
  const { army, setArmy, resources, setResources, mapNodes, setMapNodes, equipment, setEquipment, activeHeroId, attackSettlementResult } = useGame();
  
  const reportedLossesRef = useRef<Record<string, number>>({});
  const settlementRewardsRef = useRef<Resources | null>(null);

  const [hasHeroActed, setHasHeroActed] = useState(false);
  const hasHeroActedRef = useRef(false);
  const roundRef = useRef(1);
  const [isHeroTurn, setIsHeroTurn] = useState(false);
  const [heroAttackAnimation, setHeroAttackAnimation] = useState(false);

  // Equipment stats modifiers
  const atkMod = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.attackBonus || 0), 0) / 100;
  const defMod = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.defenseBonus || 0), 0) / 100;
  const hpMod  = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.hpBonus || 0), 0) / 100;

  // Visual effects state
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [effects, setEffects] = useState<AttackEffect[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<{ id: number, text: string, x: number, y: number, color?: string }[]>([]);
  const [shake, setShake] = useState(false);
  const [selectedUnitInfo, setSelectedUnitInfo] = useState<CombatUnit | null>(null);
  const [infoMode, setInfoMode] = useState(false);
  const [activeSkillState, setActiveSkillState] = useState<'curse' | 'resurrect' | 'throw_back' | null>(null);

  // Initialize teams
  const [units, setUnits] = useState<CombatUnit[]>(() => {
    const initialUnits: CombatUnit[] = [];
    let pY = 0;
    
    // Use selectedArmy if available, otherwise fallback to full army
    const armyToUse = (node as any).selectedArmy || army;
    
    (Object.entries(armyToUse) as [UnitId, number][]).forEach(([id, count]) => {
      const info = UNITS_INFO[id as UnitId];
      const size = info.size || 1;
      if (count > 0 && pY + size <= GRID_HEIGHT) {
        initialUnits.push({ 
          id: `p-${id}`, 
          unitId: id as UnitId, 
          count, 
          startCount: count,
          hp: Math.floor(info.hp * hpMod), 
          isEnemy: false, 
          x: 0, 
          y: pY, 
          hasActed: false,
          hasRetaliated: false
        });
        pY += size;
      }
    });

    let eY = 0;
      node.enemies.forEach((e, idx) => {
        const info = UNITS_INFO[e.unitId];
        const size = info.size || 1;
        // Settlements place regular units in the BACK row
        const xPos = node.type === 'settlement' ? GRID_WIDTH - size : GRID_WIDTH - size;
        if (e.count > 0 && eY + size <= GRID_HEIGHT) {
          initialUnits.push({ 
            id: `e-${e.unitId}-${idx}-${eY}`, 
            unitId: e.unitId, 
            count: e.count, 
            startCount: e.count,
            hp: info.hp, 
            isEnemy: true, 
            x: xPos, 
            y: eY, 
            hasActed: false,
            hasRetaliated: false
          });
          eY += size;
        }
      });

      // Settlement Defensive structures (Siege units)
      if (node.type === 'settlement' && node.targetSiegeUnits) {
        node.targetSiegeUnits.forEach((unitId, idx) => {
          if (!unitId) return;
          
          const info = UNITS_INFO[unitId];
          const size = 2; // Defensive structures are always 2x2
          // Places them in a single column at the front of the army
          // Slot 0 at y:0, Slot 1 at y:2, Slot 2 at y:4, Slot 3 at y:6
          const sY = idx * 2; 

          if (sY + size <= GRID_HEIGHT) {
            initialUnits.push({
              id: `e-siege-${idx}`,
              unitId: unitId,
              count: 1,
              startCount: 1,
              hp: info.hp,
              isEnemy: true,
              x: GRID_WIDTH - 4, // Occupies columns 6 and 7 (if width 10)
              y: sY,
              hasActed: false,
              hasRetaliated: false
            });
          }
        });
      }

      return initialUnits;
    });

  const [turn, setTurn] = useState<'player' | 'enemy'>(node.type === 'boss' || node.type === 'settlement' ? 'enemy' : 'player');
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [attackingUnitId, setAttackingUnitId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>(['Бій розпочався!']);
  const [gameOver, setGameOver] = useState<'victory' | 'defeat' | null>(null);
  const [round, setRound] = useState(1);
  const [settlementResultApplied, setSettlementResultApplied] = useState(false);

  // Apply settlement siege resource consequences
  useEffect(() => {
    if (gameOver && node.type === 'settlement' && node.targetId && !settlementResultApplied) {
      const won = gameOver === 'victory';
      attackSettlementResult(node.targetId, won).then(res => {
        if (res) {
          settlementRewardsRef.current = res;
          setSettlementResultApplied(true);
        }
      });
    }
  }, [gameOver, node, attackSettlementResult, settlementResultApplied]);

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 3));

  const addFloatingText = (text: string, x: number, y: number, color?: string) => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1000);
  };

  // Forward declarations for ESLint issues
  const markUnitActed = (u: CombatUnit): CombatUnit => {
    const info = UNITS_INFO[u.unitId];
    if ((info.special === 'double_turn' || info.special === 'double_action') && !u.extraTurnUsed) {
      return { ...u, movedThisTurn: false, extraTurnUsed: true, hasActed: false };
    }
    return { ...u, hasActed: true, movedThisTurn: false };
  };

  // Helper to calculate damage
  const calculateDamage = (attacker: CombatUnit, defender: CombatUnit, isCounter = false, currentUnits: CombatUnit[] = units) => {
    const attInfo = UNITS_INFO[attacker.unitId];
    const defInfo = UNITS_INFO[defender.unitId];

    let effAttack = attacker.isEnemy ? attInfo.attack : Math.floor(attInfo.attack * atkMod);
    let effDefense = defender.isEnemy ? defInfo.defense : Math.floor(defInfo.defense * defMod);
    
    // Apply curses
    if (attacker.curses) effAttack = Math.max(1, effAttack - attacker.curses.attackCurse);
    if (defender.curses) effDefense = Math.max(1, effDefense - defender.curses.defenseCurse);

    // Paladin Aura (+10 Defense, +20 HP) for allies in 1 cell radius
    const defSize = defInfo.size || 1;
    const hasPaladinAura = currentUnits.some(u => {
      if (u.isEnemy !== defender.isEnemy || UNITS_INFO[u.unitId].special !== 'aura_def_10_hp_20' || u.count <= 0) return false;
      const uSize = UNITS_INFO[u.unitId]?.size || 1;
      const dx = Math.max(0, Math.max(u.x - (defender.x + defSize - 1), defender.x - (u.x + uSize - 1)));
      const dy = Math.max(0, Math.max(u.y - (defender.y + defSize - 1), defender.y - (u.y + uSize - 1)));
      return dx <= 1 && dy <= 1;
    });
    
    if (hasPaladinAura) {
      effDefense += 10;
    }

    const effMinDmg = attacker.isEnemy ? attInfo.minDamage : Math.floor(attInfo.minDamage * atkMod);
    const effMaxDmg = attacker.isEnemy ? attInfo.maxDamage : Math.floor(attInfo.maxDamage * atkMod);
    let effUnitHp = defender.isEnemy ? defInfo.hp : Math.floor(defInfo.hp * hpMod);
    if (hasPaladinAura) {
      effUnitHp += 20;
    }
    
    const rawDmg = getRandomDamage(effMinDmg, effMaxDmg);
    let totalDmg = rawDmg * attacker.count;
    
    if (attInfo.special === 'crit_25_x2' && Math.random() < 0.25) {
      totalDmg *= 2;
    }
    if (attInfo.special === 'crit_30_x1_5' && Math.random() < 0.30) {
      totalDmg = Math.floor(totalDmg * 1.5);
    }
    
    if (isCounter && attInfo.special === 'counter_attack_50') {
      totalDmg = Math.floor(totalDmg * 0.5);
    }

    const statDiff = effAttack - effDefense;
    const multiplier = Math.max(0.05, 1 + (statDiff * 0.05));
    totalDmg = Math.floor(totalDmg * multiplier);
    
    if (totalDmg < 1 && attacker.count > 0) totalDmg = 1;
    return { totalDmg, effUnitHp };
  };

  const processAttack = (currentUnits: CombatUnit[], attacker: CombatUnit, defender: CombatUnit) => {
    const attackerInfo = UNITS_INFO[attacker.unitId];
    const defenderInfo = UNITS_INFO[defender.unitId];
    
    // Trigger Effects
    const triggerEffect = (aId: UnitId, dId: UnitId, dx: number, dy: number, ds: number) => {
      const aInfo = UNITS_INFO[aId];
      if (aInfo.range > 1) {
        let type: 'arrow' | 'fireball' | 'lightning' | 'nature' = 'arrow';
        const aidStr = aId as string;
        if (aidStr.includes('mage') || aidStr === 'o_shaman' || aidStr === 'h_archmage') type = 'fireball';
        if (aId === 'titan' || aId === 'giant') type = 'lightning';
        if (aId === 'e_huntress') type = 'nature';
        
        const projectileId = getRandomId('p');
        const newProjectile: Projectile = {
          id: projectileId, type,
          startX: attacker.x + (attackerInfo.size === 2 ? 0.5 : 0),
          startY: attacker.y + (attackerInfo.size === 2 ? 0.5 : 0),
          endX: dx + (ds === 2 ? 0.5 : 0),
          endY: dy + (ds === 2 ? 0.5 : 0),
        };
        setProjectiles(prev => [...prev, newProjectile]);
        
        setTimeout(() => {
          setProjectiles(prev => prev.filter(p => p.id !== projectileId));
          const hitType: AttackEffect['type'] = (type === 'fireball') ? 'fire' : (type === 'lightning' ? 'lightning_hit' : 'hit');
          const effectId = getRandomId('e');
          setEffects(prev => [...prev, { id: effectId, type: hitType, x: dx, y: dy, size: ds }]);
          if (hitType === 'fire' || hitType === 'lightning_hit') {
            setShake(true);
            setTimeout(() => setShake(false), 200);
          }
          setTimeout(() => setEffects(prev => prev.filter(e => e.id !== effectId)), 500);
        }, 500);
      } else {
        let effectType: AttackEffect['type'] = 'slash';
        if (aId === 'dragon' || aId === 'demon' || aId === 'hydra' || aId === 'skorpidus') effectType = 'fire';
        if (aId === 'frostdragon' || aId === 'knight') effectType = 'ice';
        
        const effectId = getRandomId('e-melee');
        setEffects(prev => [...prev, { id: effectId, type: effectType, x: dx, y: dy, size: ds }]);
        
        // Add a slight jump for melee units
        setAttackingUnitId(attacker.id);
        setTimeout(() => setAttackingUnitId(null), 300);
        
        if (attacker.count > 10 || attackerInfo.attack > 50) {
          setShake(true);
          setTimeout(() => setShake(false), 150);
        }
        
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== effectId)), 500);
      }
    };

    triggerEffect(attacker.unitId, defender.unitId, defender.x, defender.y, defenderInfo.size || 1);

    const applyDamage = (att: CombatUnit, def: CombatUnit, unitsList: CombatUnit[], isCounter = false) => {
      const { totalDmg, effUnitHp } = calculateDamage(att, def, isCounter);
      
      let remainingStackHP = (def.count - 1) * effUnitHp + def.hp - totalDmg;
      let newCount = Math.max(0, Math.ceil(remainingStackHP / effUnitHp));
      let killed = def.count - newCount;
      let newTopHP = remainingStackHP <= 0 ? 0 : (remainingStackHP % effUnitHp === 0 ? effUnitHp : remainingStackHP % effUnitHp);

      addFloatingText(`-${totalDmg}`, def.x, def.y, 'text-rose-500');

      const label = isCounter ? "Удар у відповідь" : "Атака";
      if (newCount === 0) {
        addLog(`${label}: ${UNITS_INFO[att.unitId].name} знищив ${UNITS_INFO[def.unitId].name}!`);
      } else {
        addLog(`${label}: ${UNITS_INFO[att.unitId].name} -> ${totalDmg} шкоди. Вбито: ${killed}.`);
      }

      return { newCount, newTopHP };
    };

    // Primary Attack
    let { newCount, newTopHP } = applyDamage(attacker, defender, currentUnits);
    let currentDefender = { ...defender, count: newCount, hp: newTopHP };

    // Splash Damage Logic (Archidruid - special: 'splash_50' & Kronos - 'splash_linear_40')
    let splashTargets: { id: string, damage: number }[] = [];
    if (attackerInfo.special === 'splash_50' || attackerInfo.special === 'splash_linear_40' || attackerInfo.special === 'splash_25') {
      const { totalDmg } = calculateDamage(attacker, defender, false, currentUnits);
      const isLinear = attackerInfo.special === 'splash_linear_40';
      const splashDmgBase = Math.floor(totalDmg * (isLinear ? 0.4 : (attackerInfo.special === 'splash_25' ? 0.25 : 0.5)));
      
      if (splashDmgBase > 0) {
        
        let targetX = -1;
        let targetY = -1;
        let dirX = 0;
        let dirY = 0;
        if (isLinear) {
            // Find cell behind target: direction from attacker to defender
            const defMidx = defender.x + (defenderInfo.size || 1) / 2;
            const defMidy = defender.y + (defenderInfo.size || 1) / 2;
            const attMidx = attacker.x + (attackerInfo.size || 1) / 2;
            const attMidy = attacker.y + (attackerInfo.size || 1) / 2;
            dirX = Math.sign(defMidx - attMidx);
            dirY = Math.sign(defMidy - attMidy);
            // approximate target "behind"
            targetX = defender.x + (defenderInfo.size || 1) * dirX;
            targetY = defender.y + (defenderInfo.size || 1) * dirY;
        }

        currentUnits.forEach(u => {
          if (u.id !== defender.id && u.isEnemy === defender.isEnemy && u.count > 0) {
            const uSize = UNITS_INFO[u.unitId].size || 1;
            const defSize = UNITS_INFO[defender.unitId].size || 1;
            const dx = Math.max(0, Math.max(u.x - (defender.x + defSize - 1), defender.x - (u.x + uSize - 1)));
            const dy = Math.max(0, Math.max(u.y - (defender.y + defSize - 1), defender.y - (u.y + uSize - 1)));
            
            if (isLinear && targetX !== -1) {
              // check if it falls onto targetX/Y 
              const inLinearPath = u.x <= Math.max(targetX, defender.x + dirX) && u.x + uSize - 1 >= Math.min(targetX, defender.x + dirX) &&
                                   u.y <= Math.max(targetY, defender.y + dirY) && u.y + uSize - 1 >= Math.min(targetY, defender.y + dirY);
              // Simplified: hit adjacent unit behind target.
              if (inLinearPath && (dx <= 1 && dy <= 1)) {
                 splashTargets.push({ id: u.id, damage: splashDmgBase });
              }
            } else if (!isLinear && dx <= 1 && dy <= 1) {
              splashTargets.push({ id: u.id, damage: splashDmgBase });
            }
          }
        });
      }
    }

    const finalizeAttack = (finalDefender: CombatUnit, splashHits: { id: string, damage: number }[] = [], unitsToBaseOn: CombatUnit[] = currentUnits) => {
      const updatedUnits = unitsToBaseOn.map(u => {
        if (u.id === attacker.id) return markUnitActed(u);
        if (u.id === defender.id) return finalDefender;
        
        const splash = splashHits.find(s => s.id === u.id);
        if (splash) {
          const uInfo = UNITS_INFO[u.unitId];
          const { effUnitHp } = calculateDamage(attacker, u, false, unitsToBaseOn);
          let remainingHP = (u.count - 1) * effUnitHp + u.hp - splash.damage;
          let count = Math.max(0, Math.ceil(remainingHP / effUnitHp));
          let topHP = remainingHP <= 0 ? 0 : (remainingHP % effUnitHp === 0 ? effUnitHp : remainingHP % effUnitHp);
          
          // Visual effect for splash
          const effId = getRandomId('spl');
          setTimeout(() => {
            setEffects(prev => [...prev, { id: effId, type: 'fire', x: u.x, y: u.y, size: uInfo.size || 1 }]);
            setTimeout(() => setEffects(prev => prev.filter(e => e.id !== effId)), 500);
          }, 300);
          
          return { ...u, count, hp: topHP };
        }
        return u;
      });
      setUnits([...updatedUnits]);
      setTimeout(() => checkWinCondition(updatedUnits), 600);
    };

    // Prepare multi-attacks
    const multiAttacks: number[] = [];
    if (attackerInfo.special === 'double_attack') multiAttacks.push(1);
    if (attackerInfo.special === 'double_attack_80') multiAttacks.push(0.8);
    if (attackerInfo.special === 'triple_attack_50_25') {
      multiAttacks.push(0.5);
      multiAttacks.push(0.25);
    }

    if (multiAttacks.length > 0 && newCount > 0) {
      let currentIdx = 0;
      let unitsInProgress = currentUnits.map(u => u.id === defender.id ? currentDefender : u);
      setUnits(unitsInProgress);
      
      const nextAttack = () => {
        if (currentIdx < multiAttacks.length && currentDefender.count > 0) {
          setTimeout(() => {
            triggerEffect(attacker.unitId, defender.unitId, defender.x, defender.y, defenderInfo.size || 1);
            
            const { totalDmg, effUnitHp } = calculateDamage(attacker, currentDefender, false, unitsInProgress);
            const mt = multiAttacks[currentIdx];
            const modDmg = Math.floor(totalDmg * mt);
            
            let remainingStackHP = (currentDefender.count - 1) * effUnitHp + currentDefender.hp - modDmg;
            let nC = Math.max(0, Math.ceil(remainingStackHP / effUnitHp));
            let nTopHP = remainingStackHP <= 0 ? 0 : (remainingStackHP % effUnitHp === 0 ? effUnitHp : remainingStackHP % effUnitHp);

            addFloatingText(`-${modDmg}`, currentDefender.x, currentDefender.y, 'text-rose-500');
            addLog(`Повторна атака (${currentIdx + 2}): ${UNITS_INFO[attacker.unitId].name} -> ${modDmg} шкоди.`);

            currentDefender = { ...currentDefender, count: nC, hp: nTopHP };
            unitsInProgress = unitsInProgress.map(u => u.id === defender.id ? currentDefender : u);
            setUnits([...unitsInProgress]);
            
            currentIdx++;
            nextAttack();
          }, 600);
        } else {
          finalizeAttack(currentDefender, splashTargets, unitsInProgress);
        }
      };
      
      nextAttack();
      return;
    }

    // Counter Attack Logic
    if (defender.count > 0 && attackerInfo.range === 1 && (!defender.hasRetaliated || defenderInfo.special === 'counter_attack_50')) {
      setTimeout(() => {
        triggerEffect(defender.unitId, attacker.unitId, attacker.x, attacker.y, attackerInfo.size || 1);
        const res = applyDamage(currentDefender, attacker, currentUnits, true);
        const finalUnits = currentUnits.map(u => {
          if (u.id === attacker.id) return markUnitActed({ ...u, count: res.newCount, hp: res.newTopHP });
          if (u.id === defender.id) return { ...currentDefender, hasRetaliated: true };
          return u;
        });
        setUnits(finalUnits);
        checkWinCondition(finalUnits);
      }, 600);
      return;
    }

    finalizeAttack(currentDefender, splashTargets);
  };

  const handleAI = (currentUnits: CombatUnit[], myUnit: CombatUnit) => {
    if (gameOver) return;
    
    const targets = currentUnits.filter(u => !u.isEnemy && u.count > 0);
    if (targets.length === 0) return;
    
    const info = UNITS_INFO[myUnit.unitId];
    const mySize = info.size || 1;
    const ranges = info.range;
    const speed = info.speed;

    // Improved AI: Weighted target selection
    const scoredTargets = targets.map(t => {
      const tInfo = UNITS_INFO[t.unitId];
      const tSize = tInfo.size || 1;
      const dist = getManhattanDist(myUnit.x, myUnit.y, mySize, t.x, t.y, tSize);
      
      // HP Factor: Prefer targets that can be killed
      const { totalDmg, effUnitHp } = calculateDamage(myUnit, t, false, currentUnits);
      const tTotalHP = (t.count - 1) * effUnitHp + t.hp;
      const killPercent = Math.min(1, totalDmg / tTotalHP);
      
      // Attack Factor: Target high-threat units (mages, dragons)
      const threatScore = (tInfo.attack * t.count) / 100;
      
      // Distance Factor: Prefer closer targets
      const proximityScore = 15 / (dist + 1);

      // Final Score with some randomness
      let score = (killPercent * 60) + (threatScore * 25) + (proximityScore * 15);
      score *= (0.8 + Math.random() * 0.4);

      return { t, dist, score };
    });

    scoredTargets.sort((a, b) => b.score - a.score);
    const primaryTarget = scoredTargets[0].t;
    const primaryDist = scoredTargets[0].dist;

    // Ranged AI Strategy: Kiting / Maintaining distance
    if (ranges > 1 && primaryDist <= ranges) {
      // Find a spot that's still in range of target but farther from OTHER player units
      // or just stay put if it's safe.
      // For simplicity: if already in range, stay and attack.
      processAttack(currentUnits, myUnit, primaryTarget);
    } else if (primaryDist <= ranges + (mySize > 1 ? 0.5 : 0)) {
      processAttack(currentUnits, myUnit, primaryTarget);
    } else {
      // Melee or out-of-range ranged: Move towards best target
      let newX = myUnit.x;
      let newY = myUnit.y;
      
      let steps = speed;
      while (steps > 0) {
        const dx = Math.sign(primaryTarget.x - newX);
        const dy = Math.sign(primaryTarget.y - newY);
        
        let moved = false;
        if (dx !== 0 && isAreaFree(newX + dx, newY, mySize, myUnit.id, currentUnits)) {
          newX += dx;
          moved = true;
        } else if (dy !== 0 && isAreaFree(newX, newY + dy, mySize, myUnit.id, currentUnits)) {
          newY += dy;
          moved = true;
        }
        
        if (!moved) break;
        steps--;
        
        const tSize = UNITS_INFO[primaryTarget.unitId].size || 1;
        const currentDist = getManhattanDist(newX, newY, mySize, primaryTarget.x, primaryTarget.y, tSize);
        if (currentDist <= (ranges > 1 ? ranges : 1)) break;
      }
      
      const movedUnits = currentUnits.map(u => u.id === myUnit.id ? markUnitActed({ ...u, x: newX, y: newY }) : u);
      const isNowInRange = getManhattanDist(newX, newY, mySize, primaryTarget.x, primaryTarget.y, UNITS_INFO[primaryTarget.unitId].size || 1) <= ranges;
      
      setUnits(movedUnits);
      addLog(`${info.name} (ворог) переміщується.`);
      
      // If ranged enemy moved into range, they can't attack in the same turn in this logic (hasActed set to true)
      // unless we specifically handle double actions. But for AI basic, moving ends turn.
      setTimeout(() => checkWinCondition(movedUnits), 300);
    }
  };

  const determineNextActiveUnit = (currentUnits: CombatUnit[]) => {
    setActiveSkillState(null);
    if (gameOver || !currentUnits.length) return;
    
    const aliveUnits = currentUnits.filter(u => u.count > 0);
    const alivePlayer = aliveUnits.filter(u => !u.isEnemy);
    const aliveEnemy = aliveUnits.filter(u => u.isEnemy);

    if (alivePlayer.length === 0) {
      if (!gameOver) {
        setGameOver('defeat');
        addLog("Ви програли...");
      }
      return;
    }
    if (aliveEnemy.length === 0) {
      if (!gameOver) {
        setGameOver('victory');
        addLog("Перемога!");
      }
      return;
    }

    let readyUnits = aliveUnits.filter(u => !u.hasActed);
    
    // Add hero to potential acting entities if available and hasn't acted
    const canHeroAct = activeHeroId && !hasHeroActedRef.current && roundRef.current > 0;
    
    if (readyUnits.length === 0 && !canHeroAct) {
      // New Round
      const nextRound = roundRef.current + 1;
      setRound(nextRound);
      roundRef.current = nextRound;
      addLog(`Раунд ${nextRound}`);
      const refreshedUnits = aliveUnits.map(u => ({ ...u, hasActed: false, hasRetaliated: false, movedThisTurn: false, extraTurnUsed: false }));
      setUnits(refreshedUnits);
      setHasHeroActed(false);
      hasHeroActedRef.current = false;
      setIsHeroTurn(false);
      
      // Safety timeout to avoid recursive loops
      setTimeout(() => {
        const stillAlive = refreshedUnits.filter(u => u.count > 0);
        if (stillAlive.length > 0) determineNextActiveUnit(stillAlive);
      }, 600);
      return;
    }
    
    const speedHero = 5.5; 
    
    const candidates = [
        ...readyUnits.map(u => {
          const info = UNITS_INFO[u.unitId];
          return { type: 'unit' as const, initiative: info.initiative ?? info.speed, isEnemy: u.isEnemy, id: u.id };
        }),
        ...(canHeroAct ? [{ type: 'hero' as const, initiative: speedHero, isEnemy: false, id: 'hero' }] : [])
    ];

    if (candidates.length === 0) return;

    candidates.sort((a,b) => {
      if (a.initiative !== b.initiative) return b.initiative - a.initiative;
      if (a.isEnemy !== b.isEnemy) return a.isEnemy ? -1 : 1; // Prioritize player on ties if not specified
      return 0;
    });

    const next = candidates[0];
    if (next) {
      if (next.type === 'unit') {
        setIsHeroTurn(false);
        setActiveUnitId(next.id);
        const nextTurn = next.isEnemy ? 'enemy' : 'player';
        setTurn(nextTurn);
        
        if (nextTurn === 'enemy') {
          const unitObj = units.find(u => u.id === next.id);
          if (unitObj) {
            setTimeout(() => handleAI(aliveUnits, unitObj), 1000);
          }
        }
      } else {
        // Hero Turn
        setIsHeroTurn(true);
        setActiveUnitId('hero-token'); 
        setTurn('player');
        addLog("Хід вашого героя!");
      }
    }
  };

  const handleFrenzy = () => {
    if (turn !== 'player' || gameOver || infoMode) return;
    const activeUnit = units.find(u => u.id === activeUnitId);
    if (!activeUnit || activeUnit.unitId !== 'berserk' || activeUnit.frenzyUsed) return;

    const updatedUnits = units.map(u => {
      if (u.id === activeUnit.id) {
        return { ...u, hasActed: false, movedThisTurn: false, extraTurnUsed: true, frenzyUsed: true };
      }
      return u;
    });

    addLog(`${UNITS_INFO[activeUnit.unitId].name} впадає в лють! Додатковий хід.`);
    setUnits(updatedUnits);
    
    // Visual effect
    const effectId = getRandomId('frenzy');
    setEffects(prev => [...prev, { id: effectId, type: 'fire', x: activeUnit.x, y: activeUnit.y, size: 1 }]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== effectId)), 500);
  };

  const checkWinCondition = (currentUnits: CombatUnit[]) => {
    // Redundant now as determineNextActiveUnit handles it, but kept for processAttack flow
    determineNextActiveUnit(currentUnits);
  };

  // Setup Combat
  useEffect(() => {
    determineNextActiveUnit(units);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getUnitAt = (tx: number, ty: number, currentUnits: CombatUnit[] = units) => {
    return currentUnits.find(u => {
      if (u.count <= 0) return false;
      const size = UNITS_INFO[u.unitId].size || 1;
      return tx >= u.x && tx < u.x + size && ty >= u.y && ty < u.y + size;
    });
  };

  const isAreaFree = (x: number, y: number, size: number, excludeId: string, currentUnits: CombatUnit[]) => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const tx = x + c;
        const ty = y + r;
        if (tx < 0 || tx >= GRID_WIDTH || ty < 0 || ty >= GRID_HEIGHT) return false;
        const u = getUnitAt(tx, ty, currentUnits);
        if (u && u.id !== excludeId) return false;
      }
    }
    return true;
  };

  const handleResurrect = (targetId: string) => {
    if (turn !== 'player' || gameOver || infoMode) return;
    const activeUnit = units.find(u => u.id === activeUnitId);
    if (!activeUnit || activeUnit.unitId !== 'e_huntress') return;

    const targetPos = units.find(u => u.id === targetId);
    if (!targetPos || targetPos.isEnemy || targetPos.count >= targetPos.startCount) return;

    // missing troops
    const lost = targetPos.startCount - targetPos.count;
    // Heal random 1-4 but not more than lost
    const healAmount = Math.min(lost, Math.floor(Math.random() * 4) + 1);

    const updatedUnits = units.map(u => {
      if (u.id === activeUnit.id) return markUnitActed(u);
      if (u.id === targetPos.id) return { ...u, count: u.count + healAmount };
      return u;
    });

    addLog(`Друїд воскрешає ${healAmount} ${UNITS_INFO[targetPos.unitId].name}!`);
    setUnits(updatedUnits);
    setActiveSkillState(null);
    
    // Add visual effect
    const tx = targetPos.x;
    const ty = targetPos.y;
    const effId = getRandomId('effect');
    setEffects(prev => [...prev, { id: effId, type: 'heal', x: tx, y: ty, size: UNITS_INFO[targetPos.unitId].size || 1 }]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== effId));
    }, 700);

    determineNextActiveUnit(updatedUnits);
  };

  const handleCurse = (targetId: string) => {
    if (turn !== 'player' || gameOver || infoMode) return;
    const activeUnit = units.find(u => u.id === activeUnitId);
    if (!activeUnit || activeUnit.unitId !== 'o_headhunter') return;

    const targetPos = units.find(u => u.id === targetId);
    if (!targetPos || !targetPos.isEnemy) return;

    const updatedUnits = units.map(u => {
      if (u.id === activeUnit.id) return markUnitActed(u);
      if (u.id === targetPos.id) return { ...u, curses: { attackCurse: (u.curses?.attackCurse || 0) + 10, defenseCurse: (u.curses?.defenseCurse || 0) + 10 } };
      return u;
    });

    addLog(`Некромант проклинає ${UNITS_INFO[targetPos.unitId].name} (-10 АТК/ЗАХ)!`);
    setUnits(updatedUnits);
    setActiveSkillState(null);
    
    const tx = targetPos.x;
    const ty = targetPos.y;
    const effId = getRandomId('effect');
    setEffects(prev => [...prev, { id: effId, type: 'lightning_hit', x: tx, y: ty, size: UNITS_INFO[targetPos.unitId].size || 1 }]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== effId));
    }, 700);

    determineNextActiveUnit(updatedUnits);
  };

  const handleThrowBack = (targetId: string) => {
    if (turn !== 'player' || gameOver || infoMode) return;
    const activeUnit = units.find(u => u.id === activeUnitId);
    if (!activeUnit || activeUnit.unitId !== 'e_druid') return;

    const targetPos = units.find(u => u.id === targetId);
    if (!targetPos || !targetPos.isEnemy) return;
    
    let targetX = targetPos.x;
    const dirX = Math.sign(targetPos.x - activeUnit.x);
    if (dirX !== 0) targetX = targetPos.x + dirX; // push backwards
    
    // Check if place is free, else stay.
    const tSize = UNITS_INFO[targetPos.unitId].size || 1;
    if (isAreaFree(targetX, targetPos.y, tSize, targetPos.id, units)) {
        targetPos.x = targetX;
    }
    
    const { totalDmg, effUnitHp } = calculateDamage(activeUnit, targetPos, false, units);
    const modDmg = Math.floor(totalDmg * 0.5);
    
    let remainingStackHP = (targetPos.count - 1) * effUnitHp + targetPos.hp - modDmg;
    let nC = Math.max(0, Math.ceil(remainingStackHP / effUnitHp));
    let nTopHP = remainingStackHP <= 0 ? 0 : (remainingStackHP % effUnitHp === 0 ? effUnitHp : remainingStackHP % effUnitHp);

    addFloatingText(`-${modDmg}`, targetPos.x, targetPos.y, 'text-rose-500');
    addLog(`Трент відкидає ${UNITS_INFO[targetPos.unitId].name} і наносить ${modDmg} шкоди!`);

    const updatedUnits = units.map(u => {
      if (u.id === activeUnit.id) return markUnitActed(u);
      if (u.id === targetPos.id) return { ...targetPos, count: nC, hp: nTopHP };
      return u;
    });

    setUnits(updatedUnits);
    setActiveSkillState(null);
    checkWinCondition(updatedUnits);

    const effId = getRandomId('effect');
    setEffects(prev => [...prev, { id: effId, type: 'slash', x: targetPos.x, y: targetPos.y, size: tSize }]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== effId));
      determineNextActiveUnit(updatedUnits);
    }, 500);
  };

  const handleCellClick = (x: number, y: number) => {
    if (activeSkillState) setActiveSkillState(null);
    const targetPos = getUnitAt(x, y);

    if (infoMode) {
      if (targetPos) {
        setSelectedUnitInfo(targetPos);
      }
      return;
    }

    setSelectedUnitInfo(null);
    if (turn !== 'player' || gameOver) return;
    const activeUnit = units.find(u => u.id === activeUnitId);
    if (!activeUnit && !isHeroTurn) return;

    if (isHeroTurn && targetPos && targetPos.isEnemy) {
      executeHeroAttack(targetPos);
      return;
    }

    if (!activeUnit) return;

    const activeInfo = UNITS_INFO[activeUnit.unitId];
    const activeSize = activeInfo.size || 1;
    
    const speed = activeInfo.speed;
    const ranges = activeInfo.range;

    let dist = 100;
    if (targetPos) {
      const targetSize = UNITS_INFO[targetPos.unitId].size || 1;
      dist = getManhattanDist(activeUnit.x, activeUnit.y, activeSize, targetPos.x, targetPos.y, targetSize);
    } else {
      dist = getManhattanDist(activeUnit.x, activeUnit.y, activeSize, x, y, 1);
    }

    if (targetPos) {
      if (targetPos.isEnemy) {
        if (dist <= ranges) {
          processAttack(units, activeUnit, targetPos);
        } else if (!activeUnit.movedThisTurn && dist <= speed + (ranges > 1 ? ranges : 1) - 1) { 
          // Move and attack logic
          const targetSize = UNITS_INFO[targetPos.unitId].size || 1;
          let bestX = -1;
          let bestY = -1;
          let minSteps = 999;

          // Check all cells adjacent to target
          for (let ty = targetPos.y - 1; ty <= targetPos.y + targetSize; ty++) {
            for (let tx = targetPos.x - 1; tx <= targetPos.x + targetSize; tx++) {
              if (tx < 0 || tx >= GRID_WIDTH || ty < 0 || ty >= GRID_HEIGHT) continue;
              
              // Is this cell adjacent to target?
              const distToTarget = getManhattanDist(tx, ty, activeSize, targetPos.x, targetPos.y, targetSize);
              if (distToTarget <= (ranges > 1 ? ranges : 1)) {
                // Is it reachable for us?
                const distToMe = getManhattanDist(tx, ty, activeSize, activeUnit.x, activeUnit.y, activeSize);
                if (distToMe <= speed && isAreaFree(tx, ty, activeSize, activeUnit.id, units)) {
                  if (distToMe < minSteps) {
                    minSteps = distToMe;
                    bestX = tx;
                    bestY = ty;
                  }
                }
              }
            }
          }

          if (bestX !== -1) {
            const movedUnits = units.map(u => u.id === activeUnit.id ? { ...u, x: bestX, y: bestY, movedThisTurn: true } : u);
            const updatedActive = { ...activeUnit, x: bestX, y: bestY, movedThisTurn: true };
            
            setUnits(movedUnits);
            
            // Melee restriction: Only charge_attack or double_action can move and hit immediately
            // User requested that units should either walk or hit, so we remove auto-attack for ranged units after moving.
            const canHit = activeInfo.special === 'charge_attack' || activeInfo.special === 'double_action' || activeInfo.special === 'double_turn';
            
            if (canHit) {
                addLog(`${activeInfo.name} наближається і атакує!`);
                setTimeout(() => {
                  processAttack(movedUnits, updatedActive, targetPos);
                }, 300);
            } else {
                addLog(`${activeInfo.name} підійшов до ворога. Бити можна наступного ходу!`);
                setTimeout(() => {
                  determineNextActiveUnit(movedUnits.map(u => u.id === activeUnit.id ? markUnitActed(u) : u));
                }, 500);
            }
          } else {
            addLog("Шлях до ворога заблокований.");
          }
        } else {
          addLog("Ворог занадто далеко.");
        }
      }
    } else {
      // Move for potentially large units
      if (dist <= speed && isAreaFree(x, y, activeSize, activeUnit.id, units)) {
        if ((activeInfo.special === 'double_action' || activeInfo.special === 'double_turn') && !activeUnit.movedThisTurn) {
          // Move but don't end turn
          const updatedUnits = units.map(u => u.id === activeUnit.id ? { ...u, x, y, movedThisTurn: true, hasActed: false } : u);
          setUnits(updatedUnits);
          addLog(`${activeInfo.name} перемістилася і готова до наступної дії!`);
          // We don't call determineNextActiveUnit, so she stays selected
        } else {
          const updatedUnits = units.map(u => u.id === activeUnit.id ? markUnitActed({ ...u, x, y }) : u);
          setUnits(updatedUnits);
          addLog(`${activeInfo.name} перемістився.`);
          determineNextActiveUnit(updatedUnits);
        }
      } else {
        addLog("Неможливо переміститися.");
      }
    }
  };

  // Anti-cheat: sync army losses to global state in real-time
  useEffect(() => {
    if (gameOver !== null || units.length === 0) return;
    
    setArmy(prev => {
      const playerUnitsInBattle = units.filter(u => !u.isEnemy);
      let changed = false;
      const next = { ...prev };
      
      playerUnitsInBattle.forEach(u => {
        const totalLosses = u.startCount - u.count;
        const previouslyReported = reportedLossesRef.current[u.id] || 0;
        const newLosses = Math.max(0, totalLosses - previouslyReported);
        
        if (newLosses > 0) {
          next[u.unitId] = Math.max(0, (next[u.unitId] || 0) - newLosses);
          reportedLossesRef.current[u.id] = totalLosses;
          changed = true;
        }
      });
      
      return changed ? next : prev;
    });
  }, [units, setArmy, gameOver]);

  const executeHeroAttack = (defender: CombatUnit) => {
    if (!activeHeroId) return;
    import('../lib/game.types').then(({ HEROES_INFO }) => {
        const hero = HEROES_INFO[activeHeroId as keyof typeof HEROES_INFO];
        const dmg = hero.damage;
        
        setHeroAttackAnimation(true);
        // Visual effect for hero attack
        const effectId = getRandomId('hero-atk');
        const effectId2 = getRandomId('hero-atk-2');
        setEffects(prev => [
            ...prev, 
            { id: effectId, type: 'fire', x: defender.x, y: defender.y, size: UNITS_INFO[defender.unitId].size || 1 },
            { id: effectId2, type: 'lightning_hit', x: defender.x, y: defender.y, size: UNITS_INFO[defender.unitId].size || 1 }
        ]);
        setShake(true);
        setTimeout(() => setShake(false), 300);
        
        setTimeout(() => {
            setEffects(prev => prev.filter(e => e.id !== effectId && e.id !== effectId2));
            setHeroAttackAnimation(false);

            const effUnitHp = defender.isEnemy ? UNITS_INFO[defender.unitId].hp : Math.floor(UNITS_INFO[defender.unitId].hp * hpMod);
            let remainingStackHP = (defender.count - 1) * effUnitHp + defender.hp - dmg;
            let newCount = Math.max(0, Math.ceil(remainingStackHP / effUnitHp));
            let killed = defender.count - newCount;
            let newTopHP = remainingStackHP <= 0 ? 0 : (remainingStackHP % effUnitHp === 0 ? effUnitHp : remainingStackHP % effUnitHp);

            setFloatingTexts(prev => [...prev, { id: Date.now(), text: `-${dmg}`, x: defender.x, y: defender.y, color: 'text-indigo-400 font-black' }]);
            addLog(`${hero.name} наносит ${dmg} урона ${UNITS_INFO[defender.unitId].name}!`);

            const updatedUnits = units.map(u => u.id === defender.id ? { ...u, count: newCount, hp: newTopHP } : u);
            setUnits(updatedUnits);
            setHasHeroActed(true);
            hasHeroActedRef.current = true;
            setIsHeroTurn(false);
            setActiveUnitId(null);
            
            setTimeout(() => {
                checkWinCondition(updatedUnits);
                determineNextActiveUnit(updatedUnits);
            }, 500);
        }, 800);
    });
  };

  const handleFinish = () => {
    // Final sync for current state. Since useEffect might have already synced up to the last move,
    // this just acts as a final catch-all.
    setArmy(prev => {
      const next = { ...prev };
      let changed = false;
      units.forEach(u => {
        if (!u.isEnemy) {
          const totalLosses = u.startCount - u.count;
          const previouslyReported = reportedLossesRef.current[u.id] || 0;
          const newLosses = Math.max(0, totalLosses - previouslyReported);
          if (newLosses > 0) {
            next[u.unitId] = Math.max(0, (next[u.unitId] || 0) - newLosses);
            reportedLossesRef.current[u.id] = totalLosses;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });

    if (gameOver === 'victory') {
      if (node.type !== 'settlement') {
        // Reward for regular nodes
        setResources(addResources(resources, node.reward));
      }
      
      // Handle item reward
      if (node.itemReward === 'weapon-legend') {
        import('../lib/game.types').then(({ LEGENDARY_WEAPON }) => {
          setEquipment(prev => ({ ...prev, weapon: LEGENDARY_WEAPON }));
        });
        alert("ПОЗДРАВЛЯЕМ! Вы прошли кампанию первого мира! Вы получили Легендарное Оружие!");
      }

      // Mark node cleared unless it is a daily boss or Level 3-1 (infinite battles)
      if (node.type !== 'daily_boss' && node.campaignLevel !== '3-1') {
        setMapNodes(mapNodes.map(m => m.id === node.id ? { ...m, cleared: true } : m));
      }
    }
    
    onEnd();
  };

  // Generate grid UI
  const gridCells = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const activeUnit = activeUnitId ? units.find(act => act.id === activeUnitId) : null;
      const uUnderTile = units.find(u => {
        if (u.count <= 0) return false;
        const size = UNITS_INFO[u.unitId].size || 1;
        return x >= u.x && x < u.x + size && y >= u.y && y < u.y + size; // Covers multi-tiles
      });
      
      const isOrigin = uUnderTile && uUnderTile.x === x && uUnderTile.y === y;
      
      let moveRadius = 0;
      if (activeUnit && activeUnit.unitId) {
        moveRadius = UNITS_INFO[activeUnit.unitId]?.speed || 1;
      }
      
      const activeSize = activeUnit ? (UNITS_INFO[activeUnit.unitId].size || 1) : 1;
      const dist = activeUnit ? getManhattanDist(activeUnit.x, activeUnit.y, activeSize, x, y, 1) : Infinity;
      const isAllowedMove = turn === 'player' && activeUnit && !uUnderTile && dist <= moveRadius && isAreaFree(x, y, activeSize, activeUnit.id, units);
      
      const isPickableTarget = turn === 'player' && activeUnit && uUnderTile?.isEnemy && dist <= (UNITS_INFO[activeUnit.unitId]?.range || 1);
      
      const isPickableResurrectTarget = turn === 'player' && activeUnit && activeUnit.unitId === 'e_huntress' && activeSkillState === 'resurrect' && uUnderTile && !uUnderTile.isEnemy && uUnderTile.count < uUnderTile.startCount;
      const isUnhealableTarget = turn === 'player' && activeUnit && activeUnit.unitId === 'e_huntress' && activeSkillState === 'resurrect' && uUnderTile && !uUnderTile.isEnemy && uUnderTile.count >= uUnderTile.startCount;
      
      const isPickableCurseTarget = turn === 'player' && activeUnit && activeUnit.unitId === 'o_headhunter' && activeSkillState === 'curse' && uUnderTile && uUnderTile.isEnemy;
      const isPickableThrowTarget = turn === 'player' && activeUnit && activeUnit.unitId === 'e_druid' && activeSkillState === 'throw_back' && uUnderTile && uUnderTile.isEnemy && dist <= 1;

      const isTakingDamage = effects.some(e => e.x === x && e.y === y);

      const isPaladinAuraZone = activeUnit && activeUnit.unitId === 'h_archer' && getManhattanDist(activeUnit.x, activeUnit.y, activeSize, x, y, 1) <= 1;

      gridCells.push(
        <div 
          key={`${x}-${y}`} 
          onClick={() => {
            if (isPickableResurrectTarget) handleResurrect(uUnderTile.id);
            else if (isPickableCurseTarget) handleCurse(uUnderTile.id);
            else if (isPickableThrowTarget) handleThrowBack(uUnderTile.id);
            else handleCellClick(x, y);
          }}
          className={cn(
            "relative w-full aspect-square border border-stone-700/10 flex items-center justify-center transition-colors overflow-visible",
            isAllowedMove && "cursor-pointer border-green-400/40 shadow-[inset_0_0_10px_rgba(74,222,128,0.2)] bg-green-400/5",
            isPickableTarget && !activeSkillState && "bg-red-500/10 cursor-pointer hover:bg-red-500/20 z-10",
            isPickableResurrectTarget && "bg-blue-500/20 cursor-pointer hover:bg-blue-500/40 z-10",
            (isPickableCurseTarget || isPickableThrowTarget) && "bg-purple-500/30 cursor-pointer hover:bg-purple-500/50 z-10",
            isUnhealableTarget && "bg-red-500/10 z-0",
            isPaladinAuraZone && "bg-yellow-500/30"
          )}
        >
          {isAllowedMove && (
             <div className="relative flex items-center justify-center pointer-events-none">
                <div className="absolute w-3 h-3 rounded-full bg-green-500/40 blur-[3px] animate-pulse"></div>
                <div className="relative w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]"></div>
             </div>
          )}
          {uUnderTile && isOrigin && (
            <motion.div 
              layoutId={uUnderTile.id}
              onClick={(e) => {
                e.stopPropagation(); // Prevent grid click
                if (isPickableResurrectTarget) handleResurrect(uUnderTile.id);
                else if (isPickableCurseTarget) handleCurse(uUnderTile.id);
                else if (isPickableThrowTarget) handleThrowBack(uUnderTile.id);
                else handleCellClick(x, y); 
              }}
              animate={{
                x: attackingUnitId === uUnderTile.id ? (uUnderTile.isEnemy ? -20 : 20) : 0,
                rotate: isTakingDamage ? [0, -5, 5, -5, 0] : 0,
                filter: isTakingDamage ? 'brightness(1.5) saturate(1.5)' : 'none',
                scale: isTakingDamage ? 0.95 : 1
              }}
              transition={{ 
                type: "spring", 
                bounce: 0, 
                duration: 0.3,
                rotate: { type: "tween", duration: 0.3 },
                filter: { duration: 0.2 }
              }}
              className={cn(
                "relative z-10 rounded bg-stone-900 border overflow-visible cursor-pointer",
                uUnderTile.isEnemy 
                  ? "border-red-500 shadow-[0_0_5px_rgba(255,0,0,0.4)]" 
                  : isUnhealableTarget
                    ? "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.7)]"
                    : isPickableResurrectTarget 
                      ? "border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                      : (isPickableCurseTarget || isPickableThrowTarget)
                        ? "border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.8)]"
                        : "border-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.4)]",
                uUnderTile.id === activeUnitId && "border-white shadow-[0_0_15px_rgba(255,255,255,0.7)] z-20"
              )}
              style={{
                width: `${(UNITS_INFO[uUnderTile.unitId].size || 1) * 100 - 10}%`,
                height: `${(UNITS_INFO[uUnderTile.unitId].size || 1) * 100 - 10}%`,
                position: 'absolute',
                top: '5%',
                left: '5%',
                zIndex: (UNITS_INFO[uUnderTile.unitId].size || 1) > 1 ? 40 : 30
              }}
            >
              {UNITS_INFO[uUnderTile.unitId].image ? (
                <img src={UNITS_INFO[uUnderTile.unitId].image} alt={UNITS_INFO[uUnderTile.unitId].name} className="w-full h-full object-cover rounded-[1px]" style={{ transform: uUnderTile.isEnemy ? 'scaleX(-1)' : 'none' }} />
              ) : (
                <div className="text-[7px] font-bold truncate px-0.5 w-full text-center leading-none text-white whitespace-nowrap">
                  {UNITS_INFO[uUnderTile.unitId].name.slice(0,3)}
                </div>
              )}
              <div 
                className="text-[8px] bg-stone-900 px-1 rounded-sm absolute -bottom-1 -right-1 font-black font-mono border z-50 shadow-md"
                style={{ 
                  borderColor: uUnderTile.isEnemy ? '#ef4444' : '#f59e0b',
                  color: uUnderTile.isEnemy ? '#fca5a5' : '#fef3c7'
                }}
              >
                {uUnderTile.count}
              </div>
            </motion.div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-stone-950 flex flex-col items-center justify-start py-2 overflow-hidden">
      
      {/* Top Bar - Compact */}
      <div className="w-full h-10 flex justify-between items-center px-4 mb-2">
        <h2 className="text-amber-500 font-bold tracking-widest uppercase flex items-center gap-2 text-shadow-glow text-sm">
          <Sword className="w-4 h-4"/> БОЙ
        </h2>
        <div className="text-xs font-black flex items-center gap-4 tracking-widest">
          <div className="flex items-center gap-2 uppercase">
            <span className={cn("text-[10px]", turn === 'player' ? 'text-amber-400' : 'text-stone-500')}>Я</span>
            <span className="text-stone-600 font-light text-[8px]">VS</span>
            <span className={cn("text-[10px]", turn === 'enemy' ? 'text-red-400' : 'text-stone-500')}>ВОРОГ</span>
          </div>
          <span className="text-[10px] text-stone-400 font-mono uppercase bg-stone-800 px-2 py-0.5 rounded">Раунд {round}</span>
        </div>
      </div>

      {/* Battlefield Grid - Responsive sizing */}
      <div 
        className={cn(
          "bg-stone-900 bg-[url('/fight.png')] bg-cover bg-center w-full aspect-square max-w-[420px] relative rounded border-2 border-stone-800 shadow-2xl overflow-visible shrink-0 mx-auto transition-transform duration-75",
          shake && "animate-shake"
        )}
      >
        <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-[0.5px] rounded-sm pointer-events-none"></div>
        <div 
          className="relative z-10 w-full h-full grid"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: `calc(100% / ${GRID_WIDTH}) calc(100% / ${GRID_HEIGHT})`
          }}
        >
          {gridCells}
          
          {/* Hero Attack Animation */}
          {heroAttackAnimation && activeHeroId && (
            <motion.div 
               initial={{ scale: 0, opacity: 0 }}
               animate={{ scale: [1, 2], opacity: [1, 0] }}
               className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
               <div className="w-full h-full bg-indigo-500/10 blur-3xl animate-pulse"></div>
            </motion.div>
          )}

          {/* Projectiles */}
          {projectiles.map(p => (
            <motion.div
              key={p.id}
              initial={{ 
                left: `${(p.startX + 0.5) * (100/GRID_WIDTH)}%`, 
                top: `${(p.startY + 0.5) * (100/GRID_HEIGHT)}%`,
                scale: 0.2,
                opacity: 0,
                rotate: 0,
              }}
              animate={{ 
                left: `${(p.endX + 0.5) * (100/GRID_WIDTH)}%`, 
                top: `${(p.endY + 0.5) * (100/GRID_HEIGHT)}%`,
                scale: 1,
                opacity: 1,
                rotate: p.type === 'arrow' ? Math.atan2(p.endY - p.startY, p.endX - p.startX) * 180 / Math.PI : 0,
              }}
              transition={{ duration: 0.5, ease: "linear" }}
              className="absolute w-6 h-6 z-[100] flex items-center justify-center pointer-events-none"
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              {p.type === 'arrow' && (
                <div className="relative w-8 h-1 flex items-center justify-end">
                   <div className="w-full h-0.5 bg-stone-300 shadow-[0_0_5px_white]"></div>
                   <div className="w-2 h-2 border-t-2 border-r-2 border-white rotate-45 absolute -right-0.5"></div>
                   <div className="absolute right-full w-4 h-1 bg-gradient-to-r from-transparent to-white/30 blur-[2px]"></div>
                </div>
              )}
              {p.type === 'fireball' && (
                <div className="w-8 h-8 flex items-center justify-center">
                  <div className="w-6 h-6 bg-orange-600 rounded-full shadow-[0_0_20px_#f97316] relative overflow-visible animate-pulse">
                    <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping blur-sm opacity-50"></div>
                    <div className="absolute -left-4 w-4 h-3 bg-gradient-to-r from-transparent to-orange-500 blur-[3px]"></div>
                  </div>
                </div>
              )}
              {p.type === 'lightning' && (
                <div className="w-2 h-16 bg-blue-100 shadow-[0_0_25px_#0ea5e9] animate-pulse border-white border relative">
                   <div className="absolute inset-0 bg-blue-400 blur-md opacity-50"></div>
                </div>
              )}
              {p.type === 'nature' && (
                <div className="w-8 h-8 flex items-center justify-center">
                  <div className="w-5 h-5 bg-green-400 rounded-full shadow-[0_0_20px_#4ade80] relative overflow-visible animate-pulse">
                    <div className="absolute inset-0 bg-emerald-300 rounded-full animate-ping blur-[2px] opacity-60"></div>
                    <div className="absolute inset-[-4px] border border-green-200/50 rounded-full animate-[spin_2s_linear_infinite]"></div>
                    <div className="absolute inset-[-8px] border border-emerald-400/30 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* Hit Effects */}
          {effects.map(e => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: [1, 1.5, 1], rotate: [0, 45, 0] }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              exit={{ opacity: 0 }}
              className="absolute z-[110] pointer-events-none"
              style={{
                left: `${(e.x + (e.size-1)/2 + 0.5) * (100/GRID_WIDTH)}%`,
                top: `${(e.y + (e.size-1)/2 + 0.5) * (100/GRID_HEIGHT)}%`,
                width: '60px',
                height: '60px',
                transform: 'translate(-50%, -50%)'
              }}
            >
              {e.type === 'slash' && (
                <div className="w-full h-full flex items-center justify-center">
                  <motion.div 
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: [0, 1, 0], rotate: [45, 60] }}
                    transition={{ duration: 0.3 }}
                    className="w-20 h-2 bg-white blur-[1px] shadow-[0_0_15px_white] rounded-full"
                  />
                  <motion.div 
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: [0, 0.5, 0], x: 5 }}
                    transition={{ duration: 0.3 }}
                    className="absolute w-12 h-1 bg-red-400/50 blur-[2px] rotate-[135deg]"
                  />
                </div>
              )}
              {e.type === 'hit' && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-white rounded-full animate-ping shadow-[0_0_15px_white]"></div>
                  <div className="absolute w-2 h-2 bg-white rounded-full animate-bounce"></div>
                </div>
              )}
              {e.type === 'heal' && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-green-500 rounded-full animate-ping shadow-[0_0_15px_#22c55e]"></div>
                </div>
              )}
              {e.type === 'fire' && (
                <div className="w-full h-full flex items-center justify-center relative">
                   <motion.div 
                     initial={{ scale: 0, opacity: 0 }}
                     animate={{ scale: [1, 2, 0], opacity: [1, 0.8, 0] }}
                     transition={{ duration: 0.5 }}
                     className="absolute inset-0 bg-orange-500 rounded-full blur-xl"
                   />
                   <div className="w-8 h-8 bg-red-600 rounded-full blur-md animate-bounce"></div>
                   <div className="w-4 h-4 bg-yellow-400 rounded-full blur-sm absolute"></div>
                </div>
              )}
              {e.type === 'ice' && (
                <div className="w-full h-full flex items-center justify-center relative">
                   <motion.div 
                     initial={{ scale: 0, opacity: 0 }}
                     animate={{ scale: [1, 2, 0], opacity: [1, 0.8, 0] }}
                     transition={{ duration: 0.5 }}
                     className="absolute inset-0 bg-blue-300 rounded-full blur-xl"
                   />
                   <div className="w-8 h-8 bg-cyan-100 rounded-full blur-md animate-pulse"></div>
                   <div className="w-4 h-4 bg-white rounded-full blur-sm absolute"></div>
                </div>
              )}
              {e.type === 'lightning_hit' && (
                <div className="w-full h-full flex items-center justify-center">
                  <motion.div 
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: [0, 1, 0, 1, 0], scaleY: [0, 1.2, 1], x: [-2, 2, -2, 0] }}
                    transition={{ duration: 0.5, ease: "linear" }}
                    className="w-1.5 h-24 bg-blue-100 blur-[1px] rotate-12 shadow-[0_0_20px_#0ea5e9] rounded-full"
                  />
                  <div className="absolute w-12 h-12 bg-blue-400/30 rounded-full blur-xl animate-pulse"></div>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [1, 0, 1, 0], scale: [1, 1.5] }}
                    transition={{ duration: 0.5, ease: "linear" }}
                    className="absolute w-8 h-8 rounded-full border-2 border-cyan-200 animate-ping"
                  />
                </div>
              )}
            </motion.div>
          ))}

          {/* Floating Texts */}
          <AnimatePresence>
            {floatingTexts.map(f => (
              <motion.div
                key={f.id}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -30 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={cn("absolute z-[120] font-black text-xl pointer-events-none text-shadow-glow", f.color || "text-rose-500")}
                style={{
                  left: `${(f.x + 0.5) * (100/GRID_WIDTH)}%`,
                  top: `${(f.y + 0.5) * (100/GRID_HEIGHT)}%`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                {f.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Hero Slot & Action Bar - Compressed */}
      <div className="w-full max-w-[420px] mt-2 px-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex flex-col items-center gap-0.5">
             {activeHeroId ? (
                <div className={cn(
                  "w-12 h-12 rounded border relative overflow-hidden transition-all wow-panel p-0.5",
                  isHeroTurn ? "border-amber-400 shadow-[0_0_10px_#f59e0b] scale-105" : "border-stone-800 opacity-60"
                )}>
                   <img src={HEROES_INFO[(activeHeroId as HeroId)].image} className="w-full h-full object-cover" alt="Hero" />
                   {hasHeroActed && (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-red-600 rotate-45"></div>
                     </div>
                   )}
                   {isHeroTurn && (
                     <div className="absolute inset-0 border-2 border-amber-500 animate-pulse pointer-events-none"></div>
                   )}
                </div>
             ) : (
                <div className="w-12 h-12 rounded border border-stone-800 bg-stone-900/50 flex items-center justify-center">
                   <div className="text-[7px] text-stone-600 font-black uppercase text-center leading-none">Немає героя</div>
                </div>
             )}
             <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest leading-none">Герой</span>
          </div>

          <div className="flex-1 flex gap-1 justify-end items-center">
              <button 
                onClick={() => {
                  setInfoMode(!infoMode);
                  setSelectedUnitInfo(null);
                }}
                className={cn(
                  "wow-panel-metal px-3 py-2 flex items-center gap-1.5 transition-all text-white active:scale-95",
                  infoMode ? "bg-indigo-900/40 border-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.4)]" : "bg-stone-800 hover:bg-stone-700"
                )}
               >
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider">{infoMode ? 'Огляд' : 'Інфо'}</span>
               </button>

             {isHeroTurn && (
                  <div className="wow-panel-metal px-4 py-2 flex items-center gap-2 bg-indigo-900/60 border-indigo-500 animate-pulse transition-all">
                     <Swords className="w-4 h-4 text-indigo-400" />
                     <span className="text-[10px] font-black text-white uppercase tracking-wider">Хід героя: Оберіть ціль</span>
                  </div>
             )}
             
             {units.find(u => u.id === activeUnitId)?.unitId === 'e_huntress' && (
                 <button 
                  onClick={(e) => { e.stopPropagation(); setActiveSkillState(activeSkillState === 'resurrect' ? null : 'resurrect'); }}
                  className={cn(
                    "wow-panel-metal px-4 py-2 flex items-center gap-2 transition-all min-w-[120px] justify-center",
                    activeSkillState === 'resurrect' ? "bg-green-700 border-green-300 shadow-[0_0_15px_rgba(34,197,94,0.6)] scale-105" : "bg-stone-800 hover:bg-stone-700"
                  )}
                 >
                    <img src="/unitskills/druidskill.png" className="w-6 h-6 object-contain" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Воскресити</span>
                 </button>
             )}
             {units.find(u => u.id === activeUnitId)?.unitId === 'o_headhunter' && (
                 <button 
                  onClick={(e) => { e.stopPropagation(); setActiveSkillState(activeSkillState === 'curse' ? null : 'curse'); }}
                  className={cn(
                    "wow-panel-metal px-4 py-2 flex items-center gap-2 transition-all min-w-[120px] justify-center",
                    activeSkillState === 'curse' ? "bg-purple-700 border-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.6)] scale-105" : "bg-stone-800 hover:bg-stone-700"
                  )}
                 >
                    <img src="/unitskills/necromantskill.png" className="w-6 h-6 object-contain" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Прокльон</span>
                 </button>
             )}
             {units.find(u => u.id === activeUnitId)?.unitId === 'e_druid' && (
                 <button 
                  onClick={(e) => { e.stopPropagation(); setActiveSkillState(activeSkillState === 'throw_back' ? null : 'throw_back'); }}
                  className={cn(
                    "wow-panel-metal px-3 py-2 flex items-center gap-2 transition-all min-w-[110px] justify-center",
                    activeSkillState === 'throw_back' ? "bg-yellow-700 border-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.6)] scale-105" : "bg-stone-800 hover:bg-stone-700"
                  )}
                 >
                    <img src="/unitskills/treantskill.png" className="w-5 h-5 object-contain" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Кидок</span>
                 </button>
             )}
          </div>
      </div>

      {/* Info Panel / Tooltips */}
      {/* Floating Info Overlay */}
      <AnimatePresence>
        {selectedUnitInfo && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[95%] max-w-[400px] bg-stone-950/95 border border-stone-800 rounded-lg p-3 z-[150] shadow-2xl backdrop-blur-md"
          >
            <button 
              onClick={() => setSelectedUnitInfo(null)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center border border-white z-[160]"
            >✕</button>
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded bg-stone-900 border border-stone-700 overflow-hidden flex-shrink-0">
                <img src={UNITS_INFO[selectedUnitInfo.unitId].image} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-amber-500 uppercase tracking-tighter">{UNITS_INFO[selectedUnitInfo.unitId].name} <span className="text-stone-500 text-xs">x{selectedUnitInfo.count}</span></h3>
                  <div className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-400 uppercase font-mono">
                    {UNITS_INFO[selectedUnitInfo.unitId].combatType === 'melee' ? 'Ближній' : 'Дальній'}
                  </div>
                </div>
                <p className="text-[10px] text-stone-300 italic mb-1 leading-tight">{UNITS_INFO[selectedUnitInfo.unitId].description}</p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-[9px] text-stone-400 flex flex-col">
                    <span className="uppercase opacity-50">Витривалість</span>
                    <span className="text-red-400 font-bold">{selectedUnitInfo.hp} / {selectedUnitInfo.isEnemy ? UNITS_INFO[selectedUnitInfo.unitId].hp : Math.floor(UNITS_INFO[selectedUnitInfo.unitId].hp * hpMod)} HP</span>
                    {!selectedUnitInfo.isEnemy && hpMod > 1 && <span className="text-[7px] text-green-500">+{Math.round((hpMod-1)*100)}% к-т ШОП</span>}
                  </div>
                  <div className="text-[9px] text-stone-400 flex flex-col">
                    <span className="uppercase opacity-50">Атака</span>
                    <span className="text-amber-500 font-bold">{selectedUnitInfo.isEnemy ? UNITS_INFO[selectedUnitInfo.unitId].attack : Math.floor(UNITS_INFO[selectedUnitInfo.unitId].attack * atkMod)}</span>
                    {!selectedUnitInfo.isEnemy && atkMod > 1 && <span className="text-[7px] text-green-500">+{Math.round((atkMod-1)*100)}% к-т ШОП</span>}
                  </div>
                  <div className="text-[9px] text-stone-400 flex flex-col">
                    <span className="uppercase opacity-50">Захист</span>
                    <span className="text-blue-300 font-bold">{selectedUnitInfo.isEnemy ? UNITS_INFO[selectedUnitInfo.unitId].defense : Math.floor(UNITS_INFO[selectedUnitInfo.unitId].defense * defMod)}</span>
                    {!selectedUnitInfo.isEnemy && defMod > 1 && <span className="text-[7px] text-green-500">+{Math.round((defMod-1)*100)}% к-т ШОП</span>}
                  </div>
                  <div className="text-[9px] text-stone-400 flex flex-col">
                    <span className="uppercase opacity-50">Шкода</span>
                    <span className="text-orange-400 font-bold">{UNITS_INFO[selectedUnitInfo.unitId].minDamage}-{UNITS_INFO[selectedUnitInfo.unitId].maxDamage}</span>
                  </div>
                  <div className="text-[9px] text-stone-400 flex flex-col">
                    <span className="uppercase opacity-50">Дистанція / Хід</span>
                    <span className="text-stone-300 font-bold">{UNITS_INFO[selectedUnitInfo.unitId].range} кл. / {UNITS_INFO[selectedUnitInfo.unitId].speed} кл.</span>
                  </div>
                  <div className="text-[9px] text-stone-400 flex flex-col">
                    <span className="uppercase opacity-50">Здібність</span>
                    <span className="text-amber-300 font-bold uppercase tracking-wider text-[8px] leading-tight">
                      {UNITS_INFO[selectedUnitInfo.unitId].special === 'double_attack' ? 'Подвійна атака' : 
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'counter_attack_50' ? 'Відповідна (50%)' : 
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'splash_50' ? 'Вибух (50%)' : 
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'active_resurrect_1_4' ? 'Воскресіння' :
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'active_curse_10' ? 'Прокляття' :
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'active_throw_back' ? 'Кидок назад' :
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'triple_attack_50_25' ? 'Потрійна атк.' :
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'double_attack_80' ? 'Двічі (80%)' :
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'crit_30_x1_5' ? 'Крит x1.5' :
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'aura_def_10_hp_20' ? 'Аура Захисту' :
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'charge_attack' ? 'Натиск' :
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'splash_25' ? 'Вибух (25%)' :
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'frenzy' ? 'Лють' :
                       'Немає'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2 w-full max-w-[420px] flex flex-col gap-1 shrink-0 px-2">
        {/* Battle Controls */}
        <div className="flex gap-2 h-9">
          <button 
            onClick={() => {
              setInfoMode(!infoMode);
              setSelectedUnitInfo(null);
            }}
            className={cn(
              "flex-1 px-2 py-0 rounded font-black text-[10px] uppercase tracking-widest border transition-all shadow active:scale-95",
              infoMode 
                ? "bg-red-500/20 border-red-500 text-red-500 shadow-red-500/20" 
                : "bg-green-500/20 border-green-500 text-green-500 shadow-green-500/20"
            )}
          >
            {infoMode ? "Скасувати" : "ІНФО (ОГЛЯД)"}
          </button>
          
          {turn === 'player' && (
            <button 
              onClick={() => {
                if (activeUnitId === 'hero-token') {
                  setHasHeroActed(true);
                  hasHeroActedRef.current = true;
                  setIsHeroTurn(false);
                  setActiveUnitId(null);
                  setTimeout(() => determineNextActiveUnit(units), 100);
                  return;
                }
                if (activeUnitId) {
                  const updatedUnits = units.map(u => u.id === activeUnitId ? markUnitActed(u) : u);
                  determineNextActiveUnit(updatedUnits);
                }
              }}
              className="flex-1 px-2 py-0 bg-stone-800 border border-stone-700 text-stone-300 rounded font-black text-[10px] uppercase hover:bg-stone-700"
            >
              ПАС
            </button>
          )}
        </div>

        {/* Combat Log - Height restricted to 3 lines */}
        <div className="w-full h-[52px] wow-panel p-1.5 overflow-hidden text-[9px] font-mono flex flex-col-reverse text-stone-400 bg-stone-900/80">
          {log.map((m, i) => (
            <div key={i} className={cn("leading-tight truncate", i === 0 ? "text-amber-200 font-bold" : "opacity-60")}>
              &gt; {m}
            </div>
          ))}
        </div>
      </div>

      {/* Game Over Screen */}
      <AnimatePresence>
        {gameOver && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6"
          >
            {gameOver === 'victory' ? (
              <>
                <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(0,255,0,0.5)]">
                  <Shield className="w-10 h-10"/>
                </div>
                <h1 className="text-4xl font-black text-green-400 mb-2 drop-shadow-lg">ПЕРЕМОГА!</h1>
                <p className="text-slate-400 text-center mb-6">Ворог повалений. Ви здобули трофеї.</p>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl w-full max-w-xs mb-8 flex flex-wrap justify-center gap-4 text-sm font-mono">
                  {node.type === 'settlement' ? (
                    <>
                      {settlementRewardsRef.current ? (
                        <>
                          {settlementRewardsRef.current.gold > 0 && <span className="text-yellow-500">+{settlementRewardsRef.current.gold} Золото</span>}
                          {settlementRewardsRef.current.wood > 0 && <span className="text-amber-600">+{settlementRewardsRef.current.wood} Дерево</span>}
                          {settlementRewardsRef.current.stone > 0 && <span className="text-stone-400">+{settlementRewardsRef.current.stone} Камінь</span>}
                          {settlementRewardsRef.current.food > 0 && <span className="text-green-500">+{settlementRewardsRef.current.food} 🍞</span>}
                          {(settlementRewardsRef.current.crystals || 0) > 0 && <span className="text-indigo-400">+{(settlementRewardsRef.current.crystals || 0)} 💎</span>}
                        </>
                      ) : (
                        <span className="text-stone-500 italic">Трофеї підраховуються...</span>
                      )}
                    </>
                  ) : (
                    <>
                      {node.reward.gold && <span className="text-yellow-500">+{node.reward.gold} Золото</span>}
                      {node.reward.crystals && <span className="text-indigo-400">+{node.reward.crystals} 💎</span>}
                      {node.reward.wood && <span className="text-amber-600">+{node.reward.wood} Дерево</span>}
                      {node.reward.food && <span className="text-green-500">+{node.reward.food} 🍞</span>}
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,0,0,0.5)]">
                  <Skull className="w-10 h-10"/>
                </div>
                <h1 className="text-4xl font-black text-red-500 mb-2 drop-shadow-lg">ПОРАЗКА...</h1>
                <p className="text-slate-400 text-center mb-4">Ваші війська були знищені.</p>
                {node.type === 'settlement' && settlementRewardsRef.current && (
                  <div className="bg-slate-900 border border-red-900/50 p-4 rounded-xl w-full max-w-xs mb-8 flex flex-wrap justify-center gap-4 text-sm font-mono">
                    <div className="w-full text-center text-red-500 uppercase text-[10px] font-black mb-1">Ви втратили (50%):</div>
                    {settlementRewardsRef.current.gold > 0 && <span className="text-yellow-600">-{settlementRewardsRef.current.gold} Золото</span>}
                    {settlementRewardsRef.current.wood > 0 && <span className="text-amber-800">-{settlementRewardsRef.current.wood} Дерево</span>}
                    {settlementRewardsRef.current.stone > 0 && <span className="text-stone-600">-{settlementRewardsRef.current.stone} Камінь</span>}
                    {settlementRewardsRef.current.food > 0 && <span className="text-green-700">-{settlementRewardsRef.current.food} 🍞</span>}
                    {(settlementRewardsRef.current.crystals || 0) > 0 && <span className="text-indigo-600">-{(settlementRewardsRef.current.crystals || 0)} 💎</span>}
                  </div>
                )}
                {!settlementRewardsRef.current && node.type === 'settlement' && (
                   <p className="text-stone-500 text-[10px] mb-8 animate-pulse italic">Підрахунок втрат...</p>
                )}
              </>
            )}
            
            <button 
              onClick={handleFinish}
              className="px-8 py-3 wow-button font-black rounded-lg shadow-xl tracking-widest uppercase transition-all"
            >
              Продовжити
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
