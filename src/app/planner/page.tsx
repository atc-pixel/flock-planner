'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { addWeeks, differenceInWeeks, differenceInCalendarDays, max, startOfDay, startOfWeek } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { useRouter } from 'next/navigation';

// Firebase
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, 
  writeBatch, query, where,  getDocs     // EKLENDİ
} from 'firebase/firestore';

import { Flock, INITIAL_COOPS, RULES, calculateTimeline } from '@/lib/utils';

// IMPORT YOLLARI (Planner Klasöründen)
import { Header } from '@/components/planner/Header';
import { DateSidebar } from '@/components/planner/DateSidebar';
import { CoopColumn } from '@/components/planner/CoopColumn';
import { SidebarRight } from '@/components/planner/SidebarRight';
// YENİ IMPORT: Modal bileşeni
import { NewFlockModal } from '@/components/planner/NewFlockModal';

const HEADER_HEIGHT = 64; 

export default function FlockPlanner() { //
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlockId, setSelectedFlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // YENİ STATE: Modal kontrolü için
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetCoopId, setTargetCoopId] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const [nextFlockNum, setNextFlockNum] = useState(1);

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
          // Firestore Timestamp -> Date dönüşümleri
          hatchDate: data.hatchDate?.toDate(),
          moltDate: data.moltDate?.toDate(),
          transferDate: data.transferDate?.toDate(),
          exitDate: data.exitDate?.toDate(),
          // Yeni alanlar için varsayılan değerler (eski kayıtlarda hata vermemesi için)
          name: data.name || '',
          initialCount: data.initialCount || 0
        } as Flock;
      });
      setFlocks(liveData);
    });
    return () => unsubscribeData();
  }, [user]);

  // Takvim Ayarları
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

  // Scroll to Today
  useEffect(() => {
    if (scrollContainerRef.current && flocks.length === 0 && !authLoading) {
      const rawTopPos = (daysUntilToday / 7) * RULES.pixelsPerWeek;
      const scrollPos = Math.max(0, rawTopPos - 300);
      scrollContainerRef.current.scrollTop = scrollPos;
    }
  }, [daysUntilToday, flocks.length, authLoading]);

  // Hayalet Satır
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!highlightRef.current || !scrollContainerRef.current) return;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top + scrollContainerRef.current.scrollTop; 
    
    if (relativeY < 0) {
        highlightRef.current.style.display = 'none';
        return;
    }

    const weekIndex = Math.floor(relativeY / RULES.pixelsPerWeek);
    const topPos = (weekIndex * RULES.pixelsPerWeek);

    highlightRef.current.style.display = 'block';
    highlightRef.current.style.transform = `translateY(${topPos}px)`;
  };

  const handleMouseLeave = () => {
    if (highlightRef.current) highlightRef.current.style.display = 'none';
  };

  // --- SÜRÜ OLUŞTURMA (Drag End GÜNCELLENDİ) ---
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { over, active } = event;

    if (over && active.id === 'new-flock-source') {
      const coopId = over.id as string;
      
      // Gelecek numarayı hesapla (Mevcut sürü sayısı + 1)
      setNextFlockNum(flocks.length + 1);
      
      setTargetCoopId(coopId);
      setIsModalOpen(true);
    }
  };

  // Modal Başarılı Olduğunda
  const handleModalSuccess = (newFlockId: string) => {
    setSelectedFlockId(newFlockId); // Yeni oluşturulan sürüyü seç
  };

  // Sürü ve Bağlı Verileri Silme
  const removeFlock = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("DİKKAT: Bu sürüyü ve ona ait TÜM GÜNLÜK VERİM KAYITLARINI silmek üzeresiniz.\n\nBu işlem geri alınamaz. Devam edilsin mi?")) {
      return;
    }

    try {
      // 1. Önce bu sürüye ait günlük verileri bul
      // Düşük performanslı cihazları yormamak için sorguyu sadece ID'ye göre yapıyoruz.
      const logsQuery = query(collection(db, "daily_logs"), where("flockId", "==", id));
      const snapshot = await getDocs(logsQuery);

      // 2. Toplu Silme (Batch) İşlemi
      // Firestore batch limiti 500 işlemdir. Eğer 500 günden yaşlı bir sürü ise
      // tek seferde silmek hata verir. Bu yüzden parçalara bölüyoruz (Chunking).
      const batchSize = 500;
      const docs = snapshot.docs;
      
      // Kayıtları 500'lük paketlere bölüp sırayla sil
      for (let i = 0; i < docs.length; i += batchSize) {
          const chunk = docs.slice(i, i + batchSize);
          const batch = writeBatch(db);
          
          chunk.forEach(doc => {
              batch.delete(doc.ref);
          });
          
          await batch.commit(); // Paketi gönder ve bekle
      }

      // 3. Günlükler temizlendi, şimdi sürünün kendisini sil
      await deleteDoc(doc(db, "flocks", id));

      if (selectedFlockId === id) setSelectedFlockId(null);
      
    } catch (error) { 
      console.error("Silme hatası:", error); 
      alert("Sürü silinirken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  // Sürü Güncelleme
  const updateFlock = async (updatedFlock: Flock) => {
    try {
      const flockRef = doc(db, "flocks", updatedFlock.id);
      await updateDoc(flockRef, {
        ...updatedFlock,
        hatchDate: updatedFlock.hatchDate,
        moltDate: updatedFlock.moltDate || null,
        transferDate: updatedFlock.transferDate || null,
        exitDate: updatedFlock.exitDate || null,
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
            
            <div className="flex grow relative" style={{ minHeight: `${totalHeight}px` }}>
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
                  onUpdateFlock={updateFlock}
                />
              ))}
            </div>
          </div>
          
          <SidebarRight 
            selectedFlock={selectedFlock}
            onUpdateFlock={updateFlock}
          />
        </div>

        {/* MODAL BİLEŞENİNE YENİ PROP EKLENDİ: nextFlockNumber */}
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