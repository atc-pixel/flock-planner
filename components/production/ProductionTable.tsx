'use client';

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { 
  eachDayOfInterval, isSameDay, startOfDay, addDays, format, differenceInWeeks 
} from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Flock } from '@/lib/utils';
import { collection, query, where, getDocs, doc, writeBatch, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { ProductionToolbar } from './ProductionToolbar';
import { ProductionTableHeader } from './ProductionTableHeader';
import { ProductionTableRow } from './ProductionTableRow';
import { ProductionCharts } from './ProductionCharts';
import { ProductionWeeklyTable } from './ProductionWeeklyTable';

// TİPLERİ IMPORT ET
import { TableRowData, WeeklyData } from './types';

interface ProductionTableProps {
  flock: Flock;
}

export function ProductionTable({ flock }: ProductionTableProps) {
  const [rows, setRows] = useState<TableRowData[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'weekly'>('table');

  const [localInitialCount, setLocalInitialCount] = useState(flock.initialCount);
  const hasScrolledRef = useRef(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalInitialCount(flock.initialCount);
    hasScrolledRef.current = false; 
    setViewMode('table'); 
  }, [flock.id, flock.initialCount]);

  // 1. VERİ ÇEKME
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "daily_logs"),
        where("flockId", "==", flock.id),
        orderBy("date", "asc")
      );
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        date: d.data().date.toDate() 
      }));
      setAllLogs(logs); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [flock.id]);

  useEffect(() => {
    if (flock.id) fetchData();
  }, [fetchData]);

  // 2. GÜNLÜK SATIR OLUŞTURMA
  useEffect(() => {
    const startDate = startOfDay(flock.hatchDate);
    const endDate = addDays(new Date(), 30); 
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    let runningPopulation = localInitialCount || 0;

    const newRows: TableRowData[] = days.map(day => {
      const log = allLogs.find(l => isSameDay(l.date, day));
      const mortality = log?.mortality || 0;
      
      const currentBirds = runningPopulation; 
      runningPopulation -= mortality;

      const totalEggCount = log?.eggCount || 0;
      const brokenEggCount = log?.brokenEggCount || 0;
      const dirtyEggCount = log?.dirtyEggCount || 0;
      
      const goodCount = Math.max(0, totalEggCount - brokenEggCount - dirtyEggCount);
      const notes = log?.notes || "";
      const avgWeight = log?.avgWeight || 0;
      const feedConsumed = log?.feedConsumed || 0;
      const waterConsumed = log?.waterConsumed || 0;

      const yieldVal = currentBirds > 0 ? (totalEggCount / currentBirds) * 100 : 0;
      const brokenRate = totalEggCount > 0 ? (brokenEggCount / totalEggCount) * 100 : 0;
      const dirtyRate = totalEggCount > 0 ? (dirtyEggCount / totalEggCount) * 100 : 0;
      
      const ageInWeeks = differenceInWeeks(day, flock.hatchDate) + 1;

      let specialEvent = null;
      if (flock.transferDate && isSameDay(day, flock.transferDate)) {
          specialEvent = { title: 'KÜMES TRANSFERİ', color: 'blue' };
      } else if (flock.moltDate && isSameDay(day, flock.moltDate)) {
          specialEvent = { title: 'MOLTING BAŞLANGIÇ', color: 'emerald' };
      }

      return {
        date: day,
        logId: log?.id,
        mortality,
        eggCount: totalEggCount,
        goodCount,
        brokenEggCount,
        dirtyEggCount,
        avgWeight,
        feedConsumed,
        waterConsumed,
        notes,
        currentBirds,
        yield: yieldVal,
        brokenRate,
        dirtyRate,
        ageInWeeks, 
        isDirty: false,
        specialEvent
      };
    });

    setRows(newRows);
  }, [allLogs, localInitialCount, flock]); 

  // 3. HAFTALIK AGGREGATION
  const weeklyData = useMemo(() => {
    if (rows.length === 0) return [];
    
    // HATA ÇÖZÜMÜ 1: Dizinin tipini kesin olarak belirtiyoruz.
    const groups: WeeklyData[] = []; 
    
    // HATA ÇÖZÜMÜ 2: Değişkenin tipini kesin olarak belirtiyoruz.
    let currentWeek: WeeklyData | null = null;
    
    let weightSum = 0;
    let weightCount = 0;

    rows.forEach(row => {
        const weekKey = row.ageInWeeks.toString();

        if (!currentWeek || currentWeek.key !== weekKey) {
            if (currentWeek) {
                // Önceki haftayı kapatırken 'avgWeight' ataması yapıyoruz.
                // TypeScript artık currentWeek'in WeeklyData olduğunu bildiği için kızmayacak.
                currentWeek.avgWeight = weightCount > 0 ? weightSum / weightCount : 0;
                groups.push(currentWeek);
            }
            // Yeni hafta başlat
            weightSum = 0;
            weightCount = 0;
            
            // Tüm alanlarıyla tam bir WeeklyData objesi oluşturuyoruz
            currentWeek = {
                key: weekKey,
                weekNum: row.ageInWeeks,
                startDate: row.date,
                endDate: row.date,
                totalMortality: 0,
                totalEggs: 0,
                totalBroken: 0,
                totalDirty: 0,
                avgWeight: 0, // Başlangıç değeri
                birdDays: 0,
                startBirds: row.currentBirds + row.mortality,
                days: 0,
                notes: new Set<string>(),
            };
        }
        
        // Verileri işle
        currentWeek.endDate = row.date;
        currentWeek.totalMortality += row.mortality;
        currentWeek.totalEggs += row.eggCount;
        currentWeek.totalBroken += row.brokenEggCount;
        currentWeek.totalDirty += row.dirtyEggCount;
        currentWeek.birdDays += row.currentBirds;
        
        if (row.avgWeight > 0) {
            weightSum += row.avgWeight;
            weightCount++;
        }
        
        if (row.notes) currentWeek.notes.add(row.notes);
        currentWeek.days++;
    });
    
    // Son haftayı ekle
    if (currentWeek) {
        currentWeek.avgWeight = weightCount > 0 ? weightSum / weightCount : 0;
        groups.push(currentWeek);
    }

    return groups; 
  }, [rows]);

  // Tab Değişikliğinde Scroll Reset
  useEffect(() => {
    if (viewMode !== 'table') {
        hasScrolledRef.current = false;
    }
  }, [viewMode]);

  // Işınlanma
  useLayoutEffect(() => {
    if (viewMode === 'table' && !loading && rows.length > 0 && !hasScrolledRef.current && tableContainerRef.current) {
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
  }, [loading, rows, viewMode]);

  // Handlers
  const handleInitialCountChange = (value: string) => { setLocalInitialCount(Number(value)); };
  
  const handleCellChange = (index: number, field: keyof TableRowData, value: string) => {
    const newRows = [...rows];
    let row = { ...newRows[index], isDirty: true };
    if (field === 'notes') { row.notes = value; } else {
        const numVal = value === '' ? 0 : Number(value);
        // @ts-ignore
        row[field] = numVal;
    }
    if (field === 'goodCount' || field === 'brokenEggCount' || field === 'dirtyEggCount') {
        row.eggCount = row.goodCount + row.brokenEggCount + row.dirtyEggCount;
    }
    const current = row.currentBirds;
    const totalEggs = row.eggCount;
    row.yield = current > 0 ? (totalEggs / current) * 100 : 0;
    row.brokenRate = totalEggs > 0 ? (row.brokenEggCount / totalEggs) * 100 : 0;
    row.dirtyRate = totalEggs > 0 ? (row.dirtyEggCount / totalEggs) * 100 : 0;
    newRows[index] = row;
    setRows(newRows);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        const batch = writeBatch(db);
        const changes = rows.filter(r => r.isDirty);
        changes.forEach(row => {
          const docData = {
              flockId: flock.id,
              coopId: flock.coopId,
              date: row.date,
              mortality: row.mortality,
              eggCount: row.eggCount,
              avgWeight: row.avgWeight,
              brokenEggCount: row.brokenEggCount,
              dirtyEggCount: row.dirtyEggCount,
              feedConsumed: row.feedConsumed,
              waterConsumed: row.waterConsumed,
              notes: row.notes || ""
          };
          if (row.logId) {
              const ref = doc(db, "daily_logs", row.logId);
              batch.update(ref, docData);
          } else {
              const ref = doc(collection(db, "daily_logs"));
              batch.set(ref, docData);
          }
        });
        if (localInitialCount !== flock.initialCount) {
            const flockRef = doc(db, "flocks", flock.id);
            batch.update(flockRef, { initialCount: localInitialCount });
        }
        await batch.commit();
        hasScrolledRef.current = false;
        await fetchData(); 
        alert("Kaydedildi.");
    } catch (error) { console.error("Hata:", error); alert("Hata oluştu."); } finally { setSaving(false); }
  };

  if (loading) return <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center h-64"><Loader2 className="animate-spin mb-3 text-emerald-500" size={32} /><span className="text-xs font-medium">Veriler yükleniyor...</span></div>;

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full max-h-[80vh]">
      <ProductionToolbar onSave={handleSave} rows={rows} saving={saving} viewMode={viewMode} setViewMode={setViewMode} />
      <div ref={tableContainerRef} className="overflow-auto grow scroll-smooth relative bg-slate-50">
        
        {viewMode === 'table' && (
             <table className="w-full text-xs text-left border-collapse border-spacing-0 bg-white">
                <ProductionTableHeader />
                <tbody className="divide-y divide-slate-100">
                    {rows.map((row, idx) => (
                    <ProductionTableRow key={idx} index={idx} row={row} isFirstRow={idx === 0} onCellChange={handleCellChange} onInitialCountChange={handleInitialCountChange} />
                    ))}
                </tbody>
             </table>
        )}

        {viewMode === 'weekly' && (
            <ProductionWeeklyTable weeklyData={weeklyData} />
        )}

        {viewMode === 'chart' && (
            <ProductionCharts weeklyData={weeklyData} />
        )}

      </div>
    </div>
  );
}