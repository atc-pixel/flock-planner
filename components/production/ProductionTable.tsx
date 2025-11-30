'use client';

import React, { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Flock } from '@/lib/utils';
import { collection, query, where, getDocs, doc, writeBatch, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Parçalanmış bileşenleri ve tipleri import ediyoruz
import { ProductionToolbar } from './ProductionToolbar';
import { ProductionTableHeader } from './ProductionTableHeader';
import { ProductionTableRow } from './ProductionTableRow';
import { TableRowData } from './types';

interface ProductionTableProps {
  flock: Flock;
}

export function ProductionTable({ flock }: ProductionTableProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [rows, setRows] = useState<TableRowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Veri Çekme
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const days = eachDayOfInterval({ start, end });

      // Sürünün tüm loglarını çek
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

      // Önceki ayların ölümlerini düş
      const prevLogs = allLogs.filter(l => l.date < start);
      const prevMortality = prevLogs.reduce((sum, l) => sum + (Number(l.mortality) || 0), 0);
      runningPopulation -= prevMortality;

      // Tablo satırlarını oluştur
      const newRows: TableRowData[] = days.map(day => {
        const log = allLogs.find(l => isSameDay(l.date, day));
        const mortality = log?.mortality || 0;
        
        const currentBirds = runningPopulation; 
        runningPopulation -= mortality;

        const eggCount = log?.eggCount || 0;
        const yieldVal = currentBirds > 0 ? (eggCount / currentBirds) * 100 : 0;

        return {
          date: day,
          logId: log?.id,
          mortality: mortality,
          eggCount: eggCount,
          brokenEggCount: log?.brokenEggCount || 0,
          dirtyEggCount: log?.dirtyEggCount || 0,
          feedConsumed: log?.feedConsumed || 0,
          waterConsumed: log?.waterConsumed || 0,
          currentBirds,
          yield: yieldVal,
          isDirty: false
        };
      });

      setRows(newRows);
      setLoading(false);
    };

    if (flock.id) fetchData();
  }, [flock, currentMonth]);

  // Hücre Değişikliği
  const handleCellChange = (index: number, field: keyof TableRowData, value: string) => {
    const val = value === '' ? 0 : Number(value);
    const newRows = [...rows];
    
    newRows[index] = { 
        ...newRows[index], 
        [field]: val, 
        isDirty: true 
    };
    
    if (field === 'eggCount') {
       const current = newRows[index].currentBirds;
       newRows[index].yield = current > 0 ? (val / current) * 100 : 0;
    }

    setRows(newRows);
  };

  // Kayıt
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
        alert("Kayıt Başarılı!");
    } catch (error) {
        console.error("Kayıt hatası:", error);
        alert("Bir hata oluştu.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
        <Loader2 className="animate-spin mb-2" /> 
        <span className="text-xs">Veriler Yükleniyor...</span>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full">
      <ProductionToolbar 
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        onSave={handleSave}
        rows={rows}
        saving={saving}
      />

      <div className="overflow-x-auto grow">
        <table className="w-full text-xs text-left border-collapse">
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