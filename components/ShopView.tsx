import { useState } from 'react';
import { useGame } from '../lib/game-context';
import { EquipmentSlot, SHOP_ITEMS, EquipmentItem } from '../lib/game.types';
import { formatNumber } from '../lib/game.utils';
import { X, Sword, Shield, Heart } from 'lucide-react';
import { motion } from 'motion/react';

export default function ShopView({ onClose }: { onClose: () => void }) {
  const { resources, setResources, equipment, setEquipment } = useGame();
  const [activeSlot, setActiveSlot] = useState<EquipmentSlot>('weapon');

  const slots: { id: EquipmentSlot; label: string }[] = [
    { id: 'weapon', label: 'Зброя' },
    { id: 'chest', label: 'Обладунки' },
    { id: 'boots', label: 'Взуття' },
    { id: 'ring', label: 'Персні' },
  ];

  const items = SHOP_ITEMS.filter(it => it.type === activeSlot);

  const handleBuy = (item: EquipmentItem) => {
    if (resources.crystals >= item.cost) {
      setResources(prev => ({ ...prev, crystals: prev.crystals - item.cost }));
      // Automatically equip
      setEquipment(prev => ({ ...prev, [item.type]: item }));
    }
  };

  const currentEquipped = equipment[activeSlot];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-stone-950 z-[100] flex flex-col p-4 pt-16 overflow-y-auto"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-stone-900 border-b border-stone-800 flex justify-between items-center px-4 shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-20">
        <h2 className="text-amber-500 font-bold tracking-widest uppercase flex items-center gap-2 text-shadow-glow">
          Магазин Екіпірування
        </h2>
        <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="w-full shrink-0 mt-4 mb-2">
        <div className="grid grid-cols-4 gap-1 pb-2 px-1">
          {slots.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSlot(s.id)}
              className={`whitespace-nowrap flex flex-col items-center justify-center py-1.5 rounded font-black uppercase tracking-tighter text-[8px] transition-colors border shadow-inner ${
                activeSlot === s.id 
                  ? 'bg-amber-600 text-stone-900 border-amber-400 shadow-[0_0_10px_#d97706]' 
                  : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-right text-[10px] font-black text-indigo-400 mb-4 tracking-widest uppercase flex items-center justify-end gap-1 text-shadow-glow">
        💎 Алмази: {formatNumber(resources.crystals)}
      </div>

      {/* Current Equipped Item */}
      <div className="mb-6">
        <h3 className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-2 border-b border-stone-800 pb-1">Екіпіровано:</h3>
        {currentEquipped ? (
          <div className="wow-panel p-3 border-2 border-amber-900/50 flex gap-4 items-center">
            <div className="w-16 h-16 bg-stone-900 rounded border border-stone-700 p-1 flex-shrink-0">
               <img src={currentEquipped.image} alt={currentEquipped.name} className="w-full h-full object-contain filter drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]" />
            </div>
            <div className="flex flex-col flex-1">
              <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest">{currentEquipped.name}</h4>
              <p className="text-[10px] text-stone-400 mb-1">Рівень: {currentEquipped.tier}</p>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                {currentEquipped.stats.attackBonus > 0 && <span className="flex items-center gap-1 text-red-400"><Sword className="w-3 h-3"/> +{currentEquipped.stats.attackBonus}% до Атаки війська</span>}
                {currentEquipped.stats.defenseBonus > 0 && <span className="flex items-center gap-1 text-stone-300"><Shield className="w-3 h-3"/> +{currentEquipped.stats.defenseBonus}% до Захисту війська</span>}
                {currentEquipped.stats.hpBonus > 0 && <span className="flex items-center gap-1 text-green-400"><Heart className="w-3 h-3"/> +{currentEquipped.stats.hpBonus}% до Здоров'я</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-stone-600 font-bold uppercase tracking-widest w-full text-center py-4 bg-stone-900/50 border border-stone-800 border-dashed rounded">
            Нічого не екіпіровано
          </div>
        )}
      </div>

      {/* Items List */}
      <h3 className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-2 border-b border-stone-800 pb-1">Доступні товари:</h3>
      <div className="space-y-3 pb-24">
        {items.map(item => {
          const isEquipped = currentEquipped?.id === item.id;
          const canAfford = resources.crystals >= item.cost;
          
          return (
            <div key={item.id} className={`wow-panel p-3 flex gap-3 ${isEquipped ? 'border-amber-500 border-2' : ''}`}>
              <div className="w-14 h-14 bg-stone-900 rounded border border-stone-700 p-1 flex-shrink-0 relative">
                 <img src={item.image} alt={item.name} className="w-full h-full object-contain drop-shadow-md" />
                 <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-stone-800 text-[10px] flex items-center justify-center font-black text-stone-300 rounded border border-stone-600 shadow-md">
                   {item.tier}
                 </div>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                   <h4 className="text-xs font-black text-stone-200 uppercase tracking-widest">{item.name}</h4>
                   <div className="flex flex-wrap gap-x-2 gap-y-1 text-[9px] font-bold mt-1">
                    {item.stats.attackBonus > 0 && <span className="flex items-center gap-1 text-red-500/80"><Sword className="w-3 h-3"/>+{item.stats.attackBonus}%</span>}
                    {item.stats.defenseBonus > 0 && <span className="flex items-center gap-1 text-stone-400/80"><Shield className="w-3 h-3"/>+{item.stats.defenseBonus}%</span>}
                    {item.stats.hpBonus > 0 && <span className="flex items-center gap-1 text-green-500/80"><Heart className="w-3 h-3"/>+{item.stats.hpBonus}%</span>}
                  </div>
                </div>
                
                <div className="flex justify-between items-end mt-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${canAfford ? 'text-indigo-400' : 'text-stone-600'}`}>
                    💎 {formatNumber(item.cost)}
                  </span>
                  {!isEquipped && (
                    <button 
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford}
                      className={`px-3 py-1 text-[9px] font-black tracking-widest uppercase rounded shadow-md transition-colors ${
                        canAfford 
                          ? 'bg-amber-600 hover:bg-amber-500 text-stone-900 border border-amber-400' 
                          : 'bg-stone-800 text-stone-600 border border-stone-700 cursor-not-allowed'
                      }`}
                    >
                      Купити
                    </button>
                  )}
                  {isEquipped && (
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                      Екіпіровано
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
