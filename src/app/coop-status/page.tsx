// src/app/coop-status/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
// Recharts kütüphanesini kullandığını varsayıyorum, yüklü değilse: npm i recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function CoopStatusPage() {
  const router = useRouter();
  const [coopId, setCoopId] = useState('T1');
  const [data, setData] = useState<any[]>([]); // Ham 10 dk'lık veriler
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 1. Verileri Getir (Firebase'den)
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/coop-status/api/get-readings?coopId=${coopId}&range=24h`);
      const json = await res.json();
      if (json.data) setData(json.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Senkronizasyon (Influx -> Firebase)
  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`/coop-status/api/sync-water?coopId=${coopId}`);
      await fetchData(); // Sync bitince veriyi tazele
      alert("Veriler güncellendi.");
    } catch (error) {
      alert("Senkronizasyon hatası.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [coopId]);

  // --- HESAPLAMALAR ---

  // A) Toplam Günlük Tüketim (Gelen tüm 10 dk'lık verilerin toplamı)
  const totalConsumption = data.reduce((acc, curr) => acc + (curr.total || 0), 0);

  // B) Batarya Bazlı Toplam
  const batteryTotals = data.reduce((acc, curr) => ({
    b1: acc.b1 + (curr.b1 || 0),
    b2: acc.b2 + (curr.b2 || 0),
    b3: acc.b3 + (curr.b3 || 0),
    b4: acc.b4 + (curr.b4 || 0),
  }), { b1: 0, b2: 0, b3: 0, b4: 0 });

  // C) Grafik İçin Veri Formatı (Timestamp'i saate çevir)
  const chartData = data.map(d => ({
    ...d,
    timeStr: new Date(d.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="p-2 bg-white rounded-lg border hover:bg-slate-100">
                <ArrowLeft size={20}/>
            </button>
            <h1 className="text-2xl font-bold text-slate-800">Kümes Durumu: {coopId}</h1>
        </div>
        
        <div className="flex gap-2">
            <select value={coopId} onChange={(e) => setCoopId(e.target.value)} className="p-2 rounded border">
                <option value="T1">Kümes T1</option>
                <option value="T2">Kümes T2</option>
            </select>
            <button 
                onClick={handleSync} 
                disabled={syncing}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
                <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
                {syncing ? 'Çekiliyor...' : 'Veri Çek'}
            </button>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="p-4 rounded-xl border shadow-sm col-span-2 md:col-span-1 border-purple-200 bg-purple-50">
            <p className="text-sm text-purple-600 font-bold">Toplam Tüketim (24s)</p>
            <p className="text-3xl font-bold text-purple-900">{totalConsumption.toFixed(1)} <span className="text-sm">Litre</span></p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
            <p className="text-xs text-slate-500">Batarya 1</p>
            <p className="text-xl font-bold">{batteryTotals.b1.toFixed(1)} L</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
            <p className="text-xs text-slate-500">Batarya 2</p>
            <p className="text-xl font-bold">{batteryTotals.b2.toFixed(1)} L</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
            <p className="text-xs text-slate-500">Batarya 3</p>
            <p className="text-xl font-bold">{batteryTotals.b3.toFixed(1)} L</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
            <p className="text-xs text-slate-500">Batarya 4</p>
            <p className="text-xl font-bold">{batteryTotals.b4.toFixed(1)} L</p>
        </div>
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Çizgi Grafik: Anlık Akış */}
        <div className="bg-white p-5 rounded-xl border shadow-sm h-96">
            <h3 className="font-bold text-slate-700 mb-4">Anlık Akış Hızı (10dk Periyot)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="timeStr" fontSize={12} minTickGap={30}/>
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#8884d8" name="Toplam Akış" dot={false} strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </div>

        {/* Bar Grafik: Batarya Kıyaslama */}
        <div className="bg-white p-5 rounded-xl border shadow-sm h-96">
            <h3 className="font-bold text-slate-700 mb-4">Batarya Karşılaştırma (Toplam)</h3>
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[batteryTotals]}> {/* Tek bir veri seti var toplamlar için */}
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="b1" fill="#4ade80" name="Batarya 1" />
                    <Bar dataKey="b2" fill="#60a5fa" name="Batarya 2" />
                    <Bar dataKey="b3" fill="#f472b6" name="Batarya 3" />
                    <Bar dataKey="b4" fill="#fbbf24" name="Batarya 4" />
                </BarChart>
            </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}