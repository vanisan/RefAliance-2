'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useGame } from '../lib/game-context';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, LogOut, User as UserIcon, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect } from 'react';

export default function AuthView() {
  const { user, authLoading, playerName, setPlayerName, resetProgress, setResources, referrals: globalReferrals, setReferrals: setGlobalReferrals } = useGame();
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
  const [claimedCodes, setClaimedCodes] = useState<{code: string, claimTime: number}[]>([]);

  // Load referrals from localStorage since we don't have DB support for it
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`referrals_${user.id}`);
      if (saved) setClaimedCodes(JSON.parse(saved));
    }
  }, [user]);

  const saveClaimedCodes = (newCodes: any) => {
    setClaimedCodes(newCodes);
    if (user) localStorage.setItem(`referrals_${user.id}`, JSON.stringify(newCodes));
  };

  const handleAddReferral = async () => {
    const code = refInput.trim().toUpperCase();
    if (code.length !== 6) return alert('Код має складатися з 6 символів');
    if (code === MY_CODE) return alert('Не можна додати свій власний код');
    if (claimedCodes.find(r => r.code === code)) return alert('Цей код вже додано');
    
    setLoading(true);
    try {
      // Find the user whose ID starts with this code
      const { data: allUsers, error: searchError } = await supabase
        .from('users')
        .select('id, playerName, referrals, resources');

      if (searchError) throw searchError;

      const owner = allUsers?.find(u => u.id.substring(0, 6).toUpperCase() === code);

      if (!owner) {
        setLoading(false);
        return alert('Код не знайдено. Перевірте правильність вводу.');
      }

      // 1. Increment OWNER'S referrals in the DB (Unlocks THEIR cell)
      const currentOwnerRefs = owner.referrals || owner.resources?.referrals || 0;
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          referrals: currentOwnerRefs + 1,
          lastUpdate: new Date().toISOString()
        })
        .eq('id', owner.id);

      if (updateError) throw updateError;
      
      // 2. Give the CURRENT user (the one who entered the code) a reward
      // We unlock a cell for them TOO (optional, but requested by user "за рефералів не дає клітинки" might mean they want one too)
      // Actually, standard system: I enter code -> I get something small, Owner gets referral point.
      // But user said "за рефералів не дає клітинки". 
      // If I want to be generous to both:
      setGlobalReferrals(prev => prev + 1); 

      saveClaimedCodes([...claimedCodes, { code, claimTime: 0 }]);
      setRefInput('');
      alert(`Код успiшно додано! Гравцю ${owner.playerName} зараховано реферал. Ви також отримали +1 до своїх реферальних клітинок!`);
    } catch (e: any) {
      console.error(e);
      alert('Помилка при додаваннi коду: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const claimReferral = (code: string) => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const ref = claimedCodes.find(r => r.code === code);
    if (!ref) return;

    if (now - ref.claimTime < DAY_MS) {
      return alert('Кристали за цього реферала вже зібрані сьогодні!');
    }

    // Add 10 crystals
    setResources(prev => ({ ...prev, crystals: (prev.crystals || 0) + 10 }));
    saveClaimedCodes(claimedCodes.map(r => r.code === code ? { ...r, claimTime: now } : r));
    alert('Ви отримали 10 кристалів за реферала!');
  };

  const handleCredentialsAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (login.length < 3) {
      setErrorMsg("Логін занадто короткий (мін. 3 символи)");
      setLoading(false);
      return;
    }
    if (pass.length < 6) {
      setErrorMsg("Пароль занадто короткий (мін. 6 символів)");
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
            throw new Error("Користувач із таким логіном вже існує. Спробуйте увійти.");
          }
          throw error;
        }
        
        if (!data.session) {
          throw new Error("Реєстрація успішна, але потрібне підтвердження Email! Оскільки ми використовуємо вигадані логіни, зайдіть у налаштування вашої Supabase (Authentication -> Providers -> Email) та ВІДКЛЮЧІТЬ галочку 'Confirm email', потім спробуйте знову.");
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
            throw new Error('Невірний логін або пароль. Або акаунт не існує (потрібно зареєструватися), або пароль з помилкою.');
          }
          if (error.message.includes('Email not confirmed')) {
             throw new Error('Потрібне підтвердження пошти. Вимкніть Confirm Email у налаштуваннях Supabase.');
          }
          throw error;
        }
      }
    } catch (error: any) {
      console.error("Auth error", error);
      if (error && error.message && error.message.includes('Failed to fetch')) {
        setErrorMsg('Помилка зв\'язку із сервером Supabase. Переконайтеся, що ви додали NEXT_PUBLIC_SUPABASE_URL та NEXT_PUBLIC_SUPABASE_ANON_KEY у налаштуваннях (Settings -> Secrets) AI Studio.');
      } else {
        setErrorMsg("Помилка: " + error.message);
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
      setErrorMsg("Помилка входу: " + error.message);
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
      <h2 className="text-xl font-black text-amber-500 uppercase tracking-widest text-shadow-glow mb-6 text-center">Профіль Гравця</h2>
      
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
              <p className="text-xs text-amber-600 font-black uppercase tracking-tighter leading-none mb-1">Гравець</p>
              <p className="text-lg font-bold text-stone-100">{playerName || '...'}</p>
              <p className="text-[10px] text-stone-500 font-mono italic">{login || (user.email?.endsWith(DUMMY_DOMAIN) ? user.user_metadata?.name || 'Player' : user.email)}</p>
            </div>
          </div>
          
          <div className="p-4 wow-panel-metal rounded bg-stone-800/30">
            <p className="text-xs text-stone-300 font-bold mb-2">Ваш прогрес автоматично зберігається у хмарі.</p>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest">Прогрес прив'язаний до логіну: <span className="text-amber-500">{login || (user.email?.endsWith(DUMMY_DOMAIN) ? user.user_metadata?.name || 'Player' : user.email)}</span></p>
          </div>

          <div className="p-4 rounded border border-indigo-500/30 bg-indigo-950/20">
            <h3 className="text-xs text-indigo-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Реферальна Система
            </h3>
            
            <div className="mb-4 text-center p-2 bg-stone-900 rounded border border-stone-800">
              <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Ваш код запрошення</p>
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
                Додати
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-stone-400 font-bold uppercase">Ваші реферали ({claimedCodes.length}) / Розблоковано слотів: {globalReferrals}</p>
              {claimedCodes.length === 0 ? (
                <p className="text-[10px] text-stone-600 italic">Немає рефералів</p>
              ) : (
                claimedCodes.map(r => (
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
                      {Date.now() - r.claimTime >= 24 * 60 * 60 * 1000 ? "Зібрати +10" : "Зібрано"}
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
                Скинути прогрес (Почати з 0)
              </button>
            ) : (
              <div className="bg-red-950/20 p-2 border border-red-500/30 rounded">
                <p className="text-red-500 text-[8px] font-black uppercase mb-2">Видалити все і почати з 1 лицарем?</p>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      await resetProgress();
                      setConfirmReset(false);
                    }}
                    className="flex-1 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded"
                  >
                    ТАК, ВИДАЛИТИ
                  </button>
                  <button 
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-1 bg-stone-700 text-white text-[9px] font-black uppercase rounded"
                  >
                    СКАСУВАТИ
                  </button>
                </div>
              </div>
            )}
            
            <button 
              onClick={handleLogout}
              className="w-full py-3 wow-panel-metal flex items-center justify-center gap-2 text-stone-400 font-black uppercase tracking-widest hover:bg-stone-700 transition-colors border-stone-800 border-b-2"
            >
              <LogOut className="w-4 h-4"/> Вийти із системи
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
                  <p className="text-stone-300 text-sm font-bold mb-2 uppercase tracking-tight">Створи свій шлях</p>
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest leading-relaxed italic">Армія та міста потребують правителя.</p>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogleLogin}
                  className="w-full py-4 bg-white text-stone-900 rounded font-black flex items-center justify-center gap-3 shadow-xl hover:bg-stone-100 transition-colors uppercase tracking-widest text-xs border-b-4 border-stone-300"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                  Google Вхід
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
                  Логін та Пароль
                </motion.button>
                
                <p className="mt-4 text-[9px] text-stone-700 uppercase font-black tracking-tighter">Рекомендуємо Google, якщо Логін/Пароль не працюють.</p>
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
                    {isRegister ? "Реєстрація" : "Вхід"}
                  </h3>
                  <button onClick={() => setMode('choice')} className="text-[9px] text-stone-500 uppercase font-bold hover:text-stone-300">Назад</button>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
                    <input 
                      type="text" 
                      placeholder="ЛОГІН"
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
                    isRegister ? "Створити" : "Увійти"
                  )}
                </button>

                <button 
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-[10px] text-amber-500/70 hover:text-amber-500 font-bold uppercase underline"
                >
                  {isRegister ? "Вже є аккаунт?" : "Немає аккаунта?"}
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
