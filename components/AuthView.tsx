'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useGame } from '../lib/game-context';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, LogOut, User as UserIcon, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect } from 'react';

export default function AuthView() {
  const { user, authLoading, playerName, setPlayerName, resetProgress, setResources } = useGame();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'choice' | 'credentials'>('choice');
  const [confirmReset, setConfirmReset] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [login, setLogin] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  
  const DUMMY_DOMAIN = "@heroes.game";

  // -- Referral System --
  const MY_CODE = user?.id?.substring(0, 6).toUpperCase() || '';
  const [refInput, setRefInput] = useState('');
  const [referrals, setReferrals] = useState<{code: string, claimTime: number}[]>([]);

  // Load referrals from localStorage since we don't have DB support for it
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`referrals_${user.id}`);
      if (saved) setReferrals(JSON.parse(saved));
    }
  }, [user]);

  const saveReferrals = (newRefs: any) => {
    setReferrals(newRefs);
    if (user) localStorage.setItem(`referrals_${user.id}`, JSON.stringify(newRefs));
  };

  const handleAddReferral = () => {
    const code = refInput.trim().toUpperCase();
    if (code.length !== 6) return alert('Код должен состоять из 6 символов');
    if (code === MY_CODE) return alert('Нельзя добавить свой же код');
    if (referrals.find(r => r.code === code)) return alert('Этот код уже добавлен');
    
    saveReferrals([...referrals, { code, claimTime: 0 }]);
    setRefInput('');
  };

  const claimReferral = (code: string) => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const ref = referrals.find(r => r.code === code);
    if (!ref) return;

    if (now - ref.claimTime < DAY_MS) {
      return alert('Кристаллы за этого реферала уже собраны сегодня!');
    }

    // Add 10 crystals
    setResources(prev => ({ ...prev, crystals: (prev.crystals || 0) + 10 }));
    saveReferrals(referrals.map(r => r.code === code ? { ...r, claimTime: now } : r));
    alert('Вы получили 10 кристаллов за реферала!');
  };

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

    const encodeLoginToAscii = (str: string) => {
      // Create a deterministic valid email local part from any login (including Cyrillic)
      const encoded = Array.from(new TextEncoder().encode(str))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return encoded || 'empty';
    };

    const email = `${encodeLoginToAscii(login.toLowerCase().trim())}${DUMMY_DOMAIN}`;
    
    try {
      if (isRegister) {
        const cleanName = login.trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: {
              name: cleanName
            }
          }
        });
        if (error) {
          if (error.message.includes('already registered') || error.message.includes('User already exists')) {
            throw new Error("Пользователь с таким логином уже существует. Попробуйте войти.");
          }
          throw error;
        }
        
        if (!data.session) {
          throw new Error("Регистрация успешна, но требуется подтверждение Email! Т.к. мы используем выдуманные логины, зайдите в настройки вашего Supabase (Authentication -> Providers -> Email) и ОТКЛЮЧИТЕ галочку 'Confirm email', затем попробуйте снова.");
        }

        setPlayerName(cleanName);
        
        // Supabase users table should probably be populated via trigger or manually
        if (data.user) {
          const { error: dbError } = await supabase.from('users').upsert({
            id: data.user.id,
            playerName: cleanName,
            version: 2,
            createdAt: new Date().toISOString()
          });
          if (dbError) {
            console.error("Manual doc creation failed", dbError);
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Неверный логин или пароль. Либо аккаунт не существует (нужно зарегистрироваться), либо пароль опечатка.');
          }
          if (error.message.includes('Email not confirmed')) {
             throw new Error('Требуется подтверждение почты. Отключите Confirm Email в настройках Supabase.');
          }
          throw error;
        }
      }
    } catch (error: any) {
      console.error("Auth error", error);
      if (error && error.message && error.message.includes('Failed to fetch')) {
        setErrorMsg('Ошибка связи к сервером Supabase. Убедитесь, что вы добавили NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в настройках (Settings -> Secrets) AI Studio.');
      } else {
        setErrorMsg("Ошибка: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Login failed", error);
      setErrorMsg("Ошибка входа: " + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
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
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata?.avatar_url} alt={user.user_metadata?.name || ''} className="w-16 h-16 rounded-full border-2 border-amber-500 shadow-lg" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-stone-700 border-2 border-amber-500 flex items-center justify-center shadow-lg">
                <UserIcon className="w-8 h-8 text-stone-400" />
              </div>
            )}
            <div>
              <p className="text-xs text-amber-600 font-black uppercase tracking-tighter leading-none mb-1">Игрок</p>
              <p className="text-lg font-bold text-stone-100">{playerName || '...'}</p>
              <p className="text-[10px] text-stone-500 font-mono italic">{login || (user.email?.endsWith(DUMMY_DOMAIN) ? user.user_metadata?.name || 'Player' : user.email)}</p>
            </div>
          </div>
          
          <div className="p-4 wow-panel-metal rounded bg-stone-800/30">
            <p className="text-xs text-stone-300 font-bold mb-2">Ваш прогресс автоматически сохраняется в облаке.</p>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest">Прогресс привязан к логину: <span className="text-amber-500">{login || (user.email?.endsWith(DUMMY_DOMAIN) ? user.user_metadata?.name || 'Player' : user.email)}</span></p>
          </div>

          <div className="p-4 rounded border border-indigo-500/30 bg-indigo-950/20">
            <h3 className="text-xs text-indigo-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Реферальная Система
            </h3>
            
            <div className="mb-4 text-center p-2 bg-stone-900 rounded border border-stone-800">
              <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Ваш код приглашения</p>
              <p className="text-xl font-mono text-indigo-400 font-bold tracking-[0.2em]">{MY_CODE}</p>
            </div>

            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                maxLength={6}
                value={refInput}
                onChange={e => setRefInput(e.target.value)}
                placeholder="ВВЕСТИ КОД" 
                className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-xs font-mono uppercase focus:border-indigo-500 outline-none placeholder:text-stone-600"
              />
              <button 
                onClick={handleAddReferral}
                className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-black text-[10px] uppercase transition-colors"
              >
                Добавить
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-stone-400 font-bold uppercase">Ваши рефералы ({referrals.length})</p>
              {referrals.length === 0 ? (
                <p className="text-[10px] text-stone-600 italic">Нет рефералов</p>
              ) : (
                referrals.map(r => (
                  <div key={r.code} className="flex items-center justify-between bg-stone-900/50 p-2 rounded border border-stone-800">
                    <span className="font-mono text-stone-300 text-xs">#{r.code}</span>
                    <button 
                      onClick={() => claimReferral(r.code)}
                      disabled={Date.now() - r.claimTime < 24 * 60 * 60 * 1000}
                      className={cn(
                        "px-2 py-1 rounded text-[9px] font-black uppercase transition-colors",
                        Date.now() - r.claimTime >= 24 * 60 * 60 * 1000
                          ? "bg-amber-500 text-stone-900 hover:bg-amber-400 cursor-pointer shadow-[0_0_10px_#f59e0b40]"
                          : "bg-stone-800 text-stone-600 opacity-50 cursor-not-allowed"
                      )}
                    >
                      {Date.now() - r.claimTime >= 24 * 60 * 60 * 1000 ? "Собрать +10" : "Собрано"}
                    </button>
                  </div>
                ))
              )}
            </div>
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
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
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
        </div>
      )}
    </div>
  );
}
