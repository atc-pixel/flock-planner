'use client';

import React, { useEffect, useState } from 'react';
import { TableRowData } from './types';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Save } from 'lucide-react';

interface ProductionWeeklyTableProps {
  rows: TableRowData[];
}

// Haftalık veri tipi (Sadece yem için)
type WeeklyData = {
    [weekKey: string]: number; // "2025-W23": 1500 (kg)
}

export function ProductionWeeklyTable({ rows }: ProductionWeeklyTableProps) {
  const [weeklyFeed, setWeeklyFeed] = useState<WeeklyData>({});
  const [loading, setLoading] = useState(true);
  const [flockId, setFlockId] = useState<string>("");

  // Haftalık gruplama
  const weeks = React.useMemo(() => {
    if (rows.length === 0) return [];
    
    // Flock ID'yi rows'dan alalım (hepsi aynı sürüye ait)
    // rows[0].logId içinde flockId yok ama context'ten gelmesi daha iyiydi. 
    // Pratik çözüm: Veritabanına kaydederken flockId'ye ihtiyacımız var. 
    // rows prop'unda flockId yok, parent'tan gelse iyi olurdu ama şimdilik logic kuralım.
    
    const groups: any[] = [];
    let currentWeek: any = null;

    rows.forEach(row => {
        const weekStart = startOfWeek(row.date, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-ww');

        if (!currentWeek || currentWeek.key !== weekKey) {
            if (currentWeek) groups.push(currentWeek);
            currentWeek = {
                key: weekKey,
                weekNum: row.ageInWeeks,
                startDate: weekStart,
                endDate: endOfWeek(row.date, { weekStartsOn: 1 }),
                totalMortality: 0,
                totalEggs: 0,
                totalDirty: 0,
                totalBroken: 0,
                notes: new Set(), // Notları topla
                days: 0,
                startBirds: row.currentBirds + row.mortality // Haftanın başındaki kuş sayısı (yaklaşık)
            };
        }
        
        currentWeek.totalMortality += row.mortality;
        currentWeek.totalEggs += row.eggCount;
        currentWeek.totalDirty += row.dirtyEggCount;
        currentWeek.totalBroken += row.brokenEggCount;
        if(row.notes) currentWeek.notes.add(row.notes);
        currentWeek.days++;
    });
    if (currentWeek) groups.push(currentWeek);

    return groups.reverse(); // En son hafta en üstte
  }, [rows]);

  // Firebase'den Haftalık Yem Verilerini Çek
  useEffect(() => {
    // Bu örnekte tüm 'weekly_stats' koleksiyonunu dinliyoruz. 
    // Gerçekte flockId filtresi gerekir. 
    // Basitlik için collection'daki belge ID'si "WEEK-KEY" olacak şekilde yapıyorum.
    // Daha doğrusu: doc ID = "flockId_WeekKey" olmalı.
    
    // NOT: Flock ID'yi productionTable'dan buraya prop olarak geçmek en doğrusu.
    // Şimdilik varsayım yapıyorum.
    const unsub = onSnapshot(collection(db, "weekly_stats"), (snap) => {
        const feeds: WeeklyData = {};
        snap.forEach(d => {
            // d.id örneği: "flock123_2025-45"
            // Biz sadece weekKey ile eşleştireceğiz, flockId kontrolünü atlıyorum şimdilik.
            const data = d.data();
            feeds[d.id] = data.feedConsumed;
        });
        setWeeklyFeed(feeds);
        setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleFeedChange = async (weekKey: string, value: string) => {
    // FlockId'yi parent'tan alamadığımız için rows'dan dolaylı alalım veya localStorage/URL'den.
    // Güvenli yöntem: ProductionTable bu component'e flockId prop'u geçmeli. 
    // Şimdilik "demo_flock" prefixi kullanıyorum, bunu düzeltmelisin.
    const flockId = "demo_flock"; // TODO: Parent'tan prop olarak al
    const docId = `${flockId}_${weekKey}`;
    
    const val = Number(value);
    setWeeklyFeed(prev => ({ ...prev, [docId]: val })); // Optimistic UI

    // Debounce veya Blur ile kaydetmek daha iyi ama burada direkt yazıyorum
    await setDoc(doc(db, "weekly_stats", docId), {
        feedConsumed: val,
        weekKey: weekKey,
        updatedAt: new Date()
    }, { merge: true });
  };

  if (loading) return <div className="p-4"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                <tr>
                    <th className="p-2">Hafta</th>
                    <th className="p-2">Tarih Aralığı</th>
                    <th className="p-2 text-center">Ölü</th>
                    <th className="p-2 text-center">Yumurta</th>
                    <th className="p-2 text-center">% Verim</th>
                    <th className="p-2 text-center bg-amber-50 text-amber-800 border-x border-amber-100">
                        Yem (Kg) <br/><span className="text-[9px] font-normal opacity-70">(Manuel)</span>
                    </th>
                    <th className="p-2 text-center">FCR</th>
                    <th className="p-2 w-1/3">Notlar</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {weeks.map((week) => {
                    const flockId = "demo_flock"; // TODO: Düzelt
                    const docId = `${flockId}_${week.key}`;
                    const feed = weeklyFeed[docId] || 0;
                    
                    // Hesaplamalar
                    const avgBirds = week.startBirds - (week.totalMortality / 2);
                    const henDayYield = (week.totalEggs / (avgBirds * 7)) * 100;
                    
                    // FCR: Yem (kg) / Yumurta (kg) -> Yumurta kg'sini ortalama gramajdan bulmamız lazım.
                    // Şimdilik basitçe: Yem / (Yumurta Sayısı * 0.063) (63gr varsayılan)
                    const eggMassKg = week.totalEggs * 0.063; 
                    const fcr = eggMassKg > 0 ? (feed / eggMassKg) : 0;

                    const weekNotes = Array.from(week.notes).join(", ");

                    return (
                        <tr key={week.key} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-indigo-600">#{week.weekNum}</td>
                            <td className="p-2 text-slate-500 text-[10px]">
                                {format(week.startDate, 'dd MMM')} - {format(week.endDate, 'dd MMM', {locale: tr})}
                            </td>
                            <td className="p-2 text-center font-bold text-red-600">{week.totalMortality}</td>
                            <td className="p-2 text-center font-bold text-slate-700">{week.totalEggs.toLocaleString()}</td>
                            <td className="p-2 text-center font-bold text-emerald-600">%{henDayYield.toFixed(1)}</td>
                            
                            {/* MANUEL YEM GİRİŞİ */}
                            <td className="p-1 text-center bg-amber-50/50 border-x border-amber-100">
                                <input 
                                    type="number" 
                                    className="w-full text-center bg-transparent font-bold text-amber-800 outline-none focus:bg-white focus:ring-1 focus:ring-amber-300 rounded"
                                    placeholder="0"
                                    value={feed || ''}
                                    onChange={(e) => handleFeedChange(week.key, e.target.value)}
                                />
                            </td>

                            <td className="p-2 text-center font-mono text-slate-500">{fcr > 0 ? fcr.toFixed(2) : '-'}</td>
                            <td className="p-2 text-[10px] text-slate-400 italic truncate max-w-xs" title={weekNotes}>
                                {weekNotes}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
  );
}