'use client';

import React from 'react';
import { ClipboardList, LogOut, LayoutGrid } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export function Header() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  return (
    <header className="flex justify-between items-center p-3 bg-white border-b border-slate-200 shadow-sm z-50 shrink-0 h-16">
      <div className="flex items-center gap-4">
        {/* Modüllere Dön */}
        <button 
          onClick={() => router.push('/')}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
          title="Modüllere Dön"
        >
          <LayoutGrid size={20} />
        </button>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <ClipboardList className="w-6 h-6 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Verim Kartı</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all px-3 py-2 rounded-md text-sm font-bold"
          title="Güvenli Çıkış"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}