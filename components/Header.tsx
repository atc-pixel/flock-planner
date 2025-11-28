'use client';

import React from 'react';
import { Bird, GripVertical, LogOut } from 'lucide-react'; // LogOut eklendi
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { signOut } from 'firebase/auth'; // Auth fonksiyonları
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export function Header() {
  const router = useRouter();

  // Çıkış İşlemi
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login'); // Giriş sayfasına yönlendir
    } catch (error) {
      console.error("Çıkış yapılırken hata oluştu:", error);
    }
  };

  return (
    <header className="flex justify-between items-center p-3 bg-white border-b border-slate-200 shadow-sm z-50 shrink-0 h-16">
      <div className="flex items-center gap-2">
        <Bird className="w-6 h-6 text-amber-500" />
        {/* Metin Değişikliği: FlockCycle -> Tarım Gıda */}
        <h1 className="text-xl font-bold text-slate-800">Tarım Gıda</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Draggable Source (Mevcut) */}
        <DraggableSource />

        {/* Yeni Logout Butonu */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all px-3 py-2 rounded-md text-sm font-bold border border-transparent hover:border-red-100"
          title="Güvenli Çıkış"
        >
          <LogOut size={18} />
          <span className="hidden sm:block">Çıkış</span>
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
         className="cursor-grab active:cursor-grabbing flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded shadow-md font-medium text-sm z-50 transition-colors">
      <GripVertical size={16} />
      <span>Yeni Sürü</span>
    </div>
  );
}