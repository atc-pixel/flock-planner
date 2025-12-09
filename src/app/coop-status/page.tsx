'use client';

import React, { useState, useEffect } from 'react';
import { INITIAL_COOPS } from '@/lib/utils';
import { RefreshCw, LayoutGrid, Droplets, Database, ArrowLeft, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, addDays, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar
} from 'recharts';

export default function CoopStatusPage() {
  const router = useRouter();
  const [selectedCoopId, setSelectedCoopId] = useState('T1');
  
  // Seçili gün (YYYY-MM-DD formatında)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // State'ler
  const [historyData, setHistoryData] = useState<any[]>([]); // Bar grafiği
  const [dayData, setDayData] = useState<any[]>([]); // Çizgi grafiği
  const [hourlyData, setHourlyData] = useState<any[]>([]); // Günlük saatlik dağılım (yeni)
  
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 1. GEÇMİŞ VERİLERİ ÇEK (Son 14 Gün - Bar Grafiği)
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/coop-status/api/get-readings?coopId=${selectedCoopId}&range=14d`);
      const json = await res.json();
      
      if (json.data) {
        // Günlük Gruplama (Yerel saate göre)
        const dailyMap = new Map<string, number>();
        
        // Son 14 günü hazırla
        for (let i = 13; i >= 0; i--) {
            const d = addDays(new Date(), -i);
            const key = format(d, 'yyyy-MM-dd');
            dailyMap.set(key, 0);
        }

        json.data.forEach((d: any) => {
            // Gelen UTC verisini Yerel Tarihe çevirip grupla
            const localDate = new Date(d.time);
            const dayKey = format(localDate, 'yyyy-MM-dd');
            
            if (dailyMap.has(dayKey)) {
                const current = dailyMap.get(dayKey) || 0;
                dailyMap.set(dayKey, current + (d.total || 0));
            }
        });

        const chartData = Array.from(dailyMap.entries()).map(([dateStr, total]) => ({
            date: dateStr,
            dateLabel: format(parseISO(dateStr), 'd MMM', { locale: tr }),
            total: Math.round(total)
        }));

        setHistoryData(chartData);
      }
    } catch (error) {
      console.error("Geçmiş veri hatası:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 2. GÜNLÜK DETAY (Seçili Gün - Çizgi Grafikleri)
  const fetchDayDetail = async () => {
    setLoadingDay(true);
    try {
      const res = await fetch(`/coop-status/api/get-readings?coopId=${selectedCoopId}&date=${selectedDate}`);
      const json = await res.json();
      
      if (json.data) {
        // Ham veriyi işle
        const processed = json.data.map((d: any) => ({
            ...d,
            // Grafik X ekseni için saat:dakika
            timeLabel: new Date(d.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            // Gruplama için saat (0-23)
            hour: new Date(d.time).getHours()
        }));
        setDayData(processed);

        // Saatlik Dağılımı Hesapla (00:00 - 23:00)
        const hoursMap = new Map();
        for(let i=0; i<24; i++) {
            hoursMap.set(i, { hourLabel: `${i.toString().padStart(2, '0')}:00`, total: 0 });
        }
        processed.forEach((d: any) => {
            const h = hoursMap.get(d.hour);
            if(h) h.total += (d.total || 0);
        });
        setHourlyData(Array.from(hoursMap.values()));
      }
    } catch (error) {
      console.error("Günlük detay hatası:", error);
    } finally {
      setLoadingDay(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [selectedCoopId]);
  useEffect(() => { fetchDayDetail(); }, [selectedCoopId, selectedDate]);

  // TARİH DEĞİŞTİRME (DÜZELTİLDİ)
  // Artık timezone shift sorunu yaşamadan string üzerinden güvenli işlem yapıyoruz.
  const changeDate = (days: number) => {
    const current = parseISO(selectedDate);
    const next = addDays(current, days);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  };

  const handleSync = async () => {
    if (window.location.hostname !== 'localhost' && !confirm("Localhost dışındasın, sync çalışmayabilir. Devam?")) return;
    setSyncing(true);
    try {
      await fetch(`/coop-status/api/sync-water?coopId=${selectedCoopId}`);
      await Promise.all([fetchHistory(), fetchDayDetail()]);
      alert("Veriler güncellendi.");
    } catch {
      alert("Hata oluştu.");
    } finally {
      setSyncing(false);
    }
  };

  // Seçili günün toplamı (144 interval toplamı)
  const dailyTotal = dayData.reduce((acc, curr) => acc + (curr.total || 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={() => router.push('/')} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <Droplets size={20} className="text-purple-600"/> Kümes Durumu
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
  <select 
    value={selectedCoopId} 
    onChange={(e) => setSelectedCoopId(e.target.value)} 
    className="bg-white border border-slate-300 text-sm rounded-lg p-2 font-bold focus:ring-2 focus:ring-purple-500"
  >
    {INITIAL_COOPS.map((coop) => <option key={coop.id} value={coop.id}>{coop.name}</option>)}
  </select>
  
  {/* YENİ: RAW DATA BUTONU */}
  <button 
    onClick={() => router.push('/coop-status/raw')}
    className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 p-2 rounded-lg shadow-sm transition-all"
    title="InfluxDB Ham Veri"
  >
    <Database size={20} />
  </button>

  <button onClick={handleSync} disabled={syncing} className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50">
    <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
  </button>
</div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select 
            value={selectedCoopId} 
            onChange={(e) => setSelectedCoopId(e.target.value)} 
            className="bg-white border border-slate-300 text-sm rounded-lg p-2 font-bold focus:ring-2 focus:ring-purple-500"
          >
            {INITIAL_COOPS.map((coop) => <option key={coop.id} value={coop.id}>{coop.name}</option>)}
          </select>
          <button onClick={handleSync} disabled={syncing} className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50">
            <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        
        {/* 1. SON 14 GÜNLÜK TOPLAM (BAR) */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="mb-6">
                <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                    Son 14 Günlük Su Tüketimi
                </h2>
                <p className="text-xs text-slate-500 ml-4">Günlük toplam tüketim miktarları (Litre)</p>
            </div>
            <div className="h-64 w-full">
                {loadingHistory ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">Yükleniyor...</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historyData} margin={{top: 10, right: 0, left: -20, bottom: 0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="dateLabel" fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                            <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} formatter={(value: any) => [`${value} L`, 'Toplam']} />
                            <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30} activeBar={{fill: '#2563eb'}} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </section>

        {/* 2. GÜNLÜK DETAYLAR */}
        <section>
            {/* Tarih Seçici ve Özet */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-4 gap-4">
                <div>
                    <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
                        Günlük Detay & Batarya Akışı
                    </h2>
                    <div className="flex items-center gap-2 mt-1 ml-4">
                        <span className="text-2xl font-black text-slate-800">{dailyTotal.toFixed(0)} L</span>
                        <span className="text-xs text-slate-500">(Seçili Gün Toplamı)</span>
                    </div>
                </div>

                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={18} /></button>
                    <div className="flex items-center gap-2 px-3 min-w-[140px] justify-center font-mono font-bold text-sm text-slate-700">
                        <Calendar size={14} className="text-slate-400" />
                        {format(parseISO(selectedDate), 'd MMMM yyyy', { locale: tr })}
                    </div>
                    <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={18} /></button>
                </div>
            </div>

            {/* 4'lü Grid - Batarya Grafikleri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((batteryNum) => (
                    <div key={batteryNum} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-64">
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-600
                                ${batteryNum===1?'text-green-700 bg-green-50': batteryNum===2?'text-blue-700 bg-blue-50': batteryNum===3?'text-pink-700 bg-pink-50':'text-amber-700 bg-amber-50'}
                            `}>
                                BATARYA {batteryNum}
                            </span>
                            {dayData.length > 0 && (
                                <span className="text-xs font-mono text-slate-400">
                                    Son Akış: <strong>{dayData[dayData.length-1][`b${batteryNum}`]?.toFixed(1)} L</strong>
                                </span>
                            )}
                        </div>

                        <div className="h-48 w-full">
                            {loadingDay ? (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400">Yükleniyor...</div>
                            ) : dayData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dayData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                        <XAxis dataKey="timeLabel" fontSize={10} minTickGap={30} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                        <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" width={30}/>
                                        <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                                        <Line 
                                            type="monotone" 
                                            dataKey={`b${batteryNum}`} 
                                            stroke={batteryNum===1?'#22c55e': batteryNum===2?'#3b82f6': batteryNum===3?'#f43f5e':'#eab308'} 
                                            strokeWidth={2} 
                                            dot={false} 
                                            name={`Batarya ${batteryNum}`}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 bg-slate-50/50 rounded-lg">
                                    Veri Yok
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>

      </main>
    </div>
  );
}