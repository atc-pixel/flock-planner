// src/app/coop-status/page.tsx
'use client';

import React, { useState } from 'react';
import { INITIAL_COOPS } from '@/lib/utils'; // Kümes listesini buradan alıyoruz
import { CoopWaterOverviewChart } from "@/components/coop-status/CoopWaterOverviewChart";
import { CoopWaterInstantChart } from "@/components/coop-status/CoopWaterInstantChart";
import { CoopWaterInstantTable } from "@/components/coop-status/CoopWaterInstantTable";
import { RefreshCw, LayoutGrid, Droplets, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CoopStatusPage() {
  const router = useRouter();
  
  // Varsayılan olarak T1 seçili
  const [selectedCoopId, setSelectedCoopId] = useState('T1');
  const [syncing, setSyncing] = useState(false);

  // Sync Butonu Fonksiyonu
  const handleSync = async () => {
    setSyncing(true);
    try {
      // API'yi seçili kümes ile çağır
      const res = await fetch(`/coop-status/api/sync-water?coopId=${selectedCoopId}`);
      const data = await res.json();
      
      if (res.ok) {
         alert(`Başarılı! ${data.importedCount} yeni kayıt eklendi.\nZaman aralığı: ${data.from} -> ${data.to}`);
         // Sayfayı yenile ki grafikler güncellensin
         window.location.reload();
      } else {
         alert(`Hata oluştu: ${data.message || 'Bilinmeyen hata'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Bağlantı hatası. InfluxDB erişilebilir olmayabilir.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/')}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Ana Menüye Dön"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
              <Droplets size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Kümes Durumu</h1>
              <p className="text-xs text-slate-500 font-medium">Su Tüketim Analizi</p>
            </div>
          </div>
        </div>

        {/* KONTROLLER */}
        <div className="flex items-center gap-3">
          
          {/* Kümes Seçimi */}
          <div className="relative">
            <select
              value={selectedCoopId}
              onChange={(e) => setSelectedCoopId(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-40 p-2.5 font-bold cursor-pointer"
            >
              {INITIAL_COOPS.map((coop) => (
                <option key={coop.id} value={coop.id}>
                  {coop.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
              <LayoutGrid size={14} />
            </div>
          </div>

          {/* Sync Butonu */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all shadow-md active:scale-95
              ${syncing ? 'bg-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}
            `}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{syncing ? 'Yenileniyor...' : 'Verileri Çek'}</span>
          </button>

        </div>
      </header>

      {/* İÇERİK */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Özet Kartı */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Günlük Toplam Tüketim
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Seçili kümes ({selectedCoopId}) için son 7 günün batarya bazlı özeti.
              </p>
            </div>
          </div>
          <div className="h-80 w-full">
            <CoopWaterOverviewChart coopId={selectedCoopId} days={7} />
          </div>
        </section>

        {/* Detay Kartı */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grafik */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Anlık Akış Hızı (Son 24 Saat)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Her 10 dakikada bir ölçülen tüketim (Litre/10dk).
              </p>
            </div>
            <div className="h-80 w-full">
              <CoopWaterInstantChart coopId={selectedCoopId} hours={24} />
            </div>
          </div>

          {/* Tablo */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
            <div className="mb-2">
              <h2 className="text-base font-bold text-slate-800">Detaylı Liste</h2>
              <p className="text-xs text-slate-500">Son kayıtlar</p>
            </div>
            <div className="flex-1 overflow-hidden min-h-[300px]">
              <CoopWaterInstantTable coopId={selectedCoopId} hours={24} />
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}