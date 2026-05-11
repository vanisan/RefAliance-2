import { useState, useEffect, useRef } from 'react';
import { useGame } from '../lib/game-context';
import { MapNode, UNITS_INFO, UnitId } from '../lib/game.types';
import { addResources, cn } from '../lib/game.utils';
import { getRandomId, getRandomDamage } from '../lib/combat.utils';
import { Skull, Shield, Sword } from 'lucide-react';
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
  movedThisTurn?: boolean;
  extraTurnUsed?: boolean;
};

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;

interface Projectile {
  id: string;
  type: 'arrow' | 'fireball' | 'lightning' | 'bite' | 'slash';
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
  const { army, setArmy, resources, setResources, mapNodes, setMapNodes, equipment, setEquipment } = useGame();
  
  const reportedLossesRef = useRef<Record<string, number>>({});

  // Equipment stats modifiers
  const atkMod = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.attackBonus || 0), 0) / 100;
  const defMod = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.defenseBonus || 0), 0) / 100;
  const hpMod  = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.hpBonus || 0), 0) / 100;

  // Visual effects state
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [effects, setEffects] = useState<AttackEffect[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<{ id: number, text: string, x: number, y: number, color?: string }[]>([]);
  const [selectedUnitInfo, setSelectedUnitInfo] = useState<CombatUnit | null>(null);
  const [infoMode, setInfoMode] = useState(false);
  const [isHealMode, setIsHealMode] = useState(false);

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
          hasActed: false 
        });
        pY += size;
      }
    });

    let eY = 0;
    node.enemies.forEach((e, idx) => {
      const info = UNITS_INFO[e.unitId];
      const size = info.size || 1;
      if (e.count > 0 && eY + size <= GRID_HEIGHT) {
        initialUnits.push({ 
          id: `e-${e.unitId}-${idx}-${eY}`, 
          unitId: e.unitId, 
          count: e.count, 
          startCount: e.count,
          hp: info.hp, 
          isEnemy: true, 
          x: GRID_WIDTH - size, 
          y: eY, 
          hasActed: false 
        });
        eY += size;
      }
    });
    return initialUnits;
  });
  const [turn, setTurn] = useState<'player' | 'enemy'>(node.type === 'boss' ? 'enemy' : 'player');
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>(['Бой начался!']);
  const [gameOver, setGameOver] = useState<'victory' | 'defeat' | null>(null);
  const [round, setRound] = useState(1);

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 5));

  // Forward declarations for ESLint issues
  const markUnitActed = (u: CombatUnit): CombatUnit => {
    const info = UNITS_INFO[u.unitId];
    if (info.special === 'double_turn' && !u.extraTurnUsed) {
      return { ...u, movedThisTurn: false, extraTurnUsed: true, hasActed: false };
    }
    return { ...u, hasActed: true, movedThisTurn: false };
  };

  // Helper to calculate damage
  const calculateDamage = (attacker: CombatUnit, defender: CombatUnit, isCounter = false, currentUnits: CombatUnit[] = units) => {
    const attInfo = UNITS_INFO[attacker.unitId];
    const defInfo = UNITS_INFO[defender.unitId];

    const effAttack = attacker.isEnemy ? attInfo.attack : Math.floor(attInfo.attack * atkMod);
    let effDefense = defender.isEnemy ? defInfo.defense : Math.floor(defInfo.defense * defMod);
    
    // Paladin Aura (+20% Defense for allies in 1 cell radius)
    const defSize = defInfo.size || 1;
    const hasPaladinAura = currentUnits.some(u => {
      if (u.isEnemy !== defender.isEnemy || u.unitId !== 'paladin' || u.count <= 0) return false;
      // Paladins don't buff themselves with the aura for simplicity, or we can allow it
      // if (u.id === defender.id) return false; 
      
      const uSize = UNITS_INFO[u.unitId]?.size || 1;
      const dx = Math.max(0, Math.max(u.x - (defender.x + defSize - 1), defender.x - (u.x + uSize - 1)));
      const dy = Math.max(0, Math.max(u.y - (defender.y + defSize - 1), defender.y - (u.y + uSize - 1)));
      return dx <= 1 && dy <= 1;
    });
    
    if (hasPaladinAura) {
      effDefense = Math.floor(effDefense * 1.2);
    }

    const effMinDmg = attacker.isEnemy ? attInfo.minDamage : Math.floor(attInfo.minDamage * atkMod);
    const effMaxDmg = attacker.isEnemy ? attInfo.maxDamage : Math.floor(attInfo.maxDamage * atkMod);
    const effUnitHp = defender.isEnemy ? defInfo.hp : Math.floor(defInfo.hp * hpMod);
    
    const rawDmg = getRandomDamage(effMinDmg, effMaxDmg);
    let totalDmg = rawDmg * attacker.count;
    
    if (attInfo.special === 'crit_25_x2' && Math.random() < 0.25) {
      totalDmg *= 2;
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
        let type: 'arrow' | 'fireball' | 'lightning' = 'arrow';
        if (aId === 'mage') type = 'fireball';
        if (aId === 'titan' || aId === 'giant') type = 'lightning';
        
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
          setTimeout(() => setEffects(prev => prev.filter(e => e.id !== effectId)), 500);
        }, 500);
      } else {
        let effectType: AttackEffect['type'] = 'slash';
        if (aId === 'dragon' || aId === 'demon' || aId === 'hydra') effectType = 'fire';
        if (aId === 'frostdragon') effectType = 'ice';
        
        const effectId = getRandomId('e-melee');
        setEffects(prev => [...prev, { id: effectId, type: effectType, x: dx, y: dy, size: ds }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== effectId)), 500);
      }
    };

    triggerEffect(attacker.unitId, defender.unitId, defender.x, defender.y, defenderInfo.size || 1);

    const addFloatingText = (text: string, x: number, y: number, color?: string) => {
      const id = Date.now() + Math.random();
      setFloatingTexts(prev => [...prev, { id, text, x, y, color }]);
      setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1000);
    };

    const applyDamage = (att: CombatUnit, def: CombatUnit, unitsList: CombatUnit[], isCounter = false) => {
      const { totalDmg, effUnitHp } = calculateDamage(att, def, isCounter);
      
      let remainingStackHP = (def.count - 1) * effUnitHp + def.hp - totalDmg;
      let newCount = Math.max(0, Math.ceil(remainingStackHP / effUnitHp));
      let killed = def.count - newCount;
      let newTopHP = remainingStackHP <= 0 ? 0 : (remainingStackHP % effUnitHp === 0 ? effUnitHp : remainingStackHP % effUnitHp);

      addFloatingText(`-${totalDmg}`, def.x, def.y, 'text-rose-500');

      const label = isCounter ? "Ответный удар" : "Атака";
      if (newCount === 0) {
        addLog(`${label}: ${UNITS_INFO[att.unitId].name} уничтожил ${UNITS_INFO[def.unitId].name}!`);
      } else {
        addLog(`${label}: ${UNITS_INFO[att.unitId].name} -> ${totalDmg} урона. Убито: ${killed}.`);
      }

      return { newCount, newTopHP };
    };

    // Primary Attack
    let { newCount, newTopHP } = applyDamage(attacker, defender, currentUnits);
    let currentDefender = { ...defender, count: newCount, hp: newTopHP };

    // Splash Damage Logic (Archidruid - special: 'splash_50' & Kronos - 'splash_linear_40')
    let splashTargets: { id: string, damage: number }[] = [];
    if (attackerInfo.special === 'splash_50' || attackerInfo.special === 'splash_linear_40') {
      const { totalDmg } = calculateDamage(attacker, defender, false, currentUnits);
      const isLinear = attackerInfo.special === 'splash_linear_40';
      const splashDmgBase = Math.floor(totalDmg * (isLinear ? 0.4 : 0.5));
      
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

    const finalizeAttack = (finalDefender: CombatUnit, splashHits: { id: string, damage: number }[] = []) => {
      const updatedUnits = currentUnits.map(u => {
        if (u.id === attacker.id) return markUnitActed(u);
        if (u.id === defender.id) return finalDefender;
        
        const splash = splashHits.find(s => s.id === u.id);
        if (splash) {
          const uInfo = UNITS_INFO[u.unitId];
          const { effUnitHp } = calculateDamage(attacker, u, false, currentUnits);
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
      setUnits(updatedUnits);
      setTimeout(() => checkWinCondition(updatedUnits), 600);
    };

    // Double Attack Logic (cannot trigger with splash in this simplified version, or handled separately)
    if (attackerInfo.special === 'double_attack' && newCount > 0) {
      setTimeout(() => {
        triggerEffect(attacker.unitId, defender.unitId, defender.x, defender.y, defenderInfo.size || 1);
        const secondHit = applyDamage(attacker, currentDefender, currentUnits);
        currentDefender = { ...currentDefender, count: secondHit.newCount, hp: secondHit.newTopHP };
        finalizeAttack(currentDefender);
      }, 600);
      return; 
    }

    // Counter Attack Logic (Hydra etc)
    if (defenderInfo.special === 'counter_attack_50' && attackerInfo.range === 1 && newCount > 0) {
      setTimeout(() => {
        triggerEffect(defender.unitId, attacker.unitId, attacker.x, attacker.y, attackerInfo.size || 1);
        const res = applyDamage(currentDefender, attacker, currentUnits, true);
        const finalUnits = currentUnits.map(u => {
          if (u.id === attacker.id) return markUnitActed({ ...u, count: res.newCount, hp: res.newTopHP });
          if (u.id === defender.id) return currentDefender;
          // Note: Splash and counter from main defender can't easily coexist in this block without more complexity
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
    
    let closest = targets[0];
    let minDist = 999;
    
    targets.forEach(t => {
      const targetSize = UNITS_INFO[t.unitId].size || 1;
      const myInfo = UNITS_INFO[myUnit.unitId];
      const mySize = myInfo.size || 1;

      const d = getManhattanDist(myUnit.x, myUnit.y, mySize, t.x, t.y, targetSize);
      if (d < minDist) { minDist = d; closest = t; }
    });

    const info = UNITS_INFO[myUnit.unitId];
    const ranges = info.range;
    const mySize = info.size || 1;
    
    if (minDist <= ranges + (mySize > 1 ? 0.5 : 0)) {
      processAttack(currentUnits, myUnit, closest);
    } else {
      const speed = info.speed;
      const size = info.size || 1;
      
      let newX = myUnit.x;
      let newY = myUnit.y;
      
      let steps = speed;
      while (steps > 0) {
        const dx = Math.sign(closest.x - newX);
        const dy = Math.sign(closest.y - newY);
        
        let moved = false;
        if (dx !== 0 && isAreaFree(newX + dx, newY, size, myUnit.id, currentUnits)) {
          newX += dx;
          moved = true;
        } else if (dy !== 0 && isAreaFree(newX, newY + dy, size, myUnit.id, currentUnits)) {
          newY += dy;
          moved = true;
        }
        
        if (!moved) break;
        steps--;
        
        const targetSize = UNITS_INFO[closest.unitId].size || 1;
        const currentDist = getManhattanDist(newX, newY, size, closest.x, closest.y, targetSize);
        if (currentDist <= ranges) break;
      }
      
      const movedUnits = currentUnits.map(u => u.id === myUnit.id ? markUnitActed({ ...u, x: newX, y: newY }) : u);
      setUnits(movedUnits);
      addLog(`${info.name} (враг) перемещается.`);
      setTimeout(() => checkWinCondition(movedUnits), 300);
    }
  };

  const determineNextActiveUnit = (currentUnits: CombatUnit[]) => {
    setIsHealMode(false);
    if (gameOver || !currentUnits.length) return;
    
    const aliveUnits = currentUnits.filter(u => u.count > 0);
    const alivePlayer = aliveUnits.filter(u => !u.isEnemy);
    const aliveEnemy = aliveUnits.filter(u => u.isEnemy);

    if (alivePlayer.length === 0) {
      if (!gameOver) {
        setGameOver('defeat');
        addLog("Вы проиграли...");
      }
      return;
    }
    if (aliveEnemy.length === 0) {
      if (!gameOver) {
        setGameOver('victory');
        addLog("Победа!");
      }
      return;
    }

    let readyUnits = aliveUnits.filter(u => !u.hasActed);
    
    if (readyUnits.length === 0) {
      // New Round
      setRound(r => r + 1);
      addLog("Новый раунд.");
      const refreshedUnits = aliveUnits.map(u => ({ ...u, hasActed: false, movedThisTurn: false, extraTurnUsed: false }));
      setUnits(refreshedUnits);
      
      // Safety timeout to avoid recursive loops
      setTimeout(() => {
        const stillAlive = refreshedUnits.filter(u => u.count > 0);
        if (stillAlive.length > 0) determineNextActiveUnit(stillAlive);
      }, 600);
      return;
    }
    
    readyUnits.sort((a,b) => {
      const infoA = UNITS_INFO[a.unitId];
      const infoB = UNITS_INFO[b.unitId];
      if (infoA.speed !== infoB.speed) return infoB.speed - infoA.speed;
      if (a.isEnemy !== b.isEnemy) return a.isEnemy ? 1 : -1;
      return 0;
    });

    const next = readyUnits[0];
    if (next) {
      setActiveUnitId(next.id);
      const nextTurn = next.isEnemy ? 'enemy' : 'player';
      setTurn(nextTurn);
      
      if (nextTurn === 'enemy') {
        setTimeout(() => handleAI(aliveUnits, next), 1000);
      }
    }
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

  const handleHeal = (targetId: string) => {
    if (turn !== 'player' || gameOver || infoMode) return;
    const activeUnit = units.find(u => u.id === activeUnitId);
    if (!activeUnit || activeUnit.unitId !== 'driada') return;

    const targetPos = units.find(u => u.id === targetId);
    if (!targetPos || targetPos.isEnemy || targetPos.count >= targetPos.startCount) return;

    // missing troops
    const lost = targetPos.startCount - targetPos.count;
    // Heal random 1-3 but not more than lost
    const healAmount = Math.min(lost, Math.floor(Math.random() * 3) + 1);

    const updatedUnits = units.map(u => {
      if (u.id === activeUnit.id) return markUnitActed(u);
      if (u.id === targetPos.id) return { ...u, count: u.count + healAmount };
      return u;
    });

    addLog(`Дриада воскрешает ${healAmount} ${UNITS_INFO[targetPos.unitId].name}!`);
    setUnits(updatedUnits);
    setIsHealMode(false);
    
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

  const handleCellClick = (x: number, y: number) => {
    if (isHealMode) setIsHealMode(false);
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
        } else if (activeInfo.special === 'double_action' && !activeUnit.movedThisTurn && dist <= speed + ranges - 1) { 
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
              if (distToTarget <= ranges) {
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
            const movedUnits = units.map(u => u.id === activeUnit.id ? { ...u, x: bestX, y: bestY } : u);
            const updatedActive = { ...activeUnit, x: bestX, y: bestY };
            addLog(`${activeInfo.name} приближается и атакует!`);
            
            // Short delay to show movement before attack
            setUnits(movedUnits);
            setTimeout(() => {
              processAttack(movedUnits, updatedActive, targetPos);
            }, 300);
          } else {
            addLog("Путь к врагу заблокирован.");
          }
        } else {
          addLog("Враг слишком далеко.");
        }
      }
    } else {
      // Move for potentially large units
      if (dist <= speed && isAreaFree(x, y, activeSize, activeUnit.id, units)) {
        if (activeInfo.special === 'double_action' && !activeUnit.movedThisTurn) {
          // Move but don't end turn
          const updatedUnits = units.map(u => u.id === activeUnit.id ? { ...u, x, y, movedThisTurn: true, hasActed: false } : u);
          setUnits(updatedUnits);
          addLog(`${activeInfo.name} переместилась и готова к удару!`);
          // We don't call determineNextActiveUnit, so she stays selected
        } else {
          const updatedUnits = units.map(u => u.id === activeUnit.id ? markUnitActed({ ...u, x, y }) : u);
          setUnits(updatedUnits);
          addLog(`${activeInfo.name} переместился.`);
          determineNextActiveUnit(updatedUnits);
        }
      } else {
        addLog("Невозможно переместиться.");
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
      // Reward
      setResources(addResources(resources, node.reward));
      
      // Handle item reward
      if (node.itemReward === 'weapon-legend') {
        import('../lib/game.types').then(({ LEGENDARY_WEAPON }) => {
          setEquipment(prev => ({ ...prev, weapon: LEGENDARY_WEAPON }));
        });
        alert("ПОЗДРАВЛЯЕМ! Вы прошли кампанию первого мира! Вы получили Легендарное Оружие!");
      }

      // Mark node cleared unless it is a daily boss
      if (node.type !== 'daily_boss') {
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
      
      const isPickableHealTarget = turn === 'player' && activeUnit && activeUnit.unitId === 'driada' && isHealMode && uUnderTile && !uUnderTile.isEnemy && uUnderTile.count < uUnderTile.startCount;
      const isUnhealableTarget = turn === 'player' && activeUnit && activeUnit.unitId === 'driada' && isHealMode && uUnderTile && !uUnderTile.isEnemy && uUnderTile.count >= uUnderTile.startCount;

      const isPaladinAuraZone = activeUnit && activeUnit.unitId === 'paladin' && getManhattanDist(activeUnit.x, activeUnit.y, activeSize, x, y, 1) <= 1;

      gridCells.push(
        <div 
          key={`${x}-${y}`} 
          onClick={() => isPickableHealTarget ? handleHeal(uUnderTile.id) : handleCellClick(x, y)}
          className={cn(
            "relative w-full aspect-square border border-stone-700/30 flex items-center justify-center transition-colors overflow-visible",
            isAllowedMove && "bg-green-500/10 cursor-pointer hover:bg-green-500/20",
            isPickableTarget && "bg-red-500/10 cursor-pointer hover:bg-red-500/20 z-10",
            isPickableHealTarget && "bg-blue-500/20 cursor-pointer hover:bg-blue-500/40 z-10",
            isUnhealableTarget && "bg-red-500/5 z-0",
            isPaladinAuraZone && "bg-yellow-500/20"
          )}
        >
          {isAllowedMove && <div className="w-1.5 h-1.5 rounded-full bg-green-500/30"></div>}
          {uUnderTile && isOrigin && (
            <motion.div 
              layoutId={uUnderTile.id}
              onClick={(e) => {
                e.stopPropagation(); // Prevent grid click
                isPickableHealTarget ? handleHeal(uUnderTile.id) : handleCellClick(x, y); 
              }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className={cn(
                "relative z-10 rounded bg-stone-900 border overflow-visible cursor-pointer",
                uUnderTile.isEnemy 
                  ? "border-red-500 shadow-[0_0_5px_rgba(255,0,0,0.4)]" 
                  : isUnhealableTarget
                    ? "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.7)]"
                    : isPickableHealTarget 
                      ? "border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
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
    <div className="fixed inset-0 z-50 bg-stone-950/30 flex flex-col items-center justify-center pt-16">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-stone-900/40 border-b border-stone-800 flex justify-between items-center px-4 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
        <h2 className="text-amber-500 font-bold tracking-widest uppercase flex items-center gap-2 text-shadow-glow">
          <Sword className="w-5 h-5"/> Бой
        </h2>
        <div className="text-sm font-black flex flex-col items-end gap-0 tracking-widest">
          <div className="flex items-center gap-2 uppercase">
            <span className={turn === 'player' ? 'text-amber-400' : 'text-stone-500'}>Мой ход</span>
            <span className="text-stone-600 font-light text-[10px]">vs</span>
            <span className={turn === 'enemy' ? 'text-red-400' : 'text-stone-500'}>Враг</span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono uppercase">Раунд {round}</span>
        </div>
      </div>

      {/* Battlefield Grid */}
      <div className="bg-stone-900/30 bg-[radial-gradient(circle,rgba(68,64,60,0.2)_1px,transparent_1px)] bg-[size:20px_20px] w-[95vw] h-[95vw] max-w-[500px] max-h-[500px] sm:w-[500px] sm:h-[500px] relative rounded border-4 border-stone-800 shadow-2xl overflow-visible">
        <img src="/fight.png" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-[1px] rounded-sm pointer-events-none"></div>
        <div 
          className="relative z-10 w-full h-full grid"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`
          }}
        >
          {gridCells}
          
          {/* Projectiles */}
          {projectiles.map(p => (
            <motion.div
              key={p.id}
              initial={{ 
                left: `${(p.startX + 0.5) * (100/GRID_WIDTH)}%`, 
                top: `${(p.startY + 0.5) * (100/GRID_HEIGHT)}%`,
                scale: 0.5,
                opacity: 0
              }}
              animate={{ 
                left: `${(p.endX + 0.5) * (100/GRID_WIDTH)}%`, 
                top: `${(p.endY + 0.5) * (100/GRID_HEIGHT)}%`,
                scale: 1,
                opacity: 1
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute w-4 h-4 z-[100] flex items-center justify-center pointer-events-none"
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              {p.type === 'arrow' && <div className="w-4 h-0.5 bg-stone-300 shadow-[0_0_5px_white]"></div>}
              {p.type === 'fireball' && <div className="w-5 h-5 bg-orange-600 rounded-full shadow-[0_0_20px_#f97316] relative overflow-visible">
                <div className="absolute inset-0 bg-yellow-400 rounded-full animate-pulse blur-sm"></div>
              </div>}
              {p.type === 'lightning' && <div className="w-1 h-12 bg-blue-100 shadow-[0_0_20px_#7dd3fc] rotate-45 animate-pulse border-white border"></div>}
            </motion.div>
          ))}

          {/* Hit Effects */}
          {effects.map(e => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: [1, 1.5, 1], rotate: [0, 45, 0] }}
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
                  <div className="w-12 h-1 bg-white/80 blur-[1px] rotate-45 shadow-[0_0_10px_white]"></div>
                </div>
              )}
              {e.type === 'hit' && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white rounded-full animate-ping"></div>
                </div>
              )}
              {e.type === 'heal' && (
                <div className="w-full h-full flex items-center justify-center">
                  <img src="/units/driadaheal.png" alt="Heal" className="w-[120px] h-[120px] absolute z-50 animate-pulse object-contain pointer-events-none drop-shadow-[0_0_15px_#10b981]" style={{ transform: 'translateY(-20%)' }} />
                  <div className="w-16 h-16 border-4 border-green-500 rounded-full animate-ping shadow-[0_0_15px_#22c55e]"></div>
                </div>
              )}
              {e.type === 'fire' && (
                <div className="w-full h-full flex items-center justify-center relative">
                   <motion.div 
                     initial={{ scale: 0, opacity: 0 }}
                     animate={{ scale: [1, 2, 0], opacity: [1, 0.8, 0] }}
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
                     className="absolute inset-0 bg-blue-300 rounded-full blur-xl"
                   />
                   <div className="w-8 h-8 bg-cyan-100 rounded-full blur-md animate-pulse"></div>
                   <div className="w-4 h-4 bg-white rounded-full blur-sm absolute"></div>
                </div>
              )}
              {e.type === 'lightning_hit' && (
                <div className="w-full h-full flex items-center justify-center">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [1, 0, 1, 0] }}
                    className="w-1 h-20 bg-blue-200 blur-[2px] rotate-45 shadow-[0_0_15px_#0ea5e9]"
                  />
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0, 1] }}
                    className="w-1 h-20 bg-blue-200 blur-[2px] -rotate-45 shadow-[0_0_15px_#0ea5e9] absolute"
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

      {/* Info Panel / Tooltips */}
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
                    {UNITS_INFO[selectedUnitInfo.unitId].combatType === 'melee' ? 'Ближний' : 'Дальний'}
                  </div>
                </div>
                <p className="text-[10px] text-stone-300 italic mb-1 leading-tight">{UNITS_INFO[selectedUnitInfo.unitId].description}</p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-[9px] text-stone-400 flex flex-col">
                    <span className="uppercase opacity-50">Выносливость</span>
                    <span className="text-red-400 font-bold">{selectedUnitInfo.hp} / {selectedUnitInfo.isEnemy ? UNITS_INFO[selectedUnitInfo.unitId].hp : Math.floor(UNITS_INFO[selectedUnitInfo.unitId].hp * hpMod)} HP</span>
                  </div>
                  <div className="text-[9px] text-stone-400 flex flex-col">
                    <span className="uppercase opacity-50">Атака (Дист.)</span>
                    <span className="text-blue-400 font-bold">{UNITS_INFO[selectedUnitInfo.unitId].range} кл.</span>
                  </div>
                  <div className="text-[9px] text-stone-400 flex flex-col">
                    <span className="uppercase opacity-50">Ход (Дист.)</span>
                    <span className="text-green-400 font-bold">{UNITS_INFO[selectedUnitInfo.unitId].speed} кл.</span>
                  </div>
                  <div className="text-[9px] text-stone-400 flex flex-col">
                    <span className="uppercase opacity-50">Урон</span>
                    <span className="text-amber-400 font-bold">{UNITS_INFO[selectedUnitInfo.unitId].minDamage}-{UNITS_INFO[selectedUnitInfo.unitId].maxDamage}</span>
                  </div>
                  <div className="text-[9px] text-stone-400 flex flex-col">
                    <span className="uppercase opacity-50">Доп. свойства</span>
                    <span className="text-stone-300 font-bold uppercase tracking-widest text-[7px]">
                      {UNITS_INFO[selectedUnitInfo.unitId].special === 'double_attack' ? 'Двойная атака' : 
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'counter_attack_50' ? 'Ответная (50%)' : 
                       UNITS_INFO[selectedUnitInfo.unitId].special === 'splash_50' ? 'Сплэш (50%)' : 'Нет'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 w-full max-w-[500px] flex flex-col gap-2">
        {/* Battle Controls */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => {
              setInfoMode(!infoMode);
              setSelectedUnitInfo(null);
            }}
            className={cn(
              "flex-1 px-2 py-2 rounded font-black text-[10px] uppercase tracking-widest border transition-all shadow active:scale-95 min-w-[120px]",
              infoMode 
                ? "bg-red-500/20 border-red-500 text-red-500 shadow-red-500/20" 
                : "bg-green-500/20 border-green-500 text-green-500 shadow-green-500/20"
            )}
          >
            {infoMode ? "Отмена Инфо" : "Инфо (Осмотр)"}
          </button>
          
          {turn === 'player' && (
            <>
              <button 
                onClick={() => {
                  if (activeUnitId) {
                    const updatedUnits = units.map(u => u.id === activeUnitId ? markUnitActed(u) : u);
                    determineNextActiveUnit(updatedUnits);
                  }
                }}
                className="flex-1 px-2 py-2 bg-stone-800 border border-stone-700 text-stone-300 rounded font-black text-[10px] uppercase hover:bg-stone-700 min-w-[80px]"
              >
                Пас
              </button>
              
              {units.find(u => u.id === activeUnitId)?.unitId === 'driada' && (
                <div onClick={() => setIsHealMode(true)} className={cn("flex-1 min-w-[60px] flex items-center justify-center bg-blue-900/30 border border-blue-500 rounded p-1 cursor-pointer transition-all hover:bg-blue-800/50", isHealMode && "bg-blue-600/50 border-blue-400")} title="Активировать исцеление">
                  <img src="/units/driadaheal.png" className={cn("w-6 h-6", !isHealMode && "animate-pulse")} alt="Heal Skill" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Combat Log */}
        <div className="w-full h-24 wow-panel p-2 overflow-y-auto text-[10px] font-mono flex flex-col-reverse text-stone-400">
          {log.map((m, i) => (
            <div key={i} className={i === 0 ? "text-stone-200 font-bold" : ""}>
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
                <h1 className="text-4xl font-black text-green-400 mb-2 drop-shadow-lg">ПОБЕДА!</h1>
                <p className="text-slate-400 text-center mb-6">Враг повержен. Вы добыли трофеи.</p>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl w-full max-w-xs mb-8 flex flex-wrap justify-center gap-4 text-sm font-mono">
                  {node.reward.gold && <span className="text-yellow-500">+{node.reward.gold} Золото</span>}
                  {node.reward.crystals && <span className="text-indigo-400">+{node.reward.crystals} 💎</span>}
                  {node.reward.wood && <span className="text-amber-600">+{node.reward.wood} Дерево</span>}
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,0,0,0.5)]">
                  <Skull className="w-10 h-10"/>
                </div>
                <h1 className="text-4xl font-black text-red-500 mb-2 drop-shadow-lg">ПОРАЖЕНИЕ...</h1>
                <p className="text-slate-400 text-center mb-8">Ваши войска были уничтожены.</p>
              </>
            )}
            
            <button 
              onClick={handleFinish}
              className="px-8 py-3 wow-button font-black rounded-lg shadow-xl tracking-widest uppercase transition-all"
            >
              Продолжить
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
