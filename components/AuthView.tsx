'use client';

import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useGame } from '../lib/game-context';
import { motion } from 'motion/react';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';

export default function AuthView() {
  const { user, authLoading } = useGame();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 wow-panel max-w-[400px] w-full bg-stone-900/40 backdrop-blur-md">
      <h2 className="text-xl font-black text-amber-500 uppercase tracking-widest text-shadow-glow mb-6 text-center">Профиль Героя</h2>
      
      {user ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-stone-800/50 p-4 rounded border border-stone-700 shadow-inner">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-16 h-16 rounded-full border-2 border-amber-500 shadow-lg" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-stone-700 border-2 border-amber-500 flex items-center justify-center shadow-lg">
                <UserIcon className="w-8 h-8 text-stone-400" />
              </div>
            )}
            <div>
              <p className="text-xs text-amber-600 font-black uppercase tracking-tighter leading-none mb-1">Авторизован как</p>
              <p className="text-lg font-bold text-stone-100">{user.displayName || user.email}</p>
              <p className="text-[10px] text-stone-500 font-mono italic">{user.email}</p>
            </div>
          </div>
          
          <div className="p-4 wow-panel-metal rounded bg-stone-800/30">
            <p className="text-xs text-stone-300 font-bold mb-2">Ваш прогресс автоматически сохраняется в облаке.</p>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest">Вы можете продолжить игру с любого устройства.</p>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full py-3 wow-panel-metal flex items-center justify-center gap-2 text-red-500 font-black uppercase tracking-widest hover:bg-stone-700 transition-colors border-stone-800 border-b-2"
          >
            <LogOut className="w-4 h-4"/> Выйти из системы
          </button>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-800/50 rounded-lg">
            <p className="text-stone-300 text-sm font-bold mb-2">Войдите, чтобы сохранить свой прогресс!</p>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest leading-relaxed">Ваши ресурсы, здания и армия будут навсегда привязаны к вашей учетной записи.</p>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            className="w-full py-4 bg-white text-stone-900 rounded font-black flex items-center justify-center gap-3 shadow-xl hover:bg-stone-100 transition-colors uppercase tracking-widest text-xs"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Войти через Google
          </motion.button>
          
          <p className="mt-6 text-[9px] text-stone-600 uppercase font-bold tracking-widest">Создавая аккаунт, вы соглашаетесь с кодексом чести Героя.</p>
        </div>
      )}
    </div>
  );
}
