'use client';

import React, { useState, useEffect, useRef } from 'react';
import { addWeeks, differenceInWeeks } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';

// Kendi oluşturduğumuz kütüphaneler
import { Flock, INITIAL_COOPS, RULES } from '@/lib/utils';
import { Header } from '@/components/Header';
import { DateSidebar } from '@/components/DateSidebar';
import { CoopColumn } from '@/components/CoopColumn';
import { SidebarRight } from '@/components/SidebarRight';

export default function FlockPlanner() {
  // --- STATE ---
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlockId, setSelectedFlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Scroll Alanı Referansı (Otomatik kaydırma için)
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- TAKVİM AYARLARI ---
  // 1 Ocak 2024'ten başlatıyoruz (Sabit Çapa)
  const timelineStart = new Date(2024, 0, 1); // Ay 0-indexlidir (0 = Ocak)
  const totalViewWeeks = 156; // 3 Yıl (2024, 2025, 2026)
  const totalHeight = totalViewWeeks * RULES.pixelsPerWeek;

  // Bugünün konumu (Kırmızı Çizgi ve Scroll için)
  const weeksUntilToday = differenceInWeeks(new Date(), timelineStart);
  const todayTopPos = weeksUntilToday * RULES.pixelsPerWeek;

  // --- EFFEECT: SAYFA AÇILINCA BUGÜNE GİT ---
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Bugüne git ama biraz yukarıda boşluk bırak (örn: 100px) ki bağlam görünsün
      const scrollPos = Math.max(0, todayTopPos - 150);
      scrollContainerRef.current.scrollTop = scrollPos;
    }
  }, [todayTopPos]); // todayTopPos değişirse tekrar çalışır (zaten sabit)


  // --- ACTIONS ---
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { over, active } = event;

    if (over && active.id === 'new-flock-source') {
      const coopId = over.id as string;
      const newFlock: Flock = {
        id: Math.random().toString().substring(2, 6),
        coopId: coopId,
        // Varsayılan olarak bugüne yakın bir tarihe ekle
        hatchDate: addWeeks(new Date(), -10), 
        isMolting: false,
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
        
        {/* 1. ÜST MENÜ */}
        <Header />

        {/* 2. ANA İÇERİK ALANI */}
        <div className="flex grow overflow-hidden">
          
          {/* SCROLL ALANI (Tarih + Kümesler) */}
          <div 
            ref={scrollContainerRef}
            className="grow overflow-y-auto relative flex scroll-smooth" 
            style={{ height: 'calc(100vh - 64px)' }}
          >
            
            {/* A. TARİH SÜTUNU */}
            <DateSidebar timelineStart={timelineStart} totalWeeks={totalViewWeeks} />

            {/* B. KÜMES SÜTUNLARI */}
            <div className="flex grow relative">
              
              {/* Bugün Çizgisi (Kırmızı) */}
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

          {/* 3. SAĞ PANEL (DETAY) */}
          <SidebarRight 
            selectedFlock={selectedFlock}
            onUpdateFlock={updateFlock}
          />

        </div>

        {/* DRAG OVERLAY */}
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