'use client';

import React from 'react';
import { differenceInCalendarDays } from 'date-fns'; // GÜN BAZLI HESAP İÇİN
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

  // --- HASSAS KONUM HESABI (GÜN BAZLI) ---
  // Başlangıçtan itibaren kaç gün geçti?
  const diffDays = differenceInCalendarDays(flock.hatchDate, timelineStart);
  
  // Piksel Konumu: (Gün / 7) * HaftalıkPiksel
  const topPos = Math.max(0, (diffDays / 7) * RULES.pixelsPerWeek);

  // Toplam Yükseklik Hesabı
  const totalDays = differenceInCalendarDays(tl.sanitationEnd, flock.hatchDate);
  const totalHeight = (totalDays / 7) * RULES.pixelsPerWeek;
  
  // Cetvel için yaşam süresi (hafta olarak)
  const lifeDays = differenceInCalendarDays(tl.exit, flock.hatchDate);
  const lifeWeeks = Math.ceil(lifeDays / 7);

  // Faz Yükseklikleri (Piksel cinsinden)
  const rearingHeight = 15 * RULES.pixelsPerWeek; 
  const transferHeight = 3 * RULES.pixelsPerWeek;
  const sanitationHeight = RULES.sanitationWeeks * RULES.pixelsPerWeek;
  const layingHeight = totalHeight - (rearingHeight + transferHeight + sanitationHeight);

  // Marker Pozisyonları
  const posWeek20 = 20 * RULES.pixelsPerWeek;
  const posWeek24 = 24 * RULES.pixelsPerWeek;

  // Sol / Sağ Şerit
  const leftPos = flock.lane === 1 ? '52%' : '2%';
  const widthVal = '46%';

  return (
    <div 
      onClick={() => onSelect(flock.id)}
      // DÜZELTME: 'scale' kaldırıldı. Sadece border değişimi var.
      className={`absolute rounded shadow-md overflow-hidden pointer-events-auto group cursor-pointer flex flex-col border select-none transition-colors duration-150
        ${isSelected ? 'border-blue-600 ring-1 ring-blue-600 z-30 shadow-xl' : 'border-white/20 hover:border-white/40 z-10'}`}
      style={{ 
        top: `${topPos}px`, 
        height: `${totalHeight}px`,
        left: leftPos,
        width: widthVal
      }}
    >
      {/* 1. FAZ: BÜYÜTME (YEŞİL) */}
      <div className="w-full bg-lime-500 relative shrink-0" style={{ height: `${rearingHeight}px` }}></div>

      {/* 2. FAZ: TRANSFER (MAVİ) */}
      <div className="w-full bg-blue-500 relative shrink-0" style={{ height: `${transferHeight}px` }}></div>

      {/* 3. FAZ: VERİM (TURUNCU) */}
      <div className={`w-full relative shrink-0 ${flock.isMolting ? 'bg-amber-600' : 'bg-amber-400'}`} style={{ height: `${layingHeight}px` }}></div>

      {/* CETVEL */}
      <div className="absolute inset-0 flex flex-col pointer-events-none z-10">
        {Array.from({ length: lifeWeeks }).map((_, i) => (
            <div 
                key={i} 
                className="w-full border-b border-white/20 flex items-center px-1 shrink-0" 
                style={{ height: `${RULES.pixelsPerWeek}px` }}
            >
                <span className="text-[8px] font-mono font-bold text-white/80 drop-shadow-sm min-w-[10px]">{i + 1}</span>
                {i === 0 && <span className="ml-0.5 text-[8px] font-bold text-white drop-shadow-md truncate">Civciv</span>}
                {i === 15 && <span className="ml-0.5 text-[7px] font-bold text-white/90 tracking-wide uppercase truncate">Trnsfr</span>}
            </div>
        ))}
      </div>

      {/* MARKERLAR */}
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

      {/* SİLME BUTONU */}
      <button onClick={(e) => onRemove(flock.id, e)} className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white rounded-bl-lg flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-md hover:bg-red-700 text-[10px] transition-opacity z-50 font-bold">×</button>

      {/* MOLTING ROZETİ */}
      {flock.isMolting && (
         <div className="absolute bottom-[35px] right-0.5 bg-black/30 backdrop-blur-sm px-1 py-0.5 rounded text-[7px] font-bold text-white border border-white/30 z-20">M</div>
      )}
    </div>
  );
}