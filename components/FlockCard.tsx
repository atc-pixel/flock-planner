'use client';

import React from 'react';
import { differenceInWeeks } from 'date-fns';
import { Flock, RULES, calculateTimeline } from '@/lib/utils';

interface FlockCardProps {
  flock: Flock;
  timelineStart: Date;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string, e: React.MouseEvent) => void;
}

export function FlockCard({ flock, timelineStart, isSelected, onSelect, onRemove }: FlockCardProps) {
  const tl = calculateTimeline(flock);
  if (!tl) return null;

  // --- HESAPLAMALAR ---
  const startDiffWeeks = differenceInWeeks(flock.hatchDate, timelineStart);
  const topPos = Math.max(0, startDiffWeeks * RULES.pixelsPerWeek);

  const totalWeeksWithSanitation = differenceInWeeks(tl.sanitationEnd, flock.hatchDate);
  const totalHeight = totalWeeksWithSanitation * RULES.pixelsPerWeek;
  const lifeWeeks = differenceInWeeks(tl.exit, flock.hatchDate);

  const rearingWeeks = 15;
  const transferWeeks = 3;
  const rearingHeight = rearingWeeks * RULES.pixelsPerWeek;
  const transferHeight = transferWeeks * RULES.pixelsPerWeek;
  
  const layingWeeks = lifeWeeks - (rearingWeeks + transferWeeks);
  const layingHeight = layingWeeks * RULES.pixelsPerWeek;
  const sanitationHeight = RULES.sanitationWeeks * RULES.pixelsPerWeek;

  const posWeek20 = 20 * RULES.pixelsPerWeek;
  const posWeek24 = 24 * RULES.pixelsPerWeek;

  // --- YENİ: POZİSYON AYARLARI (SOL / SAĞ ŞERİT) ---
  // Eğer lane 0 ise solda, 1 ise sağda (%50 ötede) durur. Genişlik %46 (arada %4 boşluk).
  const leftPos = flock.lane === 1 ? '52%' : '2%';
  const widthVal = '46%';

  return (
    <div 
      onClick={() => onSelect(flock.id)}
      // className'den 'left-1 right-1' kaldırıldı, style ile yönetilecek.
      className={`absolute rounded shadow-md overflow-hidden pointer-events-auto group cursor-pointer transition-all duration-200 flex flex-col border border-white/20 select-none
        ${isSelected ? 'ring-2 ring-blue-600 z-30 shadow-xl scale-[1.05]' : 'hover:scale-[1.02] z-10'}`}
      style={{ 
        top: `${topPos}px`, 
        height: `${totalHeight}px`,
        left: leftPos,        // Dinamik Sol
        width: widthVal       // Dinamik Genişlik
      }}
    >
      
      {/* 1. FAZ: CİVCİV (YEŞİL) */}
      <div className="w-full bg-lime-500 relative shrink-0" style={{ height: `${rearingHeight}px` }}></div>

      {/* 2. FAZ: TRANSFER (MAVİ) */}
      <div className="w-full bg-blue-500 relative shrink-0" style={{ height: `${transferHeight}px` }}></div>

      {/* 3. FAZ: VERİM (TURUNCU) */}
      <div className={`w-full relative shrink-0 ${flock.isMolting ? 'bg-amber-600' : 'bg-amber-400'}`} style={{ height: `${layingHeight}px` }}></div>

      {/* --- İÇ CETVEL --- */}
      <div className="absolute inset-0 flex flex-col pointer-events-none z-10">
        {Array.from({ length: lifeWeeks }).map((_, i) => (
            <div 
                key={i} 
                className="w-full border-b border-white/20 flex items-center px-1 shrink-0" 
                style={{ height: `${RULES.pixelsPerWeek}px` }}
            >
                {/* Rakamları biraz küçülttük sığması için */}
                <span className="text-[8px] font-mono font-bold text-white/80 drop-shadow-sm min-w-2.5">
                    {i + 1}
                </span>
                {i === 0 && <span className="ml-0.5 text-[8px] font-bold text-white drop-shadow-md truncate">Civciv</span>}
                {i === 15 && <span className="ml-0.5 text-[7px] font-bold text-white/90 tracking-wide uppercase truncate">Trnsfr</span>}
            </div>
        ))}
      </div>

      {/* --- MARKERLAR (Sadece Sembol) --- */}
      <div className="absolute right-0 z-20 flex items-center justify-end pr-0.5" style={{ top: `${posWeek20}px`, height: `${RULES.pixelsPerWeek}px`, width: '100%' }}>
        <div className="bg-purple-600 text-white text-[7px] font-bold px-1 py-0.5 rounded shadow-md border border-white/50">%50</div>
      </div>

      <div className="absolute right-0 z-20 flex items-center justify-end pr-0.5" style={{ top: `${posWeek24}px`, height: `${RULES.pixelsPerWeek}px`, width: '100%' }}>
        <div className="bg-red-600 text-white text-[7px] font-bold px-1 py-0.5 rounded shadow-md border border-white/50">PİK</div>
      </div>

      {/* TEMİZLİK */}
      <div className="bg-red-100 w-full relative pattern-diagonal border-t-2 border-red-300 flex items-center justify-center shrink-0 z-20" style={{ height: `${sanitationHeight}px` }}>
        <span className="text-red-500 font-bold text-[8px] bg-white/80 px-1 rounded shadow-sm truncate">TEMİZ</span>
      </div>

      {/* Silme */}
      <button onClick={(e) => onRemove(flock.id, e)} className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white rounded-bl-lg flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-md hover:bg-red-700 text-[10px] transition-opacity z-50 font-bold">×</button>

      {/* Molting Rozeti */}
      {flock.isMolting && (
         <div className="absolute bottom-[35px] right-0.5 bg-black/30 backdrop-blur-sm px-1 py-0.5 rounded text-[7px] font-bold text-white border border-white/30 z-20">M</div>
      )}
    </div>
  );
}