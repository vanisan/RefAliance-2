"use client";

import { useGame } from '../lib/game-context';
import { Race } from '../lib/game.types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sword, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '../lib/game.utils';
import { useState } from 'react';

export default function RaceSelection() {
  const { setRace } = useGame();
  const [selectedRaceId, setSelectedRaceId] = useState<Race>('human');

  const races = [
    {
      id: 'human' as Race,
      name: 'Люди',
      title: 'Альянс Лордерона',
      description: 'Збалансована фракція, що покладається на дисципліну та магію. Їхні лицарі — найміцніші в грі, а архімаги здатні змінити хід будь-якої битви.',
      icon: <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />,
      color: 'from-blue-600/30 to-blue-900/60',
      borderColor: 'border-blue-500/50',
      glowColor: 'shadow-blue-500/30',
      units: [
        { name: 'Лицар', role: 'Захист' },
        { name: 'Снайпер', role: 'Дальній бій' },
        { name: 'Паладін', role: 'Свята сила' },
        { name: 'Грифон', role: 'Авіація' },
        { name: 'Архімаг', role: 'Магія' }
      ],
      pros: 'Високий захист, Потужна магія',
      bonus: '+5 золота/сек',
      image: '/heroico/humanrace.png'
    },
    {
      id: 'orc' as Race,
      name: 'Орки',
      title: 'Воїнства Орди',
      description: 'Сила та нестримна лють. Орки володіють найвищою атакуючою могутністю та міцними воїнами.',
      icon: <Sword className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />,
      color: 'from-red-600/30 to-red-900/60',
      borderColor: 'border-red-500/50',
      glowColor: 'shadow-red-600/30',
      units: [
        { name: 'Троль', role: 'Регенерація' },
        { name: 'Звіролов', role: 'Мисливець' },
        { name: 'Некромант', role: 'Темна магія' },
        { name: 'Носоріг', role: 'Прорив' },
        { name: 'Король шаманів', role: 'Владика' }
      ],
      pros: 'Велика шкода, Багато здоров\'я',
      bonus: '+5 їжі/сек',
      image: '/heroico/orcrace.png'
    },
    {
      id: 'elf' as Race,
      name: 'Ельфи',
      title: 'Вартові Лісу',
      description: 'Спритність та єднання з природою. Нічні ельфи майстерно володіють магією лісу та дальнім боєм.',
      icon: <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />,
      color: 'from-emerald-600/30 to-emerald-900/60',
      borderColor: 'border-emerald-500/50',
      glowColor: 'shadow-emerald-500/30',
      units: [
        { name: 'Вбивця', role: 'Скритність' },
        { name: 'Лучник', role: 'Стрільба' },
        { name: 'Друїд', role: 'Зміна форми' },
        { name: 'Трент', role: 'Груба сила' },
        { name: 'Соколине око', role: 'Точність' }
      ],
      pros: 'Дальність атаки, Спритність',
      bonus: '+5 дерева/сек',
      image: '/heroico/elfrace.png'
    }
  ];

  const currentRace = races.find(r => r.id === selectedRaceId)!;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center bg-stone-950 overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/city.png')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedRaceId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute inset-0 bg-gradient-radial from-transparent to-stone-950",
              selectedRaceId === 'human' ? 'bg-blue-900/40' : 
              selectedRaceId === 'orc' ? 'bg-red-900/40' : 'bg-emerald-900/40'
            )}
          />
        </AnimatePresence>
      </div>

      <div className="w-full max-w-lg mx-auto flex flex-col h-full relative z-10 px-4 py-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] rounded-full mb-3">
            Оберіть свою фракцію
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter text-shadow-glow">
            НОВА <span className="text-amber-500">ЕРА</span>
          </h1>
        </motion.div>

        {/* Compact Selector */}
        <div className="flex justify-between gap-3 mb-6 bg-stone-900/50 p-2 rounded-2xl border border-stone-800 backdrop-blur-md shadow-2xl">
          {races.map((race) => (
            <button
              key={race.id}
              onClick={() => setSelectedRaceId(race.id)}
              className={cn(
                "flex-1 py-4 px-2 rounded-xl transition-all relative overflow-hidden flex flex-col items-center gap-2 group border border-transparent",
                selectedRaceId === race.id 
                  ? cn("bg-stone-800 shadow-[0_0_20px_rgba(0,0,0,0.5)]", race.borderColor)
                  : "hover:bg-stone-800/40"
              )}
            >
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border border-white/5",
                selectedRaceId === race.id ? "bg-white/10 scale-110" : "bg-black/20 group-hover:scale-105"
              )}>
                {race.icon}
              </div>
              <span className={cn(
                "text-[10px] sm:text-xs font-black uppercase tracking-widest",
                selectedRaceId === race.id ? "text-white" : "text-stone-500"
              )}>
                {race.name}
              </span>
              {selectedRaceId === race.id && (
                <motion.div 
                  layoutId="active-pill"
                  className={cn("absolute bottom-0 inset-x-4 h-0.5 rounded-full bg-gradient-to-r from-transparent via-current to-transparent", 
                    race.id === 'human' ? 'text-blue-500' : race.id === 'orc' ? 'text-red-500' : 'text-emerald-500'
                  )}
                />
              )}
            </button>
          ))}
        </div>

        {/* Detailed Info Area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRaceId}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col overflow-y-auto pr-1 hidden-scrollbar"
            >
              <div className={cn(
                "wow-panel relative p-6 sm:p-8 border-2 mb-4 overflow-hidden flex flex-col min-h-max",
                currentRace.borderColor,
                currentRace.glowColor
              )}>
                <div className={cn("absolute inset-0 bg-gradient-to-b opacity-20", currentRace.color)}></div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-4">
                    <h3 className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] mb-1">
                      {currentRace.title}
                    </h3>
                    <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-widest text-shadow-glow">
                      {currentRace.name}
                    </h2>
                  </div>

                  <p className="text-stone-300 text-sm leading-relaxed mb-6 font-medium">
                    {currentRace.description}
                  </p>

                  <div className="bg-black/30 border border-white/5 rounded-xl p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">Особливості</span>
                        <span className="text-xs text-white font-bold tracking-wide">{(currentRace as any).pros}</span>
                      </div>
                      <div className="border-l border-white/10 pl-4">
                        <span className="text-[10px] text-amber-500/80 uppercase font-bold tracking-widest block mb-1">Стартовий бонус</span>
                        <span className="text-xs text-amber-400 font-bold tracking-wide">{(currentRace as any).bonus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <span className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-2">Ключові загони</span>
                    {currentRace.units.map((unit, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-stone-900/60 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full", 
                            selectedRaceId === 'human' ? 'bg-blue-400' : selectedRaceId === 'orc' ? 'bg-red-400' : 'bg-emerald-400'
                          )}></div>
                          <span className="text-xs font-bold text-stone-100">{unit.name}</span>
                        </div>
                        <span className="text-[9px] uppercase font-black text-stone-500 tracking-widest">{unit.role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decor Image */}
                <div className="absolute -bottom-10 -right-10 opacity-10 pointer-events-none">
                  <img src={currentRace.image} alt="" className="w-56 h-56 object-contain grayscale" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fixed Bottom Action Container */}
        <div className="mt-auto pt-4 relative z-20 bg-stone-950/80 backdrop-blur-sm">
          <button 
            onClick={() => setRace(selectedRaceId)}
            className="w-full py-4 relative group overflow-hidden rounded-xl border border-white/20 transition-all font-black text-sm uppercase tracking-[0.3em] shadow-2xl active:scale-95"
          >
            <div className={cn("absolute inset-0 transform transition-transform duration-500 bg-gradient-to-r", 
              selectedRaceId === 'human' ? 'from-blue-600 to-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 
              selectedRaceId === 'orc' ? 'from-red-600 to-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 
              'from-emerald-600 to-emerald-400 shadow-[0_0_20px_rgba(5,150,105,0.5)]'
            )}></div>
            <span className="relative z-10 flex items-center justify-center gap-2 text-white text-shadow-glow">
              ПРИЄДНАТИСЯ ДО {selectedRaceId === 'human' ? 'АЛЬЯНСУ' : selectedRaceId === 'orc' ? 'ОРДИ' : 'ПРИРОДИ'} <ChevronRight className="w-5 h-5" />
            </span>
          </button>
          
          <div className="text-center mt-4 text-stone-500 text-[10px] uppercase font-black tracking-[0.5em] pb-2">
            World of War - New Era
          </div>
        </div>
      </div>
    </div>
  );
}
