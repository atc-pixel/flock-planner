'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, orderBy, query, onSnapshot } from 'firebase/firestore'; // onSnapshot eklendi
import { isAfter, isBefore, addWeeks } from 'date-fns';
import { Flock, INITIAL_COOPS, calculateTimeline } from '@/lib/utils';
import { Bird, AlertCircle, History, X, Home } from 'lucide-react';

import { Header } from '@/components/production/Header';
import { ProductionTable } from '@/components/production/ProductionTable';

export default function ProductionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allFlocks, setAllFlocks] = useState<Flock[]>([]);
  
  const [selectedCoopId, setSelectedCoopId] = useState<string>(INITIAL_COOPS[0].id);
  const [selectedFlockId, setSelectedFlockId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // CANLI VERİ DİNLEME (onSnapshot)
      const q = query(collection(db, "flocks"), orderBy("hatchDate", "desc"));
      
      const unsubscribeData = onSnapshot(q, (snapshot) => {
        const flockList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          hatchDate: doc.data().hatchDate?.toDate(),
          transferDate: doc.data().transferDate?.toDate(),
          exitDate: doc.data().exitDate?.toDate(),
          name: doc.data().name || '#??',
          initialCount: doc.data().initialCount || 0
        })) as Flock[];

        setAllFlocks(flockList);
        setLoading(false);
      });

      return () => unsubscribeData();
    });
    return () => unsubscribeAuth();
  }, [router]);

  // ... (Kalan useEffect ve render mantığı AYNI, sadece return kısmını aşağıya ekliyorum)

  useEffect(() => {
    if (allFlocks.length === 0) return;

    const coopFlocks = allFlocks.filter(f => f.coopId === selectedCoopId);
    const today = new Date();

    const active = coopFlocks.find(f => {
      let endDate = f.exitDate;
      if (!endDate) {
         const tl = calculateTimeline(f);
         endDate = tl ? tl.exit : addWeeks(f.hatchDate, 100);
      }
      return isBefore(f.hatchDate, today) && isAfter(endDate, today);
    });

    if (active) {
        setSelectedFlockId(active.id);
    } else if (coopFlocks.length > 0) {
        setSelectedFlockId(coopFlocks[0].id);
    } else {
        setSelectedFlockId(null);
    }
    
    setShowHistory(false);
  }, [selectedCoopId, allFlocks]);

  const selectedFlock = allFlocks.find(f => f.id === selectedFlockId);
  const historyFlocks = allFlocks.filter(f => f.coopId === selectedCoopId && f.id !== selectedFlockId);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Header />

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        
        {/* Kümes Seçimi */}
        <div className="grid grid-cols-6 gap-3 mb-6">
            {INITIAL_COOPS.map(coop => {
                const isActive = selectedCoopId === coop.id;
                const hasActiveFlock = allFlocks.some(f => f.coopId === coop.id && isBefore(f.hatchDate, new Date()) && (!f.exitDate || isAfter(f.exitDate, new Date())));

                return (
                    <button
                        key={coop.id}
                        onClick={() => setSelectedCoopId(coop.id)}
                        className={`
                            relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all h-20
                            ${isActive 
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md transform scale-105 z-10' 
                                : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:bg-slate-50'}
                        `}
                    >
                        <Home size={24} className={`mb-1 ${isActive ? 'fill-emerald-200 text-emerald-600' : 'text-slate-400'}`} />
                        <span className="font-bold text-xs">{coop.name}</span>
                        {hasActiveFlock && !isActive && <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-400 rounded-full"></span>}
                    </button>
                )
            })}
        </div>

        {selectedFlock ? (
            <div className="space-y-4">
                {/* Sürü Bilgi Kartı */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-visible">
                    
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 shadow-inner">
                            <Bird size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">{selectedFlock.name}</h2>
                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold border border-slate-200 uppercase">
                                    {selectedFlock.coopId}
                                </span>
                            </div>
                            <div className="text-sm text-slate-500 font-medium flex flex-wrap gap-3 mt-1">
                                <span>Giriş: <span className="text-slate-800 font-bold">{selectedFlock.hatchDate?.toLocaleDateString('tr-TR')}</span></span>
                                
                                <span className="text-slate-300">|</span>
                                
                                {selectedFlock.transferDate ? (
                                    <>
                                        <span>Transfer: <span className="text-slate-800 font-bold">{selectedFlock.transferDate.toLocaleDateString('tr-TR')}</span></span>
                                        <span className="text-slate-300">|</span>
                                    </>
                                ) : null}

                                <span>Başlangıç: <span className="text-slate-800 font-bold">{selectedFlock.initialCount.toLocaleString()}</span></span>
                            </div>
                        </div>
                    </div>

                    {historyFlocks.length > 0 && (
                        <div className="relative">
                            <button 
                                onClick={() => setShowHistory(!showHistory)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors
                                    ${showHistory ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}
                                `}
                            >
                                {showHistory ? <X size={14} /> : <History size={14} />}
                                {showHistory ? 'Kapat' : 'Geçmiş'}
                            </button>

                            {showHistory && (
                                <div className="absolute top-10 right-0 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Geçmiş Sürüler</div>
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                        {historyFlocks.map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => {
                                                    setSelectedFlockId(f.id);
                                                    setShowHistory(false);
                                                }}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs text-slate-600 hover:text-slate-900 flex justify-between items-center transition-colors"
                                            >
                                                <span className="font-bold">{f.name}</span>
                                                <span className="opacity-50">{f.hatchDate?.toLocaleDateString('tr-TR')}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {selectedFlock.initialCount === 0 && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-3 text-amber-800 text-sm">
                        <AlertCircle size={18} />
                        <span><strong>Veri Eksik:</strong> Doğru verim hesabı için sürü planlayıcıdan başlangıç adedini giriniz.</span>
                    </div>
                )}

                <ProductionTable flock={selectedFlock} />
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                    <Bird size={48} className="opacity-20 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-600">Aktif Sürü Yok</h3>
                <p className="text-sm mt-1 max-w-xs text-center opacity-70">
                    "{selectedCoopId}" kümesinde şu an üretimde olan bir sürü bulunamadı.
                </p>
                <button 
                    onClick={() => router.push('/planner')}
                    className="mt-6 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-bold transition-colors shadow-lg shadow-emerald-200"
                >
                    Sürü Planla
                </button>
            </div>
        )}
      </main>
    </div>
  );
}