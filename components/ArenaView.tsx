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
  const { user, army, setArmy, palaceLevel, playerName, equipment, setResources, resources, siegeUnits } = useGame();
  
  const [view, setView] = useState<'lobby' | 'battle' | 'results'>('lobby');
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([]);
  const [match, setMatch] = useState<ArenaMatchState | null>(null);
  const [myIndex, setMyIndex] = useState<0 | 1 | null>(null);
  const [units, setUnits] = useState<CombatUnit[]>([]);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [timer, setTimer] = useState(TURN_TIME);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [log, setLog] = useState<string[]>(['Арена чекає на героїв!']);
  const [gameOver, setGameOver] = useState<'win' | 'loss' | null>(null);
  
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [effects, setEffects] = useState<AttackEffect[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<{ id: number, text: string, x: number, y: number, color?: string }[]>([]);
  const [selectedUnitInfo, setSelectedUnitInfo] = useState<CombatUnit | null>(null);

  const [connectionError, setConnectionError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const lobbyChannelRef = useRef<RealtimeChannel | null>(null);

  const atkMod = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.attackBonus || 0), 0) / 100;
  const defMod = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.defenseBonus || 0), 0) / 100;
  const hpMod  = 1 + Object.values(equipment).reduce((acc, eq) => acc + (eq?.stats.hpBonus || 0), 0) / 100;

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 5));

  // --- LOBBY LOGIC ---
  useEffect(() => {
    if (!user || !supabase) {
      if (!supabase) setConnectionError("Supabase не налаштовано. Арена тимчасово недоступна.");
      return;
    }

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
          if (confirm(`Гравець ${payload.fromName} викликає вас на бій! Прийняти?`)) {
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
              armyPower: Object.values(army).reduce((a, b) => a + (Number(b) || 0), 0)
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
      alert("У вас немає армії! Спочатку найміть війська.");
      return;
    }

    const matchId = `match_${user.id}_${Date.now()}`;
    const myPlayer: ArenaPlayer = {
      id: user.id,
      name: playerName || user.email?.split('@')[0] || 'Unknown',
      army,
      hpMod,
      atkMod,
      defMod,
      siegeUnits,
      resources
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
      defMod,
      siegeUnits,
      resources
    };
    
    // We are player 1
    startMatch(matchId, opponent, role, myPlayer);
  };

  const startMatch = (id: string, p0: ArenaPlayer, role: 0 | 1, p1?: ArenaPlayer) => {
    if (!supabase) return;
    setMyIndex(role);
    
    // Defender (P1) goes first if they have siege units, or just by default as requested
    const matchData: ArenaMatchState = {
      id,
      players: (role === 0 ? [p0, null] : [p0, p1]) as [ArenaPlayer, ArenaPlayer],
      status: 'waiting',
      turn: 1, // Defender is player 1 in the invitation flow
      timer: TURN_TIME,
      activeUnitId: null,
      winner: null
    };
    setMatch(matchData);
    setView('battle');
    
    // Subscribe to match channel
    const channel = supabase.channel(`arena:match:${id}`);
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presenceCount = Object.keys(state).length;
        // If we are playing and someone left
        if (view === 'battle' && !gameOver && presenceCount < 2 && match?.status === 'playing') {
          // Someone left
          addLog("Супротивник залишив поле бою! Технічна перемога.");
          setGameOver('win');
          channel.send({ type: 'broadcast', event: 'surrender', payload: { from: user?.id } });
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (view === 'battle' && !gameOver && match?.status === 'playing') {
          addLog("Супротивник залишив бій.");
          setGameOver('win');
        }
      })
      .on('broadcast', { event: 'surrender' }, () => {
        if (!gameOver) {
          addLog("Бій завершено. Супротивник здався.");
          setGameOver('loss');
        }
      })
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
          addLog(`Гравець ${payload.player.name} увійшов у бій!`);
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

    // Handle surrender on page close
    const handleUnload = () => {
      channel.send({ type: 'broadcast', event: 'surrender', payload: { from: user?.id } });
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  };

  // --- BATTLE SYNC HELPERS ---
  const syncFullState = (m: ArenaMatchState, currentUnits?: CombatUnit[]) => {
    if (!user || !m.players[0] || m.players[0].id !== user.id) return; // Only host syncs initial/round state
    
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

  const getNextActiveUnitId = (currentUnits: CombatUnit[], lastPlayerIndex?: number): string | null => {
    const readyUnits = currentUnits.filter(u => u.count > 0 && !u.hasActed);
    if (readyUnits.length === 0) return null;
    
    const targetPlayerIndex = lastPlayerIndex === 0 ? 1 : 0;

    readyUnits.sort((a,b) => {
      const infoA = UNITS_INFO[a.unitId];
      const infoB = UNITS_INFO[b.unitId];
      
      // 1. Primary sort: Speed
      if (infoA.speed !== infoB.speed) return infoB.speed - infoA.speed;
      
      // 2. Tie breaker: Alternating Player Index
      if (a.playerIndex === targetPlayerIndex && b.playerIndex !== targetPlayerIndex) return -1;
      if (b.playerIndex === targetPlayerIndex && a.playerIndex !== targetPlayerIndex) return 1;
      
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
      if (!info) return;
      
      if (count > 0 && info.speed > 0) { // Don't include siege units in normal army list
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

    // P0 Siege Units (If any)
    if (p0.siegeUnits) {
       p0.siegeUnits.forEach((sId, idx) => {
         if (sId) {
            const info = UNITS_INFO[sId];
            initialUnits.push({
              id: `p0-siege-${idx}`,
              unitId: sId,
              count: 1,
              startCount: 1,
              hp: Math.floor(info.hp * p0.hpMod),
              playerIndex: 0,
              x: 0,
              y: idx * 2, // Distributed
              hasActed: false
            });
         }
       });
    }

    // P1 - Right
    if (p1) {
      let y1 = 0;
      Object.entries(p1.army).forEach(([id, _count]) => {
        const count = Number(_count);
        const info = UNITS_INFO[id as UnitId];
        if (!info) return;

        if (count > 0 && info.speed > 0) {
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

      // P1 Siege Units (Defender usually has these)
      if (p1.siegeUnits) {
        p1.siegeUnits.forEach((sId, idx) => {
          if (sId) {
             const info = UNITS_INFO[sId];
             initialUnits.push({
               id: `p1-siege-${idx}`,
               unitId: sId,
               count: 1,
               startCount: 1,
               hp: Math.floor(info.hp * p1.hpMod),
               playerIndex: 1,
               x: GRID_WIDTH - (info.size || 1),
               y: idx * 2,
               hasActed: false
             });
          }
        });
      }
    }

    return initialUnits;
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (view !== 'battle' || gameOver || match?.status === 'waiting') return;
    
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1 && turn === myIndex) {
          // Force turn switch if timer expires for active player
          skipTurn();
          return TURN_TIME;
        } else if (t <= -2 && myIndex === 0) {
          // Host skips guest's turn if they disconnected and failed to skip
          skipTurn();
          return TURN_TIME;
        } else if (t <= -5) {
           return 0; // Prevent runaway negative numbers for Guests
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [view, turn, myIndex, gameOver, match?.status, units, activeUnitId]);

  // Anti-cheat: sync army losses in real-time
  useEffect(() => {
    if (gameOver !== null || units.length === 0 || view !== 'battle') return;
    
    setArmy(prev => {
      const myPlayerUnitsInBattle = units.filter(u => u.playerIndex === myIndex);
      let changed = false;
      const next = { ...prev };
      
      myPlayerUnitsInBattle.forEach(u => {
        if (next[u.unitId] !== u.count) {
          next[u.unitId] = u.count;
          changed = true;
        }
      });
      
      return changed ? next : prev;
    });
  }, [units, myIndex, gameOver, view, setArmy]);

  const skipTurn = () => {
    let updatedUnits = units;
    if (activeUnitId) {
      updatedUnits = units.map(u => u.id === activeUnitId ? { ...u, hasActed: true } : u);
    }
    finishAction(updatedUnits);
  };

  const finishAction = (updatedUnits: CombatUnit[]) => {
    const nextId = getNextActiveUnitId(updatedUnits, turn);
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
  };

  const [isHealMode, setIsHealMode] = useState(false);

  useEffect(() => {
    if (turn !== myIndex) {
      setIsHealMode(false);
    }
  }, [turn, myIndex]);

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
    addLog(`${UNITS_INFO[units.find(u => u.id === unitId)!.unitId].name} перемістився.`);
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
    addLog(`Дріада воскрешає ${healAmount} ${UNITS_INFO[target.unitId].name}!`);
    
    const effId = getRandomId('heal');
    setEffects(prev => [...prev, { id: effId, type: 'heal', x: target.x, y: target.y, size: UNITS_INFO[target.unitId].size || 1 }]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== effId)), 700);

    const fId = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id: fId, text: `+${healAmount}`, x: target.x, y: target.y, color: 'text-green-500' }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== fId)), 1000);

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

    const addFloatingText = (text: string, x: number, y: number, color?: string) => {
      const id = Date.now() + Math.random();
      setFloatingTexts(prev => [...prev, { id, text, x, y, color }]);
      setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1000);
    };

    // Damage calculation
    const damageObj = calculatePvPDamage(attacker, defender, units);
    let remainingStackHP = (defender.count - 1) * damageObj.effUnitHp + defender.hp - damageObj.totalDmg;
    let newCount = Math.max(0, Math.ceil(remainingStackHP / damageObj.effUnitHp));
    let newTopHP = remainingStackHP <= 0 ? 0 : (remainingStackHP % damageObj.effUnitHp === 0 ? damageObj.effUnitHp : remainingStackHP % damageObj.effUnitHp);

    addFloatingText(`-${damageObj.totalDmg}`, defender.x, defender.y, 'text-rose-500');

    const updated = units.map(u => {
      if (u.id === attacker.id) return { ...u, hasActed: true };
      if (u.id === defender.id) return { ...u, count: newCount, hp: newTopHP };
      return u;
    });

    setUnits(updated);
    addLog(`${attackerInfo.name} -> ${damageObj.totalDmg} шкоди. Вбито: ${defender.count - newCount}`);
    
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

  useEffect(() => {
    if (gameOver !== null || units.length === 0 || match?.status !== 'playing') return;

    const p0Alive = units.filter(u => u.playerIndex === 0 && u.count > 0).length > 0;
    const p1Alive = units.filter(u => u.playerIndex === 1 && u.count > 0).length > 0;

    if (!p1Alive && p0Alive) {
      setGameOver(myIndex === 0 ? 'win' : 'loss');
    } else if (!p0Alive && p1Alive) {
      setGameOver(myIndex === 1 ? 'win' : 'loss');
    }
  }, [units, gameOver, match?.status, myIndex]);

  const claimReward = () => {
    if (gameOver === 'win' && match) {
      const opponent = match.players[myIndex === 0 ? 1 : 0];
      if (opponent && opponent.resources) {
        const loot: any = {
           gold: Math.floor(opponent.resources.gold * 0.5),
           wood: Math.floor(opponent.resources.wood * 0.5),
           stone: Math.floor(opponent.resources.stone * 0.5),
           food: Math.floor(opponent.resources.food * 0.5),
           crystals: Math.floor(opponent.resources.crystals * 0.5),
        };
        setResources(prev => addResources(prev, loot));
        addLog(`Ви захопили 50% ресурсів ворога!`);
      } else {
        // Fallback
        setResources(prev => addResources(prev, { crystals: 50 } as any));
      }
    } else if (gameOver === 'loss' && match) {
      // Lose 50% of your resources
      setResources(prev => ({
        ...prev,
        gold: Math.floor(prev.gold * 0.5),
        wood: Math.floor(prev.wood * 0.5),
        stone: Math.floor(prev.stone * 0.5),
        food: Math.floor(prev.food * 0.5),
        crystals: Math.floor(prev.crystals * 0.5),
      }));
      addLog("Ви втратили 50% ресурсів при поразці!");
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
      {connectionError && (
        <div className="bg-red-950/50 border border-red-500 p-4 rounded text-red-200 text-xs w-full text-center mb-4">
          <p className="font-bold mb-1">Помилка підключення</p>
          <p>{connectionError}</p>
          <p className="mt-2 text-[10px] opacity-80">Будь ласка, перевірте з'єднання або ключі Supabase у налаштуваннях (Secrets) для активації Арени.</p>
        </div>
      )}
      <div className="wow-panel w-full p-4 flex flex-col items-center">
        <Trophy className="w-12 h-12 text-amber-500 mb-2 animate-bounce" />
        <h2 className="text-xl font-black text-amber-500 uppercase tracking-widest text-shadow-glow">Арена Героїв</h2>
        <p className="text-[10px] text-stone-400 border-b border-stone-800 pb-2 mb-4 w-full text-center">БИЙТЕСЯ З РЕАЛЬНИМИ ГРАВЦЯМИ ЗА КРИСТАЛИ</p>
        
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] uppercase font-bold text-stone-500">Гравці в мережі</span>
            <span className="text-[10px] text-green-500 font-mono flex items-center gap-1">● {lobbyPlayers.length} онлайн</span>
          </div>
          
          <div className="bg-stone-950/50 rounded border border-stone-800 min-h-[200px] max-h-[300px] overflow-y-auto p-2">
            {lobbyPlayers.length <= 1 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-50 py-10">
                <MessageSquare className="w-6 h-6 mb-2" />
                <p className="text-xs uppercase tracking-widest font-black">Чекаємо на супротивника...</p>
              </div>
            ) : (
              lobbyPlayers.filter(p => p.id !== user?.id).map(player => (
                <div key={player.id} className="wow-panel-metal p-2 mb-2 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-amber-400">{player.name}</h4>
                    <p className="text-[10px] text-stone-500 font-mono">Сила: {player.armyPower} | Палац: {player.palaceLevel}</p>
                  </div>
                  <button 
                    onClick={() => invitePlayer(player)}
                    className="wow-button p-2 text-[10px] font-black uppercase tracking-tighter"
                  >
                    Викликати
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
        const uUnderTile = getUnitAt(x, y);
        const activeUnit = activeUnitId ? units.find(act => act.id === activeUnitId) : null;
        const info = activeUnit ? UNITS_INFO[activeUnit.unitId] : null;
        const size = info?.size || 1;
        
        const dx = Math.max(0, Math.max(x - (activeUnit?.x || 0 + size - 1), (activeUnit?.x || 0) - (x + 1 - 1)));
        const dy = Math.max(0, Math.max(y - (activeUnit?.y || 0 + size - 1), (activeUnit?.y || 0) - (y + 1 - 1)));
        
        const activeSize = activeUnit ? (UNITS_INFO[activeUnit.unitId].size || 1) : 1;
        const dist = activeUnit ? (Math.max(0, Math.max(x - (activeUnit.x + activeSize - 1), activeUnit.x - (x + 1 - 1))) + Math.max(0, Math.max(y - (activeUnit.y + activeSize - 1), activeUnit.y - (y + 1 - 1)))) : 99;
        
        const isAllowedMove = turn === myIndex && activeUnit && !uUnderTile && dist <= (info?.speed || 0) && isAreaFree(x, y, activeSize, activeUnit.id, units);
        const isTarget = turn === myIndex && activeUnit && uUnderTile && uUnderTile.playerIndex !== myIndex && dist <= (info?.range || 1);

        const isHealTarget = turn === myIndex && activeUnit && activeUnit.unitId === 'driada' && uUnderTile && uUnderTile.playerIndex === myIndex && uUnderTile.count < uUnderTile.startCount;
        const isUnhealable = turn === myIndex && activeUnit && activeUnit.unitId === 'driada' && uUnderTile && uUnderTile.playerIndex === myIndex && uUnderTile.count >= uUnderTile.startCount;
        
        const isPaladinAura = activeUnit && activeUnit.unitId === 'paladin' && dist <= 1;

        const isOrigin = uUnderTile && uUnderTile.x === x && uUnderTile.y === y;

        gridCells.push(
          <div 
            key={`${x}-${y}`}
            onClick={() => isHealTarget ? localHeal(activeUnit!.id, uUnderTile.id) : handleCellClick(x, y)}
            className={cn(
              "relative w-full aspect-square border border-stone-700/30 flex items-center justify-center transition-colors overflow-visible",
              isAllowedMove && "bg-green-500/10 cursor-pointer hover:bg-green-500/20",
              isTarget && "bg-red-500/10 cursor-pointer hover:bg-red-500/20 z-10",
              isHealTarget && "bg-blue-500/20 cursor-pointer hover:bg-blue-500/40 z-10",
              isUnhealable && "bg-red-500/5 z-0",
              isPaladinAura && "bg-yellow-500/20"
            )}
          >
            {isAllowedMove && <div className="w-1.5 h-1.5 rounded-full bg-green-500/30"></div>}
            {uUnderTile && isOrigin && (
              <motion.div 
                layoutId={uUnderTile.id}
                onClick={(e) => {
                  e.stopPropagation();
                  isHealTarget ? localHeal(activeUnit!.id, uUnderTile.id) : handleCellClick(x, y);
                }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className={cn(
                  "relative z-10 rounded bg-stone-900 border overflow-visible cursor-pointer",
                  uUnderTile.playerIndex === 0 
                    ? "border-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.4)]" 
                    : "border-red-500 shadow-[0_0_5px_rgba(239,68,68,0.4)]",
                  uUnderTile.id === activeUnitId && "border-white shadow-[0_0_15px_rgba(255,255,255,0.7)] z-20",
                  isUnhealable && "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.7)]"
                )}
                style={{ 
                  width: `${(UNITS_INFO[uUnderTile.unitId].size || 1) * 100 - 10}%`,
                  height: `${(UNITS_INFO[uUnderTile.unitId].size || 1) * 100 - 10}%`,
                  position: 'absolute', top: '5%', left: '5%',
                  zIndex: (UNITS_INFO[uUnderTile.unitId].size || 1) > 1 ? 40 : 30
                }}
              >
                <img src={UNITS_INFO[uUnderTile.unitId].image} alt={UNITS_INFO[uUnderTile.unitId].name} className={cn("w-full h-full object-cover rounded-[1px]", uUnderTile.playerIndex === 1 && "scale-x-[-1]")} />
                <div 
                  className="text-[8px] bg-stone-900 px-1 rounded-sm absolute -bottom-1 -right-1 font-black font-mono border z-50 shadow-md"
                  style={{ 
                    borderColor: uUnderTile.playerIndex === 0 ? '#3b82f6' : '#ef4444',
                    color: uUnderTile.playerIndex === 0 ? '#93c5fd' : '#fca5a5'
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
      <div className="flex flex-col items-center w-full max-w-lg gap-4 relative">
        {/* Battle Header */}
        <div className="w-full flex justify-between items-center px-4 py-2 bg-stone-900/40 border border-stone-800 rounded shadow-lg backdrop-blur-sm">
           <div className="flex flex-col">
             <div className="flex items-center gap-1.5">
               <div className={cn("w-2 h-2 rounded-full", turn === 0 ? "bg-blue-400 animate-pulse" : "bg-stone-700")}></div>
               <span className={cn("text-[10px] font-black uppercase tracking-widest", myIndex === 0 ? "text-blue-400" : "text-stone-500")}>
                 {match?.players[0].name} {myIndex === 0 && "(Ви)"}
               </span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className={cn("w-2 h-2 rounded-full", turn === 1 ? "bg-red-400 animate-pulse" : "bg-stone-700")}></div>
               <span className={cn("text-[10px] font-black uppercase tracking-widest", myIndex === 1 ? "text-red-400" : "text-stone-500")}>
                 {match?.players[1]?.name || '...'} {myIndex === 1 && "(Ви)"}
               </span>
             </div>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                 <Timer className="w-3 h-3 text-amber-500 mb-0.5" />
                 <span className={cn("text-lg font-black font-mono", timer <= 3 ? "text-red-500 animate-pulse" : "text-amber-500")}>{Math.max(0, timer)}s</span>
              </div>
              <div className="h-8 w-px bg-stone-800"></div>
              <div className="flex flex-col items-center">
                 <span className="text-[7px] uppercase text-stone-500 font-bold mb-0.5">Раунд {round}</span>
                 <span className="text-[9px] font-black text-amber-400 uppercase tracking-tighter">
                   {turn === myIndex ? 'ВАШ ХІД' : 'ХІД ВОРОГА'}
                 </span>
              </div>
           </div>
        </div>

        {/* Battlefield */}
        <div className="relative w-[95%] aspect-square bg-stone-900/30 bg-[radial-gradient(circle,rgba(68,64,60,0.2)_1px,transparent_1px)] bg-[size:20px_20px] border-4 border-stone-800 rounded shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-visible active-battle-grid">
           <img src="/fight.png" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay pointer-events-none" />
           <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-[1px] rounded-sm pointer-events-none"></div>

           {match?.status === 'waiting' && (
             <div className="absolute inset-0 bg-stone-950/80 z-[60] flex flex-col items-center justify-center rounded">
               <Trophy className="w-10 h-10 text-amber-500 mb-4 animate-bounce" />
               <h2 className="text-lg font-black uppercase tracking-widest text-amber-400">Очікування Супротивника</h2>
               <p className="text-[10px] text-stone-400 mt-1 uppercase tracking-tighter">Арена чекає на героїв...</p>
             </div>
           )}
           
           <div 
             className="relative z-10 w-full h-full grid"
             style={{ gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`, gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)` }}
           >
             {gridCells}
           </div>

           {/* FX layer */}
           {projectiles.map(p => (
              <motion.div 
                key={p.id} 
                initial={{ left: `${(p.startX + 0.5) * (100/GRID_WIDTH)}%`, top: `${(p.startY + 0.5) * (100/GRID_HEIGHT)}%`, scale: 0.5, opacity: 0 }} 
                animate={{ left: `${(p.endX + 0.5) * (100/GRID_WIDTH)}%`, top: `${(p.endY + 0.5) * (100/GRID_HEIGHT)}%`, scale: 1, opacity: 1 }} 
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
                  width: '60px', height: '60px',
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
                  <div className="w-full h-full flex items-center justify-center relative">
                    <div className="w-16 h-16 border-4 border-green-500 rounded-full animate-ping shadow-[0_0_15px_#22c55e]"></div>
                    <Heart className="text-green-500 w-8 h-8 absolute animate-bounce" />
                  </div>
                )}
                {e.type === 'fire' && (
                  <div className="w-full h-full flex items-center justify-center relative">
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [1, 2, 0], opacity: [1, 0.8, 0] }} className="absolute inset-0 bg-orange-500 rounded-full blur-xl" />
                  </div>
                )}
                {e.type === 'lightning_hit' && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-1 h-20 bg-blue-200 blur-[2px] rotate-45 shadow-[0_0_15px_#0ea5e9]"></div>
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

        {/* Console */}
        <div className="w-full bg-stone-950/80 border border-stone-800 rounded p-3 h-28 overflow-hidden mb-2 shadow-inner">
           {log.map((m, i) => (
             <p key={i} className={cn("text-[10px] font-mono leading-none mb-1.5 flex items-start gap-2", i === 0 ? "text-amber-400 font-bold" : "text-stone-500")}>
               <span className="opacity-30">[{log.length - i}]</span> {m}
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
        {gameOver === 'win' ? 'ПЕРЕМОГА НА АРЕНІ!' : 'ПОРАЗКА'}
      </h2>
      <p className="text-stone-400 text-sm mb-6">
        {gameOver === 'win' 
          ? 'Ви довели свою перевагу та розграбували замок супротивника!' 
          : 'Ваші війська пали під стінами ворожого замку. Повертайтеся сильнішими.'}
      </p>
      
      {gameOver === 'win' && match && (
        <div className="bg-indigo-950/30 border border-indigo-500 p-3 rounded mb-6 flex flex-col items-center w-full">
           <span className="text-xs text-indigo-300 font-bold uppercase tracking-widest mb-2">ЗАХОПЛЕНО РЕСУРСІВ (50%)</span>
           <div className="grid grid-cols-2 gap-4 text-xs font-bold text-stone-200">
             <span>Золото: {Math.floor((match.players[myIndex === 0 ? 1 : 0]?.resources?.gold || 0) * 0.5)}</span>
             <span>Дерево: {Math.floor((match.players[myIndex === 0 ? 1 : 0]?.resources?.wood || 0) * 0.5)}</span>
             <span>Камінь: {Math.floor((match.players[myIndex === 0 ? 1 : 0]?.resources?.stone || 0) * 0.5)}</span>
             <span>Їжа: {Math.floor((match.players[myIndex === 0 ? 1 : 0]?.resources?.food || 0) * 0.5)}</span>
           </div>
        </div>
      )}

      <button onClick={claimReward} className="wow-button w-full py-4 font-black uppercase tracking-widest">
        ПОВЕРНУТИСЯ В МІСТО
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

