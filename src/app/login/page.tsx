'use client';

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Bird, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/'); // Başarılıysa ana sayfaya git
    } catch (err: any) {
      console.error(err);
      setError('Giriş başarısız. E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-amber-500 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
            <Bird size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">FlockCycle</h1>
          <p className="text-amber-100 text-sm">Yönetici Girişi</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                placeholder="yonetici@ciftlik.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Şifre</label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Giriş Yap <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}