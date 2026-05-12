'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint, ShieldCheck, User, LayoutGrid, Settings, Bell, Search, LogOut } from 'lucide-react';

type AuthState = 'welcome' | 'authenticating' | 'success';

export default function PasskeyAuthPage() {
  const [authState, setAuthState] = useState<AuthState>('welcome');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username);
          setAuthState('success');
        }
      } catch (err) {
        console.error("Session check failed");
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const handleAuth = async (type: 'register' | 'login') => {
    if (!username) return setError('Username required');
    setError(null);
    setAuthState('authenticating');
    try {
      const optRes = await fetch(`/api/auth/${type}/generate-options`, { 
        method: 'POST', body: JSON.stringify({ username }) 
      });
      const options = await optRes.json();
      if (options.error) throw new Error(options.error);

      const attResp = type === 'register' ? await startRegistration(options) : await startAuthentication(options);
      
      const verRes = await fetch(`/api/auth/${type}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, data: attResp }),
      });

      const verification = await verRes.json();
      if (verification.success) setAuthState('success');
      else throw new Error(verification.error || 'Auth failed');
    } catch (err: any) {
      setError(err.message);
      setAuthState('welcome');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthState('welcome');
    setUsername('');
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {authState === 'welcome' && (
          <motion.div key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-md bg-white/40 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8 space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/80 rounded-2xl shadow-sm border border-slate-100 mb-4"><ShieldCheck className="w-8 h-8 text-indigo-600" /></div>
              <h1 className="text-2xl font-bold text-slate-900">Passkey Bento</h1>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" />
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleAuth('login')} className="py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg active:scale-95">Sign In</button>
                <button onClick={() => handleAuth('register')} className="py-3 bg-white text-slate-900 font-semibold border border-slate-200 rounded-xl">Register</button>
              </div>
            </div>
          </motion.div>
        )}

        {authState === 'authenticating' && (
          <motion.div key="a" className="w-full max-w-md bg-white/40 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-12 text-center space-y-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-24 h-24 bg-indigo-500/20 rounded-full animate-ping" />
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white"><Fingerprint className="w-10 h-10" /></div>
            </div>
            <h2 className="text-xl font-bold">Authenticating...</h2>
          </motion.div>
        )}

        {authState === 'success' && (
          <motion.div key="s" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-5xl space-y-6">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">{username?.[0]?.toUpperCase()}</div>
                <h1 className="text-xl font-bold">Hello, {username}</h1>
              </div>
              <button onClick={handleLogout} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500"><LogOut className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2 row-span-2 bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white"><LayoutGrid className="text-indigo-600" /> <h3 className="text-3xl font-bold mt-12">Dashboard</h3></div>
              <div className="bg-indigo-600 text-white p-6 rounded-3xl"><Bell /> <p className="text-2xl font-bold mt-4">12 Notifications</p></div>
              <div className="bg-white/60 p-6 rounded-3xl border border-white"><Search className="text-slate-400" /> <p className="text-2xl font-bold mt-4">84% Capacity</p></div>
              <div className="col-span-2 bg-white/60 p-6 rounded-3xl border border-white flex justify-between items-center"><Settings className="text-slate-400" /> <button className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl">Settings</button></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
