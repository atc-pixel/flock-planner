'use client';

import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { TableRowData } from './types';
import { startOfWeek, endOfWeek, format, isWithinInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface ProductionWeeklyTableProps {
  rows: TableRowData[];
}

type WeeklyData = {
    [weekKey: string]: number; 
}

export function ProductionWeeklyTable({ rows }: ProductionWeeklyTableProps) {
  const [weeklyFeed, setWeeklyFeed] = useState<WeeklyData>({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<boolean>(false);

  // Haftalık gruplama (Kronolojik: Eski -> Yeni)
  const weeks = React.useMemo(() => {
    if (rows.length === 0) return [];
    
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
                notes: new Set(),
                days: 0,
                startBirds: row.currentBirds + row.mortality
            };
        }
        
        currentWeek.totalMortality += row.mortality;
        currentWeek.totalEggs += row.eggCount;
        if(row.notes) currentWeek.notes.add(row.notes);
        currentWeek.days++;
    });
    if (currentWeek) groups.push(currentWeek);

    return groups; 
  }, [rows]);

  // Firebase Yem Verisi
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "weekly_stats"), (snap) => {
        const feeds: WeeklyData = {};
        snap.forEach(d => {
            feeds[d.id] = d.data().feedConsumed;
        });
        setWeeklyFeed(feeds);
        setLoading(false);
    });
    return () => unsub();
  }, []);

  // IŞINLANMA: Sayfa açıldığında güncel haftaya git
  useLayoutEffect(() => {
    if (!loading && weeks.length > 0 && !scrollRef.current) {
        const today = new Date();
        const currentWeek = weeks.find(w => 
            isWithinInterval(today, { start: w.startDate, end: w.endDate })
        );

        const targetKey = currentWeek ? currentWeek.key : weeks[weeks.length - 1].key;
        const el = document.getElementById(`week-${targetKey}`);
        
        if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'center' });
            scrollRef.current = true;
        }
    }
  }, [loading, weeks]);

  const handleFeedChange = async (weekKey: string, value: string) => {
    const flockId = "demo_flock"; 
    const docId = `${flockId}_${weekKey}`;
    const val = Number(value);
    
    setWeeklyFeed(prev => ({ ...prev, [docId]: val }));

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
            <thead className="bg-slate-50 text-slate-500 font-bold border-b sticky top-0 z-10">
                <tr>
                    <th className="p-2 w-10">Hafta</th>
                    <th className="p-2">Tarih Aralığı</th>
                    <th className="p-2 text-center">Ölü</th>
                    <th className="p-2 text-center">Yumurta</th>
                    <th className="p-2 text-center">% Verim</th>
                    <th className="p-2 text-center bg-amber-50 text-amber-800 border-x border-amber-100 w-24">
                        Yem (Kg)
                    </th>
                    <th className="p-2 w-32">Notlar</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {weeks.map((week) => {
                    const flockId = "demo_flock"; 
                    const docId = `${flockId}_${week.key}`;
                    const feed = weeklyFeed[docId] || 0;
                    
                    const avgBirds = week.startBirds - (week.totalMortality / 2);
                    const henDayYield = avgBirds > 0 ? (week.totalEggs / (avgBirds * 7)) * 100 : 0;
                    const weekNotes = Array.from(week.notes).join(", ");
                    
                    const isCurrentWeek = isWithinInterval(new Date(), { start: week.startDate, end: week.endDate });

                    return (
                        <tr 
                            key={week.key} 
                            id={`week-${week.key}`}
                            className={`hover:bg-slate-50 transition-colors ${isCurrentWeek ? 'bg-blue-50/50' : ''}`}
                        >
                            <td className="p-2 font-bold text-indigo-600 text-center">#{week.weekNum}</td>
                            <td className="p-2 text-slate-500 text-[10px]">
                                {format(week.startDate, 'dd MMM')} - {format(week.endDate, 'dd MMM', {locale: tr})}
                            </td>
                            <td className="p-2 text-center font-bold text-red-600">{week.totalMortality}</td>
                            <td className="p-2 text-center font-bold text-slate-700">{week.totalEggs.toLocaleString()}</td>
                            <td className="p-2 text-center font-bold text-emerald-600">%{henDayYield.toFixed(1)}</td>
                            
                            <td className="p-1 text-center bg-amber-50/50 border-x border-amber-100">
                                <input 
                                    type="number" 
                                    className="w-full text-center bg-transparent font-bold text-amber-800 outline-none focus:bg-white focus:ring-1 focus:ring-amber-300 rounded h-6"
                                    placeholder="-"
                                    value={feed || ''}
                                    onChange={(e) => handleFeedChange(week.key, e.target.value)}
                                />
                            </td>

                            <td className="p-2 text-[10px] text-slate-400 italic truncate max-w-[120px]" title={weekNotes}>
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