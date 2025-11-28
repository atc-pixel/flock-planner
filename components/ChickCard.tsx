'use client';

import React from 'react';
import { differenceInCalendarDays, addDays } from 'date-fns';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Flock, RULES, calculateTimeline } from '@/lib/utils';

interface ChickCardProps {
  flock: Flock;
  timelineStart: Date;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (flock: Flock) => void;
  onRemove: (id: string, e: React.MouseEvent) => void;
}

export function ChickCard({ flock, timelineStart, isSelected, onSelect, onUpdate, onRemove }: ChickCardProps) {
  const tl = calculateTimeline(flock);
  if (!tl) return null;

  // --- HESAPLAMALAR ---
  const maxWeeks = 25;
  const totalHeight = maxWeeks * RULES.pixelsPerWeek;
  
  const diffDays = differenceInCalendarDays(flock.hatchDate, timelineStart);
  const topPos = Math.max(0, (diffDays / 7) * RULES.pixelsPerWeek);

  let transferStartDayOffset = 0;
  let transferDurationWeeks = 0;

  if (flock.transferDate) {
    transferStartDayOffset = differenceInCalendarDays(flock.transferDate, flock.hatchDate);
    transferDurationWeeks = 1;
  } else {
    transferStartDayOffset = RULES.transferRangeStart * 7;
    transferDurationWeeks = RULES.transferRangeDuration;
  }

  const rearingHeight = (transferStartDayOffset / 7) * RULES.pixelsPerWeek;
  const transferHeight = transferDurationWeeks * RULES.pixelsPerWeek;
  const remainingHeight = totalHeight - rearingHeight - transferHeight;

  // DÜZELTME: Marker Konumları (0-index olduğu için 1 çıkarıyoruz)
  const posWeek20 = (20 - 1) * RULES.pixelsPerWeek;
  const posWeek24 = (24 - 1) * RULES.pixelsPerWeek;

  // --- AKSİYONLAR ---
  const shiftWeek = (e: React.MouseEvent, direction: 'up' | 'down') => {
    e.stopPropagation();
    const days = direction === 'down' ? 7 : -7;
    
    const newHatchDate = addDays(flock.hatchDate, days);
    
    onUpdate({
        ...flock,
        hatchDate: newHatchDate,
        transferDate: flock.transferDate ? addDays(flock.transferDate, days) : undefined,
        moltDate: flock.moltDate ? addDays(flock.moltDate, days) : undefined,
        exitDate: flock.exitDate ? addDays(flock.exitDate, days) : undefined,
    });
  };

  return (
    <div 
      onClick={() => onSelect(flock.id)}
      className={`absolute rounded-xl shadow-sm overflow-hidden pointer-events-auto group cursor-pointer flex flex-col border select-none transition-all duration-200
        ${isSelected ? 'border-amber-500 ring-2 ring-amber-500 z-30 shadow-xl' : 'border-slate-300 hover:border-amber-300 z-10'}`}
      style={{ 
        top: `${topPos}px`, 
        height: `${totalHeight}px`,
        left: '2%',
        width: '46%'
      }}
    >
      {/* 1. Büyütme (Yeşil) */}
      <div className="w-full bg-lime-400 relative shrink-0" style={{ height: `${rearingHeight}px` }}>
         <span className="absolute top-1 left-1 text-[9px] font-bold text-lime-900 bg-lime-200/80 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            CİVCİV
         </span>
      </div>

      {/* 2. Transfer (Mavi) */}
      <div className="w-full bg-blue-400 relative shrink-0" style={{ height: `${transferHeight}px` }}></div>

      {/* 3. İlk Verim (Amber) */}
      <div className="w-full bg-amber-300 relative shrink-0 flex flex-col justify-end" style={{ height: `${Math.max(0, remainingHeight)}px` }}>
         <div className="h-4 w-full bg-gradient-to-b from-transparent to-black/10"></div>
      </div>

      {/* MARKERLAR */}
      <div className="absolute right-0 z-20 flex items-center justify-end pr-0.5" style={{ top: `${posWeek20}px`, height: `${RULES.pixelsPerWeek}px`, width: '100%' }}>
        <div className="bg-purple-600 text-white text-[7px] font-bold px-1 py-0.5 rounded shadow-md border border-white/50">%50</div>
      </div>
      <div className="absolute right-0 z-20 flex items-center justify-end pr-0.5" style={{ top: `${posWeek24}px`, height: `${RULES.pixelsPerWeek}px`, width: '100%' }}>
        <div className="bg-red-600 text-white text-[7px] font-bold px-1 py-0.5 rounded shadow-md border border-white/50">PİK</div>
      </div>

      {/* CETVEL / HAFTA NUMARALARI */}
      <div className="absolute inset-0 flex flex-col pointer-events-none z-20">
        {Array.from({ length: maxWeeks }).map((_, i) => (
            <div key={i} className="w-full border-b border-black/5 flex items-center px-1 shrink-0" style={{ height: `${RULES.pixelsPerWeek}px` }}>
                <span className="text-[8px] font-mono font-bold text-black/40 drop-shadow-sm min-w-2.5">{i + 1}</span>
            </div>
        ))}
      </div>

      {/* --- KONTROLLER --- */}
      
      {/* 1. SİLME BUTONU */}
      <button 
        onClick={(e) => onRemove(flock.id, e)} 
        className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white rounded-bl-lg flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-md hover:bg-red-700 text-[10px] transition-opacity z-50 font-bold pointer-events-auto"
      >
        ×
      </button>

      {/* 2. YUKARI/AŞAĞI OKLAR */}
      <div className="absolute right-1 top-7 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-40 pointer-events-auto">
         <button 
            onClick={(e) => shiftWeek(e, 'up')}
            className="p-1 bg-white/90 hover:bg-white text-slate-600 rounded shadow-md hover:text-amber-600 transition-colors"
            title="1 Hafta Öne Çek"
         >
            <ChevronUp size={14} />
         </button>
         <button 
            onClick={(e) => shiftWeek(e, 'down')}
            className="p-1 bg-white/90 hover:bg-white text-slate-600 rounded shadow-md hover:text-amber-600 transition-colors"
            title="1 Hafta İleri At"
         >
            <ChevronDown size={14} />
         </button>
      </div>
    </div>
  );
}