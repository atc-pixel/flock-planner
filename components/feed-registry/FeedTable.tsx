'use client';

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { 
  eachDayOfInterval, startOfDay, addDays, format, differenceInDays, addMonths
} from 'date-fns';
import { Loader2 } from 'lucide-react';
import { INITIAL_COOPS, Flock } from '@/lib/utils';
import { collection, query, where, getDocs, doc, writeBatch, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FeedTableRowData } from './types';
import { FeedToolbar } from './FeedToolbar';
import { FeedTableHeader } from './FeedTableHeader';
import { FeedTableRow } from './FeedTableRow';

export function FeedTable() {
  const [rows, setRows] = useState<FeedTableRowData[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [allFlocks, setAllFlocks] = useState<Flock[]>([]);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]); // Hayvan sayısı için
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCoopType, setSelectedCoopType] = useState<'hen' | 'chick'>('hen');

  const hasScrolledRef = useRef(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Seçili kümes tipine göre filtrele
  const filteredCoops = useMemo(() => {
    return INITIAL_COOPS.filter(coop => coop.type === selectedCoopType);
  }, [selectedCoopType]);

  // Tarih aralığı: 01.11.2025'ten başlayıp bugün+1 ay
  const startDate = useMemo(() => new Date('2025-11-01'), []);
  const endDate = useMemo(() => addMonths(new Date(), 1), []);

  // 1. VERİ ÇEKME
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Feed logs
      const feedQuery = query(
        collection(db, "feed_logs"),
        where("date", ">=", Timestamp.fromDate(startOfDay(startDate))),
        where("date", "<=", Timestamp.fromDate(startOfDay(endDate))),
        orderBy("date", "asc")
      );
      const feedSnapshot = await getDocs(feedQuery);
      const logs = feedSnapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        date: d.data().date.toDate() 
      }));
      setAllLogs(logs);

      // Flocks (kümes-sürü ilişkisi için)
      const flocksQuery = query(collection(db, "flocks"), orderBy("hatchDate", "desc"));
      const flocksSnapshot = await getDocs(flocksQuery);
      const flocks = flocksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        hatchDate: doc.data().hatchDate?.toDate(),
        transferDate: doc.data().transferDate?.toDate(),
        exitDate: doc.data().exitDate?.toDate(),
        name: doc.data().name || '#??',
        initialCount: doc.data().initialCount || 0,
        chickCoopId: doc.data().chickCoopId || undefined
      })) as Flock[];
      setAllFlocks(flocks);

      // Daily logs (hayvan sayısı hesaplama için)
      const dailyQuery = query(
        collection(db, "daily_logs"),
        orderBy("date", "asc")
      );
      const dailySnapshot = await getDocs(dailyQuery);
      const daily = dailySnapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        date: d.data().date.toDate()
      }));
      setDailyLogs(daily);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Kümes başına feed log'ları grupla (coopId ve flockId bazlı)
  // Aynı tarihte aynı coopId'de birden fazla kayıt olabilir (farklı sürüler için)
  // Bu yüzden flockId'ye göre de filtreleme yapacağız
  const logsByCoopAndDate = useMemo<Record<string, Record<string, any>>>(() => {
    const map: Record<string, Record<string, any>> = {};
    INITIAL_COOPS.forEach(coop => {
      map[coop.id] = {};
    });
    allLogs.forEach(log => {
      if (log.coopId && map[log.coopId]) {
        const dateKey = format(startOfDay(log.date), 'yyyy-MM-dd');
        // Eğer aynı tarihte zaten kayıt varsa, flockId'ye göre seç
        // (Aynı tarihte aynı coopId'de farklı sürüler olabilir)
        const existing = map[log.coopId][dateKey];
        if (!existing || (log.flockId && !existing.flockId)) {
          map[log.coopId][dateKey] = log;
        }
      }
    });
    return map;
  }, [allLogs]);

  // Aktif sürüyü bul (basit mantık)
  // Mantık:
  // 1. Sürü ID'sine bak
  // 2. Eğer chick fazındaysa (transfer öncesi) => chickCoopId'ye bak
  // 3. Eğer hen fazındaysa (transfer sonrası) => coopId'ye bak
  const getActiveFlockForCoop = useCallback((coopId: string, date: Date): Flock | null => {
    const targetDate = startOfDay(date);
    
    // Tüm sürüleri kontrol et
    for (const flock of allFlocks) {
      const start = startOfDay(flock.hatchDate);
      const end = flock.exitDate ? startOfDay(flock.exitDate) : addDays(start, 1000);
      
      // Tarih aralığında mı?
      if (targetDate < start || targetDate > end) continue;
      
      // Transfer kontrolü: Sürü chick fazında mı yoksa hen fazında mı?
      const isChickPhase = !flock.transferDate || targetDate < startOfDay(flock.transferDate);
      
      if (isChickPhase) {
        // Chick fazı: chickCoopId'ye bak
        if (flock.chickCoopId === coopId) {
          return flock;
        }
      } else {
        // Hen fazı: coopId'ye bak
        if (flock.coopId === coopId) {
          return flock;
        }
      }
    }
    
    return null;
  }, [allFlocks]);

  // Bugün için aktif sürüler (header'da gösterim için)
  const activeFlocksByCoop = useMemo<Record<string, Flock | null>>(() => {
    const today = new Date();
    const map: Record<string, Flock | null> = {};
    filteredCoops.forEach(coop => {
      const activeFlock = getActiveFlockForCoop(coop.id, today);
      map[coop.id] = activeFlock;
    });
    
    // Debug: Tüm sürüleri ve aktif sürüleri logla
    const todayDebug = new Date();
    console.log('[FeedTable] Bugün:', todayDebug);
    console.log('[FeedTable] Tüm sürüler:', allFlocks.map(f => {
      const isChick = !f.transferDate || todayDebug < startOfDay(f.transferDate);
      return {
        id: f.id,
        name: f.name,
        coopId: f.coopId,
        chickCoopId: f.chickCoopId,
        transferDate: f.transferDate,
        hatchDate: f.hatchDate,
        exitDate: f.exitDate,
        isChickPhase: isChick,
        shouldBeInCoop: isChick ? (f.chickCoopId || 'UNKNOWN') : f.coopId
      };
    }));
    console.log('[FeedTable] Aktif sürüler (bugün):', Object.entries(map).map(([coopId, flock]) => ({
      coopId,
      flock: flock ? { id: flock.id, name: flock.name } : null
    })));
    
    return map;
  }, [getActiveFlockForCoop, allFlocks]);

  // Kümes başına hayvan sayısı hesaplama (tarih bazlı)
  const getBirdsCountForDate = useCallback((coopId: string, date: Date): number => {
    // Aktif sürüyü bul (transfer mantığı ile)
    const activeFlock = getActiveFlockForCoop(coopId, date);
    
    if (!activeFlock) return 0;

    // Daily logs'tan o tarihteki mevcut hayvan sayısını hesapla
    const flockLogs = dailyLogs
      .filter(log => log.flockId === activeFlock.id)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningCount = activeFlock.initialCount || 0;
    const targetDate = startOfDay(date);

    for (const log of flockLogs) {
      const logDate = startOfDay(log.date);
      if (logDate > targetDate) break;
      runningCount -= (log.mortality || 0);
      runningCount = Math.max(0, runningCount);
    }

    return runningCount;
  }, [getActiveFlockForCoop, dailyLogs]);

  // Ortalama tüketim hesaplama
  const calculateAvgConsumption = useCallback((
    coopId: string,
    startDate: Date,
    endDate: Date,
    startCurrentFeed: number,
    endCurrentFeed: number,
    totalProduced: number,
    days: number
  ): number | null => {
    if (startCurrentFeed === null || endCurrentFeed === null) return null;

    if (days <= 0) return null;

    // Ortadaki tarih
    const midDate = addDays(startDate, Math.floor(days / 2));
    const birdsCount = getBirdsCountForDate(coopId, midDate);

    if (birdsCount <= 0) return null;

    // Tüketim = Başlangıç mevcut + Yapılan yemler - Bitiş mevcut (ton cinsinden)
    const consumed = startCurrentFeed + totalProduced - endCurrentFeed;
    if (consumed < 0) return null;

    // Ortalama = (Tüketim * 1000 * 1000) / Gün sayısı / Hayvan sayısı
    // Tüketim ton cinsinden, gram'a çevirmek için 1000 * 1000 = 1,000,000 ile çarpıyoruz
    // Sonuç: gram/hayvan/gün
    const avg = (consumed * 1000000) / days / birdsCount;
    return avg;
  }, [getBirdsCountForDate]);

  // Ortalama tüketim hesaplama fonksiyonu (yeniden kullanılabilir)
  const recalculateAvgConsumption = useCallback((rowsToRecalc: FeedTableRowData[]) => {
    const newRows = [...rowsToRecalc];
    
    filteredCoops.forEach(coop => {
      const coopId = coop.id;
      
      // Önce tüm ortalamaları temizle (mevcut yem silinirse ortalamalar da silinmeli)
      newRows.forEach(row => {
        row.coopData[coopId].avgConsumption = null;
      });
      
      let lastCurrentFeedIndex = -1;
      let lastCurrentFeed: number | null = null;

      for (let j = 0; j < newRows.length; j++) {
        const currentFeed = newRows[j].coopData[coopId].currentFeed;
        
        if (currentFeed !== null) {
          if (lastCurrentFeedIndex >= 0 && lastCurrentFeed !== null) {
            // İki mevcut yem arası hesapla
            // İlk mevcut yem günü dahil, son mevcut yem günü dahil değil (bir sonraki aralığın başlangıcı)
            const startDate = newRows[lastCurrentFeedIndex].date;
            const endDate = newRows[j].date;
            
            // Bu aralıktaki yapılan yemlerin toplamı (ilk mevcut günü dahil, son mevcut günü dahil değil)
            let totalProduced = 0;
            for (let k = lastCurrentFeedIndex; k < j; k++) {
              totalProduced += newRows[k].coopData[coopId].producedFeed || 0;
            }

            // Gün sayısı: İlk mevcut günü dahil, son mevcut günü dahil değil
            // Örnek: 1 Kasım (index 0) ve 10 Kasım (index 9) -> 1-9 Kasım = 9 gün
            const days = j - lastCurrentFeedIndex;

            const avg = calculateAvgConsumption(
              coopId,
              startDate,
              endDate,
              lastCurrentFeed,
              currentFeed,
              totalProduced,
              days
            );

            // Bu aralıktaki tüm günlere ortalama ata (ilk mevcut günü dahil, son mevcut günü dahil değil)
            for (let k = lastCurrentFeedIndex; k < j; k++) {
              newRows[k].coopData[coopId].avgConsumption = avg;
            }
          }
          
          lastCurrentFeedIndex = j;
          lastCurrentFeed = currentFeed;
        }
      }
      
      // En son mevcuttan sonraki tüm ortalamaları temizle (mevcut yem yoksa ortalama da olmamalı)
      if (lastCurrentFeedIndex >= 0) {
        for (let k = lastCurrentFeedIndex + 1; k < newRows.length; k++) {
          newRows[k].coopData[coopId].avgConsumption = null;
        }
      }
    });

    return newRows;
  }, [calculateAvgConsumption, filteredCoops]);

  // 2. GÜNLÜK SATIR OLUŞTURMA
  useEffect(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const newRows: FeedTableRowData[] = days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const coopData: Record<string, any> = {};

      filteredCoops.forEach(coop => {
        // O gün için aktif sürüyü bul
        const activeFlock = getActiveFlockForCoop(coop.id, day);
        
        // Yem kaydını bul (coopId ve flockId ile)
        let log = logsByCoopAndDate[coop.id]?.[dateKey];
        
        // Eğer log varsa, aktif sürü ile eşleşmeli
        if (log && activeFlock) {
          // Aktif sürü var: flockId uyuşmalı veya log.flockId olmamalı (eski kayıt - backward compatibility)
          if (log.flockId && log.flockId !== activeFlock.id) {
            log = null; // Farklı sürüye ait kayıt, gösterilmemeli
          }
          // Eğer log.flockId yoksa, aktif sürüye ait olduğunu varsay (backward compatibility)
        } else if (log && !activeFlock) {
          // Aktif sürü yok ama log var: Eğer log.flockId varsa gösterilmemeli (farklı sürü)
          // Eğer log.flockId yoksa göster (eski kayıt - backward compatibility)
          if (log.flockId) {
            log = null; // Aktif sürü yok ama log.flockId var, gösterilmemeli
          }
        }
        
        coopData[coop.id] = {
          logId: log?.id,
          flockId: activeFlock?.id || null,
          producedFeed: log?.producedFeed || 0,
          currentFeed: log?.currentFeed ?? null,
          avgConsumption: log?.avgConsumption ?? null,
          isDirty: false,
        };
      });

      return {
        date: day,
        coopData,
      };
    });

    // Ortalama tüketim hesaplama: İki mevcut yem arası
    const recalculated = recalculateAvgConsumption(newRows);
    setRows(recalculated);
  }, [logsByCoopAndDate, recalculateAvgConsumption, startDate, endDate, getActiveFlockForCoop]);

  // Bugüne scroll
  useLayoutEffect(() => {
    if (!loading && rows.length > 0 && !hasScrolledRef.current && tableContainerRef.current) {
      const todayId = `row-${format(new Date(), 'yyyy-MM-dd')}`;
      const todayEl = document.getElementById(todayId);

      if (todayEl) {
        const container = tableContainerRef.current;
        const rowHeight = 40;
        const offsetRows = 3;
        const topPos = todayEl.offsetTop;
        const scrollTo = Math.max(0, topPos - (rowHeight * offsetRows));
        
        container.scrollTo({ top: scrollTo, behavior: 'auto' });
        hasScrolledRef.current = true;
      }
    }
  }, [loading, rows]);

  // Cell change handler
  const handleCellChange = (dateKey: string, coopId: string, field: 'producedFeed' | 'currentFeed', value: string) => {
    const newRows = [...rows];
    const rowIndex = newRows.findIndex(r => format(r.date, 'yyyy-MM-dd') === dateKey);
    if (rowIndex === -1) return;

    const row = newRows[rowIndex];
    const numVal = value === '' ? (field === 'currentFeed' ? null : 0) : Number(value);
    
    row.coopData[coopId] = {
      ...row.coopData[coopId],
      [field]: numVal,
      isDirty: true,
    };

    // Mevcut yem veya yapılan yem değiştiyse ortalama tüketimi yeniden hesapla
    // (Yapılan yem değiştiğinde de hesaplama güncellenmeli çünkü toplam yapılan yem değişir)
    const recalculated = recalculateAvgConsumption(newRows);
    setRows(recalculated);
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      
      const changes: Array<{ row: FeedTableRowData; coopId: string }> = [];
      rows.forEach(row => {
        filteredCoops.forEach(coop => {
          if (row.coopData[coop.id]?.isDirty) {
            changes.push({ row, coopId: coop.id });
          }
        });
      });

      changes.forEach(({ row, coopId }) => {
        const data = row.coopData[coopId];
        const activeFlock = getActiveFlockForCoop(coopId, row.date);
        
        if (!activeFlock) {
          console.warn(`Aktif sürü bulunamadı: ${coopId} - ${format(row.date, 'yyyy-MM-dd')}`);
          return;
        }
        
        const docData = {
          coopId,
          flockId: activeFlock.id,
          date: Timestamp.fromDate(startOfDay(row.date)),
          producedFeed: data.producedFeed || 0,
          currentFeed: data.currentFeed,
        };

        if (data.logId) {
          const ref = doc(db, "feed_logs", data.logId);
          batch.update(ref, docData);
        } else {
          const ref = doc(collection(db, "feed_logs"));
          batch.set(ref, docData);
        }
      });

      await batch.commit();
      hasScrolledRef.current = false;
      await fetchData();
      alert("Kaydedildi.");
    } catch (error) {
      console.error("Hata:", error);
      alert("Hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center h-64">
        <Loader2 className="animate-spin mb-3 text-emerald-500" size={32} />
        <span className="text-xs font-medium">Veriler yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full max-h-[80vh]">
      <FeedToolbar 
        onSave={handleSave} 
        saving={saving}
        selectedCoopType={selectedCoopType}
        onCoopTypeChange={setSelectedCoopType}
      />

      {/* Table */}
      <div ref={tableContainerRef} className="overflow-auto grow scroll-smooth relative bg-slate-50">
        <table className="text-xs text-left border-collapse border-spacing-0 bg-white table-fixed">
          <FeedTableHeader activeFlocksByCoop={activeFlocksByCoop} coops={filteredCoops} />
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <FeedTableRow
                key={`row-${format(row.date, 'yyyy-MM-dd')}`}
                index={idx}
                row={row}
                onCellChange={handleCellChange}
                coops={filteredCoops}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

