'use client';

import React, { useState, useEffect } from 'react';
import { INITIAL_COOPS } from '@/lib/utils';
import { RefreshCw, LayoutGrid, Droplets, Database, LogOut, ChevronLeft, ChevronRight, Calendar, Home, Egg } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, addDays, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar
} from 'recharts';

export default function CoopStatusPage() {
  const router = useRouter();
  const [selectedCoopId, setSelectedCoopId] = useState('T1');
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [historyData, setHistoryData] = useState<any[]>([]); 
  const [dayData, setDayData] = useState<any[]>([]); 
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/coop-status/api/get-readings?coopId=${selectedCoopId}&range=14d`);
      const json = await res.json();
      
      if (json.data) {
        const dailyMap = new Map<string, number>();
        for (let i = 13; i >= 0; i--) {
            const d = addDays(new Date(), -i);
            const key = format(d, 'yyyy-MM-dd');
            dailyMap.set(key, 0);
        }
        json.data.forEach((d: any) => {
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
    } catch (error) { console.error(error); } finally { setLoadingHistory(false); }
  };

  const fetchDayDetail = async () => {
    setLoadingDay(true);
    try {
      const res = await fetch(`/coop-status/api/get-readings?coopId=${selectedCoopId}&date=${selectedDate}`);
      const json = await res.json();
      if (json.data) {
        const processed = json.data.map((d: any) => ({
            ...d,
            timeLabel: new Date(d.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        }));
        setDayData(processed);
      }
    } catch (error) { console.error(error); } finally { setLoadingDay(false); }
  };

  useEffect(() => { fetchHistory(); }, [selectedCoopId]);
  useEffect(() => { fetchDayDetail(); }, [selectedCoopId, selectedDate]);

  const changeDate = (days: number) => {
    const current = parseISO(selectedDate);
    const next = addDays(current, days);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  };

  const handleSync = async () => {
    if (window.location.hostname !== 'localhost' && !confirm("Sync işlemi başlatılsın mı?")) return;
    setSyncing(true);
    try {
      await fetch(`/coop-status/api/sync-water?coopId=${selectedCoopId}`);
      await Promise.all([fetchHistory(), fetchDayDetail()]);
      alert("Veriler güncellendi.");
    } catch { alert("Hata oluştu."); } finally { setSyncing(false); }
  };

  const dailyTotal = dayData.reduce((acc, curr) => acc + (curr.total || 0), 0);

  // YENİ: Batarya sayısı belirleme (T2 için 5, diğerleri 4)
  const batteryCount = selectedCoopId === 'T2' ? 5 : 4;
  const batteries = Array.from({ length: batteryCount }, (_, i) => i + 1);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* HEADER */}
      <header className="flex justify-between items-center p-3 bg-white border-b border-slate-200 shadow-sm z-50 shrink-0 h-16">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => router.push('/')}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                title="Modüllere Dön"
            >
                <LayoutGrid size={20} />
            </button>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <Droplets className="w-6 h-6 text-purple-600" />
                <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Kümes Durumu</h1>
            </div>
        </div>

        <div className="flex items-center gap-3">
            <button 
                onClick={() => router.push(`/coop-status/raw?coopId=${selectedCoopId}`)}
                className="flex items-center gap-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-md text-xs font-bold transition-all border border-slate-200"
                title="Ham Veri"
            >
                <Database size={16} />
                <span className="hidden sm:inline">Ham Veri</span>
            </button>

            <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all px-3 py-2 rounded-md text-sm font-bold"
                title="Güvenli Çıkış"
            >
                <LogOut size={18} />
            </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* KÜMES SEÇİM GRID */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {INITIAL_COOPS.map(coop => {
                const isActive = selectedCoopId === coop.id;
                const isChick = coop.type === 'chick';
                
                return (
                    <button
                        key={coop.id}
                        onClick={() => setSelectedCoopId(coop.id)}
                        className={`
                            relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all h-20 shadow-sm
                            ${isActive 
                                ? (isChick ? 'bg-amber-50 border-amber-500 text-amber-800' : 'bg-purple-50 border-purple-500 text-purple-800') 
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}
                        `}
                    >
                        {isChick ? <Egg size={20} className={isActive ? 'text-amber-600' : 'text-slate-400'} /> 
                                 : <Home size={20} className={isActive ? 'text-purple-600' : 'text-slate-400'} />}
                        <span className="font-bold text-xs mt-1">{coop.name}</span>
                        {isActive && (
                            <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${isChick ? 'bg-amber-500' : 'bg-purple-500'}`}></span>
                        )}
                    </button>
                )
            })}
        </div>

        {/* SENKRONİZASYON & TARİH SEÇİMİ */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <button 
                    onClick={handleSync} 
                    disabled={syncing}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 text-sm w-full md:w-auto justify-center"
                >
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Veriler Çekiliyor...' : 'IoT Verisini Güncelle'}
                </button>
                <div className="text-xs text-slate-400 hidden md:block">
                    Son güncelleme: Az önce
                </div>
            </div>

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-inner w-full md:w-auto justify-between">
                <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-lg text-slate-500 shadow-sm transition-all"><ChevronLeft size={18} /></button>
                <div className="flex items-center gap-2 px-4 font-mono font-bold text-sm text-slate-700">
                    <Calendar size={16} className="text-purple-500" />
                    {format(parseISO(selectedDate), 'd MMMM yyyy', { locale: tr })}
                </div>
                <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-lg text-slate-500 shadow-sm transition-all"><ChevronRight size={18} /></button>
            </div>
        </div>

        {/* GRAFİKLER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SOL: 14 GÜNLÜK ÖZET */}
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Son 14 Gün (Litre)
                </h3>
                <div className="flex-1 min-h-[200px]">
                    {loadingHistory ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400">Yükleniyor...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="dateLabel" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} interval={2} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}} />
                                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* SAĞ: GÜNLÜK DETAY & TOPLAM */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Günlük Toplam Kartı */}
                <div className="bg-linear-to-r from-purple-600 to-blue-600 p-6 rounded-2xl text-white shadow-lg flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-purple-100 text-sm font-medium mb-1">Günlük Toplam Tüketim</div>
                        <div className="text-4xl font-black tracking-tight">{dailyTotal.toFixed(0)} <span className="text-xl font-medium opacity-80">Litre</span></div>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm relative z-10">
                        <Droplets size={32} className="text-white" />
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                </div>

                {/* YENİ: Dinamik Batarya Grafikleri Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {batteries.map((batteryNum) => (
                        <div key={batteryNum} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider
                                    ${batteryNum===1?'text-green-700 bg-green-50 border border-green-100': 
                                      batteryNum===2?'text-blue-700 bg-blue-50 border border-blue-100': 
                                      batteryNum===3?'text-pink-700 bg-pink-50 border border-pink-100':
                                      batteryNum===4?'text-amber-700 bg-amber-50 border border-amber-100':
                                      'text-indigo-700 bg-indigo-50 border border-indigo-100'} 
                                `}>
                                    Batarya {batteryNum}
                                </span>
                                {dayData.length > 0 && (
                                    <span className="text-[10px] font-mono text-slate-400">
                                        Son: <strong>{dayData[dayData.length-1][`b${batteryNum}`]?.toFixed(1)} L</strong>
                                    </span>
                                )}
                            </div>

                            <div className="h-32 w-full">
                                {loadingDay ? (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-400">...</div>
                                ) : dayData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={dayData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc"/>
                                            <XAxis dataKey="timeLabel" hide />
                                            <Tooltip 
                                                contentStyle={{borderRadius: '8px', border:'none', fontSize:'12px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}
                                                itemStyle={{color: '#6366f1'}} // Default color
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey={`b${batteryNum}`} 
                                                stroke={
                                                    batteryNum===1?'#22c55e': 
                                                    batteryNum===2?'#3b82f6': 
                                                    batteryNum===3?'#f43f5e':
                                                    batteryNum===4?'#eab308':
                                                    '#6366f1' // Batarya 5 için Indigo
                                                } 
                                                strokeWidth={2} 
                                                dot={false} 
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-400 bg-slate-50/50 rounded-lg">Veri Yok</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}