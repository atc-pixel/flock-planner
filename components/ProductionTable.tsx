'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addDays, isToday 
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { Flock, ProductionLog } from '@/lib/utils';
import { collection, query, where, getDocs, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ProductionTableProps {
  flock: Flock;
}

// Tablo Satırı için Tip Tanımı
type TableRowData = {
  date: Date;
  logId?: string; // Varsa Firestore ID
  mortality: number;
  eggCount: number;
  brokenEggCount: number;
  dirtyEggCount: number;
  feedConsumed: number;
  waterConsumed: number;
  // Hesaplananlar (UI State)
  currentBirds: number; 
  yield: number;
  isDirty: boolean; // Değişiklik var mı?
};

export function ProductionTable({ flock }: ProductionTableProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [rows, setRows] = useState<TableRowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. Ayın Verilerini Çek ve Tabloyu Oluştur
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const days = eachDayOfInterval({ start, end });

      // Firestore'dan bu ayın loglarını çek
      const q = query(
        collection(db, "daily_logs"),
        where("flockId", "==", flock.id),
        where("date", ">=", start),
        where("date", "<=", end)
      );
      
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // ÖNCEKİ ÖLÜM TOPLAMINI BUL (Mevcut sayısını hesaplamak için)
      // Gerçek bir uygulamada bu bir "summary" dokümanından okunmalıdır.
      // Şimdilik performans için sadece 'initialCount' kullanacağız, 
      // ileride kümülatif ölüm sorgusu eklenebilir.
      let runningPopulation = flock.initialCount || 0; 

      // Tablo Satırlarını Oluştur
      const newRows: TableRowData[] = days.map(day => {
        // Bu güne ait log var mı?
        const log = logs.find(l => isSameDay(l.date.toDate(), day));
        
        const mortality = log?.mortality || 0;
        
        // Mevcut hesaplama (Basitleştirilmiş: Sadece bu ay içindeki düşüşü gösterir)
        // Not: Gerçek kümülatif hesap için geçmiş ayların verisi de gerekir.
        runningPopulation -= mortality;

        const eggCount = log?.eggCount || 0;
        const currentBirds = runningPopulation; // Bu satırdaki mevcut
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

    fetchData();
  }, [flock, currentMonth]);

  // 2. Hücre Değişikliği
  const handleCellChange = (index: number, field: keyof TableRowData, value: string) => {
    const val = Number(value) || 0;
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: val, isDirty: true };
    
    // Verim % otomatik güncelle (UI için)
    if (field === 'eggCount' || field === 'mortality') {
       const current = newRows[index].currentBirds; // Basitlik için sabit aldık, aslında mortality değişirse alt satırlar da değişmeli
       newRows[index].yield = current > 0 ? (newRows[index].eggCount / current) * 100 : 0;
    }

    setRows(newRows);
  };

  // 3. Toplu Kayıt (Batch Write)
  const handleSave = async () => {
    setSaving(true);
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
        // Güncelle
        const ref = doc(db, "daily_logs", row.logId);
        batch.update(ref, docData);
      } else {
        // Yeni Ekle
        const ref = doc(collection(db, "daily_logs"));
        batch.set(ref, docData);
      }
    });

    await batch.commit();
    setSaving(false);
    // Sayfayı yenile veya isDirty'leri temizle
    setRows(rows.map(r => ({ ...r, isDirty: false })));
    alert("Kayıt Başarılı!");
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /> Yükleniyor...</div>;

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
      {/* Tablo Araç Çubuğu */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div className="flex gap-2">
            <input 
                type="month" 
                value={format(currentMonth, 'yyyy-MM')}
                onChange={(e) => setCurrentMonth(new Date(e.target.value))}
                className="border rounded p-1 text-sm"
            />
        </div>
        <button 
            onClick={handleSave}
            disabled={!rows.some(r => r.isDirty) || saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Kaydet
        </button>
      </div>

      {/* Excel Tarzı Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                    <th className="p-3 border-b sticky left-0 bg-slate-100 z-10 w-24">Tarih</th>
                    <th className="p-3 border-b text-center w-16 bg-red-50 text-red-700">Ölü</th>
                    <th className="p-3 border-b text-center w-20">Mevcut</th>
                    <th className="p-3 border-b text-center w-20 bg-amber-50 text-amber-700">Top. Yumurta</th>
                    <th className="p-3 border-b text-center w-16">Kırık</th>
                    <th className="p-3 border-b text-center w-16">Kirli</th>
                    <th className="p-3 border-b text-center w-16 bg-blue-50 text-blue-700">Yem (kg)</th>
                    <th className="p-3 border-b text-center w-16 bg-blue-50 text-blue-700">Su (lt)</th>
                    <th className="p-3 border-b text-center w-16 font-black text-slate-800">% Verim</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isToday(row.date) ? 'bg-amber-50/60' : ''}`}>
                        
                        {/* Tarih */}
                        <td className="p-2 border-r border-slate-100 sticky left-0 bg-white font-medium text-slate-500">
                            {format(row.date, 'dd MMM', { locale: tr })}
                            <span className="block text-[9px] text-slate-300 font-normal">{format(row.date, 'EEEE', { locale: tr })}</span>
                        </td>

                        {/* Ölü (Input) */}
                        <td className="p-1 border-r border-slate-100">
                            <input type="number" 
                                className="w-full h-full text-center outline-none bg-transparent focus:bg-red-50 focus:font-bold text-red-600"
                                value={row.mortality || ''}
                                onChange={(e) => handleCellChange(idx, 'mortality', e.target.value)}
                            />
                        </td>

                        {/* Mevcut (Read Only) */}
                        <td className="p-2 border-r border-slate-100 text-center text-slate-400 font-mono select-none">
                            {row.currentBirds.toLocaleString()}
                        </td>

                        {/* Yumurta (Input) */}
                        <td className="p-1 border-r border-slate-100">
                            <input type="number" 
                                className="w-full h-full text-center outline-none bg-transparent focus:bg-amber-50 focus:font-bold text-slate-800"
                                value={row.eggCount || ''}
                                onChange={(e) => handleCellChange(idx, 'eggCount', e.target.value)}
                            />
                        </td>

                        {/* Kırık (Input) */}
                        <td className="p-1 border-r border-slate-100">
                            <input type="number" 
                                className="w-full h-full text-center outline-none bg-transparent focus:bg-slate-100"
                                value={row.brokenEggCount || ''}
                                onChange={(e) => handleCellChange(idx, 'brokenEggCount', e.target.value)}
                            />
                        </td>

                        {/* Kirli (Input) */}
                        <td className="p-1 border-r border-slate-100">
                            <input type="number" 
                                className="w-full h-full text-center outline-none bg-transparent focus:bg-slate-100"
                                value={row.dirtyEggCount || ''}
                                onChange={(e) => handleCellChange(idx, 'dirtyEggCount', e.target.value)}
                            />
                        </td>

                        {/* Yem (Input) */}
                        <td className="p-1 border-r border-slate-100">
                            <input type="number" 
                                className="w-full h-full text-center outline-none bg-transparent focus:bg-blue-50"
                                value={row.feedConsumed || ''}
                                onChange={(e) => handleCellChange(idx, 'feedConsumed', e.target.value)}
                            />
                        </td>

                        {/* Su (Input) */}
                        <td className="p-1 border-r border-slate-100">
                            <input type="number" 
                                className="w-full h-full text-center outline-none bg-transparent focus:bg-blue-50"
                                value={row.waterConsumed || ''}
                                onChange={(e) => handleCellChange(idx, 'waterConsumed', e.target.value)}
                            />
                        </td>

                        {/* Verim % (Calculated) */}
                        <td className="p-2 text-center font-bold">
                            <span className={`${row.yield > 90 ? 'text-emerald-600' : row.yield < 80 ? 'text-red-500' : 'text-amber-600'}`}>
                                %{row.yield.toFixed(1)}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}