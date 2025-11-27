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

  // Faz Yükseklikleri
  const rearingWeeks = 15; // Yeşil
  const transferWeeks = 3; // Mavi
  const rearingHeight = rearingWeeks * RULES.pixelsPerWeek;
  const transferHeight = transferWeeks * RULES.pixelsPerWeek;
  
  const layingWeeks = lifeWeeks - (rearingWeeks + transferWeeks);
  const layingHeight = layingWeeks * RULES.pixelsPerWeek;
  const sanitationHeight = RULES.sanitationWeeks * RULES.pixelsPerWeek;

  // Marker Pozisyonları (Kartın tepesinden itibaren piksel)
  const posWeek20 = 20 * RULES.pixelsPerWeek;
  const posWeek24 = 24 * RULES.pixelsPerWeek;

  return (
    <div 
      onClick={() => onSelect(flock.id)}
      className={`absolute left-1 right-1 rounded shadow-md overflow-hidden pointer-events-auto group cursor-pointer transition-transform duration-200 flex flex-col border border-white/20 select-none
        ${isSelected ? 'ring-2 ring-blue-600 z-30 shadow-xl scale-[1.02]' : 'hover:scale-[1.02] z-10'}`}
      style={{ top: `${topPos}px`, height: `${totalHeight}px` }}
    >
      
      {/* 1. FAZ: CİVCİV / BÜYÜTME (YEŞİL) */}
      <div className="w-full bg-lime-500 relative shrink-0" style={{ height: `${rearingHeight}px` }}></div>

      {/* 2. FAZ: TRANSFER (MAVİ) */}
      <div className="w-full bg-blue-500 relative shrink-0" style={{ height: `${transferHeight}px` }}></div>

      {/* 3. FAZ: VERİM (TURUNCU) */}
      <div className={`w-full relative shrink-0 ${flock.isMolting ? 'bg-amber-600' : 'bg-amber-400'}`} style={{ height: `${layingHeight}px` }}></div>

      {/* --- İÇ CETVEL VE GRİD (DÜZELTME BURADA YAPILDI) --- */}
      <div className="absolute inset-0 flex flex-col pointer-events-none z-10">
        {Array.from({ length: lifeWeeks }).map((_, i) => (
            <div 
                key={i} 
                // DİKKAT: shrink-0 eklendi. Bu, Flexbox'ın satırları ezmesini engeller.
                className="w-full border-b border-white/20 flex items-center px-1 shrink-0" 
                style={{ height: `${RULES.pixelsPerWeek}px` }}
            >
                {/* Hafta Numarası: i + 1 */}
                <span className="text-[9px] font-mono font-bold text-white/80 drop-shadow-sm min-w-[12px]">
                    {i + 1}
                </span>

                {/* 1. Hafta (Civciv) Etiketi */}
                {i === 0 && (
                    <span className="ml-1 text-[9px] font-bold text-white drop-shadow-md">Civciv</span>
                )}
                
                {/* Transfer Etiketi (16. Haftaya denk gelen satır yani index 15) */}
                {i === 15 && (
                    <span className="ml-1 text-[8px] font-bold text-white/90 tracking-wide uppercase">Transfer</span>
                )}
            </div>
        ))}
      </div>

      {/* --- MARKERLAR --- */}

      {/* Marker: %50 (20. Hafta) */}
      <div 
        className="absolute right-0 z-20 flex items-center justify-end pr-1"
        style={{ top: `${posWeek20}px`, height: `${RULES.pixelsPerWeek}px`, width: '100%' }}
      >
        <div className="bg-purple-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-md border border-white/50">
           %50
        </div>
      </div>

      {/* Marker: PİK (24. Hafta) */}
      <div 
        className="absolute right-0 z-20 flex items-center justify-end pr-1"
        style={{ top: `${posWeek24}px`, height: `${RULES.pixelsPerWeek}px`, width: '100%' }}
      >
        <div className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-md border border-white/50">
          ★ PİK
        </div>
      </div>

      {/* --- TEMİZLİK BÖLÜMÜ --- */}
      <div 
         className="bg-red-100 w-full relative pattern-diagonal border-t-2 border-red-300 flex items-center justify-center shrink-0 z-20" 
         style={{ height: `${sanitationHeight}px` }}
      >
        <span className="text-red-500 font-bold text-[9px] bg-white/80 px-1 rounded shadow-sm">TEMİZLİK</span>
      </div>

      {/* Silme Butonu */}
      <button 
          onClick={(e) => onRemove(flock.id, e)}
          className="absolute top-0 right-0 w-6 h-6 bg-red-600 text-white rounded-bl-xl flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-md hover:bg-red-700 text-xs transition-opacity z-50 font-bold"
      >
          ×
      </button>

      {/* Molting Rozeti */}
      {flock.isMolting && (
         <div className="absolute bottom-[35px] right-1 bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold text-white border border-white/30 z-20">
            MOLT
         </div>
      )}
    </div>
  );
}