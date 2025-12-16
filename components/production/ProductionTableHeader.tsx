'use client';

import React from 'react';

export function ProductionTableHeader() {
  return (
    <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider sticky top-0 z-20 shadow-sm text-[10px]">
      <tr>
        <th className="p-1 border-b border-r border-slate-200 sticky left-0 top-0 bg-slate-100 z-30 w-28 text-center shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
          Tarih
        </th>
        <th className="p-1 border-b border-r border-slate-200 text-center w-10 text-slate-500">Hafta</th>
        <th className="p-1 border-b border-r border-slate-200 text-center w-14 bg-red-50/80 text-red-700">Ölü</th>
        <th className="p-1 border-b border-r border-slate-200 text-center w-16">Mevcut</th>
        
        {/* Yumurta Grubu */}
        <th className="p-1 border-b border-r border-slate-200 text-center w-14 bg-emerald-50/80 text-emerald-700">Sağlam</th>
        <th className="p-1 border-b border-r border-slate-200 text-center w-14 bg-slate-100 text-slate-600">Kırık</th>
        <th className="p-1 border-b border-r border-slate-200 text-center w-14 bg-slate-100 text-slate-600">Kirli</th>
        <th className="p-1 border-b border-r border-slate-200 text-center w-14 bg-amber-50/80 text-amber-800">Toplam</th>
        
        <th className="p-1 border-b border-r border-slate-200 text-center w-12 text-indigo-600">Ort.Gr</th>
        <th className="p-1 border-b border-r border-slate-200 text-center w-16 font-black text-slate-800 bg-emerald-50/50">% Verim</th>

        {/* YENİ: Notlar Başlığı */}
        <th className="p-1 border-b text-left pl-2 w-64 text-slate-400">Notlar</th>
      </tr>
    </thead>
  );
}