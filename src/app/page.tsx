'use client';

import React, { useState, useEffect, useRef } from 'react';
import { addWeeks, differenceInWeeks } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';

// calculateTimeline import edildi
import { Flock, INITIAL_COOPS, RULES, calculateTimeline } from '@/lib/utils';
import { Header } from '@/components/Header';
import { DateSidebar } from '@/components/DateSidebar';
import { CoopColumn } from '@/components/CoopColumn';
import { SidebarRight } from '@/components/SidebarRight';

export default function FlockPlanner() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlockId, setSelectedFlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const timelineStart = new Date(2024, 0, 1); 
  const totalViewWeeks = 156; 
  const totalHeight = totalViewWeeks * RULES.pixelsPerWeek;

  const weeksUntilToday = differenceInWeeks(new Date(), timelineStart);
  const todayTopPos = weeksUntilToday * RULES.pixelsPerWeek;

  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollPos = Math.max(0, todayTopPos - 150);
      scrollContainerRef.current.scrollTop = scrollPos;
    }
  }, [todayTopPos]);

  // --- AUTO LANE MANTIĞI ---
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { over, active } = event;

    if (over && active.id === 'new-flock-source') {
      const coopId = over.id as string;
      
      // Yeni Sürünün Tahmini Tarihleri
      const newHatchDate = addWeeks(new Date(), -10); // Varsayılan başlangıç
      // Standart çıkış + sanitasyon süresini baz alarak bir bitiş hesaplayalım
      const standardDuration = RULES.stdExitWeek + (RULES.sanitationWeeks || 3);
      const newEndDate = addWeeks(newHatchDate, standardDuration);

      // Bu kümesteki mevcut sürüleri bul
      const existingFlocksInCoop = flocks.filter(f => f.coopId === coopId);

      // Sol Şeritte (Lane 0) çakışma var mı kontrol et
      const isLane0Busy = existingFlocksInCoop.some(existingFlock => {
          if (existingFlock.lane !== 0) return false; // Sadece sol şeride bakıyoruz

          const existingTl = calculateTimeline(existingFlock);
          if (!existingTl) return false;

          // Çakışma Kontrolü (Overlap Logic):
          // (StartA < EndB) && (EndA > StartB)
          const overlap = (newHatchDate < existingTl.sanitationEnd) && (newEndDate > existingFlock.hatchDate);
          return overlap;
      });

      // Eğer Lane 0 doluysa 1 yap, boşsa 0 yap.
      const assignedLane = isLane0Busy ? 1 : 0;

      const newFlock: Flock = {
        id: Math.random().toString().substring(2, 6),
        coopId: coopId,
        hatchDate: newHatchDate, 
        isMolting: false,
        lane: assignedLane as 0 | 1, // Otomatik atanan şerit
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
            <div className="flex grow relative" style={{ minHeight: `${totalHeight}px` }}>
              
              {/* Bugün Çizgisi */}
              {weeksUntilToday >= 0 && weeksUntilToday < totalViewWeeks && (
                <div 
                   className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none opacity-80"
                   style={{ top: `${todayTopPos}px` }} 
                >
                    <div className="absolute right-0 -top-2.5 bg-red-500 text-white text-[9px] px-1 rounded font-bold">BUGÜN</div>
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