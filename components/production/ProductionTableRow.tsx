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

  // Ortak input stili
  const inputClass = (bgColor: string, ringColor: string, textColor: string) => 
    `w-full h-9 text-center outline-none bg-transparent focus:${bgColor} focus:ring-inset focus:ring-2 focus:${ringColor} ${textColor} disabled:opacity-30 font-medium placeholder-transparent`;

  return (
    <tr className={`group transition-colors ${isCurrentDay ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
      
      {/* Tarih */}
      <td className="p-2 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50 font-medium text-slate-600 text-center">
        <div className="flex flex-col">
          <span className={isCurrentDay ? 'text-amber-600 font-bold' : ''}>
            {format(row.date, 'dd MMM', { locale: tr })}
          </span>
          <span className="text-[9px] text-slate-300 font-normal">
            {format(row.date, 'EEE', { locale: tr })}
          </span>
        </div>
      </td>

      {/* Ölü */}
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

      {/* Mevcut (Salt Okunur) */}
      <td className="p-2 border-r border-slate-100 text-center text-slate-400 font-mono select-none text-[10px]">
        {row.currentBirds.toLocaleString()}
      </td>

      {/* Yumurta */}
      <td className="p-0 border-r border-slate-100">
        <input 
          type="number"
          disabled={isFutureDate}
          className={inputClass('bg-amber-50', 'ring-amber-200', 'text-slate-800 font-bold')}
          value={row.eggCount === 0 ? '' : row.eggCount}
          onChange={(e) => onCellChange(index, 'eggCount', e.target.value)}
        />
      </td>

      {/* Kırık */}
      <td className="p-0 border-r border-slate-100">
        <input 
          type="number"
          disabled={isFutureDate}
          className={inputClass('bg-slate-100', 'ring-slate-300', 'text-slate-500 text-[10px]')}
          value={row.brokenEggCount === 0 ? '' : row.brokenEggCount}
          onChange={(e) => onCellChange(index, 'brokenEggCount', e.target.value)}
        />
      </td>

      {/* Kirli */}
      <td className="p-0 border-r border-slate-100">
        <input 
          type="number"
          disabled={isFutureDate}
          className={inputClass('bg-slate-100', 'ring-slate-300', 'text-slate-500 text-[10px]')}
          value={row.dirtyEggCount === 0 ? '' : row.dirtyEggCount}
          onChange={(e) => onCellChange(index, 'dirtyEggCount', e.target.value)}
        />
      </td>

      {/* Yem */}
      <td className="p-0 border-r border-slate-100">
        <input 
          type="number"
          disabled={isFutureDate}
          className={inputClass('bg-blue-50', 'ring-blue-200', 'text-blue-800')}
          value={row.feedConsumed === 0 ? '' : row.feedConsumed}
          onChange={(e) => onCellChange(index, 'feedConsumed', e.target.value)}
        />
      </td>

      {/* Su */}
      <td className="p-0 border-r border-slate-100">
        <input 
          type="number"
          disabled={isFutureDate}
          className={inputClass('bg-blue-50', 'ring-blue-200', 'text-blue-800')}
          value={row.waterConsumed === 0 ? '' : row.waterConsumed}
          onChange={(e) => onCellChange(index, 'waterConsumed', e.target.value)}
        />
      </td>

      {/* Verim % */}
      <td className="p-2 text-center font-bold">
        {row.eggCount > 0 ? (
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
            row.yield > 90 ? 'bg-emerald-100 text-emerald-700' : 
            row.yield < 80 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
          }`}>
            %{row.yield.toFixed(1)}
          </span>
        ) : (
          <span className="text-slate-200">-</span>
        )}
      </td>
    </tr>
  );
}