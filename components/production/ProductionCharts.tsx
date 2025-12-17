'use client';

import React, { useMemo } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area 
} from 'recharts';
import { TableRowData } from './types';
import { isAfter, startOfDay } from 'date-fns';

interface ProductionChartsProps {
  data: TableRowData[];
}

export function ProductionCharts({ data }: ProductionChartsProps) {
  
  const weeklyData = useMemo(() => {
    const groups: any = {};
    const today = startOfDay(new Date());

    // 1. Veriyi Filtrele: Sadece bugüne kadar olan verileri al
    const validData = data.filter(d => !isAfter(d.date, today));
    
    validData.forEach(row => {
        const weekKey = row.ageInWeeks;
        if (!groups[weekKey]) {
            groups[weekKey] = {
                week: weekKey,
                name: `${weekKey}.H`,
                totalEggs: 0,
                totalBroken: 0,
                totalDirty: 0,
                birdDays: 0,
                mortality: 0,
                weightSum: 0,
                weightCount: 0,
            };
        }
        groups[weekKey].totalEggs += row.eggCount;
        groups[weekKey].totalBroken += row.brokenEggCount;
        groups[weekKey].totalDirty += row.dirtyEggCount;
        groups[weekKey].mortality += row.mortality;
        groups[weekKey].birdDays += row.currentBirds;
        
        if (row.avgWeight > 0) {
            groups[weekKey].weightSum += row.avgWeight;
            groups[weekKey].weightCount += 1;
        }
    });

    return Object.values(groups).map((g: any) => {
        const yieldVal = g.birdDays > 0 ? (g.totalEggs / g.birdDays) * 100 : 0;
        const brokenRate = g.totalEggs > 0 ? (g.totalBroken / g.totalEggs) * 100 : 0;
        const dirtyRate = g.totalEggs > 0 ? (g.totalDirty / g.totalEggs) * 100 : 0;
        const avgWeight = g.weightCount > 0 ? g.weightSum / g.weightCount : 0;

        return {
            name: g.name,
            yield: Number(yieldVal.toFixed(2)),
            broken: Number(brokenRate.toFixed(2)),
            dirty: Number(dirtyRate.toFixed(2)),
            mortality: g.mortality,
            avgWeight: Number(avgWeight.toFixed(1)),
        };
    }).sort((a: any, b: any) => parseInt(a.name) - parseInt(b.name));
  }, [data]);

  if (weeklyData.length === 0) {
    return <div className="p-12 text-center text-slate-400">Grafik için veri bekleniyor...</div>;
  }

  // Ortak Grafik Ayarları
  const commonMargin = { top: 10, right: 10, bottom: 0, left: -20 };
  const syncId = "productionStats"; // Tüm grafikleri birbirine bağlar

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
        
        {/* 1. VERİM GRAFİĞİ */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-64">
            <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Verim Analizi (%)
            </h3>
            <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={weeklyData} syncId={syncId} margin={commonMargin}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px'}} />
                    <Area type="monotone" dataKey="yield" name="Verim %" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>

        {/* 2. KALİTE (KIRIK/KİRLİ) GRAFİĞİ */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-64">
             <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Kırık & Kirli (%)
            </h3>
            <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={weeklyData} syncId={syncId} margin={commonMargin}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px'}} />
                    <Line type="monotone" dataKey="broken" name="Kırık %" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="dirty" name="Kirli %" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>

        {/* 3. ÖLÜM GRAFİĞİ */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-64">
             <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-800"></span> Haftalık Ölüm
            </h3>
            <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={weeklyData} syncId={syncId} margin={commonMargin}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px'}} />
                    <Bar dataKey="mortality" name="Ölü Sayısı" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={20} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>

        {/* 4. GRAMAJ GRAFİĞİ */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-64">
             <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Ort. Gramaj (gr)
            </h3>
            <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={weeklyData} syncId={syncId} margin={commonMargin}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px'}} />
                    <Line type="monotone" dataKey="avgWeight" name="Gramaj" stroke="#6366f1" strokeWidth={2} dot={{r:3}} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>

    </div>
  );
}