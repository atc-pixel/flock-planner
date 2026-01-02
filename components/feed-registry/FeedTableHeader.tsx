'use client';

import React from 'react';
import { INITIAL_COOPS, Flock } from '@/lib/utils';

interface FeedTableHeaderProps {
  activeFlocksByCoop: Record<string, Flock | null>;
  coops: typeof INITIAL_COOPS;
}

export function FeedTableHeader({ activeFlocksByCoop, coops }: FeedTableHeaderProps) {
  return (
    <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider sticky top-0 z-20 shadow-sm text-[10px]">
      <tr>
        <th className="p-0.5 border-b border-r border-slate-200 sticky left-0 top-0 bg-slate-100 z-30 w-14 text-center shadow-[1px_0_0_0_rgba(0,0,0,0.05)]" style={{ width: '64px' }}>
          Tarih
        </th>
        {coops.map((coop, coopIndex) => {
          const isLastCoop = coopIndex === coops.length - 1;
          const activeFlock = activeFlocksByCoop[coop.id];
          const isChick = coop.type === 'chick';
          const colWidth = isChick ? 'w-12' : 'w-14';
          const colWidthPx = isChick ? '168px' : '192px'; // 3 sütun * 56px veya 64px
          return (
            <th key={coop.id} colSpan={3} className={`p-1 border-b ${isLastCoop ? 'border-r-0' : 'border-r-2 border-slate-400'} text-center bg-slate-200 font-black ${isChick ? 'text-[9px]' : 'text-[10px]'}`} style={{ width: colWidthPx }}>
              <div className="flex flex-col items-center gap-0">
                <span className="leading-tight">{coop.name}</span>
                {activeFlock && (
                  <span className={`font-normal text-slate-600 leading-tight ${isChick ? 'text-[7px]' : 'text-[8px]'}`}>
                    {activeFlock.name}
                  </span>
                )}
              </div>
            </th>
          );
        })}
      </tr>
      <tr>
        <th className="p-0.5 border-b border-r border-slate-200 sticky left-0 top-0 bg-slate-100 z-30 w-14 text-center shadow-[1px_0_0_0_rgba(0,0,0,0.05)]" style={{ width: '64px' }}></th>
        {coops.map((coop, coopIndex) => {
          const isLastCoop = coopIndex === coops.length - 1;
          const isChick = coop.type === 'chick';
          const colWidth = isChick ? 'w-12' : 'w-14';
          const cellWidthPx = isChick ? '56px' : '64px';
          const fontSize = isChick ? 'text-[8px]' : 'text-[9px]';
          return (
            <React.Fragment key={coop.id}>
              <th className={`p-0.5 border-b border-r border-slate-200 text-center ${colWidth} bg-blue-50 font-semibold ${fontSize}`} style={{ width: cellWidthPx }}>Yapılan</th>
              <th className={`p-0.5 border-b border-r border-slate-200 text-center ${colWidth} bg-amber-50 font-semibold ${fontSize}`} style={{ width: cellWidthPx }}>Mevcut</th>
              <th className={`p-0.5 border-b ${isLastCoop ? 'border-r-0' : 'border-r-2 border-slate-400'} text-center ${colWidth} bg-emerald-50 font-semibold ${fontSize}`} style={{ width: cellWidthPx }}>Ortalama</th>
            </React.Fragment>
          );
        })}
      </tr>
    </thead>
  );
}

