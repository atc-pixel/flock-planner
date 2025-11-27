'use client';

import React from 'react';
import { differenceInCalendarDays, addDays } from 'date-fns';
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
  const oneDayMs = 1000 * 60 * 60 * 24;
  const diffDays = differenceInCalendarDays(flock.hatchDate, timelineStart);
  const topPos = Math.max(0, (diffDays / 7) * RULES.pixelsPerWeek);

  const totalDays = differenceInCalendarDays(tl.sanitationEnd, flock.hatchDate);
  const totalHeight = (totalDays / 7) * RULES.pixelsPerWeek;
  
  const lifeDays = differenceInCalendarDays(tl.exit, flock.hatchDate);
  const lifeWeeks = Math.ceil(lifeDays / 7);

  // --- TRANSFER VE FAZLAR ---
  let transferStartDayOffset = 0;
  let transferDurationWeeks = 0;

  if (flock.transferDate) {
    transferStartDayOffset = differenceInCalendarDays(flock.transferDate, flock.hatchDate);
    transferDurationWeeks = 1;
  } else {
    transferStartDayOffset = RULES.transferRangeStart * 7;
    transferDurationWeeks = RULES.transferRangeDuration;
  }

  const rearingDays = transferStartDayOffset;
  const rearingHeight = (rearingDays / 7) * RULES.pixelsPerWeek;

  const transferHeight = transferDurationWeeks * RULES.pixelsPerWeek;

  // Yumurtlama Başlangıcı (Transfer Bitişi)
  const transferEndDay = transferStartDayOffset + (transferDurationWeeks * 7);
  const layingDays = lifeDays - transferEndDay;
  const layingHeight = (layingDays / 7) * RULES.pixelsPerWeek;

  const sanitationHeight = RULES.sanitationWeeks * RULES.pixelsPerWeek;

  // --- MOLTING HESAPLARI ---
  let moltStartTop = 0;     // Laying div içindeki üst konumu
  let moltGrayHeight = 0;
  let moltRecoveryHeight = 0;
  let moltMarkerTop = 0;
  let postMoltDarkHeight = 0; // Koyu alanın yüksekliği

  if (flock.isMolting && flock.moltDate) {
    // Transfer bitiş tarihini (Laying başlangıcı) hesapla
    const layingStartDate = addDays(flock.hatchDate, transferEndDay);
    
    // Molt tarihi, Laying başlangıcından kaç gün sonra?
    const daysFromLayingStartToMolt = differenceInCalendarDays(flock.moltDate, layingStartDate);
    
    // Piksel Konumu
    moltStartTop = (daysFromLayingStartToMolt / 7) * RULES.pixelsPerWeek;
    
    // Özel Alanlar
    moltGrayHeight = (7 / 7) * RULES.pixelsPerWeek;
    moltRecoveryHeight = (23 / 7) * RULES.pixelsPerWeek;
    moltMarkerTop = moltStartTop + moltGrayHeight + moltRecoveryHeight;

    // Koyu Alan: Molt başlangıcından kartın sonuna kadar
    postMoltDarkHeight = layingHeight - moltStartTop;
  }

  // --- GÜNCELLENEN MARKER POZİSYONLARI ---
  // (Hafta Sayısı - 1) * Pixel = O haftanın BAŞLANGIÇ (Üst) çizgisi
  const posWeek20 = (20 - 1) * RULES.pixelsPerWeek;
  const posWeek24 = (24 - 1) * RULES.pixelsPerWeek;

  const leftPos = flock.lane === 1 ? '52%' : '2%';
  const widthVal = '46%';

  return (
    <div 
      onClick={() => onSelect(flock.id)}
      className={`absolute rounded shadow-md overflow-hidden pointer-events-auto group cursor-pointer flex flex-col border select-none transition-colors duration-150
        ${isSelected ? 'border-blue-600 ring-1 ring-blue-600 z-30 shadow-xl' : 'border-white/20 hover:border-white/40 z-10'}`}
      style={{ 
        top: `${topPos}px`, 
        height: `${totalHeight}px`,
        left: leftPos,
        width: widthVal
      }}
    >
      {/* 1. BÜYÜTME (YEŞİL) */}
      <div className="w-full bg-lime-500 relative shrink-0" style={{ height: `${rearingHeight}px` }}></div>

      {/* 2. TRANSFER (MAVİ) */}
      <div className="w-full bg-blue-500 relative shrink-0" style={{ height: `${transferHeight}px` }}></div>

      {/* 3. VERİM (STANDART TURUNCU) */}
      <div className="w-full relative shrink-0 bg-amber-400" style={{ height: `${layingHeight}px` }}>
          
          {/* --- MOLTING KATMANLARI --- */}
          {flock.isMolting && flock.moltDate && (
            <>
              {/* A. KOYU ARKA PLAN (Molt Tarihinden Sona Kadar) */}
              <div 
                className="absolute left-0 right-0 bg-amber-600 z-0"
                style={{
                    top: `${moltStartTop}px`,
                    height: `${postMoltDarkHeight}px`
                }}
              ></div>

              {/* B. GRİ ALAN (7 Gün) - Koyu zeminin üstünde (z-10) */}
              <div 
                className="absolute left-0 right-0 bg-gray-500 z-10 border-y border-white/30"
                style={{
                    top: `${moltStartTop}px`,
                    height: `${moltGrayHeight}px`
                }}
              >
                 <span className="text-[6px] text-white font-bold pl-1 block pt-0.5 opacity-80">MOLT</span>
              </div>

              {/* C. RECOVERY ALANI (23 Gün) - Koyu zeminin üstünde (z-10) */}
              <div 
                className="absolute left-0 right-0 bg-teal-500 z-10 border-b border-white/30"
                style={{
                    top: `${moltStartTop + moltGrayHeight}px`,
                    height: `${moltRecoveryHeight}px`
                }}
              ></div>

              {/* D. %20 MARKER */}
              <div 
                 className="absolute right-0 z-20 pr-1 flex justify-end"
                 style={{
                    top: `${moltMarkerTop - 6}px`,
                 }}
              >
                 <div className="bg-teal-700 text-white text-[7px] font-bold px-1 py-0.5 rounded shadow border border-white/50">%20</div>
              </div>
            </>
          )}
      </div>

      {/* CETVEL */}
      <div className="absolute inset-0 flex flex-col pointer-events-none z-20">
        {Array.from({ length: lifeWeeks }).map((_, i) => (
            <div key={i} className="w-full border-b border-white/20 flex items-center px-1 shrink-0" style={{ height: `${RULES.pixelsPerWeek}px` }}>
                <span className="text-[8px] font-mono font-bold text-white/80 drop-shadow-sm min-w-2.5">{i + 1}</span>
                {i === 0 && <span className="ml-0.5 text-[8px] font-bold text-white drop-shadow-md truncate">Civciv</span>}
            </div>
        ))}
      </div>

      {/* SABİT MARKERLAR (Güncellendi) */}
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
    </div>
  );
}