'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Flock } from '@/lib/utils';
import { ArrowLeft, Bird, AlertCircle, Calendar } from 'lucide-react';
import { ProductionTable } from '@/components/ProductionTable';

export default function ProductionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlockId, setSelectedFlockId] = useState<string | null>(null);

  // 1. Auth ve Sürüleri Çek
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // Tüm sürüleri çek
      const q = query(collection(db, "flocks"), orderBy("hatchDate", "desc"));
      const snapshot = await getDocs(q);
      const flockList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        hatchDate: doc.data().hatchDate?.toDate(),
        // Varsayılan değerler
        name: doc.data().name || '#??',
        initialCount: doc.data().initialCount || 0
      })) as Flock[];

      setFlocks(flockList);
      
      // İlk sürüyü otomatik seç
      if (flockList.length > 0) setSelectedFlockId(flockList[0].id);
      
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const selectedFlock = flocks.find(f => f.id === selectedFlockId);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* Üst Bar: Sürü Seçimi */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => router.push('/')}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Bird size={20} className="text-emerald-600"/> 
                        Verim Kartı
                    </h1>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {selectedFlock ? `${selectedFlock.coopId} KÜMESİ` : 'Sürü Seçiniz'}
                    </span>
                </div>
            </div>

            {/* Sürü Selector (Tab benzeri yapı) */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-md no-scrollbar">
                {flocks.map(flock => (
                    <button
                        key={flock.id}
                        onClick={() => setSelectedFlockId(flock.id)}
                        className={`
                            flex flex-col items-center justify-center px-4 py-1.5 rounded-lg border text-xs font-bold transition-all min-w-20
                            ${selectedFlockId === flock.id 
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' 
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}
                        `}
                    >
                        <span className="text-sm">{flock.name || 'Sürü'}</span>
                        <span className="opacity-70 text-[9px]">{flock.coopId}</span>
                    </button>
                ))}
            </div>
        </div>
      </header>

      {/* Ana İçerik: Tablo */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {selectedFlock ? (
            <div className="space-y-4">
                {/* Bilgi Kartı */}
                {selectedFlock.initialCount === 0 && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-3 text-amber-800 text-sm">
                        <AlertCircle size={18} />
                        <div>
                            <strong>Dikkat:</strong> Bu sürünün başlangıç adedi (initialCount) girilmemiş. 
                            Verim hesaplaması için lütfen sürü ayarlarından girişi yapın.
                        </div>
                    </div>
                )}

                <ProductionTable flock={selectedFlock} />
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Bird size={48} className="mb-4 opacity-20" />
                <p>Görüntülenecek sürü bulunamadı.</p>
            </div>
        )}
      </main>
    </div>
  );
}