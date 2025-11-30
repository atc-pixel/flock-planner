'use client';

import React from 'react';
import { Bird, GripVertical, LogOut, LayoutGrid } from 'lucide-react'; // LayoutGrid ikonu eklendi
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
      console.error("Çıkış yapılırken hata oluştu:", error);
    }
  };

  return (
    <header className="flex justify-between items-center p-3 bg-white border-b border-slate-200 shadow-sm z-50 shrink-0 h-16">
      <div className="flex items-center gap-4">
        {/* MODÜLLERE DÖN BUTONU */}
        <button 
          onClick={() => router.push('/')}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
          title="Modüllere Dön"
        >
          <LayoutGrid size={20} />
        </button>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <Bird className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Sürü Planlayıcı</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Yeni Sürü Sürükle-Bırak Kaynağı */}
        <DraggableSource />

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

function DraggableSource() {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'new-flock-source',
    data: { type: 'source' }
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} 
         className="cursor-grab active:cursor-grabbing flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-md font-bold text-sm z-50 transition-colors">
      <GripVertical size={16} />
      <span>+ Yeni Sürü</span>
    </div>
  );
}