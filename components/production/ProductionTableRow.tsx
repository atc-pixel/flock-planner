'use client';

import React from 'react';
import { format, isToday, isFuture } from 'date-fns';
import { tr } from 'date-fns/locale';
import { TableRowData } from './types';

interface ProductionTableRowProps {
  row: TableRowData;
  index: number;
  isFirstRow?: boolean;
  onCellChange: (index: number, field: keyof TableRowData, value: string) => void;
  onInitialCountChange?: (value: string) => void;
}

export function ProductionTableRow({ row, index, isFirstRow, onCellChange, onInitialCountChange }: ProductionTableRowProps) {
  const isFutureDate = isFuture(row.date);
  const isCurrentDay = isToday(row.date);
  
  const isEvenWeek = row.ageInWeeks % 2 === 0;
  const rowId = `row-${format(row.date, 'yyyy-MM-dd')}`;

  // Değişiklik: h-5 -> h-4 ve text-sm -> text-xs
  const inputClass = (bgColor: string, ringColor: string, textColor: string) => 
    `w-full h-4 text-center outline-none bg-transparent focus:${bgColor} focus:ring-inset focus:ring-1 focus:${ringColor} ${textColor} disabled:opacity-30 font-bold placeholder-transparent text-xs leading-none`;

  let rowBgClass = 'bg-white hover:bg-blue-50/30';
  if (isCurrentDay) {
    rowBgClass = 'bg-amber-50/60';
  } else if (isEvenWeek) {
    rowBgClass = 'bg-slate-50/80 hover:bg-blue-50/30';
  }

  return (
    <>
      {row.specialEvent && (
        <tr className="bg-slate-50">
          <td colSpan={11} className="p-0 border-b border-slate-200">
            <div className={`
              w-full text-center py-0.5 rounded-sm font-bold text-[9px] uppercase tracking-widest border-y
              ${row.specialEvent.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-100' : ''}
              ${row.specialEvent.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : ''}
            `}>
              ✨ {row.specialEvent.title}
            </div>
          </td>
        </tr>
      )}

      {isCurrentDay && (
        <tr>
            <td colSpan={11} className="p-0 border-t-2 border-red-500 relative h-0 z-20">
                <div className="absolute right-0 -top-2 bg-red-500 text-white text-[8px] px-1 py-0 rounded-l font-bold shadow-sm">
                    BUGÜN
                </div>
            </td>
        </tr>
      )}

      <tr 
        id={rowId} 
        className={`group transition-colors ${rowBgClass}`}
      >
        {/* Tarih - h-4 ve text-[10px] yapıldı */}
        <td className={`p-0 border-r border-slate-200 sticky left-0 font-medium text-slate-700 text-center z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] ${isCurrentDay ? 'bg-amber-50/90' : 'bg-white group-hover:bg-inherit'}`}>
          <div className="flex items-center justify-start gap-1 px-1 h-4 whitespace-nowrap overflow-hidden">
            <span className={`text-[10px] ${isCurrentDay ? 'text-red-600 font-bold' : ''}`}>
              {format(row.date, 'dd MMM', { locale: tr })}
            </span>
            <span className="text-[9px] text-slate-400 font-semibold uppercase">
              {format(row.date, 'EEE', { locale: tr })}
            </span>
          </div>
        </td>

        {/* HAFTA */}
        <td className="p-0 border-r border-slate-200 text-center">
            <div className={`h-4 flex items-center justify-center font-mono font-black text-[10px]
                ${isEvenWeek ? 'text-indigo-400' : 'text-slate-300'}
            `}>
                {row.ageInWeeks}
            </div>
        </td>

        {/* Ölü */}
        <td className="p-0 border-r border-slate-200">
          <input 
            type="number"
            disabled={isFutureDate}
            className={inputClass('bg-red-50', 'ring-red-300', 'text-red-600')}
            placeholder="-"
            value={row.mortality === 0 ? '' : row.mortality}
            onChange={(e) => onCellChange(index, 'mortality', e.target.value)}
          />
        </td>

        {/* MEVCUT */}
        <td className="p-0 border-r border-slate-200">
          {isFirstRow && onInitialCountChange ? (
             <input 
               type="number"
               className={`${inputClass('bg-indigo-50', 'ring-indigo-300', 'text-indigo-700')} underline decoration-dashed decoration-indigo-300`}
               value={row.currentBirds}
               onChange={(e) => onInitialCountChange(e.target.value)}
               title="Başlangıç mevcudunu buradan değiştirebilirsiniz"
             />
          ) : (
             <div className="h-4 flex items-center justify-center font-mono select-none text-[10px] font-bold text-slate-600">
               {row.currentBirds.toLocaleString()}
             </div>
          )}
        </td>

        {/* Toplam Yumurta */}
        <td className="p-0 border-r border-slate-200">
          <input 
            type="number"
            disabled={isFutureDate}
            className={inputClass('bg-amber-50', 'ring-amber-300', 'text-amber-900')}
            value={row.eggCount === 0 ? '' : row.eggCount}
            onChange={(e) => onCellChange(index, 'eggCount', e.target.value)}
          />
        </td>

        {/* ORTALAMA GRAMAJ (Yeni Eklenen) */}
        <td className="p-0 border-r border-slate-200">
          <input 
            type="number"
            step="0.1"
            disabled={isFutureDate}
            className={inputClass('bg-indigo-50', 'ring-indigo-300', 'text-indigo-700')}
            placeholder="-"
            value={row.avgWeight === 0 ? '' : row.avgWeight}
            onChange={(e) => onCellChange(index, 'avgWeight', e.target.value)}
          />
        </td>

        {/* Kırık */}
        <td className="p-0 border-r border-slate-200">
          <input 
            type="number"
            disabled={isFutureDate}
            className={inputClass('bg-slate-100', 'ring-slate-300', 'text-slate-600')}
            value={row.brokenEggCount === 0 ? '' : row.brokenEggCount}
            onChange={(e) => onCellChange(index, 'brokenEggCount', e.target.value)}
          />
        </td>

        {/* % Kırık */}
        <td className="p-0 border-r border-slate-200 text-center text-[10px] font-bold text-slate-500 font-mono select-none flex items-center justify-center h-4">
          {row.brokenRate > 0 ? `%${row.brokenRate.toFixed(1)}` : '-'}
        </td>

        {/* Kirli */}
        <td className="p-0 border-r border-slate-200">
          <input 
            type="number"
            disabled={isFutureDate}
            className={inputClass('bg-slate-100', 'ring-slate-300', 'text-slate-600')}
            value={row.dirtyEggCount === 0 ? '' : row.dirtyEggCount}
            onChange={(e) => onCellChange(index, 'dirtyEggCount', e.target.value)}
          />
        </td>

        {/* % Kirli */}
        <td className="p-0 border-r border-slate-200 text-center text-[10px] font-bold text-slate-500 font-mono select-none flex items-center justify-center h-4">
          {row.dirtyRate > 0 ? `%${row.dirtyRate.toFixed(1)}` : '-'}
        </td>

        {/* % Verim */}
        <td className="p-0 text-center font-black bg-emerald-50/20 border-b border-slate-100 flex items-center justify-center h-4">
          {row.eggCount > 0 ? (
            <span className={`text-[10px] ${
              row.yield > 90 ? 'text-emerald-700' : 
              row.yield < 80 ? 'text-red-600' : 'text-amber-700'
            }`}>
              %{row.yield.toFixed(1)}
            </span>
          ) : (
            <span className="text-slate-300 text-[10px]">-</span>
          )}
        </td>
      </tr>
    </>
  );
}