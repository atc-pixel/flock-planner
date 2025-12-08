'use client';

import React, { useState, useEffect } from 'react';
import { INITIAL_COOPS } from '@/lib/utils';
import { RefreshCw, LayoutGrid, Droplets, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
// Recharts
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar
} from 'recharts';

export default function CoopStatusPage() {
  const router = useRouter();
  const [selectedCoopId, setSelectedCoopId] = useState('T1');
  const [data, setData] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Veri Çekme (Firebase'den)
  const fetchData = async () => {
    setLoading(true);
    try {
      // Varsayılan olarak son 24 saati çekiyoruz
      const res = await fetch(`/coop-status/api/get-readings?coopId=${selectedCoopId}&range=24h`);
      const json = await res.json();
      if (json.data) {
        // Veriyi grafik için işle
        const processed = json.data.map((d: any) => ({
            ...d,
            timeLabel: new Date(d.time).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})
        }));
        setData(processed);
      }
    } catch (error) {
      console.error("Veri hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sayfa açılınca veya kümes değişince veri çek
  useEffect(() => {
    fetchData();
  }, [selectedCoopId]);

  // Sync Butonu
  const handleSync = async () => {
    if (window.location.hostname !== 'localhost' && !confirm("InfluxDB yerel ağda ise bu işlem Vercel üzerinde çalışmaz. Devam?")) return;
    
    setSyncing(true);
    try {
      const res = await fetch(`/coop-status/api/sync-water?coopId=${selectedCoopId}`);
      const result = await res.json();
      if (res.ok) {
         alert(`Senkronizasyon Başarılı: ${result.importedCount} kayıt güncellendi.`);
         fetchData(); // Verileri tazele
      } else {
         alert("Hata: " + result.message);
      }
    } catch (err) {
      alert("Bağlantı hatası.");
    } finally {
      setSyncing(false);
    }
  };

  // --- HESAPLAMALAR ---
  const totalConsumption = data.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const batteryTotals = data.reduce((acc, curr) => ({
    b1: acc.b1 + (curr.b1 || 0),
    b2: acc.b2 + (curr.b2 || 0),
    b3: acc.b3 + (curr.b3 || 0),
    b4: acc.b4 + (curr.b4 || 0),
  }), { b1: 0, b2: 0, b3: 0, b4: 0 });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between gap-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Droplets size={24} /></div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Kümes Durumu</h1>
              <p className="text-xs text-slate-500">Su Tüketim Analizi</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedCoopId}
              onChange={(e) => setSelectedCoopId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5 font-bold w-40"
            >
              {INITIAL_COOPS.map((coop) => (
                <option key={coop.id} value={coop.id}>{coop.name}</option>
              ))}
            </select>
            <LayoutGrid size={14} className="absolute right-3 top-3 text-slate-500 pointer-events-none"/>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{syncing ? 'Yenileniyor...' : 'Veri Çek'}</span>
          </button>
        </div>
      </header>

      {/* İÇERİK */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Özet Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl col-span-2 md:col-span-1 shadow-sm">
                <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">TOPLAM (24s)</p>
                <p className="text-3xl font-black text-purple-900 mt-1">{totalConsumption.toFixed(1)} <span className="text-sm font-medium">L</span></p>
            </div>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <p className="text-xs text-slate-400 font-bold uppercase">Batarya {i}</p>
                    <p className="text-xl font-bold text-slate-700 mt-1">
                        {batteryTotals[`b${i}` as keyof typeof batteryTotals].toFixed(1)} L
                    </p>
                </div>
            ))}
        </div>

        {/* Grafikler */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Çizgi Grafik */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-96">
                <h3 className="font-bold text-slate-700 mb-4 text-sm">Anlık Akış Hızı (10dk)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="timeLabel" fontSize={10} minTickGap={30} tickLine={false} axisLine={false}/>
                        <YAxis fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                        <Legend wrapperStyle={{fontSize: '12px'}}/>
                        <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Toplam" />
                        <Line type="monotone" dataKey="b1" stroke="#cbd5e1" strokeWidth={1} dot={false} name="B1" />
                        <Line type="monotone" dataKey="b2" stroke="#cbd5e1" strokeWidth={1} dot={false} name="B2" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Bar Grafik */}
            <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-96">
                <h3 className="font-bold text-slate-700 mb-4 text-sm">Batarya Dağılımı</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[batteryTotals]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}}/>
                        <Bar dataKey="b1" fill="#4ade80" name="Batarya 1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="b2" fill="#60a5fa" name="Batarya 2" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="b3" fill="#f472b6" name="Batarya 3" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="b4" fill="#fbbf24" name="Batarya 4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

        </div>
      </main>
    </div>
  );
}