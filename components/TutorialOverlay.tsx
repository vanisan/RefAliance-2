'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Sparkles, Trophy, Map as MapIcon, Hammer, Users, Shield, Sword, Gem } from 'lucide-react';
import { cn } from '../lib/game.utils';

interface TutorialStep {
  title: string;
  content: string;
  icon: React.ReactNode;
  color: string;
}

const steps: TutorialStep[] = [
  {
    title: "Вітаємо, Мій Лорде!",
    content: "Ласкаво просимо у світ Heroes of the Realm. Ви стали володарем невеликого поселення, яке має стати могутньою імперією.",
    icon: <Trophy className="w-8 h-8" />,
    color: "from-amber-400 to-amber-600"
  },
  {
    title: "Ваші Ресурси",
    content: "Зверху ви бачите Золото, Дерево, Камінь, Їжу та Кристали. Вони автоматично генеруються вашим містом та будівлями.",
    icon: <Gem className="w-8 h-8" />,
    color: "from-cyan-400 to-blue-600"
  },
  {
    title: "Головний Палац",
    content: "Палац - це серце вашого міста. Рівень Палацу визначає максимальний рівень для всіх інших будівель (Палац Lvl 1 = Макс Lvl 5 для будівель).",
    icon: <Trophy className="w-8 h-8" />,
    color: "from-amber-500 to-yellow-700"
  },
  {
    title: "Міське Будівництво",
    content: "Натискайте на вільні слоти в місті, щоб будувати Казарми, Ферми, Шахти та інші споруди. Кожна будівля дає свій бонус.",
    icon: <Hammer className="w-8 h-8" />,
    color: "from-orange-400 to-red-600"
  },
  {
    title: "Ваша Армія",
    content: "У розділі 'Армія' ви можете переглядати свої війська, одягати Героя в артефакти та вибирати активного персонажа.",
    icon: <Sword className="w-8 h-8" />,
    color: "from-red-500 to-red-800"
  },
  {
    title: "Карта та Битви",
    content: "Перейдіть на вкладку 'Карта', щоб битися з монстрами, проходити кампанію та захоплювати ресурси сусідніх земель.",
    icon: <MapIcon className="w-8 h-8" />,
    color: "from-emerald-400 to-green-700"
  },
  {
    title: "Призов Еліти",
    content: "Через інтерактивні точки на карті або в Хабі ви можете прикликати Елітних воїнів (Драконів, Титанів) за Кристали.",
    icon: <Sparkles className="w-8 h-8" />,
    color: "from-purple-400 to-purple-800"
  },
  {
    title: "Арена",
    content: "Змагайтеся з арміями інших гравців на Арені. Перемоги підвищують ваш рейтинг у світовій таблиці лідерів.",
    icon: <Shield className="w-8 h-8" />,
    color: "from-indigo-400 to-indigo-700"
  },
  {
    title: "Кузня та Магазин",
    content: "У Кузні можна покращувати екіпірування, а в Магазині - купувати ресурси та ключі до підземель з босами.",
    icon: <Hammer className="w-8 h-8" />,
    color: "from-stone-500 to-stone-800"
  },
  {
    title: "Рейтинг Лордів",
    content: "Розділ 'Рейтинг' показує найсильніших гравців. Ваша сила розраховується на основі чисельності та потужності армії.",
    icon: <Users className="w-8 h-8" />,
    color: "from-blue-400 to-blue-800"
  },
  {
    title: "Час Починати!",
    content: "Тепер ви знаєте основи. Розвивайте Палац, збирайте армію та підкорюйте ці землі! Удачі, Лорде!",
    icon: <Sparkles className="w-8 h-8" />,
    color: "from-amber-400 to-orange-600"
  }
];

interface TutorialOverlayProps {
  onComplete: () => void;
}

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div 
        key={currentStep}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-md bg-stone-900 border border-stone-700 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative"
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-stone-800">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            className="h-full bg-amber-500"
          />
        </div>

        <div className="p-8 flex flex-col items-center text-center">
          <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br shadow-lg", step.color)}>
            {step.icon}
          </div>

          <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-4">
            {step.title}
          </h3>

          <p className="text-stone-300 text-sm leading-relaxed mb-8">
            {step.content}
          </p>

          <div className="w-full flex items-center justify-between gap-4">
            <button 
              onClick={prev}
              disabled={currentStep === 0}
              className={cn(
                "p-3 rounded-xl border border-stone-700 text-stone-400 transition-all active:scale-95",
                currentStep === 0 ? "opacity-30" : "hover:bg-stone-800 hover:text-white"
              )}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex-1 flex justify-center gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i === currentStep ? "bg-amber-500 w-4" : "bg-stone-700"
                  )} 
                />
              ))}
            </div>

            <button 
              onClick={next}
              className="p-3 rounded-xl bg-amber-500 text-stone-900 shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all active:scale-95 group"
            >
              <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          
          <button 
            onClick={onComplete}
            className="mt-6 text-[10px] font-black text-stone-500 uppercase tracking-widest hover:text-stone-300 transition-colors"
          >
            Пропустити навчання
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
