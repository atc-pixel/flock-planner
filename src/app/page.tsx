'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { addWeeks, differenceInWeeks, differenceInCalendarDays, max, startOfDay, startOfWeek } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { useRouter } from 'next/navigation'; // Yönlendirme için

// Firebase Modülleri
import { db, auth } from '@/lib/firebase'; // auth eklendi
import { onAuthStateChanged, User } from 'firebase/auth'; // Auth dinleyici
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

import { Flock, INITIAL_COOPS, RULES, calculateTimeline } from '@/lib/utils';
import { Header } from '@/components/Header';
import { DateSidebar } from '@/components/DateSidebar';
import { CoopColumn } from '@/components/CoopColumn';
import { SidebarRight } from '@/components/SidebarRight';

const HEADER_HEIGHT = 40;

export default function FlockPlanner() {
  // --- AUTH STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  // --- APP STATE ---
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlockId, setSelectedFlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // 1. GÜVENLİK KONTROLÜ (AUTH GUARD)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        // Kullanıcı yoksa Login'e at
        router.push('/login');
      } else {
        // Kullanıcı varsa içeri al
        setUser(currentUser);
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, [router]);

  // 2. VERİ DİNLEME (Sadece kullanıcı giriş yapmışsa çalışır)
  useEffect(() => {
    if (!user) return; // Güvenlik önlemi

    const unsubscribeData = onSnapshot(collection(db, "flocks"), (snapshot) => {
      const liveData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          coopId: data.coopId,
          hatchDate: data.hatchDate?.toDate(),
          isMolting: data.isMolting,
          lane: data.lane,
          moltDate: data.moltDate?.toDate(),
          transferDate: data.transferDate?.toDate(),
          exitDate: data.exitDate?.toDate(),
        } as Flock;
      });
      setFlocks(liveData);
    });

    return () => unsubscribeData();
  }, [user]); // user değişince (giriş yapınca) çalışır

  // --- TAKVİM AYARLARI ---
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

  const daysUntilToday = differenceInCalendarDays(new Date(), timelineStart);
  const todayTopPos = ((daysUntilToday / 7) * RULES.pixelsPerWeek) + HEADER_HEIGHT;
  const weeksUntilToday = Math.floor(daysUntilToday / 7);

  useEffect(() => {
    if (scrollContainerRef.current && flocks.length === 0 && !authLoading) {
      const scrollPos = Math.max(0, todayTopPos - 300);
      scrollContainerRef.current.scrollTop = scrollPos;
    }
  }, [todayTopPos, flocks.length, authLoading]);

  // --- MOUSE HIGHLIGHT ---
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!highlightRef.current || !scrollContainerRef.current) return;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top + scrollContainerRef.current.scrollTop;
    const yWithoutHeader = relativeY - HEADER_HEIGHT;

    if (yWithoutHeader < 0) {
        highlightRef.current.style.display = 'none';
        return;
    }

    const weekIndex = Math.floor(yWithoutHeader / RULES.pixelsPerWeek);
    const topPos = (weekIndex * RULES.pixelsPerWeek) + HEADER_HEIGHT;

    highlightRef.current.style.display = 'block';
    highlightRef.current.style.transform = `translateY(${topPos}px)`;
  };

  const handleMouseLeave = () => {
    if (highlightRef.current) {
        highlightRef.current.style.display = 'none';
    }
  };

  // --- ACTIONS ---
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { over, active } = event;

    if (over && active.id === 'new-flock-source') {
      const coopId = over.id as string;
      const newHatchDate = startOfDay(new Date()); 
      const standardDuration = RULES.stdExitWeek + (RULES.sanitationWeeks || 3);
      const newEndDate = addWeeks(newHatchDate, standardDuration);

      const existingFlocksInCoop = flocks.filter(f => f.coopId === coopId);
      const isLane0Busy = existingFlocksInCoop.some(existingFlock => {
          if (existingFlock.lane !== 0) return false; 
          const existingTl = calculateTimeline(existingFlock);
          if (!existingTl) return false;
          return (newHatchDate < existingTl.sanitationEnd) && (newEndDate > existingFlock.hatchDate);
      });

      const assignedLane = isLane0Busy ? 1 : 0;

      const newFlockPayload = {
        coopId: coopId,
        hatchDate: newHatchDate, 
        isMolting: false,
        lane: assignedLane,
        moltDate: null,
        transferDate: null,
        exitDate: null,
        updatedBy: user?.email, // Kimin eklediğini de kaydedelim
        updatedAt: new Date()
      };

      try {
        const docRef = await addDoc(collection(db, "flocks"), newFlockPayload);
        setSelectedFlockId(docRef.id);
      } catch (e) {
        console.error("Ekleme hatası:", e);
        alert("Sürü eklenirken bir hata oluştu. İnternet bağlantınızı kontrol edin.");
      }
    }
  };

  const removeFlock = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Bu sürüyü silmek istediğinize emin misiniz?")) {
      try {
        await deleteDoc(doc(db, "flocks", id));
        if (selectedFlockId === id) setSelectedFlockId(null);
      } catch (error) {
        console.error("Silme hatası:", error);
      }
    }
  };

  const updateFlock = async (updatedFlock: Flock) => {
    try {
      const flockRef = doc(db, "flocks", updatedFlock.id);
      await updateDoc(flockRef, {
        coopId: updatedFlock.coopId,
        hatchDate: updatedFlock.hatchDate,
        isMolting: updatedFlock.isMolting,
        lane: updatedFlock.lane,
        moltDate: updatedFlock.moltDate || null,
        transferDate: updatedFlock.transferDate || null,
        exitDate: updatedFlock.exitDate || null,
        updatedBy: user?.email,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Güncelleme hatası:", error);
    }
  };

  const selectedFlock = flocks.find(f => f.id === selectedFlockId);

  // YÜKLENİYOR EKRANI
  if (authLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Sistem Yükleniyor...</p>
      </div>
    );
  }

  // Kullanıcı yoksa boş döndür (Router zaten Login'e atıyor)
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
            className="grow overflow-y-auto relative flex scroll-smooth group" 
            style={{ height: 'calc(100vh - 64px)' }}
          >
            <div 
                ref={highlightRef}
                className="absolute left-0 right-0 border-y-2 border-blue-400 bg-blue-100/10 pointer-events-none z-20 hidden transition-transform duration-75 ease-out"
                style={{ height: `${RULES.pixelsPerWeek}px` }}
            >
                <div className="absolute left-0 top-0 bottom-0 bg-blue-500 w-1"></div>
            </div>

            <DateSidebar timelineStart={timelineStart} totalWeeks={totalViewWeeks} />
            
            <div className="flex grow relative" style={{ minHeight: `${totalHeight + HEADER_HEIGHT}px` }}>
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