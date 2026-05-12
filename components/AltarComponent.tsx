import { useState, useEffect } from 'react';
import { useGame } from '../lib/game-context';
import { addResources } from '../lib/game.utils';
import { Zap } from 'lucide-react';

export default function AltarComponent({ onClose, level = 1 }: { onClose: () => void, level?: number }) {
  const { resources, setResources, lastPrayerTime, setLastPrayerTime } = useGame();
  const [canPray, setCanPray] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const checkPrayer = () => {
      const now = Date.now();
      if (!lastPrayerTime || (now - lastPrayerTime) >= 86400000) {
        setCanPray(true);
        setTimeLeft('');
      } else {
        setCanPray(false);
        const remaining = 86400000 - (now - lastPrayerTime);
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        setTimeLeft(`${hours}год ${minutes}хв`);
      }
    };
    checkPrayer();
    const interval = setInterval(checkPrayer, 60000);
    return () => clearInterval(interval);
  }, [lastPrayerTime]);

  const handlePray = () => {
    if (!canPray) return;
    setResources(addResources(resources, { crystals: 50 } as any));
    setLastPrayerTime(Date.now());
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 z-[100] flex items-center justify-center p-4">
      <div className="wow-panel p-6 max-w-sm w-full">
        <h2 className="text-xl font-black text-amber-500 uppercase tracking-widest text-center mb-4">Вівтар</h2>
        <p className="text-stone-300 text-sm mb-6 text-center">Принесіть молитву, щоб отримати 50 алмазів. Доступно раз на добу.</p>
        
        {canPray ? (
          <button 
            onClick={handlePray}
            className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-stone-900 font-black uppercase rounded shadow-lg text-lg flex items-center justify-center gap-2"
          >
            <Zap className="w-6 h-6" /> Молитися
          </button>
        ) : (
          <div className="text-center py-4 text-stone-500 font-bold">
            Наступна молитва через: <span className="text-amber-500">{timeLeft}</span>
          </div>
        )}
        
        <button 
          onClick={onClose}
          className="w-full mt-4 py-2 text-stone-500 hover:text-stone-300 font-bold uppercase text-xs"
        >
          Закрити
        </button>
      </div>
    </div>
  );
}
