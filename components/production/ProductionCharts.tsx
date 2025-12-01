'use client';

import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart 
} from 'recharts';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { TableRowData } from './types';
import { getBreedStandard } from '../../lib/standards';

interface ProductionChartsProps {
  data: TableRowData[];
}

export function ProductionCharts({ data }: ProductionChartsProps) {
  
  // Veriyi Grafiğe Hazırla
  // Sadece geçmiş ve bugünün verilerini gösterelim (Gelecek boş verileri filtrele)
  const chartData = data
    .filter(row => row.eggCount > 0 || row.mortality > 0) // Sadece verisi olan günler
    .map(row => ({
      date: format(row.date, 'dd MMM'),
      week: row.ageInWeeks,
      actualYield: Number(row.yield.toFixed(1)),
      standardYield: Number(getBreedStandard(row.ageInWeeks).toFixed(1)),
      brokenRate: Number(row.brokenRate.toFixed(1)),
      dirtyRate: Number(row.dirtyRate.toFixed(1)),
    }));

  if (chartData.length === 0) {
    return (
        <div className="flex items-center justify-center h-64 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            Henüz grafik oluşturacak kadar veri girilmemiş.
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 bg-slate-50/50 rounded-xl border border-slate-200">
      
      {/* 1. VERİM GRAFİĞİ */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Verim Analizi (% Üretim)
        </h3>
        <div className="h-64 text-xs">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="date" 
                        tick={{fontSize: 10, fill: '#64748b'}} 
                        axisLine={false} 
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    <YAxis 
                        domain={[0, 100]} 
                        tick={{fontSize: 10, fill: '#64748b'}} 
                        axisLine={false} 
                        tickLine={false} 
                        unit="%"
                    />
                    <Tooltip 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        labelStyle={{color: '#64748b', fontSize: '12px', fontWeight: 'bold'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '10px'}}/>
                    
                    {/* Standart Hedef (Çizgi) */}
                    <Line 
                        type="monotone" 
                        dataKey="standardYield" 
                        name="Irk Standardı" 
                        stroke="#94a3b8" 
                        strokeWidth={2} 
                        strokeDasharray="5 5" 
                        dot={false} 
                    />
                    
                    {/* Gerçek Verim (Alan) */}
                    <Area 
                        type="monotone" 
                        dataKey="actualYield" 
                        name="Gerçekleşen" 
                        stroke="#10b981" 
                        fill="url(#colorYield)" 
                        strokeWidth={2} 
                    />
                    
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

      {/* 2. KALİTE GRAFİĞİ */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Kalite Analizi (% Kırık & Kirli)
        </h3>
        <div className="h-64 text-xs">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="date" 
                        tick={{fontSize: 10, fill: '#64748b'}} 
                        axisLine={false} 
                        tickLine={false}
                        minTickGap={30}
                    />
                    <YAxis 
                        tick={{fontSize: 10, fill: '#64748b'}} 
                        axisLine={false} 
                        tickLine={false} 
                        unit="%"
                    />
                    <Tooltip 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '10px'}}/>
                    
                    <Line 
                        type="monotone" 
                        dataKey="brokenRate" 
                        name="% Kırık" 
                        stroke="#ef4444" 
                        strokeWidth={2} 
                        dot={false}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="dirtyRate" 
                        name="% Kirli" 
                        stroke="#f59e0b" 
                        strokeWidth={2} 
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}