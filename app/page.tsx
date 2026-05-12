'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint, ShieldCheck, User, LayoutGrid, Settings, Bell, Search, LogOut } from 'lucide-react';

// --- Types ---
type AuthState = 'welcome' | 'authenticating' | 'success';

export default function PasskeyAuthPage() {
  const [authState, setAuthState] = useState<AuthState>('welcome');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  // --- Handlers ---
  const handleRegister = async () => {
    if (!username) return setError('Please enter a username');
    setError(null);
    setAuthState('authenticating');

    try {
      // 1. Get options from server
      const optionsRes = await fetch('/api/auth/register/generate-options', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      const options = await optionsRes.json();

      if (options.error) throw new Error(options.error);

      // 2. Start WebAuthn registration
      const attResp = await startRegistration(options);

      // 3. Verify on server
      const verifyRes = await fetch('/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, data: attResp }),
      });

      const verification = await verifyRes.json();
      if (verification.success) {
        setAuthState('success');
      } else {
        throw new Error(verification.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message);
      setAuthState('welcome');
    }
  };

  const handleLogin = async () => {
    if (!username) return setError('Please enter a username');
    setError(null);
    setAuthState('authenticating');

    try {
      // 1. Get options from server
      const optionsRes = await fetch('/api/auth/login/generate-options', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      const options = await optionsRes.json();

      if (options.error) throw new Error(options.error);

      // 2. Start WebAuthn authentication
      const asseResp = await startAuthentication(options);

      // 3. Verify on server
      const verifyRes = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, data: asseResp }),
      });

      const verification = await verifyRes.json();
      if (verification.success) {
        setAuthState('success');
      } else {
        throw new Error(verification.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message);
      setAuthState('welcome');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-indigo-100">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/50 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-200/50 blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {authState === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md bg-white/40 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8 space-y-8"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/80 rounded-2xl shadow-sm border border-slate-100 mb-4">
                <ShieldCheck className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
              <p className="text-slate-500">Sign in securely with your Passkey</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 font-medium text-center">{error}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleLogin}
                  className="flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                >
                  <Fingerprint className="w-4 h-4" />
                  Sign In
                </button>
                <button
                  onClick={handleRegister}
                  className="flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 text-slate-900 font-semibold border border-slate-200 rounded-xl transition-all active:scale-[0.98]"
                >
                  Register
                </button>
              </div>
            </div>

            <p className="text-xs text-center text-slate-400">
              Powered by <span className="font-semibold text-slate-500">WebAuthn API</span>
            </p>
          </motion.div>
        )}

        {authState === 'authenticating' && (
          <motion.div
            key="authenticating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md bg-white/40 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-12 text-center space-y-6"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-24 h-24 bg-indigo-500/20 rounded-full animate-ping" />
              <div className="relative w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center">
                <Fingerprint className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Authenticating...</h2>
              <p className="text-slate-500">Please confirm your identity via your device prompt</p>
            </div>
          </motion.div>
        )}

        {authState === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-5xl space-y-6"
          >
            {/* Bento Grid Dashboard */}
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                  {username[0].toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Hello, {username}</h1>
                  <p className="text-sm text-slate-500">Overview Dashboard</p>
                </div>
              </div>
              <button 
                onClick={() => setAuthState('welcome')}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-full">
              {/* Large Card */}
              <div className="md:col-span-2 md:row-span-2 bg-white/60 backdrop-blur-md border border-white p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-12">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">ACTIVE</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">Workspace</h3>
                <p className="text-slate-500 mb-8">Manage your projects and team collaboration in one place.</p>
                <div className="grid grid-cols-3 gap-2">
                    {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100/50 rounded-2xl animate-pulse" />)}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-lg shadow-indigo-600/20">
                <Bell className="w-6 h-6 mb-4" />
                <h4 className="text-sm font-medium opacity-80 uppercase tracking-wider">Alerts</h4>
                <p className="text-2xl font-bold mt-1">12 New</p>
              </div>

              <div className="bg-white/60 backdrop-blur-md border border-white p-6 rounded-3xl shadow-sm">
                <Search className="w-6 h-6 text-slate-400 mb-4" />
                <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Storage</h4>
                <p className="text-2xl font-bold text-slate-900 mt-1">84% Full</p>
              </div>

              {/* Settings / Profile */}
              <div className="md:col-span-2 bg-white/60 backdrop-blur-md border border-white p-6 rounded-3xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">System Preferences</h4>
                    <p className="text-sm text-slate-500">Configure your workspace</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors">
                  Open
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
