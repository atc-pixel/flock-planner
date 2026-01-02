'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { addWeeks, differenceInWeeks, differenceInCalendarDays, max, startOfDay, startOfWeek } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { useRouter } from 'next/navigation';

// Firebase
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';

import { Flock, INITIAL_COOPS, RULES, calculateTimeline } from '@/lib/utils';

// Planner Bileşenleri
import { Header } from '@/components/planner/Header';
import { DateSidebar } from '@/components/planner/DateSidebar';
import { CoopColumn } from '@/components/planner/CoopColumn';
import { SidebarRight } from '@/components/planner/SidebarRight';
import { NewFlockModal } from '@/components/planner/NewFlockModal';

// DÜZELTME: Sütun başlığı yüksekliği (h-10 = 40px) ile eşleşmeli
const COLUMN_HEADER_HEIGHT = 40; 

export default function FlockPlanner() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlockId, setSelectedFlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetCoopId, setTargetCoopId] = useState<string | null>(null);
  const [nextFlockNum, setNextFlockNum] = useState(1);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false); // Scroll kilidi

  // Auth Kontrolü
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
      }
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, [router]);

  // Veri Dinleme
  useEffect(() => {
    if (!user) return;
    const unsubscribeData = onSnapshot(collection(db, "flocks"), (snapshot) => {
      const liveData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          hatchDate: data.hatchDate?.toDate(),
          moltDate: data.moltDate?.toDate(),
          transferDate: data.transferDate?.toDate(),
          exitDate: data.exitDate?.toDate(),
          name: data.name || '',
          initialCount: data.initialCount || 0,
          chickCoopId: data.chickCoopId || undefined
        } as Flock;
      });
      setFlocks(liveData);
    });
    return () => unsubscribeData();
  }, [user]);

  // Takvim Ayarları (Başlangıç: 2023)
  const timelineStart = useMemo(() => startOfWeek(new Date(2023, 6, 1), { weekStartsOn: 1 }), []); 
  const minEndDate = useMemo(() => new Date(2027, 11, 31), []);

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
    const bufferedEndDate = addWeeks(maxDate, 12);
    return Math.max(differenceInWeeks(bufferedEndDate, timelineStart), 52); 
  }, [flocks, minEndDate, timelineStart]);

  const totalHeight = totalViewWeeks * RULES.pixelsPerWeek;
  
  // Bugün Çizgisi Konumu
  const daysUntilToday = differenceInCalendarDays(new Date(), timelineStart);
  const todayTopPos = ((daysUntilToday / 7) * RULES.pixelsPerWeek) + COLUMN_HEADER_HEIGHT;
  const weeksUntilToday = Math.floor(daysUntilToday / 7);

  // Otomatik Scroll (Bugün)
  useEffect(() => {
    if (!authLoading && scrollContainerRef.current && !hasScrolledRef.current) {
      if (todayTopPos > 0) {
        const scrollPos = Math.max(0, todayTopPos - 300);
        scrollContainerRef.current.scrollTop = scrollPos;
        hasScrolledRef.current = true;
      }
    }
  }, [authLoading, todayTopPos]);

  // Hayalet Satır
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!highlightRef.current || !scrollContainerRef.current) return;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top + scrollContainerRef.current.scrollTop; 
    
    // Header'ı hesaba kat
    const yWithoutHeader = relativeY - COLUMN_HEADER_HEIGHT;

    if (yWithoutHeader < 0) {
        highlightRef.current.style.display = 'none';
        return;
    }

    const weekIndex = Math.floor(yWithoutHeader / RULES.pixelsPerWeek);
    const topPos = (weekIndex * RULES.pixelsPerWeek) + COLUMN_HEADER_HEIGHT;

    highlightRef.current.style.display = 'block';
    highlightRef.current.style.transform = `translateY(${topPos}px)`;
  };

  const handleMouseLeave = () => {
    if (highlightRef.current) highlightRef.current.style.display = 'none';
  };

  // Sürü Oluşturma (Modal Açılır)
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { over, active } = event;

    if (over && active.id === 'new-flock-source') {
      const coopId = over.id as string;
      setNextFlockNum(flocks.length + 1);
      setTargetCoopId(coopId);
      setIsModalOpen(true);
    }
  };

  const handleModalSuccess = (newFlockId: string) => {
    setSelectedFlockId(newFlockId);
  };

  // Silme (Batch & Cascade)
  const removeFlock = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("DİKKAT: Bu sürüyü ve tüm verim kayıtlarını silmek üzeresiniz. Devam edilsin mi?")) return;

    try {
      const logsQuery = query(collection(db, "daily_logs"), where("flockId", "==", id));
      const snapshot = await getDocs(logsQuery);
      const batchSize = 500;
      const docs = snapshot.docs;
      
      for (let i = 0; i < docs.length; i += batchSize) {
          const chunk = docs.slice(i, i + batchSize);
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
      }

      await deleteDoc(doc(db, "flocks", id));
      if (selectedFlockId === id) setSelectedFlockId(null);
    } catch (error) { console.error("Silme hatası:", error); }
  };

  // Güncelleme
  const updateFlock = async (updatedFlock: Flock) => {
    // Firebase undefined değerleri kabul etmez, null veya field'ı hiç eklememek gerekiyor
    // chickCoopId undefined ise, field'ı kaldır
    const updateData: any = {
      ...updatedFlock,
      hatchDate: updatedFlock.hatchDate,
      transferDate: updatedFlock.transferDate || null,
      exitDate: updatedFlock.exitDate || null,
      moltDate: updatedFlock.moltDate || null,
    };
    
    // undefined değerleri kaldır
    if (updateData.chickCoopId === undefined) {
      delete updateData.chickCoopId;
    } else if (updateData.chickCoopId === null) {
      updateData.chickCoopId = null;
    }
    
    // Diğer undefined değerleri de kaldır
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    try {
      const flockRef = doc(db, "flocks", updatedFlock.id);
      await updateDoc(flockRef, {
        ...updateData,
        updatedAt: new Date()
      });
    } catch (error) { console.error("Güncelleme hatası:", error); }
  };

  const selectedFlock = flocks.find(f => f.id === selectedFlockId);

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-50">Yükleniyor...</div>;
  if (!user) return null;

  return (
    <DndContext onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col bg-slate-50 font-sans overflow-hidden">
        <Header />
        
        <div className="flex grow overflow-hidden">
          <div 
            ref={scrollContainerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="grow overflow-y-auto relative flex scroll-smooth group select-none" 
            style={{ height: 'calc(100vh - 64px)' }}
          >
            {/* HAYALET SATIR */}
            <div 
                ref={highlightRef}
                className="absolute left-0 right-0 border-y-2 border-blue-400 bg-blue-100/10 pointer-events-none z-20 hidden transition-transform duration-75 ease-out"
                style={{ height: `${RULES.pixelsPerWeek}px` }}
            >
                <div className="absolute left-0 top-0 bottom-0 bg-blue-500 w-1"></div>
            </div>

            <DateSidebar timelineStart={timelineStart} totalWeeks={totalViewWeeks} />
            
            <div className="flex grow relative" style={{ minHeight: `${totalHeight + COLUMN_HEADER_HEIGHT}px` }}>
              {/* Sütunları Render Et */}
              {INITIAL_COOPS.filter(c => c.type === 'hen').map((coop) => (
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
                  onUpdateFlock={updateFlock}
                />
              ))}

              {/* DÜZELTME: BUGÜN ÇİZGİSİ EN SONA (ÜSTE) EKLENDİ */}
              {weeksUntilToday >= 0 && weeksUntilToday < totalViewWeeks && (
                <div 
                   className="absolute left-0 right-0 border-t-2 border-red-600 z-60 pointer-events-none shadow-sm"
                   style={{ top: `${todayTopPos}px` }} 
                >
                    <div className="absolute right-0 -top-2.5 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-l font-bold shadow-md">
                        BUGÜN
                    </div>
                </div>
              )}
            </div>
          </div>
          
          <SidebarRight 
            selectedFlock={selectedFlock}
            onUpdateFlock={updateFlock}
          />
        </div>

        <NewFlockModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          coopId={targetCoopId || ''}
          coopName={INITIAL_COOPS.find(c => c.id === targetCoopId)?.name}
          userEmail={user?.email}
          onSuccess={handleModalSuccess}
          nextFlockNumber={nextFlockNum} 
        />

        <DragOverlay>
            {activeId === 'new-flock-source' ? (
                <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-xl font-bold opacity-90 cursor-grabbing">
                   + Yeni Sürü
                </div>
            ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}