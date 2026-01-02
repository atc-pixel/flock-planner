'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  CalendarDays,
  ClipboardList,
  Activity,
  LogOut,
  Bird,
  LayoutGrid,
  Camera,
  Wheat,
} from 'lucide-react';

export default function ModulesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      } else {
        setUserEmail(user.email);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  const modules = [
    {
      title: 'Günlük Girişler',
      description: 'Fiş fotoğrafı yükle. (Bir sonraki adım: LLM ile otomatik okuma.)',
      icon: <Camera size={32} className="text-amber-600" />,
      path: '/daily-entry',
      color: 'bg-amber-50 hover:border-amber-300 border-amber-100',
      textColor: 'text-amber-900',
    },
    {
      title: 'Verim Kartı',
      description: 'Günlük yumurta, yem, su ve ölüm verilerini girin.',
      icon: <ClipboardList size={32} className="text-emerald-600" />,
      path: '/production',
      color: 'bg-emerald-50 hover:border-emerald-300 border-emerald-100',
      textColor: 'text-emerald-900',
    },
    {
      title: 'Sürü Planlayıcı',
      description: 'Sürülerin yaşam döngüsü, transfer ve kesim planlaması.',
      icon: <CalendarDays size={32} className="text-blue-600" />,
      path: '/planner',
      color: 'bg-blue-50 hover:border-blue-300 border-blue-100',
      textColor: 'text-blue-900',
    },
    {
      title: 'Kümes Durumu',
      description: 'Anlık kümes doluluk oranları ve canlı veriler.',
      icon: <Activity size={32} className="text-purple-600" />,
      path: '/coop-status', // Henüz yapılmadı
      color: 'bg-purple-50 hover:border-purple-300 border-purple-100',
      textColor: 'text-purple-900',
    },
    {
      title: 'Yem Kayıt',
      description: 'Kümesler için yapılan yemlerin kaydı ve tüketim hesaplaması.',
      icon: <Wheat size={32} className="text-orange-600" />,
      path: '/feed-registry',
      color: 'bg-orange-50 hover:border-orange-300 border-orange-100',
      textColor: 'text-orange-900',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Üst Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-lg text-white">
            <Bird size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Tarım Gıda</h1>
            <p className="text-xs text-slate-500 font-medium">Sürü Yönetim Sistemi v1.0</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-400 hidden sm:block">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-bold transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </header>

      {/* Modül Grid */}
      <main className="max-w-5xl mx-auto p-6 mt-8">
        <div className="flex items-center gap-2 mb-6">
          <LayoutGrid className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-600">Modüller</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod, index) => (
            <div
              key={index}
              onClick={() => router.push(mod.path)}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 ${mod.color}`}
            >
              <div className="mb-4 bg-white w-14 h-14 rounded-xl flex items-center justify-center shadow-sm">
                {mod.icon}
              </div>
              <h3 className={`text-lg font-bold mb-2 ${mod.textColor}`}>{mod.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed opacity-80">{mod.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
