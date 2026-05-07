import { Home, Map as MapIcon, Shield, Menu } from 'lucide-react';

export type TabType = 'palace' | 'map' | 'army' | 'menu';

interface BottomNavProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  hasBarracks: boolean;
}

export default function BottomNav({ activeTab, onChange, hasBarracks }: BottomNavProps) {
  const tabs = [
    { id: 'palace', label: 'Дворец', icon: <Home className="w-6 h-6" />, disabled: false },
    { id: 'map', label: 'Карта', icon: <MapIcon className="w-6 h-6" />, disabled: false },
    { id: 'army', label: 'Армия', icon: <Shield className="w-6 h-6" />, disabled: !hasBarracks },
    { id: 'menu', label: 'Меню', icon: <Menu className="w-6 h-6" />, disabled: false },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-slate-900 flex z-50">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = tab.disabled;
        
        return (
          <button
            key={tab.id}
            disabled={isDisabled}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors bg-slate-900
              ${isActive 
                ? 'border-t-2 border-cyan-500 shadow-[inset_0_5px_15px_-10px_#22d3ee] text-cyan-500' 
                : 'border-t-2 border-slate-800 text-slate-500 hover:bg-slate-800'
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
