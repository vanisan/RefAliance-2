'use client';

import { useState } from 'react';
import { useGame } from '../lib/game-context';
import { Sword, Shield, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function NameEntryView() {
  const { setPlayerName } = useGame();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    
    if (trimmedName.length < 3) {
      setError('Имя слишком короткое (мин. 3 символа)');
      return;
    }
    if (trimmedName.length > 15) {
      setError('Имя слишком длинное (макс. 15 символов)');
      return;
    }
    
    setPlayerName(trimmedName);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-stone-950 flex items-center justify-center p-6">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm wow-panel bg-stone-900/80 backdrop-blur-xl p-8 border-2 border-amber-900/50 relative"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full border-2 border-amber-500 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <Shield className="w-10 h-10 text-amber-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-stone-900 border border-amber-500 p-1.5 rounded-full">
              <Sword className="w-4 h-4 text-amber-500" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-amber-500 uppercase tracking-tighter italic">Путь Героя</h2>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-[0.2em] mt-1">Как называть тебя в летописях?</p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
              <input 
                type="text" 
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="Введи имя..."
                autoFocus
                className="w-full bg-stone-950 border-b-2 border-stone-800 focus:border-amber-500 outline-none p-3 text-center text-stone-100 font-bold tracking-widest uppercase transition-all placeholder:text-stone-700"
              />
              {error && (
                <p className="absolute -bottom-6 left-0 right-0 text-[10px] text-red-500 font-bold uppercase text-center animate-shake">
                  {error}
                </p>
              )}
            </div>

            <button 
              type="submit"
              className="w-full group relative overflow-hidden bg-amber-600 hover:bg-amber-500 text-stone-900 p-4 rounded font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
            >
              Начать приключение
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <p className="text-[9px] text-stone-600 uppercase font-bold tracking-widest leading-none">Имя будет отображаться в рейтинге игроков</p>
        </div>
      </motion.div>
    </div>
  );
}
