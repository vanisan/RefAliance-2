import { Home, Map as MapIcon, Shield, Menu, Trophy } from 'lucide-react';

export type TabType = 'palace' | 'map' | 'army' | 'ranking' | 'menu';

interface BottomNavProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  hasBarracks: boolean;
}

export default function BottomNav({ activeTab, onChange, hasBarracks }: BottomNavProps) {
  const tabs = [
    { id: 'palace', label: 'Дворец', icon: <Home className="w-5 h-5" />, disabled: false },
    { id: 'map', label: 'Карта', icon: <MapIcon className="w-5 h-5" />, disabled: false },
    { id: 'army', label: 'Армия', icon: <Shield className="w-5 h-5" />, disabled: !hasBarracks },
    { id: 'ranking', label: 'Рейтинг', icon: <Trophy className="w-5 h-5" />, disabled: false },
    { id: 'menu', label: 'Меню', icon: <Menu className="w-5 h-5" />, disabled: false },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-stone-900 border-t-2 border-stone-800 flex z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = tab.disabled;
        
        return (
          <button
            key={tab.id}
            disabled={isDisabled}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors bg-stone-900
              ${isActive 
                ? 'border-t-2 border-amber-500 shadow-[inset_0_5px_15px_-10px_#f59e0b] text-amber-500' 
                : 'border-t-2 border-transparent text-stone-500 hover:bg-stone-800 hover:text-stone-300'
              }
              ${isDisabled && 'opacity-30 cursor-not-allowed'}
            `}
          >
            {tab.icon}
            <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
