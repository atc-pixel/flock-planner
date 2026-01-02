'use client';

import React from 'react';
import { format, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { INITIAL_COOPS } from '@/lib/utils';
import { FeedTableRowData } from './types';

interface FeedTableRowProps {
  index: number;
  row: FeedTableRowData;
  onCellChange: (dateKey: string, coopId: string, field: 'producedFeed' | 'currentFeed', value: string) => void;
  coops: typeof INITIAL_COOPS;
}

export function FeedTableRow({ index, row, onCellChange, coops }: FeedTableRowProps) {
  const rowId = `row-${format(row.date, 'yyyy-MM-dd')}`;
  const isCurrentDay = isToday(row.date);
  const isEven = index % 2 === 0;
  const dateKey = format(row.date, 'yyyy-MM-dd');

  return (
    <React.Fragment>
      {/* Bugün çizgisi */}
      {isCurrentDay && (
        <tr>
          <td colSpan={1 + coops.length * 3} className="p-0 border-t border-red-300 relative h-0 z-20 shadow-[0_1px_3px_rgba(252,165,165,0.4)]">
            <div className="absolute right-0 -top-2 bg-red-400 text-white text-[8px] px-1.5 py-0 rounded-l font-bold shadow-sm opacity-90">
              BUGÜN
            </div>
          </td>
        </tr>
      )}
      <tr id={rowId} className={`group transition-colors border-b border-slate-100 ${isCurrentDay ? 'bg-amber-50/60' : isEven ? 'bg-slate-50 hover:bg-slate-100' : 'bg-white hover:bg-slate-50'}`}>
        {/* Tarih */}
        <td className={`p-0 border-r border-slate-100 sticky left-0 z-10 w-14 ${isCurrentDay ? 'bg-amber-50' : isEven ? 'bg-slate-50' : 'bg-white'}`} style={{ width: '64px' }}>
          <div className="flex flex-col items-center justify-center h-full py-0.5">
            <span className={`font-bold text-[9px] leading-tight ${isCurrentDay ? 'text-red-500' : 'text-slate-700'}`}>
              {format(row.date, 'd MMM', { locale: tr })}
            </span>
            <span className="text-[8px] text-slate-400 uppercase leading-tight">
              {format(row.date, 'EEEE', { locale: tr })}
            </span>
          </div>
        </td>
        {/* Kümes sütunları */}
        {coops.map((coop, coopIndex) => {
          const data = row.coopData[coop.id] || {
            logId: undefined,
            flockId: null,
            producedFeed: 0,
            currentFeed: null,
            avgConsumption: null,
            isDirty: false,
          };
          const isLastCoop = coopIndex === coops.length - 1;
          const isChick = coop.type === 'chick';
          const colWidth = isChick ? 'w-12' : 'w-14';
          const cellWidthPx = isChick ? '56px' : '64px';
          const inputFontSize = isChick ? 'text-[9px]' : 'text-[10px]';
          const avgFontSize = isChick ? 'text-[8px]' : 'text-[9px]';
          return (
            <React.Fragment key={coop.id}>
              {/* Yapılan yem */}
              <td className={`p-0 border-r border-slate-200 ${colWidth} bg-blue-50/30`} style={{ width: cellWidthPx }}>
                <input
                  type="number"
                  className={`w-full h-7 text-center bg-transparent focus:bg-white outline-none focus:ring-1 focus:ring-inset rounded font-bold ${inputFontSize} appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]`}
                  value={data.producedFeed === 0 ? '' : data.producedFeed}
                  onChange={(e) => onCellChange(dateKey, coop.id, 'producedFeed', e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </td>
              {/* Mevcut yem */}
              <td className={`p-0 border-r border-slate-200 ${colWidth} bg-amber-50/30`} style={{ width: cellWidthPx }}>
                <input
                  type="number"
                  className={`w-full h-7 text-center bg-transparent focus:bg-white outline-none focus:ring-1 focus:ring-inset rounded font-bold ${inputFontSize} appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]`}
                  value={data.currentFeed === null ? '' : data.currentFeed}
                  onChange={(e) => onCellChange(dateKey, coop.id, 'currentFeed', e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </td>
              {/* Ortalama tüketim */}
              <td className={`p-0 ${isLastCoop ? 'border-r-0' : 'border-r-2 border-slate-400'} ${colWidth} bg-emerald-50/30`} style={{ width: cellWidthPx }}>
                <div className="flex items-center justify-center h-7">
                  <span className={`${avgFontSize} font-bold text-emerald-700`}>
                    {data.avgConsumption !== null ? data.avgConsumption.toFixed(3) : '-'}
                  </span>
                </div>
              </td>
            </React.Fragment>
          );
        })}
      </tr>
    </React.Fragment>
  );
}

