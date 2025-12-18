'use client';

import React, { useState, useEffect } from 'react';
import { TableRowData } from './types';
import { format, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MessageSquare } from 'lucide-react';

interface ProductionTableRowProps {
  index: number;
  row: TableRowData;
  isFirstRow: boolean;
  onCellChange: (index: number, field: keyof TableRowData, value: string) => void;
  // YENİ: onInitialCountChange buradan kaldırıldı
}

export function ProductionTableRow({ 
    index, 
    row, 
    isFirstRow, 
    onCellChange,
}: ProductionTableRowProps) {

  const [localData, setLocalData] = useState({
      mortality: row.mortality,
      goodCount: row.goodCount,
      brokenEggCount: row.brokenEggCount,
      dirtyEggCount: row.dirtyEggCount,
      avgWeight: row.avgWeight,
      notes: row.notes || ""
  });

  useEffect(() => {
    setLocalData({
        mortality: row.mortality,
        goodCount: row.goodCount,
        brokenEggCount: row.brokenEggCount,
        dirtyEggCount: row.dirtyEggCount,
        avgWeight: row.avgWeight,
        notes: row.notes || ""
    });
  }, [row]);

  const handleBlur = (field: keyof TableRowData, val: string | number) => {
    // @ts-ignore
    if (val != row[field]) { 
        onCellChange(index, field, val.toString());
    }
  };

  const handleChange = (field: keyof typeof localData, val: string) => {
    setLocalData(prev => ({ ...prev, [field]: val }));
  };

  const rowId = `row-${format(row.date, 'yyyy-MM-dd')}`;
  const isCurrentDay = isToday(row.date);
  const isEvenWeek = row.ageInWeeks % 2 === 0;

  // Satır renkleri
  let rowClass = "";
  let stickyDateClass = "";

  if (isCurrentDay) {
      rowClass = "bg-amber-50/60";
      stickyDateClass = "bg-amber-50"; 
  } else if (row.specialEvent) {
      if (row.specialEvent.color === 'blue') {
        rowClass = "bg-blue-100/30";
        stickyDateClass = "bg-blue-50";
      } else {
        rowClass = "bg-emerald-100/30";
        stickyDateClass = "bg-emerald-50";
      }
  } else {
      if (isEvenWeek) {
        rowClass = "bg-slate-50 hover:bg-slate-100";
        stickyDateClass = "bg-slate-50 group-hover:bg-slate-100";
      } else {
        rowClass = "bg-white hover:bg-slate-50";
        stickyDateClass = "bg-white group-hover:bg-slate-50";
      }
  }

  const inputClass = "w-full h-8 text-center bg-transparent focus:bg-white outline-none focus:ring-2 focus:ring-inset rounded font-bold text-xs";

  const totalEggs = row.eggCount;
  const brokenRate = totalEggs > 0 ? (row.brokenEggCount / totalEggs) * 100 : 0;
  const dirtyRate = totalEggs > 0 ? (row.dirtyEggCount / totalEggs) * 100 : 0;

  return (
    <>
      {/* 1. ÖZEL ETKİNLİK SATIRI */}
      {row.specialEvent && (
        <tr className="bg-slate-50">
          <td colSpan={13} className="p-0 border-b border-slate-200">
            <div className={`w-full text-center py-0.5 rounded-sm font-bold text-[9px] uppercase tracking-widest border-y ${row.specialEvent.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
              ✨ {row.specialEvent.title}
            </div>
          </td>
        </tr>
      )}

      {/* 2. BUGÜN KIRMIZI ÇİZGİSİ */}
      {isCurrentDay && (
        <tr>
            <td colSpan={13} className="p-0 border-t border-red-300 relative h-0 z-20 shadow-[0_1px_3px_rgba(252,165,165,0.4)]">
                <div className="absolute right-0 -top-2 bg-red-400 text-white text-[8px] px-1.5 py-0 rounded-l font-bold shadow-sm opacity-90">
                    BUGÜN
                </div>
            </td>
        </tr>
      )}

      {/* 3. ANA VERİ SATIRI */}
      <tr id={rowId} className={`group transition-colors border-b border-slate-100 last:border-0 ${rowClass}`}>
        
        {/* Tarih */}
        <td className={`p-0 border-r border-slate-100 sticky left-0 z-10 w-20 ${stickyDateClass}`}>
            <div className="flex flex-col items-center justify-center h-full py-1">
                <span className={`font-bold text-[10px] ${isCurrentDay ? 'text-red-500' : 'text-slate-700'}`}>
                    {format(row.date, 'd MMM', { locale: tr })}
                </span>
                <span className="text-[9px] text-slate-400 uppercase">
                    {format(row.date, 'EEEE', { locale: tr })}
                </span>
            </div>
        </td>

        {/* Hafta */}
        <td className="p-0 border-r border-slate-100 text-center w-8">
            <span className="text-[9px] font-mono text-slate-400 font-bold">{row.ageInWeeks}</span>
        </td>

        {/* Mevcut (YENİ: Sadece text gösterimi, input kaldırıldı) */}
        <td className="p-0 border-r border-slate-100 text-center w-14 bg-slate-50/30">
            <div className="flex flex-col items-center justify-center">
                <span className="font-mono font-bold text-slate-600 text-[10px]">
                    {row.currentBirds.toLocaleString()}
                </span>
            </div>
        </td>

        {/* Ölü */}
        <td className="p-0 border-r border-slate-100 w-12">
            <input 
                type="number" 
                className={`${inputClass} text-red-600 focus:ring-red-200`}
                value={localData.mortality === 0 ? '' : localData.mortality}
                onChange={(e) => handleChange('mortality', e.target.value)}
                onBlur={(e) => handleBlur('mortality', e.target.value)}
            />
        </td>

        {/* Verim % */}
        <td className="p-0 border-r border-slate-100 w-14 bg-emerald-50/20">
            <div className="flex items-center justify-center h-8">
                <span className={`font-bold text-[10px] ${row.yield < 85 ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {row.yield > 0 ? `%${row.yield.toFixed(2).replace('.', ',')}` : '-'}
                </span>
            </div>
        </td>

        {/* Sağlam */}
        <td className="p-0 border-r border-slate-100 w-14">
            <input 
                type="number" 
                className={`${inputClass} text-emerald-700 focus:ring-emerald-200`}
                value={localData.goodCount === 0 ? '' : localData.goodCount}
                onChange={(e) => handleChange('goodCount', e.target.value)}
                onBlur={(e) => handleBlur('goodCount', e.target.value)}
            />
        </td>

        {/* Kırık */}
        <td className="p-0 border-r border-slate-100 w-12 bg-slate-50/30">
            <input 
                type="number" 
                className={`${inputClass} text-slate-600 focus:ring-slate-200`}
                value={localData.brokenEggCount === 0 ? '' : localData.brokenEggCount}
                onChange={(e) => handleChange('brokenEggCount', e.target.value)}
                onBlur={(e) => handleBlur('brokenEggCount', e.target.value)}
            />
        </td>

        {/* Kırık % */}
        <td className="p-0 border-r border-slate-100 w-12 bg-slate-50/50">
            <div className="flex items-center justify-center h-8 text-[9px] text-slate-500 font-medium">
                {brokenRate > 0 ? `%${brokenRate.toFixed(2).replace('.', ',')}` : '-'}
            </div>
        </td>

        {/* Kirli */}
        <td className="p-0 border-r border-slate-100 w-12 bg-slate-50/30">
            <input 
                type="number" 
                className={`${inputClass} text-slate-600 focus:ring-slate-200`}
                value={localData.dirtyEggCount === 0 ? '' : localData.dirtyEggCount}
                onChange={(e) => handleChange('dirtyEggCount', e.target.value)}
                onBlur={(e) => handleBlur('dirtyEggCount', e.target.value)}
            />
        </td>

        {/* Kirli % */}
        <td className="p-0 border-r border-slate-100 w-12 bg-slate-50/50">
            <div className="flex items-center justify-center h-8 text-[9px] text-slate-500 font-medium">
                {dirtyRate > 0 ? `%${dirtyRate.toFixed(2).replace('.', ',')}` : '-'}
            </div>
        </td>

        {/* Toplam */}
        <td className="p-0 border-r border-slate-100 w-14 bg-amber-50/30">
            <div className="flex items-center justify-center h-8 font-mono font-black text-[10px] text-amber-800">
                {row.eggCount > 0 ? row.eggCount : '-'}
            </div>
        </td>

        {/* Gramaj */}
        <td className="p-0 border-r border-slate-100 w-12">
            <input 
                type="number" 
                step="0.1"
                className={`${inputClass} text-indigo-700 focus:ring-indigo-200`}
                value={localData.avgWeight === 0 ? '' : localData.avgWeight}
                onChange={(e) => handleChange('avgWeight', e.target.value)}
                onBlur={(e) => handleBlur('avgWeight', e.target.value)}
            />
        </td>

        {/* Notlar */}
        <td className="p-0 w-24">
            <div className="relative h-8">
                <input 
                    type="text" 
                    className="w-full h-full px-2 text-left text-xs bg-transparent focus:bg-white outline-none focus:ring-2 focus:ring-yellow-200 text-slate-600 truncate focus:text-clip"
                    placeholder="Not..."
                    value={localData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    onBlur={(e) => handleBlur('notes', e.target.value)}
                />
                {row.notes && (
                    <div className="absolute right-1 top-2 pointer-events-none text-yellow-500">
                        <MessageSquare size={12} fill="currentColor" />
                    </div>
                )}
            </div>
        </td>
      </tr>
    </>
  );
}