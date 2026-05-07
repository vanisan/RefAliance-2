'use client';

import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, LogOut, ShieldAlert } from 'lucide-react';

export default function AuthView() {
  const [error, setError] = useState("");

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl max-w-md w-full">
      <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">RefAlliance 2</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg flex items-center gap-2 text-red-200 text-sm">
          <ShieldAlert className="w-4 h-4" />
          {error}
        </div>
      )}

      <button
        onClick={login}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg"
      >
        <LogIn className="w-5 h-5" />
        Login with Google
      </button>

      <p className="mt-4 text-xs text-zinc-500 text-center uppercase tracking-widest">
        Command your heroes. Build your alliance.
      </p>
    </div>
  );
}
