'use client';

import { useState } from 'react';
import { signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useGame } from '../lib/game-context';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, LogOut, User as UserIcon, Lock, ShieldCheck } from 'lucide-react';

export default function AuthView() {
  const { user, authLoading, playerName, setPlayerName, resetProgress } = useGame();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'choice' | 'credentials'>('choice');
  const [confirmReset, setConfirmReset] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [login, setLogin] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const DUMMY_DOMAIN = "@heroes.game";

  const handleCredentialsAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (login.length < 3) {
      setErrorMsg("Логин слишком короткий (мин. 3 символа)");
      setLoading(false);
      return;
    }
    if (pass.length < 6) {
      setErrorMsg("Пароль слишком короткий (мин. 6 символов)");
      setLoading(false);
      return;
    }

    const email = `${login.toLowerCase().trim()}${DUMMY_DOMAIN}`;

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, pass);
        // Important: set the playerName state immediately so sync uses it
        const cleanName = login.trim();
        setPlayerName(cleanName);
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (error: any) {
      console.error("Auth error", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') 
        setErrorMsg("Неверный логин или пароль.");
      else if (error.code === 'auth/email-already-in-use') {
        setErrorMsg("Этот логин уже занят. Если это ваш аккаунт — просто нажмите 'Войти'.");
        setIsRegister(false); 
      }
      else if (error.code === 'auth/weak-password')
        setErrorMsg("Слишком слабый пароль.");
      else 
        setErrorMsg("Ошибка: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Logged in:", result.user.email);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMsg("Окно было закрыто. Попробуйте еще раз.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setErrorMsg("Запрос отменен. Нажмите кнопку еще раз.");
      } else if (error.code === 'auth/popup-blocked') {
        setErrorMsg("Всплывающее окно заблокировано! Разрешите их в настройках браузера.");
      } else {
        setErrorMsg("Ошибка входа: " + error.message);
      }
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
      <h2 className="text-xl font-black text-amber-500 uppercase tracking-widest text-shadow-glow mb-6 text-center">Профиль Игрока</h2>
      
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
              <p className="text-xs text-amber-600 font-black uppercase tracking-tighter leading-none mb-1">Игрок</p>
              <p className="text-lg font-bold text-stone-100">{playerName || '...'}</p>
              <p className="text-[10px] text-stone-500 font-mono italic">{login || user.email?.split('@')[0]}</p>
            </div>
          </div>
          
          <div className="p-4 wow-panel-metal rounded bg-stone-800/30">
            <p className="text-xs text-stone-300 font-bold mb-2">Ваш прогресс автоматически сохраняется в облаке.</p>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest">Прогресс привязан к логину: <span className="text-amber-500">{login || user.email?.split('@')[0]}</span></p>
          </div>

          <div className="space-y-2 pt-4">
            {!confirmReset ? (
              <button 
                onClick={() => setConfirmReset(true)}
                className="w-full py-2 bg-stone-900/50 text-red-500/50 text-[9px] font-black uppercase tracking-widest hover:text-red-500 border border-stone-700 rounded transition-all"
              >
                Сбросить прогресс (Начать с 0)
              </button>
            ) : (
              <div className="bg-red-950/20 p-2 border border-red-500/30 rounded">
                <p className="text-red-500 text-[8px] font-black uppercase mb-2">Удалить всё и начать с 1 рыцарем?</p>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      await resetProgress();
                      setConfirmReset(false);
                    }}
                    className="flex-1 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded"
                  >
                    ДА, УДАЛИТЬ
                  </button>
                  <button 
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-1 bg-stone-700 text-white text-[9px] font-black uppercase rounded"
                  >
                    ОТМЕНА
                  </button>
                </div>
              </div>
            )}
            
            <button 
              onClick={handleLogout}
              className="w-full py-3 wow-panel-metal flex items-center justify-center gap-2 text-stone-400 font-black uppercase tracking-widest hover:bg-stone-700 transition-colors border-stone-800 border-b-2"
            >
              <LogOut className="w-4 h-4"/> Выйти из системы
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <AnimatePresence mode="wait">
            {mode === 'choice' ? (
              <motion.div
                key="choice"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="mb-6 p-4 bg-amber-900/10 border border-amber-800/30 rounded-lg">
                  <p className="text-stone-300 text-sm font-bold mb-2 uppercase tracking-tight">Создай свой путь</p>
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest leading-relaxed italic">Армия и города требуют правителя.</p>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogleLogin}
                  className="w-full py-4 bg-white text-stone-900 rounded font-black flex items-center justify-center gap-3 shadow-xl hover:bg-stone-100 transition-colors uppercase tracking-widest text-xs border-b-4 border-stone-300"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  Google Вход
                </motion.button>

                <div className="flex items-center gap-3 py-2">
                  <div className="h-px bg-stone-800 flex-1"></div>
                  <span className="text-[9px] text-stone-600 font-bold uppercase">Альтернатива</span>
                  <div className="h-px bg-stone-800 flex-1"></div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode('credentials')}
                  className="w-full py-4 bg-stone-800 text-stone-200 rounded font-black flex items-center justify-center gap-3 shadow-xl hover:bg-stone-700 transition-colors uppercase tracking-widest text-xs border-b-4 border-stone-950"
                >
                  <LogIn className="w-4 h-4 text-amber-500" />
                  Логин и Пароль
                </motion.button>
                
                <p className="mt-4 text-[9px] text-stone-700 uppercase font-black tracking-tighter">Рекомендуем Google, если Логин/Пароль не работают.</p>
              </motion.div>
            ) : (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-amber-500 uppercase italic">
                    {isRegister ? "Регистрация" : "Вход"}
                  </h3>
                  <button onClick={() => setMode('choice')} className="text-[9px] text-stone-500 uppercase font-bold hover:text-stone-300">Назад</button>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
                    <input 
                      type="text" 
                      placeholder="ЛОГИН"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 p-3 pl-10 rounded text-stone-100 text-xs font-bold focus:border-amber-500 outline-none uppercase tracking-widest"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
                    <input 
                      type="password" 
                      placeholder="ПАРОЛЬ"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 p-3 pl-10 rounded text-stone-100 text-xs font-bold focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => handleCredentialsAuth()}
                  disabled={loading}
                  className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-stone-900 rounded font-black flex items-center justify-center gap-3 shadow-xl transition-colors uppercase tracking-widest text-xs border-b-4 border-amber-800"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    isRegister ? "Создать" : "Войти"
                  )}
                </button>

                <button 
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-[10px] text-amber-500/70 hover:text-amber-500 font-bold uppercase underline"
                >
                  {isRegister ? "Уже есть аккаунт?" : "Нет аккаунта?"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-100 text-[10px] font-bold text-center uppercase tracking-tight"
            >
              {errorMsg}
            </motion.div>
          )}
          
          <div className="mt-8 pt-6 border-t border-stone-800/50">
            <p className="text-[9px] text-stone-600 uppercase font-bold tracking-widest">
              Domain Error? Add &quot;ref-aliance-2.vercel.app&quot; to Firebase Auth Settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
