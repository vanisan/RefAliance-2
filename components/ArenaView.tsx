'use client';

import { useState, useEffect, useRef } from 'react';
import { useGame } from '../lib/game-context';
import { UnitId, UNITS_INFO, ArenaMatchState, ArenaPlayer } from '../lib/game.types';
import { cn, addResources } from '../lib/game.utils';
import { getRandomId, getRandomDamage } from '../lib/combat.utils';
import { Trophy, Swords, X, Timer, MessageSquare, Shield, Sword, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;
const TURN_TIME = 10;

interface ArenaViewProps {
  onClose: () => void;
}

type CombatUnit = {
  id: string; // unique instance id
  unitId: UnitId;
  count: number;
  startCount: number;
  hp: number; // HP of the top unit in stack
  playerIndex: number; // 0 or 1
  x: number;
  y: number;
  hasActed: boolean;
};

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
  type: 'slash' | 'hit' | 'fire' | 'lightning_hit' | 'heal';
  x: number;
  y: number;
  size: number;
}

export default function ArenaView({ onClose }: ArenaViewProps) {
  const { user, army, palaceLevel, playerName, equipment, setResources, resources } = useGame();
  
  const [view, setView] = useState<'lobby' | 'battle' | 'results'>('lobby');
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([]);
  const [match, setMatch] = useState<ArenaMatchState | null>(null);
  const [myIndex, setMyIndex] = useState<0 | 1 | null>(null);
  const [units, setUnits] = useState<CombatUnit[]>([]);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [timer, setTimer] = useState(TURN_TIME);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [log, setLog] = useState<string[]>(['Арена ждет героев!']);
  const [gameOver, setGameOver] = useState<'win' | 'loss' | null>(null);
  
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [effects, setEffects] = useState<AttackEffect[]>([]);
  const [selectedUnitInfo, setSelectedUnitInfo] = useState<CombatUnit | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const lobbyChannelRef = useRef<RealtimeChannel | null>(null);

  const atkMod = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.attackBonus || 0), 0) / 100;
  const defMod = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.defenseBonus || 0), 0) / 100;
  const hpMod  = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.hpBonus || 0), 0) / 100;

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 5));

  // --- LOBBY LOGIC ---
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('arena:lobby', {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const players = Object.values(state).flat().map((p: any) => p.user).filter(u => !!u);
        setLobbyPlayers(players);
      })
      .on('broadcast', { event: 'match_invitation' }, ({ payload }) => {
        if (payload.targetId === user.id) {
          // Received a match invitation
          if (confirm(`Игрок ${payload.fromName} вызывает вас на бой! Принять?`)) {
            joinMatch(payload.matchId, payload.fromPlayer, 1);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user: {
              id: user.id,
              name: playerName || user.email?.split('@')[0],
              palaceLevel,
              armyPower: Object.values(army).reduce((a, b) => a + b, 0)
            }
          });
        }
      });

    lobbyChannelRef.current = channel;
    return () => {
      channel.unsubscribe();
    };
  }, [user, army, palaceLevel, playerName]);

  const invitePlayer = (player: any) => {
    if (!user) return;
    const totalUnits = Object.values(army).reduce((acc, count) => acc + (Number(count) || 0), 0);
    if (totalUnits === 0) {
      alert("У вас нет армии! Сначала наймите войска.");
      return;
    }

    const matchId = `match_${user.id}_${Date.now()}`;
    const myPlayer: ArenaPlayer = {
      id: user.id,
      name: playerName || user.email?.split('@')[0] || 'Unknown',
      army,
      hpMod,
      atkMod,
      defMod
    };

    lobbyChannelRef.current?.send({
      type: 'broadcast',
      event: 'match_invitation',
      payload: {
        matchId,
        targetId: player.id,
        fromId: user.id,
        fromName: playerName || user.email?.split('@')[0],
        fromPlayer: myPlayer
      }
    });

    // We act as Player 0
    startMatch(matchId, myPlayer, 0);
  };

  const joinMatch = (matchId: string, opponent: ArenaPlayer, role: 0 | 1) => {
    if (!user) return;
    const myPlayer: ArenaPlayer = {
      id: user.id,
      name: playerName || user.email?.split('@')[0] || 'Unknown',
      army,
      hpMod,
      atkMod,
      defMod
    };
    
    // We are player 1
    startMatch(matchId, opponent, role, myPlayer);
  };

  const startMatch = (id: string, p0: ArenaPlayer, role: 0 | 1, p1?: ArenaPlayer) => {
    setMyIndex(role);
    const matchData: ArenaMatchState = {
      id,
      players: (role === 0 ? [p0, null] : [p0, p1]) as [ArenaPlayer, ArenaPlayer],
      status: 'waiting',
      turn: Math.random() > 0.5 ? 0 : 1,
      timer: TURN_TIME,
      activeUnitId: null,
      winner: null
    };
    setMatch(matchData);
    setView('battle');
    
    // Subscribe to match channel
    const channel = supabase.channel(`arena:match:${id}`);
    
    channel
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
        if (role === 0) {
          // Instead of doing state side-effects inside setMatch, we calculate it here
          // But we need the current match state (p0). 
          // `p0` is in the closure of startMatch.
          const updated: ArenaMatchState = {
            id,
            players: [p0, payload.player],
            status: 'playing',
            turn: matchData.turn,
            timer: TURN_TIME,
            activeUnitId: null,
            winner: null
          };
          setMatch(updated);
          syncFullState(updated);
          addLog(`Игрок ${payload.player.name} вошел в бой!`);
        }
      })
      .on('broadcast', { event: 'sync_state' }, ({ payload }) => {
        setUnits(payload.units);
        setTurn(payload.turn);
        setRound(payload.round);
        setTimer(payload.timer);
        setActiveUnitId(payload.activeUnitId);
        if (payload.status) {
          setMatch(prev => prev ? { ...prev, status: payload.status } : null);
        }
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        handleRemoteMove(payload.unitId, payload.x, payload.y);
      })
      .on('broadcast', { event: 'attack' }, ({ payload }) => {
        handleRemoteAttack(payload.attId, payload.defId);
      })
      .on('broadcast', { event: 'heal' }, ({ payload }) => {
        handleRemoteHeal(payload.driadaId, payload.targetId);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && role === 1 && p1) {
          channel.send({
            type: 'broadcast',
            event: 'player_joined',
            payload: { player: p1 }
          });
        }
      });

    channelRef.current = channel;
  };

  // --- BATTLE SYNC HELPERS ---
  const syncFullState = (m: ArenaMatchState, currentUnits?: CombatUnit[]) => {
    if (myIndex !== 0) return; // Only host syncs initial/round state
    
    let u = currentUnits || units;
    if (u.length === 0 && m.players[0] && m.players[1]) {
      u = initializeUnits(m.players[0], m.players[1]);
      setUnits(u);
    }

    const nextActiveId = getNextActiveUnitId(u);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'sync_state',
      payload: {
        units: u,
        turn: m.turn,
        round: 1,
        timer: TURN_TIME,
        activeUnitId: nextActiveId,
        status: 'playing'
      }
    });

    setTurn(m.turn);
    setActiveUnitId(nextActiveId);
  };

  const getNextActiveUnitId = (currentUnits: CombatUnit[]): string | null => {
    const readyUnits = currentUnits.filter(u => u.count > 0 && !u.hasActed);
    if (readyUnits.length === 0) return null;
    
    readyUnits.sort((a,b) => {
      const infoA = UNITS_INFO[a.unitId];
      const infoB = UNITS_INFO[b.unitId];
      if (infoA.speed !== infoB.speed) return infoB.speed - infoA.speed;
      if (a.playerIndex !== b.playerIndex) return a.playerIndex - b.playerIndex;
      return 0;
    });

    return readyUnits[0].id;
  };

  const initializeUnits = (p0: ArenaPlayer, p1: ArenaPlayer | null): CombatUnit[] => {
    const initialUnits: CombatUnit[] = [];
    
    // P0 - Left
    let y0 = 0;
    Object.entries(p0.army).forEach(([id, _count]) => {
      const count = Number(_count);
      const info = UNITS_INFO[id as UnitId];
      if (!info) {
        console.warn('DEBUG: Unknown unit id found in army:', id);
        return;
      }
      
      if (count > 0) {
        initialUnits.push({
          id: `p0-${id}`,
          unitId: id as UnitId,
          count,
          startCount: count,
          hp: Math.floor(info.hp * p0.hpMod),
          playerIndex: 0,
          x: 0,
          y: y0,
          hasActed: false
        });
        y0 += (info.size || 1);
      }
    });

    // P1 - Right
    if (p1) {
      let y1 = 0;
      Object.entries(p1.army).forEach(([id, _count]) => {
        const count = Number(_count);
        const info = UNITS_INFO[id as UnitId];
        if (!info) {
          console.warn('DEBUG: Unknown unit id found in p1 army:', id);
          return;
        }

        if (count > 0) {
          initialUnits.push({
            id: `p1-${id}`,
            unitId: id as UnitId,
            count,
            startCount: count,
            hp: Math.floor(info.hp * p1.hpMod),
            playerIndex: 1,
            x: GRID_WIDTH - (info.size || 1),
            y: y1,
            hasActed: false
          });
          y1 += (info.size || 1);
        }
      });
    }

    return initialUnits;
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (view !== 'battle' || gameOver || match?.status === 'waiting') return;
    
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          // Force turn switch if timer expires
          if (turn === myIndex) {
            skipTurn();
          } else if (myIndex === 0) {
            // Host skips guest's turn if it times out
            skipTurn();
          }
          return TURN_TIME;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [view, turn, myIndex, gameOver, match?.status, units, activeUnitId]);

  const skipTurn = () => {
    let updatedUnits = units;
    if (activeUnitId) {
      updatedUnits = units.map(u => u.id === activeUnitId ? { ...u, hasActed: true } : u);
    }
    finishAction(updatedUnits);
  };

  const finishAction = (updatedUnits: CombatUnit[]) => {
    const nextId = getNextActiveUnitId(updatedUnits);
    let nextTurn = turn;
    let nextRound = round;
    let finalUnits = updatedUnits;

    if (!nextId) {
      // New Round
      nextRound += 1;
      finalUnits = updatedUnits.map(u => ({ ...u, hasActed: false }));
      const newNextId = getNextActiveUnitId(finalUnits);
      const nextActiveUnit = finalUnits.find(u => u.id === newNextId);
      nextTurn = (nextActiveUnit?.playerIndex as 0 | 1) ?? 0;
      
      setUnits(finalUnits);
      setRound(nextRound);
      setTurn(nextTurn);
      setActiveUnitId(newNextId);
      setTimer(TURN_TIME);
    } else {
      const nextActiveUnit = updatedUnits.find(u => u.id === nextId);
      nextTurn = (nextActiveUnit?.playerIndex as 0 | 1) ?? 0;
      
      setUnits(updatedUnits);
      setTurn(nextTurn);
      setActiveUnitId(nextId);
      setTimer(TURN_TIME);
    }

    // Only broadcast if we took the action
    channelRef.current?.send({
      type: 'broadcast',
      event: 'sync_state',
      payload: {
        units: finalUnits,
        turn: nextTurn,
        round: nextRound,
        timer: TURN_TIME,
        activeUnitId: nextId || getNextActiveUnitId(finalUnits)
      }
    });

    checkWinCondition(finalUnits);
  };

  const [isHealMode, setIsHealMode] = useState(false);

  // --- ACTIONS ---
  const handleCellClick = (x: number, y: number) => {
    if (turn !== myIndex || gameOver) return;
    const activeUnit = units.find(u => u.id === activeUnitId);
    if (!activeUnit) return;

    const uAt = getUnitAt(x, y);
    const info = UNITS_INFO[activeUnit.unitId];
    
    if (isHealMode) {
      if (uAt && uAt.playerIndex === myIndex && uAt.count < uAt.startCount) {
        localHeal(activeUnit.id, uAt.id);
        setIsHealMode(false);
      } else {
        setIsHealMode(false);
      }
      return;
    }

    const dx = Math.max(0, Math.max(x - (activeUnit.x + (info.size || 1) - 1), activeUnit.x - (x + 1 - 1)));
    const dy = Math.max(0, Math.max(y - (activeUnit.y + (info.size || 1) - 1), activeUnit.y - (y + 1 - 1)));
    const dist = dx + dy;

    if (uAt) {
      if (uAt.playerIndex !== myIndex) {
        // Attack
        if (dist <= info.range) {
          localAttack(activeUnit.id, uAt.id);
        }
      }
    } else {
      // Move
      if (dist <= info.speed && isAreaFree(x, y, info.size || 1, activeUnit.id, units)) {
        localMove(activeUnit.id, x, y);
      }
    }
  };

  const localMove = (unitId: string, x: number, y: number) => {
    channelRef.current?.send({ type: 'broadcast', event: 'move', payload: { unitId, x, y } });
    handleRemoteMove(unitId, x, y);
  };

  const handleRemoteMove = (unitId: string, x: number, y: number) => {
    const updated = units.map(u => u.id === unitId ? { ...u, x, y, hasActed: true } : u);
    setUnits(updated);
    addLog(`${UNITS_INFO[units.find(u => u.id === unitId)!.unitId].name} переместился.`);
    if (turn === myIndex) finishAction(updated);
  };

  const localAttack = (attId: string, defId: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'attack', payload: { attId, defId } });
    handleRemoteAttack(attId, defId);
  };

  const handleRemoteAttack = (attId: string, defId: string) => {
    const att = units.find(u => u.id === attId)!;
    const def = units.find(u => u.id === defId)!;
    
    // Logic from CombatView
    processAttack(att, def);
  };

  const localHeal = (driadaId: string, targetId: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'heal', payload: { driadaId, targetId } });
    handleRemoteHeal(driadaId, targetId);
  };

  const handleRemoteHeal = (driadaId: string, targetId: string) => {
    const driada = units.find(u => u.id === driadaId)!;
    const target = units.find(u => u.id === targetId)!;
    
    const lost = target.startCount - target.count;
    const healAmount = Math.min(lost, Math.floor(Math.random() * 3) + 1);

    const updated = units.map(u => {
      if (u.id === driada.id) return { ...u, hasActed: true };
      if (u.id === target.id) return { ...u, count: u.count + healAmount };
      return u;
    });

    setUnits(updated);
    addLog(`Дриада воскрешает ${healAmount} ${UNITS_INFO[target.unitId].name}!`);
    
    const effId = getRandomId('heal');
    setEffects(prev => [...prev, { id: effId, type: 'heal', x: target.x, y: target.y, size: UNITS_INFO[target.unitId].size || 1 }]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== effId)), 700);

    if (turn === myIndex) finishAction(updated);
  };

  // --- COMBAT CORE ---
  const processAttack = (attacker: CombatUnit, defender: CombatUnit) => {
    const attackerInfo = UNITS_INFO[attacker.unitId];
    const defenderInfo = UNITS_INFO[defender.unitId];

    const triggerEffect = (aId: UnitId, dId: UnitId, dx: number, dy: number, ds: number) => {
      const aInfo = UNITS_INFO[aId];
      if (aInfo.range > 1) {
        let type: 'arrow' | 'fireball' | 'lightning' = 'arrow';
        if (aId === 'mage') type = 'fireball';
        if (aId === 'titan' || aId === 'giant') type = 'lightning';
        
        const pid = getRandomId('p');
        setProjectiles(prev => [...prev, { id: pid, type, startX: attacker.x, startY: attacker.y, endX: dx, endY: dy }]);
        setTimeout(() => {
          setProjectiles(prev => prev.filter(p => p.id !== pid));
          const hitType = (type === 'fireball' ? 'fire' : (type === 'lightning' ? 'lightning_hit' : 'hit')) as any;
          const eid = getRandomId('e');
          setEffects(prev => [...prev, { id: eid, type: hitType, x: dx, y: dy, size: ds }]);
          setTimeout(() => setEffects(prev => prev.filter(e => e.id !== eid)), 500);
        }, 500);
      } else {
        const eid = getRandomId('e');
        setEffects(prev => [...prev, { id: eid, type: 'slash', x: dx, y: dy, size: ds }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== eid)), 500);
      }
    };

    triggerEffect(attacker.unitId, defender.unitId, defender.x, defender.y, defenderInfo.size || 1);

    // Damage calculation
    const damageObj = calculatePvPDamage(attacker, defender, units);
    let remainingStackHP = (defender.count - 1) * damageObj.effUnitHp + defender.hp - damageObj.totalDmg;
    let newCount = Math.max(0, Math.ceil(remainingStackHP / damageObj.effUnitHp));
    let newTopHP = remainingStackHP <= 0 ? 0 : (remainingStackHP % damageObj.effUnitHp === 0 ? damageObj.effUnitHp : remainingStackHP % damageObj.effUnitHp);

    const updated = units.map(u => {
      if (u.id === attacker.id) return { ...u, hasActed: true };
      if (u.id === defender.id) return { ...u, count: newCount, hp: newTopHP };
      return u;
    });

    setUnits(updated);
    addLog(`${attackerInfo.name} -> ${damageObj.totalDmg} урона. Убито: ${defender.count - newCount}`);
    
    setTimeout(() => {
      if (turn === myIndex) finishAction(updated);
    }, 600);
  };

  const calculatePvPDamage = (att: CombatUnit, def: CombatUnit, currentUnits: CombatUnit[]) => {
    const attInfo = UNITS_INFO[att.unitId];
    const defInfo = UNITS_INFO[def.unitId];
    const pAtt = match!.players[att.playerIndex];
    const pDef = match!.players[def.playerIndex];

    let effAttack = Math.floor(attInfo.attack * pAtt.atkMod);
    let effDefense = Math.floor(defInfo.defense * pDef.defMod);
    
    // Paladin Aura
    const defSize = defInfo.size || 1;
    const hasPaladinAura = currentUnits.some(u => {
      if (u.playerIndex !== def.playerIndex || u.unitId !== 'paladin' || u.count <= 0) return false;
      const uSize = UNITS_INFO[u.unitId]?.size || 1;
      const dx = Math.max(0, Math.max(u.x - (def.x + defSize - 1), def.x - (u.x + uSize - 1)));
      const dy = Math.max(0, Math.max(u.y - (def.y + defSize - 1), def.y - (u.y + uSize - 1)));
      return dx <= 1 && dy <= 1;
    });
    if (hasPaladinAura) effDefense += 15;

    const effMinDmg = Math.floor(attInfo.minDamage * pAtt.atkMod);
    const effMaxDmg = Math.floor(attInfo.maxDamage * pAtt.atkMod);
    const effUnitHp = Math.floor(defInfo.hp * pDef.hpMod);

    const rawDmg = getRandomDamage(effMinDmg, effMaxDmg);
    let totalDmg = rawDmg * att.count;
    const statDiff = effAttack - effDefense;
    const multiplier = Math.max(0.05, 1 + (statDiff * 0.05));
    totalDmg = Math.floor(totalDmg * multiplier);
    
    return { totalDmg, effUnitHp };
  };

  const checkWinCondition = (currentUnits: CombatUnit[]) => {
    const p0Alive = currentUnits.filter(u => u.playerIndex === 0 && u.count > 0).length > 0;
    const p1Alive = currentUnits.filter(u => u.playerIndex === 1 && u.count > 0).length > 0;

    if (!p1Alive && p0Alive) {
      if (myIndex === 0) setGameOver('win'); else setGameOver('loss');
    } else if (!p0Alive && p1Alive) {
      if (myIndex === 1) setGameOver('win'); else setGameOver('loss');
    }
  };

  const claimReward = () => {
    if (gameOver === 'win') {
      setResources(addResources(resources, { crystals: 50 } as any));
    }
    onClose();
  };

  // --- UTILS ---
  const getUnitAt = (tx: number, ty: number) => {
    return units.find(u => {
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
        const u = getUnitAt(tx, ty);
        if (u && u.id !== excludeId) return false;
      }
    }
    return true;
  };

  // --- RENDERING ---
  const renderLobby = () => (
    <div className="flex flex-col items-center w-full max-w-md gap-4">
      <div className="wow-panel w-full p-4 flex flex-col items-center">
        <Trophy className="w-12 h-12 text-amber-500 mb-2 animate-bounce" />
        <h2 className="text-xl font-black text-amber-500 uppercase tracking-widest text-shadow-glow">Арена Героев</h2>
        <p className="text-[10px] text-stone-400 border-b border-stone-800 pb-2 mb-4 w-full text-center">СРАЖАЙТЕСЬ С РЕАЛЬНЫМИ ИГРОКАМИ ЗА КРИСТАЛЛЫ</p>
        
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] uppercase font-bold text-stone-500">Игроки в сети</span>
            <span className="text-[10px] text-green-500 font-mono flex items-center gap-1">● {lobbyPlayers.length} online</span>
          </div>
          
          <div className="bg-stone-950/50 rounded border border-stone-800 min-h-[200px] max-h-[300px] overflow-y-auto p-2">
            {lobbyPlayers.length <= 1 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-50 py-10">
                <MessageSquare className="w-6 h-6 mb-2" />
                <p className="text-xs uppercase tracking-widest font-black">Ждем противника...</p>
              </div>
            ) : (
              lobbyPlayers.filter(p => p.id !== user?.id).map(player => (
                <div key={player.id} className="wow-panel-metal p-2 mb-2 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-amber-400">{player.name}</h4>
                    <p className="text-[10px] text-stone-500 font-mono">Сила: {player.armyPower} | Дворец: {player.palaceLevel}</p>
                  </div>
                  <button 
                    onClick={() => invitePlayer(player)}
                    className="wow-button p-2 text-[10px] font-black uppercase tracking-tighter"
                  >
                    Вызвать
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBattle = () => {
    const gridCells = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const u = getUnitAt(x, y);
        const activeUnit = units.find(act => act.id === activeUnitId);
        const info = activeUnit ? UNITS_INFO[activeUnit.unitId] : null;
        const size = info?.size || 1;
        
        const dist = activeUnit ? (Math.max(0, Math.max(x - (activeUnit.x + size - 1), activeUnit.x - (x + 1 - 1))) + Math.max(0, Math.max(y - (activeUnit.y + size - 1), activeUnit.y - (y + 1 - 1)))) : 99;
        
        const isAllowedMove = turn === myIndex && activeUnit && !u && dist <= (info?.speed || 0) && isAreaFree(x, y, size, activeUnit.id, units);
        const isTarget = turn === myIndex && activeUnit && u && u.playerIndex !== myIndex && dist <= (info?.range || 0);

        const isHealTarget = turn === myIndex && activeUnit && activeUnit.unitId === 'driada' && u && u.playerIndex === myIndex && u.count < u.startCount;
        const isUnhealable = turn === myIndex && activeUnit && activeUnit.unitId === 'driada' && u && u.playerIndex === myIndex && u.count >= u.startCount;
        
        const isPaladinAura = activeUnit && activeUnit.unitId === 'paladin' && dist <= 1;

        gridCells.push(
          <div 
            key={`${x}-${y}`}
            onClick={() => handleCellClick(x, y)}
            className={cn(
              "relative w-full aspect-square border border-stone-800/30 transition-all",
              isAllowedMove && "bg-green-500/10 cursor-pointer hover:bg-green-500/20",
              isTarget && "bg-red-500/10 cursor-pointer hover:bg-red-500/20",
              isHealTarget && "bg-blue-500/20 cursor-pointer hover:bg-blue-500/40",
              isUnhealable && "bg-red-500/10",
              isPaladinAura && "bg-yellow-500/10"
            )}
          >
            {u && u.x === x && u.y === y && (
              <motion.div 
                layoutId={u.id}
                className={cn(
                  "p-0.5 rounded-sm border-2 overflow-hidden bg-stone-900 shadow-xl",
                  u.playerIndex === 0 ? "border-blue-500/50" : "border-red-500/50",
                  u.id === activeUnitId && "border-white shadow-[0_0_15px_white]",
                  isUnhealable && "border-red-600 shadow-[0_0_10px_#dc2626]"
                )}
                style={{ 
                  width: `${(UNITS_INFO[u.unitId].size || 1) * 100 - 10}%`,
                  height: `${(UNITS_INFO[u.unitId].size || 1) * 100 - 10}%`,
                  position: 'absolute', top: '5%', left: '5%',
                  zIndex: u.id === activeUnitId ? 50 : 30
                }}
              >
                <img src={UNITS_INFO[u.unitId].image} className={cn("w-full h-full object-cover", u.playerIndex === 1 && "scale-x-[-1]")} />
                <div className="absolute bottom-0 right-0 bg-stone-950 px-1 text-[8px] font-mono border-t border-l border-stone-700 text-stone-200">
                  {u.count}
                </div>
              </motion.div>
            )}
          </div>
        );
      }
    }

    return (
      <div className="flex flex-col items-center w-full max-w-lg gap-4 relative">
        {/* Battle Header */}
        <div className="w-full flex justify-between items-center mb-2 px-2">
           <div className="flex flex-col">
             <span className={cn("text-xs font-black uppercase tracking-widest", myIndex === 0 ? "text-blue-400" : "text-stone-500")}>
               {match?.players[0].name} {myIndex === 0 && "(Вы)"}
             </span>
             <span className="text-[10px] text-stone-600 font-mono">VS</span>
             <span className={cn("text-xs font-black uppercase tracking-widest", myIndex === 1 ? "text-red-400" : "text-stone-500")}>
               {match?.players[1]?.name || '...'} {myIndex === 1 && "(Вы)"}
             </span>
           </div>
           
           <div className="wow-panel p-2 flex items-center gap-4">
              <div className="flex flex-col items-center">
                 <Timer className="w-4 h-4 text-amber-500 mb-0.5" />
                 <span className={cn("text-xl font-black font-mono", timer <= 3 ? "text-red-500 animate-pulse" : "text-amber-500")}>{timer}s</span>
              </div>
              <div className="h-10 w-px bg-stone-800"></div>
              <div className="flex flex-col items-center">
                 <span className="text-[8px] uppercase text-stone-500">Ход</span>
                 <span className="text-[10px] font-black text-amber-400 uppercase tracking-tighter">
                   {turn === myIndex ? 'ВАШ ОЧЕРЕДЬ' : 'ВРАГ ХОДИТ'}
                 </span>
              </div>
           </div>
        </div>

        {/* Battlefield */}
        <div className="relative w-full aspect-square bg-stone-900/50 border-4 border-stone-800 rounded shadow-2xl overflow-hidden active-battle-grid">
           {match?.status === 'waiting' && (
             <div className="absolute inset-0 bg-stone-950/80 z-50 flex flex-col items-center justify-center">
               <Trophy className="w-12 h-12 text-amber-500 mb-4 animate-bounce" />
               <h2 className="text-xl font-black uppercase tracking-widest text-amber-400">Ожидание Противника</h2>
               <p className="text-xs text-stone-400 mt-2">Арена ждет героев...</p>
             </div>
           )}
           <div 
             className="grid w-full h-full"
             style={{ gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`, gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)` }}
           >
             {gridCells}
           </div>

           {/* FX layer */}
           {projectiles.map(p => (
              <motion.div key={p.id} initial={{ left: `${p.startX*12.5 + 6.25}%`, top: `${p.startY*12.5 + 6.25}%` }} animate={{ left: `${p.endX*12.5 + 6.25}%`, top: `${p.endY*12.5 + 6.25}%` }} className="absolute w-2 h-2 bg-amber-400 rounded-full z-[100] blur-[1px]" />
           ))}
           {effects.map(e => (
              <motion.div key={e.id} initial={{ opacity: 1, scale: 0.5 }} animate={{ opacity: 0, scale: 2 }} className="absolute z-[110] pointer-events-none" style={{ left: `${e.x*12.5 + 6.25}%`, top: `${e.y*12.5 + 6.25}%`, transform: 'translate(-50%, -50%)' }}>
                 {e.type === 'heal' ? <Heart className="text-green-500 w-12 h-12" /> : <Shield className="text-red-500 w-12 h-12" />}
              </motion.div>
           ))}
        </div>

        {/* Console */}
        <div className="w-full bg-stone-950/80 border border-stone-800 rounded p-2 h-24 overflow-hidden mb-2">
           {log.map((m, i) => (
             <p key={i} className={cn("text-[10px] font-mono leading-none mb-1", i === 0 ? "text-amber-400 font-bold" : "text-stone-500")}>
               [{round}] {m}
             </p>
           ))}
        </div>

        {/* Battle Controls */}
        {activeUnitId && units.find(u => u.id === activeUnitId)?.playerIndex === myIndex && (
          <div className="w-full flex gap-2">
            <button 
              onClick={() => skipTurn()}
              className="wow-button flex-1 p-2 text-[10px] font-black uppercase tracking-tighter"
            >
              Пас
            </button>
            {units.find(u => u.id === activeUnitId)?.unitId === 'driada' && (
              <button 
                onClick={() => setIsHealMode(true)}
                className={cn("wow-button flex-1 p-2 flex items-center justify-center", isHealMode && "bg-blue-600")}
              >
                <img src="/units/driadaheal.png" className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => (
    <div className="wow-panel p-6 flex flex-col items-center text-center max-w-sm">
      <Trophy className={cn("w-20 h-20 mb-4", gameOver === 'win' ? "text-amber-500 animate-bounce" : "text-stone-600 grayscale")} />
      <h2 className="text-2xl font-black uppercase tracking-widest mb-2">
        {gameOver === 'win' ? 'ПОБЕДА НА АРЕНЕ!' : 'ПОРАЖЕНИЕ'}
      </h2>
      <p className="text-stone-400 text-sm mb-6">
        {gameOver === 'win' 
          ? 'Вы доказали свое превосходство и заслужили награду в 50 кристаллов.' 
          : 'Ваши войска пали, но дух не сломлен. Возвращайтесь сильнее.'}
      </p>
      
      {gameOver === 'win' && (
        <div className="bg-indigo-950/30 border border-indigo-500 p-3 rounded mb-6 flex flex-col items-center">
           <span className="text-xs text-indigo-300 font-bold uppercase tracking-widest">ВАША НАГРАДА</span>
           <span className="text-2xl font-black text-indigo-400 animate-pulse">50 💎 Кристаллов</span>
        </div>
      )}

      <button onClick={claimReward} className="wow-button w-full py-4 font-black uppercase tracking-widest">
        ВЕРНУТЬСЯ В ГОРОД
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-stone-500 hover:text-white transition-colors">
        <X className="w-8 h-8" />
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={gameOver ? 'results' : view}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full flex flex-col items-center"
        >
          {gameOver ? renderResults() : view === 'lobby' ? renderLobby() : renderBattle()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

