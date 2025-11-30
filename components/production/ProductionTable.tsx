'use client';

import React, { useState, useEffect } from 'react';
import { 
  eachDayOfInterval, isSameDay, startOfDay, addDays, subDays, format, differenceInWeeks 
} from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Flock } from '@/lib/utils';
import { collection, query, where, getDocs, doc, writeBatch, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { ProductionToolbar } from './ProductionToolbar';
import { ProductionTableHeader } from './ProductionTableHeader';
import { ProductionTableRow } from './ProductionTableRow';
import { TableRowData } from './types';

interface ProductionTableProps {
  flock: Flock;
}

export function ProductionTable({ flock }: ProductionTableProps) {
  const [rows, setRows] = useState<TableRowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const startDate = startOfDay(flock.hatchDate);
      const endDate = addDays(new Date(), 30); 

      const days = eachDayOfInterval({ start: startDate, end: endDate });

      const q = query(
        collection(db, "daily_logs"),
        where("flockId", "==", flock.id),
        orderBy("date", "asc")
      );
      
      const snapshot = await getDocs(q);
      const allLogs = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        date: d.data().date.toDate() 
      } as any));

      let runningPopulation = flock.initialCount || 0;

      const newRows: TableRowData[] = days.map(day => {
        const log = allLogs.find(l => isSameDay(l.date, day));
        const mortality = log?.mortality || 0;
        
        const currentBirds = runningPopulation; 
        runningPopulation -= mortality;

        const eggCount = log?.eggCount || 0;
        const brokenEggCount = log?.brokenEggCount || 0;
        const dirtyEggCount = log?.dirtyEggCount || 0;

        const yieldVal = currentBirds > 0 ? (eggCount / currentBirds) * 100 : 0;
        const brokenRate = eggCount > 0 ? (brokenEggCount / eggCount) * 100 : 0;
        const dirtyRate = eggCount > 0 ? (dirtyEggCount / eggCount) * 100 : 0;
        
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
          eggCount,
          brokenEggCount,
          dirtyEggCount,
          feedConsumed: log?.feedConsumed || 0,
          waterConsumed: log?.waterConsumed || 0,
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
      setLoading(false);
    };

    if (flock.id) fetchData();
  }, [flock]);

  // Otomatik Scroll (Bugün - 6 gün)
  useEffect(() => {
    if (!loading && rows.length > 0) {
        // Hedef: 6 gün öncesi
        const targetDate = subDays(new Date(), 6);
        const targetId = `row-${format(targetDate, 'yyyy-MM-dd')}`;
        const element = document.getElementById(targetId);

        if (element) {
            element.scrollIntoView({ behavior: 'auto', block: 'start' }); // 'smooth' yerine 'auto' daha stabil olabilir ilk açılışta
        } else {
            const todayId = `row-${format(new Date(), 'yyyy-MM-dd')}`;
            const todayEl = document.getElementById(todayId);
            if (todayEl) todayEl.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
    }
  }, [loading, rows]);

  const handleCellChange = (index: number, field: keyof TableRowData, value: string) => {
    const val = value === '' ? 0 : Number(value);
    const newRows = [...rows];
    
    const row = { ...newRows[index], [field]: val, isDirty: true };

    const current = row.currentBirds;
    const eggs = row.eggCount;

    row.yield = current > 0 ? (eggs / current) * 100 : 0;
    row.brokenRate = eggs > 0 ? (row.brokenEggCount / eggs) * 100 : 0;
    row.dirtyRate = eggs > 0 ? (row.dirtyEggCount / eggs) * 100 : 0;

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
              brokenEggCount: row.brokenEggCount,
              dirtyEggCount: row.dirtyEggCount,
              feedConsumed: row.feedConsumed, 
              waterConsumed: row.waterConsumed, 
          };

          if (row.logId) {
              const ref = doc(db, "daily_logs", row.logId);
              batch.update(ref, docData);
          } else {
              const ref = doc(collection(db, "daily_logs"));
              batch.set(ref, docData);
          }
        });

        await batch.commit();
        setRows(prev => prev.map(r => ({ ...r, isDirty: false })));
        alert("Başarıyla kaydedildi!");
    } catch (error) {
        console.error("Hata:", error);
        alert("Bir hata oluştu.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
        <Loader2 className="animate-spin mb-2" /> 
        <span className="text-xs">Tablo Hazırlanıyor...</span>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full max-h-[80vh]">
      <ProductionToolbar 
        onSave={handleSave}
        rows={rows}
        saving={saving}
      />

      <div className="overflow-auto grow scroll-smooth relative">
        <table className="w-full text-xs text-left border-collapse border-spacing-0">
          <ProductionTableHeader />
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <ProductionTableRow 
                key={idx} 
                index={idx}
                row={row} 
                onCellChange={handleCellChange} 
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}