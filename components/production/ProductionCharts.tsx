//components/production/ProductionCharts.tsx

'use client';

import React from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area
} from 'recharts';
import { WeeklyData } from './types';
import { isAfter, startOfDay } from 'date-fns';

interface ProductionChartsProps {
  weeklyData: WeeklyData[];
}

export function ProductionCharts({ weeklyData }: ProductionChartsProps) {

  // Sadece bugüne kadar olan verileri filtrele ve grafiğe uygun formata getir
  const chartData = weeklyData
    .filter(w => !isAfter(w.startDate, startOfDay(new Date())))
    .map(w => {
      // ✅ Yield: Artık günlük yield ortalaması (aggregation'dan gelen)
      const yieldVal = w.avgYield;

      const brokenRate = w.totalEggs > 0 ? (w.totalBroken / w.totalEggs) * 100 : 0;
      const dirtyRate = w.totalEggs > 0 ? (w.totalDirty / w.totalEggs) * 100 : 0;

      return {
        name: `${w.weekNum}.H`,
        yield: Number(yieldVal.toFixed(2)),
        broken: Number(brokenRate.toFixed(2)),
        dirty: Number(dirtyRate.toFixed(2)),
        mortality: Math.min(w.totalMortality, 500),
        mortalityRaw: w.totalMortality,
        avgWeight: Number(w.avgWeight.toFixed(1)),
        };

    })
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));

  if (chartData.length === 0) {
    return <div className="p-12 text-center text-slate-400">Grafik için veri bekleniyor...</div>;
  }

  const commonMargin = { top: 10, right: 10, bottom: 0, left: -20 };
  const syncId = "productionStats";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12 p-4">

      {/* 1. VERİM GRAFİĞİ */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-64">
        <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Verim Analizi (%)
        </h3>
        <ResponsiveContainer width="100%" height="90%">
          <ComposedChart data={chartData} syncId={syncId} margin={commonMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
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
          <ComposedChart data={chartData} syncId={syncId} margin={commonMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 500]} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
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
            <ComposedChart data={chartData} syncId={syncId} margin={commonMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis
                domain={[0, 500]}
                tick={{ fontSize: 9 }}
                axisLine={false}
                tickLine={false}
            />
            <Tooltip
                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                formatter={(_, name, props) => {
                    // props.payload = ilgili noktanın tüm row'u
                    if (name === 'Ölü Sayısı') {
                    const raw = props?.payload?.mortalityRaw;
                    return [raw ?? 0, 'Ölü Sayısı'];
                    }
                    return [props?.value ?? 0, name];
                }}
                />

            <Bar
                dataKey="mortality"
                name="Ölü Sayısı"
                fill="#1e293b"
                radius={[4, 4, 0, 0]}
                barSize={20}
            />
            </ComposedChart>
        </ResponsiveContainer>
        </div>



      {/* 4. GRAMAJ GRAFİĞİ */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-64">
        <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Ort. Gramaj (gr)
        </h3>
        <ResponsiveContainer width="100%" height="90%">
          <ComposedChart data={chartData} syncId={syncId} margin={commonMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="avgWeight" name="Gramaj" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
