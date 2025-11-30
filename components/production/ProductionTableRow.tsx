'use client';

import React from 'react';
import { format, isToday, isFuture } from 'date-fns';
import { tr } from 'date-fns/locale';
import { TableRowData } from './types';

interface ProductionTableRowProps {
  row: TableRowData;
  index: number;
  onCellChange: (index: number, field: keyof TableRowData, value: string) => void;
}

export function ProductionTableRow({ row, index, onCellChange }: ProductionTableRowProps) {
  const isFutureDate = isFuture(row.date);
  const isCurrentDay = isToday(row.date);
  
  // GÜNCELLEME: Çift haftaları renklendirmek için kontrol
  const isEvenWeek = row.ageInWeeks % 2 === 0;

  const rowId = `row-${format(row.date, 'yyyy-MM-dd')}`;

  const inputClass = (bgColor: string, ringColor: string, textColor: string) => 
    `w-full h-7 text-center outline-none bg-transparent focus:${bgColor} focus:ring-inset focus:ring-1 focus:${ringColor} ${textColor} disabled:opacity-30 font-medium placeholder-transparent text-xs`;

  // Satır Arka Plan Rengi Mantığı
  let rowBgClass = 'hover:bg-blue-50/50 transition-colors'; // Varsayılan hover
  if (isCurrentDay) {
    rowBgClass = 'bg-amber-50/60'; // Bugün ise amber
  } else if (isEvenWeek) {
    rowBgClass = 'bg-slate-50/60 hover:bg-blue-50/50'; // Çift hafta ise hafif gri
  } else {
    rowBgClass = 'bg-white hover:bg-blue-50/50'; // Tek hafta ise beyaz
  }

  return (
    <>
      {row.specialEvent && (
        <tr className="bg-slate-50">
          <td colSpan={10} className="p-1 border-b border-slate-200">
            <div className={`
              w-full text-center py-1 rounded-sm font-bold text-[10px] uppercase tracking-widest border
              ${row.specialEvent.color === 'blue' ? 'bg-blue-100 text-blue-700 border-blue-200' : ''}
              ${row.specialEvent.color === 'emerald' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}
            `}>
              ✨ {row.specialEvent.title}
            </div>
          </td>
        </tr>
      )}

      {isCurrentDay && (
        <tr>
            <td colSpan={10} className="p-0 border-t-2 border-red-500 relative h-0">
                <div className="absolute right-0 -top-2 bg-red-500 text-white text-[8px] px-1 py-0 rounded-l font-bold shadow-sm z-10">
                    BUGÜN
                </div>
            </td>
        </tr>
      )}

      <tr id={rowId} className={`group ${rowBgClass}`}>
        {/* Tarih */}
        <td className="p-1 border-r border-slate-100 sticky left-0 bg-inherit group-hover:bg-inherit font-medium text-slate-600 text-center z-10">
          <div className="flex items-center justify-between px-1">
            <span className={`text-[10px] ${isCurrentDay ? 'text-red-600 font-bold' : ''}`}>
              {format(row.date, 'dd MMM', { locale: tr })}
            </span>
            <span className="text-[9px] text-slate-300 font-normal">
              {format(row.date, 'EEE', { locale: tr })}
            </span>
          </div>
        </td>

        {/* HAFTA (Renklendirilmiş) */}
        <td className="p-1 border-r border-slate-100 text-center">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold
                ${isEvenWeek ? 'bg-indigo-50 text-indigo-400' : 'bg-slate-100 text-slate-400'}
            `}>
                {row.ageInWeeks}
            </span>
        </td>

        <td className="p-0 border-r border-slate-100">
          <input 
            type="number"
            disabled={isFutureDate}
            className={inputClass('bg-red-50', 'ring-red-200', 'text-red-600')}
            placeholder="-"
            value={row.mortality === 0 ? '' : row.mortality}
            onChange={(e) => onCellChange(index, 'mortality', e.target.value)}
          />
        </td>

        <td className="p-1 border-r border-slate-100 text-center text-slate-400 font-mono select-none text-[10px]">
          {row.currentBirds.toLocaleString()}
        </td>

        <td className="p-0 border-r border-slate-100">
          <input 
            type="number"
            disabled={isFutureDate}
            className={inputClass('bg-amber-50', 'ring-amber-200', 'text-slate-800 font-bold')}
            value={row.eggCount === 0 ? '' : row.eggCount}
            onChange={(e) => onCellChange(index, 'eggCount', e.target.value)}
          />
        </td>

        <td className="p-0 border-r border-slate-100">
          <input 
            type="number"
            disabled={isFutureDate}
            className={inputClass('bg-slate-100', 'ring-slate-300', 'text-slate-500')}
            value={row.brokenEggCount === 0 ? '' : row.brokenEggCount}
            onChange={(e) => onCellChange(index, 'brokenEggCount', e.target.value)}
          />
        </td>

        <td className="p-1 border-r border-slate-100 text-center text-[10px] text-slate-400 font-mono select-none">
          {row.brokenRate > 0 ? `%${row.brokenRate.toFixed(1)}` : '-'}
        </td>

        <td className="p-0 border-r border-slate-100">
          <input 
            type="number"
            disabled={isFutureDate}
            className={inputClass('bg-slate-100', 'ring-slate-300', 'text-slate-500')}
            value={row.dirtyEggCount === 0 ? '' : row.dirtyEggCount}
            onChange={(e) => onCellChange(index, 'dirtyEggCount', e.target.value)}
          />
        </td>

        <td className="p-1 border-r border-slate-100 text-center text-[10px] text-slate-400 font-mono select-none">
          {row.dirtyRate > 0 ? `%${row.dirtyRate.toFixed(1)}` : '-'}
        </td>

        <td className="p-1 text-center font-bold bg-emerald-50/10">
          {row.eggCount > 0 ? (
            <span className={`px-1.5 py-0.5 rounded text-[9px] ${
              row.yield > 90 ? 'bg-emerald-100 text-emerald-700' : 
              row.yield < 80 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
            }`}>
              %{row.yield.toFixed(1)}
            </span>
          ) : (
            <span className="text-slate-200 text-[10px]">-</span>
          )}
        </td>
      </tr>
    </>
  );
}