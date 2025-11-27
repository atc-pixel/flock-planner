'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { addWeeks, differenceInWeeks, differenceInCalendarDays, max, startOfDay } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';

import { Flock, INITIAL_COOPS, RULES, calculateTimeline } from '@/lib/utils';
import { Header } from '@/components/Header';
import { DateSidebar } from '@/components/DateSidebar';
import { CoopColumn } from '@/components/CoopColumn';
import { SidebarRight } from '@/components/SidebarRight';

// Kümes başlıklarının yüksekliği (h-10 = 40px)
const HEADER_HEIGHT = 40;

export default function FlockPlanner() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlockId, setSelectedFlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- TAKVİM AYARLARI ---
  // 1. Başlangıç Tarihi: 01.01.2022
  const timelineStart = useMemo(() => new Date(2022, 0, 1), []); 

  // 2. Varsayılan Minimum Bitiş: 31.12.2027
  const minEndDate = useMemo(() => new Date(2027, 11, 31), []);

  // 3. Dinamik Toplam Hafta
  const totalViewWeeks = useMemo(() => {
    let maxDate = minEndDate;
    if (flocks.length > 0) {
      const flockEndDates = flocks.map(f => {
        const tl = calculateTimeline(f);
        return tl ? tl.sanitationEnd : minEndDate;
      });
      const latestFlockDate = max(flockEndDates);
      if (latestFlockDate > maxDate) maxDate = latestFlockDate;
    }
    // +12 Hafta Tampon
    const bufferedEndDate = addWeeks(maxDate, 12);
    return Math.max(differenceInWeeks(bufferedEndDate, timelineStart), 52); 
  }, [flocks, minEndDate, timelineStart]);

  const totalHeight = totalViewWeeks * RULES.pixelsPerWeek;

  // --- DÜZELTME: BUGÜN ÇİZGİSİ ---
  // 1. Tam gün farkını al
  const daysUntilToday = differenceInCalendarDays(new Date(), timelineStart);
  
  // 2. Piksel konumu + HEADER YÜKSEKLİĞİ (40px)
  const todayTopPos = ((daysUntilToday / 7) * RULES.pixelsPerWeek) + HEADER_HEIGHT;
  
  // 3. Görsel hafta kontrolü (Kırmızı çizginin olduğu hafta)
  const weeksUntilToday = Math.floor(daysUntilToday / 7);

  // Sayfa açılınca bugüne git
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollPos = Math.max(0, todayTopPos - 300); // Biraz daha ortada dursun
      scrollContainerRef.current.scrollTop = scrollPos;
    }
  }, [todayTopPos]);

  // --- AUTO LANE MANTIĞI ---
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { over, active } = event;

    if (over && active.id === 'new-flock-source') {
      const coopId = over.id as string;
      
      // Varsayılan yeni sürü başlangıcı: Bugün
      const newHatchDate = startOfDay(new Date()); 
      const standardDuration = RULES.stdExitWeek + (RULES.sanitationWeeks || 3);
      const newEndDate = addWeeks(newHatchDate, standardDuration);

      const existingFlocksInCoop = flocks.filter(f => f.coopId === coopId);

      const isLane0Busy = existingFlocksInCoop.some(existingFlock => {
          if (existingFlock.lane !== 0) return false; 
          const existingTl = calculateTimeline(existingFlock);
          if (!existingTl) return false;
          const overlap = (newHatchDate < existingTl.sanitationEnd) && (newEndDate > existingFlock.hatchDate);
          return overlap;
      });

      const assignedLane = isLane0Busy ? 1 : 0;

      const newFlock: Flock = {
        id: Math.random().toString().substring(2, 6),
        coopId: coopId,
        hatchDate: newHatchDate, 
        isMolting: false,
        lane: assignedLane as 0 | 1, 
      };

      setFlocks([...flocks, newFlock]);
      setSelectedFlockId(newFlock.id);
    }
  };

  const removeFlock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlocks(curr => curr.filter(f => f.id !== id));
    if (selectedFlockId === id) setSelectedFlockId(null);
  };

  const updateFlock = (updatedFlock: Flock) => {
    setFlocks(curr => curr.map(f => f.id === updatedFlock.id ? updatedFlock : f));
  };

  const selectedFlock = flocks.find(f => f.id === selectedFlockId);

  return (
    <DndContext onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col bg-slate-50 font-sans overflow-hidden">
        <Header />
        <div className="flex grow overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="grow overflow-y-auto relative flex scroll-smooth" 
            style={{ height: 'calc(100vh - 64px)' }}
          >
            <DateSidebar timelineStart={timelineStart} totalWeeks={totalViewWeeks} />
            
            {/* minHeight: İçerik kadar uzasın */}
            <div className="flex grow relative" style={{ minHeight: `${totalHeight + HEADER_HEIGHT}px` }}>
              
              {/* BUGÜN ÇİZGİSİ */}
              {weeksUntilToday >= 0 && weeksUntilToday < totalViewWeeks && (
                <div 
                   className="absolute left-0 right-0 border-t-2 border-red-500 z-50 pointer-events-none opacity-80"
                   style={{ top: `${todayTopPos}px` }} 
                >
                    <div className="absolute right-0 -top-2.5 bg-red-500 text-white text-[9px] px-1 rounded font-bold shadow-sm">BUGÜN</div>
                </div>
              )}

              {INITIAL_COOPS.map((coop) => (
                <CoopColumn
                  key={coop.id}
                  coop={coop}
                  height={totalHeight}
                  totalWeeks={totalViewWeeks}
                  flocks={flocks.filter(f => f.coopId === coop.id)}
                  timelineStart={timelineStart}
                  selectedFlockId={selectedFlockId}
                  onSelectFlock={setSelectedFlockId}
                  onRemoveFlock={removeFlock}
                />
              ))}
            </div>
          </div>
          <SidebarRight 
            selectedFlock={selectedFlock}
            onUpdateFlock={updateFlock}
          />
        </div>
        <DragOverlay>
            {activeId === 'new-flock-source' ? (
                <div className="bg-amber-500 text-white px-3 py-2 rounded shadow-xl font-bold opacity-90 cursor-grabbing">
                   + Yeni Sürü
                </div>
            ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}