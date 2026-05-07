import { useState, useEffect } from 'react';
import { useGame } from '../lib/game-context';
import { MapNode, UNITS_INFO, UnitId } from '../lib/game.types';
import { addResources } from '../lib/game.utils';
import { Skull, Shield, Sword } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './PalaceView';

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
  hp: number; // HP of the top unit in stack
  isEnemy: boolean;
  x: number;
  y: number;
  hasActed: boolean;
};

const GRID_WIDTH = 10;
const GRID_HEIGHT = 10;

export default function CombatView({ node, onEnd }: CombatViewProps) {
  const { army, setArmy, resources, setResources, mapNodes, setMapNodes, equipment } = useGame();
  
  // Equipment stats modifiers
  const atkMod = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.attackBonus || 0), 0) / 100;
  const defMod = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.defenseBonus || 0), 0) / 100;
  const hpMod  = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.hpBonus || 0), 0) / 100;

  // Initialize teams
  const [units, setUnits] = useState<CombatUnit[]>(() => {
    const initialUnits: CombatUnit[] = [];
    let pY = 0;
    (Object.entries(army) as [UnitId, number][]).forEach(([id, count]) => {
      if (count > 0 && pY < GRID_HEIGHT) {
        // Player HP is boosted
        initialUnits.push({ id: `p-${id}`, unitId: id as UnitId, count, hp: Math.floor(UNITS_INFO[id as UnitId].hp * hpMod), isEnemy: false, x: 0, y: pY, hasActed: false });
        pY++;
      }
    });
    let eY = 0;
    node.enemies.forEach(e => {
      if (e.count > 0 && eY < GRID_HEIGHT) {
        initialUnits.push({ id: `e-${e.unitId}-${eY}`, unitId: e.unitId, count: e.count, hp: UNITS_INFO[e.unitId].hp, isEnemy: true, x: GRID_WIDTH - 1, y: eY, hasActed: false });
        eY++;
      }
    });
    return initialUnits;
  });
  const [turn, setTurn] = useState<'player' | 'enemy'>('player');
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>(['Бой начался!']);
  const [gameOver, setGameOver] = useState<'victory' | 'defeat' | null>(null);

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 5));

  // Forward declarations for ESLint issues
  const checkWinCondition = (currentUnits: CombatUnit[]) => {
    const alivePlayer = currentUnits.filter(u => !u.isEnemy && u.count > 0);
    const aliveEnemy = currentUnits.filter(u => u.isEnemy && u.count > 0);
    
    if (alivePlayer.length === 0) {
      setGameOver('defeat');
      addLog("Вы проиграли...");
    } else if (aliveEnemy.length === 0) {
      setGameOver('victory');
      addLog("Победа!");
    } else {
      determineNextActiveUnit(currentUnits);
    }
  };

  const processAttack = (currentUnits: CombatUnit[], attacker: CombatUnit, defender: CombatUnit) => {
    const attInfo = UNITS_INFO[attacker.unitId];
    const defInfo = UNITS_INFO[defender.unitId];

    const effAttack = attacker.isEnemy ? attInfo.attack : Math.floor(attInfo.attack * atkMod);
    const effDefense = defender.isEnemy ? defInfo.defense : Math.floor(defInfo.defense * defMod);
    const effMinDmg = attacker.isEnemy ? attInfo.minDamage : Math.floor(attInfo.minDamage * atkMod);
    const effMaxDmg = attacker.isEnemy ? attInfo.maxDamage : Math.floor(attInfo.maxDamage * atkMod);
    const effUnitHp = defender.isEnemy ? defInfo.hp : Math.floor(defInfo.hp * hpMod);
    
    // eslint-disable-next-line react-hooks/purity
    const rawDmg = Math.floor(Math.random() * (effMaxDmg - effMinDmg + 1)) + effMinDmg;
    let totalDmg = rawDmg * attacker.count;
    
    const statDiff = effAttack - effDefense;
    const multiplier = Math.max(0.01, 1 + (statDiff * 0.05));
    totalDmg = Math.floor(totalDmg * multiplier);
    
    let remainingStackHP = (defender.count - 1) * effUnitHp + defender.hp - totalDmg;
    let killed = 0;
    let newCount = defender.count;
    let newTopHP = defender.hp;

    if (remainingStackHP <= 0) {
      killed = defender.count;
      newCount = 0;
      addLog(`${UNITS_INFO[attacker.unitId].name} убил отряд ${UNITS_INFO[defender.unitId].name}!`);
    } else {
      newCount = Math.ceil(remainingStackHP / effUnitHp);
      killed = defender.count - newCount;
      newTopHP = remainingStackHP % effUnitHp === 0 ? effUnitHp : remainingStackHP % effUnitHp;
      addLog(`${UNITS_INFO[attacker.unitId].name} наносит ${totalDmg} урона. Убито: ${killed}.`);
    }

    const updatedUnits = currentUnits.map(u => {
      if (u.id === attacker.id) return { ...u, hasActed: true };
      if (u.id === defender.id) return { ...u, count: newCount, hp: newTopHP };
      return u;
    });

    setUnits(updatedUnits);
    checkWinCondition(updatedUnits);
  };

  const handleAI = (currentUnits: CombatUnit[], myUnit: CombatUnit) => {
    if (gameOver) return;
    
    const targets = currentUnits.filter(u => !u.isEnemy && u.count > 0);
    if (targets.length === 0) return;
    
    let closest = targets[0];
    let minDist = 999;
    
    targets.forEach(t => {
      const d = Math.abs(t.x - myUnit.x) + Math.abs(t.y - myUnit.y);
      if (d < minDist) { minDist = d; closest = t; }
    });

    const ranges = UNITS_INFO[myUnit.unitId].range;
    
    if (minDist <= ranges) {
      processAttack(currentUnits, myUnit, closest);
    } else {
      const speed = UNITS_INFO[myUnit.unitId].speed;
      const dx = Math.sign(closest.x - myUnit.x);
      const dy = Math.sign(closest.y - myUnit.y);
      
      let newX = myUnit.x;
      let newY = myUnit.y;
      
      if (Math.abs(closest.x - myUnit.x) > ranges) {
        newX = Math.max(0, Math.min(GRID_WIDTH-1, myUnit.x + dx * Math.min(speed, Math.abs(closest.x - myUnit.x) - ranges + 1)));
      }
      
      while (currentUnits.some(u => u.count > 0 && u.id !== myUnit.id && u.x === newX && u.y === myUnit.y)) {
        newX -= dx;
        if (newX === myUnit.x) break;
      }
      
      const movedUnits = currentUnits.map(u => u.id === myUnit.id ? { ...u, x: newX, hasActed: true } : u);
      setUnits(movedUnits);
      addLog(`Вражеский ${UNITS_INFO[myUnit.unitId].name} перемещается.`);
      determineNextActiveUnit(movedUnits);
    }
  };

  const determineNextActiveUnit = (currentUnits: CombatUnit[], expectedTurn?: 'player'|'enemy') => {
    const aliveUnits = currentUnits.filter(u => u.count > 0);
    let readyUnits = aliveUnits.filter(u => !u.hasActed);
    
    if (readyUnits.length === 0) {
      const resetUnits = aliveUnits.map(u => ({ ...u, hasActed: false }));
      setUnits(resetUnits);
      readyUnits = resetUnits;
      addLog("Новый раунд.");
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

  // Setup Combat
  useEffect(() => {
    determineNextActiveUnit(units, 'player');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCellClick = (x: number, y: number) => {
    if (turn !== 'player' || gameOver) return;
    const activeUnit = units.find(u => u.id === activeUnitId);
    if (!activeUnit) return;

    const targetPos = units.find(u => u.x === x && u.y === y && u.count > 0);
    
    const dist = Math.abs(activeUnit.x - x) + Math.abs(activeUnit.y - y);
    const speed = UNITS_INFO[activeUnit.unitId].speed;
    const ranges = UNITS_INFO[activeUnit.unitId].range;

    if (targetPos) {
      if (targetPos.isEnemy) {
        if (dist <= ranges) {
          processAttack(units, activeUnit, targetPos);
        } else {
          addLog("Враг слишком далеко для атаки.");
        }
      } else {
        // clicked own unit - do nothing or wait (for MVP: wait turn)
      }
    } else {
      // Move
      if (dist <= speed) {
        const updatedUnits = units.map(u => u.id === activeUnit.id ? { ...u, x, y, hasActed: true } : u);
        setUnits(updatedUnits);
        addLog(`${UNITS_INFO[activeUnit.unitId].name} переместился.`);
        determineNextActiveUnit(updatedUnits);
      } else {
        addLog("Слишком далеко для перемещения.");
      }
    }
  };

  const handleFinish = () => {
    if (gameOver === 'victory') {
      // Save remaining army
      const newArmy = { ...army };
      
      // Reset army counts to 0 for those in combat, then add survivors
      // We only take types we deployed
      Object.keys(newArmy).forEach(id => {
        const u = id as UnitId;
        const total = units.find(x => x.unitId === u && !x.isEnemy)?.count || 0;
        // In a real game we'd add back survivors to reserves that didn't go. Here we override.
      });
      // Actually MVP: update army exactly as left on field
      const nextArmy: Record<UnitId, number> = { knight: 0, archer: 0, berserk: 0, mage: 0, dragon: 0, titan: 0, goblin: 0, orc: 0 };
      units.forEach(u => {
        if (!u.isEnemy && u.count > 0) {
          nextArmy[u.unitId] = (nextArmy[u.unitId] || 0) + u.count;
        }
      });
      setArmy(nextArmy);
      
      // Reward
      setResources(addResources(resources, node.reward));
      
      // Mark node cleared
      setMapNodes(mapNodes.map(m => m.id === node.id ? { ...m, cleared: true } : m));
    } else if (gameOver === 'defeat') {
      // Lose all deployed troops
      setArmy({ knight: 0, archer: 0, berserk: 0, mage: 0, dragon: 0, titan: 0, goblin: 0, orc: 0 }); // Hardcore loss
    }
    onEnd();
  };

  // Generate grid UI
  const gridCells = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const u = units.find(u => u.x === x && u.y === y && u.count > 0);
      const isAllowedMove = turn === 'player' && activeUnitId && !u && (Math.abs((units.find(act => act.id === activeUnitId)?.x || 99) - x) + Math.abs((units.find(act => act.id === activeUnitId)?.y || 99) - y)) <= (UNITS_INFO[units.find(act => act.id === activeUnitId)?.unitId!]?.speed || 0);

      gridCells.push(
        <div 
          key={`${x}-${y}`} 
          onClick={() => handleCellClick(x, y)}
          className={cn(
            "relative w-full aspect-square border border-stone-700/50 flex items-center justify-center transition-colors",
            isAllowedMove && "bg-green-500/20 cursor-pointer hover:bg-green-500/40 border-green-500/50 shadow-[inset_0_0_15px_rgba(34,197,94,0.3)] z-0"
          )}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-5">{(x+y)%2===0 ? '·' : ''}</div>
          {u && (
            <motion.div 
              layoutId={u.id}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className={cn(
                "relative z-10 w-[85%] h-[85%] rounded bg-stone-900 flex flex-col items-center justify-center overflow-visible",
                u.isEnemy ? "border border-red-500 shadow-[0_0_5px_rgba(255,0,0,0.5)]" : "border border-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]",
                u.id === activeUnitId && "border-2 border-white shadow-[0_0_15px_#fff] z-20 scale-110",
                u.isEnemy && "scale-x-[-1]" // flip enemy images horizontally
              )}
            >
              {UNITS_INFO[u.unitId].image ? (
                <img src={UNITS_INFO[u.unitId].image} alt={UNITS_INFO[u.unitId].name} className="w-full h-full object-cover rounded-[1px]" />
              ) : (
                <div className="text-[7px] font-bold truncate px-0.5 w-full text-center leading-none text-white whitespace-nowrap" style={{ transform: u.isEnemy ? 'scaleX(-1)' : 'none' }}>
                  {UNITS_INFO[u.unitId].name.slice(0,3)}
                </div>
              )}
              <div 
                className="text-[8px] bg-stone-900 px-1 rounded-sm absolute -bottom-1 -right-1 font-black font-mono border z-30 shadow-md"
                style={{ 
                  transform: u.isEnemy ? 'scaleX(-1)' : 'none',
                  borderColor: u.isEnemy ? '#ef4444' : '#f59e0b',
                  color: u.isEnemy ? '#fca5a5' : '#fef3c7'
                }}
              >
                {u.count}
              </div>
            </motion.div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col items-center justify-center pt-16">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-stone-900 border-b border-stone-800 flex justify-between items-center px-4 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
        <h2 className="text-amber-500 font-bold tracking-widest uppercase flex items-center gap-2 text-shadow-glow">
          <Sword className="w-5 h-5"/> Бой
        </h2>
        <div className="text-sm font-black flex items-center gap-2 uppercase tracking-widest">
          <span className={turn === 'player' ? 'text-amber-400' : 'text-red-400 opacity-50'}>Мой ход</span>
          <span className="text-stone-500 font-light">vs</span>
          <span className={turn === 'enemy' ? 'text-red-400' : 'text-amber-400 opacity-50'}>Враг</span>
        </div>
      </div>

      {/* Battlefield Grid */}
      <div className="bg-[url('https://picsum.photos/id/1015/800/800')] bg-cover w-[95%] max-w-[500px] aspect-square relative rounded border-4 border-stone-800 shadow-2xl">
        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm mix-blend-multiply"></div>
        <div 
          className="relative z-10 w-full h-full grid"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`
          }}
        >
          {gridCells}
        </div>
      </div>

      {/* Combat Log */}
      <div className="mt-4 w-[95%] max-w-[500px] h-28 wow-panel p-2 overflow-y-auto text-[10px] font-mono flex flex-col-reverse text-stone-400">
        {log.map((m, i) => (
          <div key={i} className={i === 0 ? "text-stone-200 font-bold" : ""}>
            &gt; {m}
          </div>
        ))}
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
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl w-full max-w-xs mb-8 flex justify-center gap-4 text-sm font-mono">
                  {node.reward.gold && <span className="text-yellow-500">+{node.reward.gold} Золото</span>}
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
