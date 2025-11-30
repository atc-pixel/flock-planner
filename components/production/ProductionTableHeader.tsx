'use client';

import React from 'react';

export function ProductionTableHeader() {
  return (
    <thead className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
      <tr>
        <th className="p-2 border-b border-r border-slate-200 sticky left-0 bg-slate-100 z-20 w-24 text-center">Tarih</th>
        
        {/* YENİ HAFTA SÜTUNU */}
        <th className="p-2 border-b border-r border-slate-200 text-center w-12 text-slate-400">Hafta</th>

        <th className="p-2 border-b border-r border-slate-200 text-center w-16 bg-red-50/50 text-red-700">Ölü</th>
        <th className="p-2 border-b border-r border-slate-200 text-center w-20">Mevcut</th>
        <th className="p-2 border-b border-r border-slate-200 text-center w-20 bg-amber-50/50 text-amber-700">Top. Yumurta</th>
        <th className="p-2 border-b border-r border-slate-200 text-center w-14">Kırık</th>
        <th className="p-2 border-b border-r border-slate-200 text-center w-14 text-slate-400 font-normal lowercase italic">% kırık</th>
        <th className="p-2 border-b border-r border-slate-200 text-center w-14">Kirli</th>
        <th className="p-2 border-b border-r border-slate-200 text-center w-14 text-slate-400 font-normal lowercase italic">% kirli</th>
        <th className="p-2 border-b text-center w-16 font-black text-slate-700 bg-emerald-50/30">% Verim</th>
      </tr>
    </thead>
  );
}