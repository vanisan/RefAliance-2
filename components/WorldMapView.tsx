import { useState, useEffect } from 'react';
import { useGame } from '../lib/game-context';
import { X, Globe, User, Shield, Info, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BUILDINGS_INFO, UnitId, UNITS_INFO } from '../lib/game.types';

interface WorldMapViewProps {
  onClose: () => void;
}

interface RankedPlayer {
  id: string;
  playerName: string;
  armyPower: number;
  buildings: any[];
  army: any;
  siegeUnits: (UnitId | null)[];
}

export default function WorldMapView({ onClose }: WorldMapViewProps) {
  const { getLeaderboard } = useGame();
  const [randomPlayers, setRandomPlayers] = useState<RankedPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<RankedPlayer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      const allPlayers = await getLeaderboard();
      if (allPlayers.length > 0) {
        // Pick 3-4 random
        const shuffled = [...allPlayers].sort(() => 0.5 - Math.random());
        setRandomPlayers(shuffled.slice(0, 4));
      }
      setLoading(false);
    };
    fetchPlayers();
  }, [getLeaderboard]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 md:p-6 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-0 bg-[url('/universemap.png')] bg-cover bg-center opacity-40"></div>
      
      <div className="w-full h-full max-w-5xl rounded-lg wow-panel flex flex-col relative z-10 p-4 border-amber-900 overflow-hidden">
        <div className="flex justify-between items-center mb-4 border-b border-stone-800 pb-2">
          <h2 className="text-lg font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
            <Globe className="w-5 h-5" /> Карта Мира (Соседи)
          </h2>
          <button onClick={onClose} className="bg-stone-800 p-1.5 rounded hover:bg-stone-700 transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-amber-500 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Загрузка игроков...</p>
          </div>
        ) : (
          <div className="flex-1 relative">
             <p className="text-[10px] text-stone-400 mb-6 uppercase tracking-widest font-bold">Нажмите на игрока чтобы просмотреть его владения:</p>
             
             <div className="flex flex-wrap gap-8 justify-center items-center h-full pb-20">
                {randomPlayers.map((player, idx) => {
                  const x = (idx % 2 === 0 ? 20 : 60) + Math.random() * 20;
                  const y = (idx < 2 ? 20 : 60) + Math.random() * 20;
                  
                  return (
                    <motion.button
                      key={player.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setSelectedPlayer(player)}
                      className="group flex flex-col items-center gap-2"
                    >
                      <div className="w-16 h-16 bg-stone-900 border-2 border-amber-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(217,119,6,0.3)] group-hover:shadow-[0_0_30px_#f59e0b] relative transition-all group-hover:border-amber-400 overflow-hidden bg-[url('/city-thumb.png')] bg-cover">
                         <div className="absolute inset-0 bg-black/40"></div>
                         <Shield className="w-8 h-8 text-amber-500 relative z-10" />
                      </div>
                      <div className="bg-black/80 px-3 py-1 rounded-sm border border-stone-800 shadow-xl flex flex-col items-center">
                        <span className="text-[10px] font-black text-amber-500 uppercase whitespace-nowrap">{player.playerName}</span>
                        <span className="text-[8px] text-stone-400 font-bold">⚔️ {Math.floor(player.armyPower)}</span>
                      </div>
                    </motion.button>
                  );
                })}
             </div>
          </div>
        )}

        <p className="absolute bottom-4 left-4 text-[9px] text-stone-500 font-bold uppercase tracking-widest">Random neighbors from Top 20</p>
      </div>

      {/* Mini Window for View */}
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-40%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-40%" }}
            className="fixed top-1/2 left-1/2 z-[60] w-[95%] max-w-xl wow-panel-metal p-4 shadow-[0_0_100px_rgba(0,0,0,1)] border-amber-600"
          >
            <div className="flex justify-between items-start mb-4 border-b border-amber-900/30 pb-2">
               <div>
                 <h3 className="text-amber-500 font-black text-lg uppercase leading-none tracking-tighter">{selectedPlayer.playerName}</h3>
                 <p className="text-[10px] text-stone-400 font-bold mt-1">ИНФОРМАЦИЯ О ПОСЕЛЕНИИ</p>
               </div>
               <button onClick={() => setSelectedPlayer(null)} className="p-1 text-stone-500 hover:text-stone-300">
                  <X className="w-6 h-6" />
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[60vh] overflow-y-auto pr-2">
               {/* Left: Layout */}
               <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 mb-1">
                     <Layout className="w-3 h-3 text-amber-500" />
                     <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Сетка построек:</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 transform scale-90 origin-top-left bg-black/40 p-1.5 rounded border border-stone-800">
                     {selectedPlayer.buildings.map((b, i) => (
                       <div key={i} className="aspect-square bg-stone-900 rounded border border-stone-800 flex items-center justify-center relative shadow-inner">
                          {b && (
                            <div className="text-center group relative cursor-pointer">
                               <span className="text-[8px] text-stone-500 font-bold uppercase block leading-none">{BUILDINGS_INFO[b.id as keyof typeof BUILDINGS_INFO]?.icon === 'Sword' ? '⚔️' : BUILDINGS_INFO[b.id as keyof typeof BUILDINGS_INFO]?.icon === 'Wheat' ? '🌾' : BUILDINGS_INFO[b.id as keyof typeof BUILDINGS_INFO]?.icon === 'Coins' ? '🪙' : BUILDINGS_INFO[b.id as keyof typeof BUILDINGS_INFO]?.icon === 'Trees' ? '🪵' : '🪨'}</span>
                               <span className="text-[7px] text-amber-600 font-black block mt-0.5">L.{b.level}</span>
                               <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-stone-900 text-[8px] px-2 py-1 border border-stone-700 whitespace-nowrap hidden group-hover:block z-50 rounded shadow-xl">
                                  {BUILDINGS_INFO[b.id as keyof typeof BUILDINGS_INFO]?.name}
                               </div>
                            </div>
                          )}
                          {i >= 16 && (
                            <div className="absolute inset-0 bg-blue-500/5 flex items-center justify-center">
                               <div className="w-1 h-1 bg-indigo-500 rounded-full opacity-50"></div>
                            </div>
                          )}
                       </div>
                     ))}
                  </div>
               </div>

               {/* Right: Siege & Army Snap */}
               <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                       <Shield className="w-3 h-3 text-red-500" />
                       <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Осада (Оборона):</span>
                    </div>
                    <div className="flex gap-2">
                       {selectedPlayer.siegeUnits && selectedPlayer.siegeUnits.map((sid, i) => (
                         <div key={i} className="w-10 h-10 bg-stone-900 border border-stone-800 rounded flex items-center justify-center relative">
                            {sid && (
                              <img src={UNITS_INFO[sid].image} alt="" className="w-8 h-8 object-contain" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div>
                     <div className="flex items-center gap-1.5 mb-2">
                       <Info className="w-3 h-3 text-stone-400" />
                       <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Сила армии:</span>
                     </div>
                     <div className="text-2xl font-black text-stone-100 font-mono tracking-tighter">
                        {Math.floor(selectedPlayer.armyPower).toLocaleString()} <span className="text-[10px] text-stone-500 uppercase">Power Score</span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="mt-6 flex justify-end">
               <button onClick={() => setSelectedPlayer(null)} className="wow-button px-6 py-2 uppercase font-black text-xs tracking-widest">Закрыть</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
