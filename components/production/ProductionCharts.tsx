'use client';

import React, { useMemo } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { TableRowData } from './types';
import { startOfWeek, format } from 'date-fns';

interface ProductionChartsProps {
  data: TableRowData[];
}

export function ProductionCharts({ data }: ProductionChartsProps) {
  
  // Günlük veriyi HAFTALIK olarak özetle
  const weeklyData = useMemo(() => {
    const groups: any = {};
    
    data.forEach(row => {
        const weekKey = row.ageInWeeks;
        if (!groups[weekKey]) {
            groups[weekKey] = {
                week: weekKey,
                totalEggs: 0,
                totalBroken: 0,
                totalDirty: 0,
                birdDays: 0, // Hen-Day hesabı için (Kuş * Gün)
            };
        }
        groups[weekKey].totalEggs += row.eggCount;
        groups[weekKey].totalBroken += row.brokenEggCount;
        groups[weekKey].totalDirty += row.dirtyEggCount;
        groups[weekKey].birdDays += row.currentBirds;
    });

    return Object.values(groups).map((g: any) => {
        const yieldVal = g.birdDays > 0 ? (g.totalEggs / g.birdDays) * 100 : 0;
        const brokenRate = g.totalEggs > 0 ? (g.totalBroken / g.totalEggs) * 100 : 0;
        const dirtyRate = g.totalEggs > 0 ? (g.totalDirty / g.totalEggs) * 100 : 0;

        return {
            name: `Hafta ${g.week}`,
            yield: Number(yieldVal.toFixed(1)),
            broken: Number(brokenRate.toFixed(2)),
            dirty: Number(dirtyRate.toFixed(2)),
        };
    }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); // Sayısal sırala
  }, [data]);

  if (weeklyData.length === 0) {
    return <div className="p-12 text-center text-slate-400">Grafik için veri bekleniyor...</div>;
  }

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm h-[500px]">
        <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center justify-between">
            <span>Haftalık Verim & Kalite Analizi</span>
            <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Verim (%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Kırık (%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Kirli (%)</span>
            </div>
        </h3>

        <ResponsiveContainer width="100%" height="90%">
            <ComposedChart data={weeklyData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                
                <XAxis 
                    dataKey="name" 
                    tick={{fontSize: 10, fill: '#64748b'}} 
                    axisLine={false} 
                    tickLine={false}
                />
                
                {/* SOL EKSEN: VERİM (%) */}
                <YAxis 
                    yAxisId="left"
                    domain={[0, 100]} 
                    tick={{fontSize: 10, fill: '#10b981'}} 
                    axisLine={false} 
                    tickLine={false} 
                    unit="%"
                    label={{ value: 'Verim %', angle: -90, position: 'insideLeft', fill: '#10b981', fontSize: 10 }}
                />

                {/* SAĞ EKSEN: KALİTE (%) - Genelde %0-5 arası olur, o yüzden domain farklı */}
                <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 'auto']} 
                    tick={{fontSize: 10, fill: '#ef4444'}} 
                    axisLine={false} 
                    tickLine={false}
                    unit="%"
                    label={{ value: 'Hata Oranı %', angle: 90, position: 'insideRight', fill: '#ef4444', fontSize: 10 }}
                />

                <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    labelStyle={{color: '#64748b', fontWeight: 'bold', marginBottom: '5px'}}
                />
                
                {/* Çizgiler */}
                <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="yield" 
                    name="Toplam Verim" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{r: 3, fill: '#10b981', strokeWidth: 0}}
                    activeDot={{r: 6}}
                />

                <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="broken" 
                    name="Kırık Oranı" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    dot={false}
                />

                <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="dirty" 
                    name="Kirli Oranı" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    dot={false}
                />

            </ComposedChart>
        </ResponsiveContainer>
    </div>
  );
}