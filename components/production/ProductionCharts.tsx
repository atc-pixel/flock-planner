'use client';

import React from 'react';
import { 
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { format } from 'date-fns';
import { TableRowData } from './types';
import { getBreedStandard } from '../../lib/standards';

interface ProductionChartsProps {
  data: TableRowData[];
}

export function ProductionCharts({ data }: ProductionChartsProps) {
  
  const chartData = data
    .filter(row => row.eggCount > 0 || row.mortality > 0 || row.notes) // Not varsa da göster
    .map(row => ({
      date: format(row.date, 'dd MMM'),
      fullDate: format(row.date, 'dd MMMM yyyy'),
      week: row.ageInWeeks,
      actualYield: Number(row.yield.toFixed(1)),
      standardYield: Number(getBreedStandard(row.ageInWeeks).toFixed(1)),
      brokenRate: Number(row.brokenRate.toFixed(1)),
      dirtyRate: Number(row.dirtyRate.toFixed(1)),
      note: row.notes // Notu veriye ekle
    }));

  // Notu olan günleri bul
  const noteLines = chartData.filter(d => d.note && d.note.length > 0);

  // Custom Tooltip: Not varsa en altta göster
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentData = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs">
          <p className="font-bold text-slate-700 mb-2 border-b pb-1">{currentData.fullDate}</p>
          {payload.map((p: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1" style={{ color: p.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
              <span>{p.name}: <strong>{p.value}{p.unit}</strong></span>
            </div>
          ))}
          
          {/* NOT GÖSTERİMİ */}
          {currentData.note && (
             <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-slate-600 bg-yellow-50 p-2 rounded -mx-1">
                <span className="font-bold text-amber-600 block text-[10px] uppercase">📝 Günlük Not</span>
                {currentData.note}
             </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 bg-slate-50/50 rounded-xl border border-slate-200">
      
      {/* 1. VERİM GRAFİĞİ */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Verim Analizi (% Üretim)
        </h3>
        <div className="h-64 text-xs">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{fontSize: 10}} axisLine={false} tickLine={false} minTickGap={30} />
                    <YAxis domain={[0, 100]} tick={{fontSize: 10}} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '10px'}}/>
                    
                    <Line type="monotone" dataKey="standardYield" name="Standart" stroke="#94a3b8" strokeDasharray="5 5" dot={false} strokeWidth={2}/>
                    <Area type="monotone" dataKey="actualYield" name="Gerçekleşen" stroke="#10b981" fill="url(#colorYield)" strokeWidth={2} />
                    
                    {/* NOT ÇİZGİLERİ */}
                    {noteLines.map((entry, i) => (
                        <ReferenceLine 
                            key={i} 
                            x={entry.date} 
                            stroke="#fbbf24" 
                            strokeDasharray="3 3"
                            label={{ position: 'top', value: '!', fill: '#d97706', fontSize: 14, fontWeight: 'bold' }} 
                        />
                    ))}

                    <defs>
                        <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                </ComposedChart>
            </ResponsiveContainer>
        </div>
      </div>
      
      {/* Kalite Grafiği için de aynısını yapabilirsin (ReferenceLine ekleyerek) */}
    </div>
  );
}