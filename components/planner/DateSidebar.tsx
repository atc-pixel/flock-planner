'use client';

import React from 'react';
import { addWeeks, format, differenceInWeeks, getISOWeek, getYear } from 'date-fns'; // getISOWeek eklendi
import { tr } from 'date-fns/locale';
import { RULES } from '@/lib/utils';

interface DateSidebarProps {
  timelineStart: Date;
  totalWeeks: number;
}

export function DateSidebar({ timelineStart, totalWeeks }: DateSidebarProps) {
  const totalHeight = totalWeeks * RULES.pixelsPerWeek;

  return (
    <div className="w-20 shrink-0 bg-slate-50 border-r border-slate-300 z-30 select-none">
       {/* Sticky Header */}
       <div className="sticky top-0 h-10 bg-slate-100 border-b border-slate-300 flex items-center justify-center font-bold text-[10px] text-slate-600 z-40 shadow-sm">
          TARİH / H
       </div>
       
       <div style={{ height: `${totalHeight}px` }} className="relative">
          {Array.from({ length: totalWeeks }).map((_, i) => {
            const weekDate = addWeeks(timelineStart, i);
            const isCurrent = differenceInWeeks(weekDate, new Date()) === 0;
            const weekNumber = getISOWeek(weekDate);
            const isFirstWeek = weekNumber === 1;

            return (
              <div 
                key={i} 
                className={`absolute w-full border-b border-slate-200 text-[9px] flex items-center justify-between px-2 text-slate-500 
                  ${isCurrent ? 'bg-amber-100 text-amber-700 font-bold' : ''}
                  ${isFirstWeek ? 'bg-blue-50 border-blue-200' : ''} 
                `}
                style={{ top: `${i * RULES.pixelsPerWeek}px`, height: `${RULES.pixelsPerWeek}px` }}
              >
                {/* Sol: Gün Ay */}
                <span className="truncate">{format(weekDate, 'dd MMM', { locale: tr })}</span>
                
                {/* Sağ: Hafta No */}
                <span className={`opacity-50 text-[8px] ${isFirstWeek ? 'font-bold text-blue-600' : ''}`}>
                   W{weekNumber}
                </span>
              </div>
            );
          })}
       </div>
    </div>
  );
}