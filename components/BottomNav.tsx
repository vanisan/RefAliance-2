import { Home, Map as MapIcon, Shield, Menu, Trophy } from 'lucide-react';

export type TabType = 'palace' | 'map' | 'army' | 'ranking' | 'menu';

interface BottomNavProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  hasBarracks: boolean;
}

export default function BottomNav({ activeTab, onChange, hasBarracks }: BottomNavProps) {
  const tabs = [
    { id: 'palace', label: 'Палац', icon: <Home className="w-5 h-5 sm:w-6 sm:h-6" />, disabled: false },
    { id: 'map', label: 'Карта', icon: <MapIcon className="w-5 h-5 sm:w-6 sm:h-6" />, disabled: false },
    { id: 'army', label: 'Армія', icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6" />, disabled: !hasBarracks },
    { id: 'ranking', label: 'Рейтинг', icon: <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />, disabled: false },
    { id: 'menu', label: 'Меню', icon: <Menu className="w-5 h-5 sm:w-6 sm:h-6" />, disabled: false },
  ] as const;

  return (
    <nav className="h-16 sm:h-20 bg-stone-900 border-t border-stone-800 flex shrink-0 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md px-1 sm:px-4 w-full max-w-2xl mx-auto rounded-t-xl sm:rounded-t-2xl relative">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = tab.disabled;
        
        return (
          <button
            key={tab.id}
            disabled={isDisabled}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors bg-stone-900 px-0.5
              ${isActive 
                ? 'border-t-2 border-amber-500 shadow-[inset_0_5px_15px_-10px_#f59e0b] text-amber-500 pt-1' 
                : 'border-t-2 border-transparent text-stone-500 hover:bg-stone-800 hover:text-stone-300'
              }
              ${isDisabled && 'opacity-30 cursor-not-allowed'}
            `}
          >
            <div className={`${isActive ? 'scale-110 mb-0.5 text-amber-400' : ''} transition-transform`}>
              {tab.icon}
            </div>
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-tighter sm:tracking-widest truncate w-full text-center">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
