'use client';

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
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

import { TableRowData } from './types';

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

  // 2. HESAPLAMA VE SATIR OLUŞTURMA
  useEffect(() => {
    const startDate = startOfDay(flock.hatchDate);
    // İsteğe bağlı: Transfer tarihinden başlatmak istersen burayı değiştirebilirsin
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
      
      // YENİ: Sağlam Yumurta = Toplam - (Kırık + Kirli)
      // Veritabanı tutarlılığı için eksiye düşmemesini sağlıyoruz
      const goodCount = Math.max(0, totalEggCount - brokenEggCount - dirtyEggCount);
      
      // YENİ: Notlar
      const notes = log?.notes || "";

      const avgWeight = log?.avgWeight || 0;
      const feedConsumed = log?.feedConsumed || 0;
      const waterConsumed = log?.waterConsumed || 0;

      // Verim Hesabı: Toplam Yumurta / Mevcut
      const yieldVal = currentBirds > 0 ? (totalEggCount / currentBirds) * 100 : 0;
      
      // Oranlar (Toplam üzerinden)
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
        eggCount: totalEggCount, // DB'deki esas toplam
        goodCount,               // Arayüz için hesaplanan
        brokenEggCount,
        dirtyEggCount,
        avgWeight,
        feedConsumed,
        waterConsumed,
        notes,                   // Not verisi
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

  // Tab Değişikliğinde Scroll Reset
  useEffect(() => {
    if (viewMode !== 'table') {
        hasScrolledRef.current = false;
    }
  }, [viewMode]);

  // Işınlanma (Otomatik Scroll)
  useLayoutEffect(() => {
    if (viewMode === 'table' && !loading && rows.length > 0 && !hasScrolledRef.current) {
        const todayId = `row-${format(new Date(), 'yyyy-MM-dd')}`;
        const todayEl = document.getElementById(todayId);
        if (todayEl) {
            todayEl.scrollIntoView({ behavior: 'auto', block: 'start' });
            hasScrolledRef.current = true;
        }
    }
  }, [loading, rows, viewMode]);

  // --- HANDLERS ---

  const handleInitialCountChange = (value: string) => {
    setLocalInitialCount(Number(value)); 
  };

  const handleCellChange = (index: number, field: keyof TableRowData, value: string) => {
    const newRows = [...rows];
    let row = { ...newRows[index], isDirty: true };

    // String/Number ayrımı: Notlar text, diğerleri number
    if (field === 'notes') {
        row.notes = value;
    } else {
        const numVal = value === '' ? 0 : Number(value);
        // @ts-ignore - Dinamik key ataması güvenli kabul edildi
        row[field] = numVal;
    }

    // Yumurta Sayıları Değiştiyse TOPLAMI Güncelle
    if (field === 'goodCount' || field === 'brokenEggCount' || field === 'dirtyEggCount') {
        row.eggCount = row.goodCount + row.brokenEggCount + row.dirtyEggCount;
    }

    // Türetilmiş Değerleri (Verim, Oranlar) Tekrar Hesapla
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
              eggCount: row.eggCount, // Toplam olarak kaydediyoruz
              avgWeight: row.avgWeight,
              brokenEggCount: row.brokenEggCount,
              dirtyEggCount: row.dirtyEggCount,
              feedConsumed: row.feedConsumed,
              waterConsumed: row.waterConsumed,
              notes: row.notes || "" // Notları kaydet
          };

          if (row.logId) {
              const ref = doc(db, "daily_logs", row.logId);
              batch.update(ref, docData);
          } else {
              const ref = doc(collection(db, "daily_logs"));
              batch.set(ref, docData);
          }
        });

        // Başlangıç sayısı değiştiyse onu da güncelle
        if (localInitialCount !== flock.initialCount) {
            const flockRef = doc(db, "flocks", flock.id);
            batch.update(flockRef, { initialCount: localInitialCount });
        }

        await batch.commit();
        hasScrolledRef.current = false;
        await fetchData(); 
        alert("Başarıyla kaydedildi.");
    } catch (error) {
        console.error("Kayıt Hatası:", error);
        alert("Bir hata oluştu, konsolu kontrol ediniz.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center h-64">
        <Loader2 className="animate-spin mb-3 text-emerald-500" size={32} /> 
        <span className="text-xs font-medium">Veriler yükleniyor...</span>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full max-h-[80vh]">
      
      <ProductionToolbar 
        onSave={handleSave}
        rows={rows}
        saving={saving}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <div className="overflow-auto grow scroll-smooth relative bg-slate-50">
        
        {viewMode === 'table' && (
             <table className="w-full text-xs text-left border-collapse border-spacing-0 bg-white">
                <ProductionTableHeader />
                <tbody className="divide-y divide-slate-100">
                    {rows.map((row, idx) => (
                    <ProductionTableRow 
                        key={idx} 
                        index={idx}
                        row={row}
                        isFirstRow={idx === 0} 
                        onCellChange={handleCellChange}
                        onInitialCountChange={handleInitialCountChange}
                    />
                    ))}
                </tbody>
             </table>
        )}

        {viewMode === 'weekly' && (
            <ProductionWeeklyTable rows={rows} />
        )}

        {viewMode === 'chart' && (
            <ProductionCharts data={rows} />
        )}

      </div>
    </div>
  );
}