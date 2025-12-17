'use client';

import React from 'react';

export function ProductionTableHeader() {
  return (
    <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider sticky top-0 z-20 shadow-sm text-[10px]">
      <tr>
        {/* 1. Tarih (Sabit) */}
        <th className="p-1 border-b border-r border-slate-200 sticky left-0 top-0 bg-slate-100 z-30 w-20 text-center shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
          Tarih
        </th>
        
        {/* 2. Hafta */}
        <th className="p-1 border-b border-r border-slate-200 text-center w-8 text-slate-500">Hafta</th>
        
        {/* 3. Mevcut */}
        <th className="p-1 border-b border-r border-slate-200 text-center w-14">Mevcut</th>

        {/* 4. Ölü */}
        <th className="p-1 border-b border-r border-slate-200 text-center w-12 bg-red-50/80 text-red-700">Ölü</th>
        
        {/* 5. Verim */}
        <th className="p-1 border-b border-r border-slate-200 text-center w-14 font-black text-slate-800 bg-emerald-50/50">% Verim</th>

        {/* 6. Sağlam */}
        <th className="p-1 border-b border-r border-slate-200 text-center w-14 bg-emerald-50/80 text-emerald-700">Sağlam</th>
        
        {/* 7. Kırık */}
        <th className="p-1 border-b border-r border-slate-200 text-center w-12 bg-slate-100 text-slate-600">Kırık</th>
        
        {/* 8. Kırık % (YENİ) */}
        <th className="p-1 border-b border-r border-slate-200 text-center w-12 bg-slate-50 text-slate-500">Kırık%</th>

        {/* 9. Kirli */}
        <th className="p-1 border-b border-r border-slate-200 text-center w-12 bg-slate-100 text-slate-600">Kirli</th>

        {/* 10. Kirli % (YENİ) */}
        <th className="p-1 border-b border-r border-slate-200 text-center w-12 bg-slate-50 text-slate-500">Kirli%</th>

        {/* 11. Toplam */}
        <th className="p-1 border-b border-r border-slate-200 text-center w-14 bg-amber-50/80 text-amber-800">Toplam</th>
        
        {/* 12. Gramaj */}
        <th className="p-1 border-b border-r border-slate-200 text-center w-12 text-indigo-600">Ort.Gr</th>

        {/* 13. Notlar (Küçültüldü) */}
        <th className="p-1 border-b text-left pl-2 w-24 text-slate-400">Notlar</th>
      </tr>
    </thead>
  );
}