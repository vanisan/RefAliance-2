'use client';

import { useState, useEffect } from 'react';
import { useGame } from '../lib/game-context';
import { formatNumber } from '../lib/game.utils';
import { Trophy, Users, Sword, Shield, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UNITS_INFO, UnitId } from '../lib/game.types';

export default function RankingView() {
  const { getLeaderboard, user } = useGame();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const data = await getLeaderboard();
      setLeaders(data);
      setLoading(false);
    };
    fetch();
  }, [getLeaderboard, user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-amber-500 font-bold uppercase tracking-widest text-xs animate-pulse">Завантаження рейтингу...</p>
      </div>
    );
  }

  return (
    <div className="p-4 safe-area-bottom pb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-500/20 rounded border border-amber-500/30">
          <Trophy className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-black text-amber-500 uppercase tracking-tighter leading-none">Зал Слави</h2>
          <p className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mt-1">Найсильніші правителі</p>
        </div>
      </div>

      <div className="space-y-2">
        {leaders.map((leader, index) => (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            key={leader.uid}
            className={`flex items-center gap-3 p-3 rounded border transition-all ${
              leader.uid === user?.id 
                ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                : 'bg-stone-900/40 border-stone-800'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm italic ${
              index === 0 ? 'bg-yellow-500 text-stone-900 border-2 border-white' :
              index === 1 ? 'bg-stone-300 text-stone-900' :
              index === 2 ? 'bg-amber-700 text-white' :
              'bg-stone-800 text-stone-500'
            }`}>
              {index + 1}
            </div>

            {leader.activeHeroId && (
              <div className="w-8 h-8 rounded-full border-2 border-amber-500 overflow-hidden bg-stone-900 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                <img src={`/heroes/${leader.activeHeroId}.png`} alt="Hero" className="w-full h-full object-cover" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-100 truncate">{leader.playerName}</span>
                {leader.uid === user?.id && <span className="text-[8px] bg-amber-500 text-stone-900 px-1 rounded font-black uppercase">Ви</span>}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <div className="flex items-center gap-1 text-[10px] text-stone-400 font-mono">
                  <Sword className="w-3 h-3 text-red-500/70" /> {formatNumber(leader.armyPower || 0)}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-stone-400 font-mono">
                  <Shield className="w-3 h-3 text-blue-500/70" /> Lvl {leader.palaceLevel || 1}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedUser(leader)}
              className="p-2 bg-stone-800 hover:bg-stone-700 rounded transition-colors"
            >
              <Eye className="w-4 h-4 text-amber-500" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* User Army Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm shadow-2xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md wow-panel bg-stone-900 p-6 relative overflow-hidden"
            >
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 p-1 rounded-full bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-stone-800 rounded-full mx-auto border-2 border-amber-500 shadow-2xl flex items-center justify-center mb-3 overflow-hidden">
                   {selectedUser.activeHeroId ? (
                     <img src={`/heroes/${selectedUser.activeHeroId}.png`} className="w-full h-full object-cover" alt="Hero" />
                   ) : (
                     <Users className="w-10 h-10 text-amber-500" />
                   )}
                </div>
                <h3 className="text-xl font-black text-amber-500 uppercase">{selectedUser.playerName}</h3>
                <p className="text-xs text-stone-500 uppercase font-bold tracking-widest">Міць армії: {formatNumber(selectedUser.armyPower || 0)}</p>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto p-1 pr-2 scrollbar-thin">
                {selectedUser.activeHeroId && (
                  <div className="wow-panel-metal p-2 border-amber-900/50 bg-amber-900/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded border border-amber-500 overflow-hidden shrink-0">
                      <img src={`/heroes/${selectedUser.activeHeroId}.png`} alt="Hero" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-amber-500 uppercase">Герой Правителя</h4>
                      <p className="text-[8px] text-stone-400 font-bold uppercase opacity-80">Веде армію в бій</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedUser.army || {}).map(([id, count]) => {
                    if ((count as number) <= 0) return null;
                    const info = UNITS_INFO[id as UnitId];
                    return (
                      <div key={id} className="flex items-center gap-2 p-1.5 bg-stone-800/50 rounded border border-stone-700">
                        <div className="w-8 h-8 rounded overflow-hidden bg-stone-900 shrink-0 border border-stone-700">
                          {info?.image && <img src={info.image} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] text-amber-600 font-black uppercase leading-none mb-1 truncate">{info?.name}</p>
                          <p className="text-xs font-bold text-stone-200">x{count as number}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button 
                onClick={() => setSelectedUser(null)}
                className="w-full mt-6 py-3 bg-stone-800 text-stone-300 font-black uppercase tracking-widest text-xs rounded hover:bg-stone-700"
              >
                Закрити
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
