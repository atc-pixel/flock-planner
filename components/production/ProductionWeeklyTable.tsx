'use client';

import React, { useMemo, useLayoutEffect, useRef } from 'react'; // useLayoutEffect ve useRef eklendi
import { isSameDay } from 'date-fns'; // isSameDay eklendi
import { TableRowData } from './types';

interface ProductionWeeklyTableProps {
  rows: TableRowData[];
}

export function ProductionWeeklyTable({ rows }: ProductionWeeklyTableProps) {
  const hasScrolledRef = useRef(false); // Scroll kilidi
  
  // Bugünün hangi hafta olduğunu bul
  const currentWeek = useMemo(() => {
    const today = new Date();
    const todayRow = rows.find(r => isSameDay(r.date, today));
    return todayRow ? todayRow.ageInWeeks : -1;
  }, [rows]);

  const weeklyData = useMemo(() => {
    const groups = new Map<number, any>();

    rows.forEach(row => {
      const week = row.ageInWeeks;
      
      if (!groups.has(week)) {
        groups.set(week, {
          week: week,
          daysCount: 0,
          totalMortality: 0,
          totalEggs: 0,
          totalBroken: 0,
          totalDirty: 0,
          totalFeed: 0,
          sumAvgWeight: 0,
          weightDataCount: 0,
          sumDailyBirds: 0,
          startDate: row.date,
          endDate: row.date
        });
      }

      const g = groups.get(week);
      
      if (row.date < g.startDate) g.startDate = row.date;
      if (row.date > g.endDate) g.endDate = row.date;

      g.daysCount += 1;
      g.totalMortality += row.mortality;
      g.totalEggs += row.eggCount;
      g.totalBroken += row.brokenEggCount;
      g.totalDirty += row.dirtyEggCount;
      g.totalFeed += row.feedConsumed;
      g.sumDailyBirds += row.currentBirds;

      if (row.avgWeight > 0) {
        g.sumAvgWeight += row.avgWeight;
        g.weightDataCount += 1;
      }
    });

    // 1. Hafta en üstte olacak şekilde sıralama (a - b)
    return Array.from(groups.values()).map(g => {
        const avgWeight = g.weightDataCount > 0 ? (g.sumAvgWeight / g.weightDataCount) : 0;
        const yieldPerc = g.sumDailyBirds > 0 ? (g.totalEggs / g.sumDailyBirds) * 100 : 0;
        const brokenRate = g.totalEggs > 0 ? (g.totalBroken / g.totalEggs) * 100 : 0;
        const dirtyRate = g.totalEggs > 0 ? (g.totalDirty / g.totalEggs) * 100 : 0;

        return {
            ...g,
            avgWeight,
            yieldPerc,
            brokenRate,
            dirtyRate
        };
    }).sort((a, b) => a.week - b.week); 

  }, [rows]);

  // YENİ: Işınlanma Mantığı (LayoutEffect)
  useLayoutEffect(() => {
    if (currentWeek > 0 && !hasScrolledRef.current) {
        const elementId = `week-row-${currentWeek}`;
        const element = document.getElementById(elementId);
        
        if (element) {
            // behavior: 'auto' -> Animasyonsuz, direkt atlama
            // block: 'start' -> Sayfanın en tepesine hizala (Geçmiş yukarıda kalır)
            element.scrollIntoView({ behavior: 'auto', block: 'start' });
            hasScrolledRef.current = true;
        }
    }
  }, [currentWeek, weeklyData]);

  return (
    <div className="p-4 bg-slate-50 h-full overflow-y-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-10">
        <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 shadow-sm">
                <tr>
                    <th className="p-3 text-center w-16 border-b border-slate-200">Hafta</th>
                    <th className="p-3 text-left border-b border-slate-200">Tarih Aralığı</th>
                    <th className="p-3 text-center text-red-600 border-b border-slate-200">Top. Ölü</th>
                    <th className="p-3 text-center text-amber-700 border-b border-slate-200">Top. Yumurta</th>
                    <th className="p-3 text-center text-indigo-600 border-b border-slate-200">Ort. Gr.</th>
                    <th className="p-3 text-center border-b border-slate-200">Top. Yem</th>
                    <th className="p-3 text-center border-b border-slate-200">% Kırık</th>
                    <th className="p-3 text-center border-b border-slate-200">% Kirli</th>
                    <th className="p-3 text-center bg-emerald-50 text-emerald-800 border-b border-slate-200">% Verim</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {weeklyData.map((w) => {
                    const isCurrent = w.week === currentWeek;
                    return (
                        <tr 
                            key={w.week} 
                            id={`week-row-${w.week}`} // ID ataması önemli
                            className={`transition-colors group ${isCurrent ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                        >
                            <td className="p-3 text-center font-black text-slate-700 bg-slate-50/50 group-hover:bg-slate-100 relative">
                                {w.week}
                                {isCurrent && <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></span>}
                            </td>
                            <td className="p-3 text-slate-500 font-medium font-mono text-[11px]">
                                {w.startDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - {w.endDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                            </td>
                            <td className="p-3 text-center font-bold text-red-600 bg-red-50/10">{w.totalMortality}</td>
                            <td className="p-3 text-center font-bold text-amber-700 bg-amber-50/10">{w.totalEggs.toLocaleString()}</td>
                            <td className="p-3 text-center font-bold text-indigo-600">
                                {w.avgWeight > 0 ? w.avgWeight.toFixed(1) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="p-3 text-center font-mono text-slate-600">{w.totalFeed > 0 ? w.totalFeed.toLocaleString() : '-'}</td>
                            <td className="p-3 text-center text-slate-500">{w.brokenRate > 0 ? `%${w.brokenRate.toFixed(1)}` : '-'}</td>
                            <td className="p-3 text-center text-slate-500">{w.dirtyRate > 0 ? `%${w.dirtyRate.toFixed(1)}` : '-'}</td>
                            <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/20">
                                {w.totalEggs > 0 ? `%${w.yieldPerc.toFixed(1)}` : <span className="text-slate-300">-</span>}
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
      </div>
    </div>
  );
}