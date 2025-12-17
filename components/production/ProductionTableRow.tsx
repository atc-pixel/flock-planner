import React, { useState, useEffect, useRef } from 'react'; // useRef eklendi
import { TableRowData } from './types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ProductionTableRowProps {
  index: number;
  row: TableRowData;
  isFirstRow: boolean;
  onCellChange: (index: number, field: keyof TableRowData, value: string) => void;
  onInitialCountChange?: (value: string) => void;
}

// React.memo ile sarmalayarak gereksiz render'ları engelliyoruz
export const ProductionTableRow = React.memo(({ 
    index, 
    row, 
    isFirstRow, 
    onCellChange,
    onInitialCountChange
}: ProductionTableRowProps) => {

  // --- LOCAL STATE YÖNETİMİ ---
  // Props'tan gelen veriyi state'e alıyoruz ki kullanıcı yazarken tablo render edilmesin
  const [localData, setLocalData] = useState({
      mortality: row.mortality,
      goodCount: row.goodCount,
      brokenEggCount: row.brokenEggCount,
      dirtyEggCount: row.dirtyEggCount,
      feedConsumed: row.feedConsumed,
      waterConsumed: row.waterConsumed,
      avgWeight: row.avgWeight,
      notes: row.notes || ""
  });

  // Eğer dışarıdan (DB'den veya hesaplamadan) veri değişirse local state'i güncelle
  useEffect(() => {
    setLocalData({
        mortality: row.mortality,
        goodCount: row.goodCount,
        brokenEggCount: row.brokenEggCount,
        dirtyEggCount: row.dirtyEggCount,
        feedConsumed: row.feedConsumed,
        waterConsumed: row.waterConsumed,
        avgWeight: row.avgWeight,
        notes: row.notes || ""
    });
  }, [row]);

  // Hücreden çıkınca (onBlur) ana tabloya haber ver
  const handleBlur = (field: keyof TableRowData, val: string | number) => {
    // Sadece değer gerçekten değiştiyse tetikle (Performans için kritik)
    // @ts-ignore
    if (val != row[field]) { 
        onCellChange(index, field, val.toString());
    }
  };

  // Input değişince sadece local state'i güncelle (Anlık tepki, kasma yok)
  const handleChange = (field: keyof typeof localData, val: string) => {
    setLocalData(prev => ({ ...prev, [field]: val }));
  };

  const dateLabel = format(row.date, 'd MMM EEEE', { locale: tr });
  const rowId = `row-${format(row.date, 'yyyy-MM-dd')}`;

  // Bugün mü?
  const isToday = new Date().toDateString() === row.date.toDateString();
  
  // Özel Olay Renkleri
  let rowClass = isToday ? "bg-blue-50/60" : "hover:bg-slate-50";
  if (row.specialEvent) {
      if (row.specialEvent.color === 'blue') rowClass = "bg-blue-100/30";
      else if (row.specialEvent.color === 'emerald') rowClass = "bg-emerald-100/30";
  }

  return (
    <tr id={rowId} className={`group transition-colors border-b border-slate-100 last:border-0 ${rowClass}`}>
      
      {/* 1. Tarih ve Yaş */}
      <td className="p-2 whitespace-nowrap border-r border-slate-100 bg-white/50 sticky left-0 z-10 group-hover:bg-slate-50">
        <div className="flex flex-col">
            <span className={`font-bold text-[11px] ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                {dateLabel}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded">
                    {row.ageInWeeks}. Hafta
                </span>
                {row.specialEvent && (
                    <span className={`text-[9px] font-bold px-1 rounded bg-${row.specialEvent.color}-100 text-${row.specialEvent.color}-700`}>
                        {row.specialEvent.title}
                    </span>
                )}
            </div>
        </div>
      </td>

      {/* 2. Mevcut (Current Birds) */}
      <td className="p-2 text-center border-r border-slate-100 w-24 bg-slate-50/30">
        <div className="flex flex-col items-center justify-center h-full">
            <span className="font-mono font-bold text-slate-600 text-xs">
                {row.currentBirds.toLocaleString()}
            </span>
            
            {/* Sadece ilk satırda Başlangıç Sayısı düzenlenebilir */}
            {isFirstRow && onInitialCountChange && (
                <div className="mt-1">
                     <span className="text-[9px] text-slate-400 block mb-0.5">Başlangıç:</span>
                     <input 
                        type="number"
                        className="w-16 text-center text-[10px] border border-blue-200 rounded bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                        defaultValue={row.currentBirds + row.mortality} 
                        onBlur={(e) => onInitialCountChange(e.target.value)}
                     />
                </div>
            )}
        </div>
      </td>

      {/* 3. Ölü (Mortality) */}
      <td className="p-1 border-r border-slate-100 w-16">
        <input 
            type="number" 
            min="0"
            className="w-full h-8 text-center bg-transparent focus:bg-white outline-none focus:ring-2 focus:ring-red-200 rounded font-bold text-red-600"
            value={localData.mortality || ''}
            onChange={(e) => handleChange('mortality', e.target.value)}
            onBlur={(e) => handleBlur('mortality', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </td>

      {/* 4. Verim % (Otomatik Hesaplanır - ReadOnly) */}
      <td className="p-1 border-r border-slate-100 w-16 bg-slate-50/50">
        <div className="flex items-center justify-center h-full">
            <span className={`font-bold text-xs ${row.yield < 85 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {row.yield > 0 ? `%${row.yield.toFixed(1)}` : '-'}
            </span>
        </div>
      </td>

      {/* 5. Yumurta Grubu (Sağlam, Kırık, Kirli) */}
      <td className="p-1 border-r border-slate-100 w-20">
        <input 
            type="number" 
            className="w-full h-8 text-center bg-transparent focus:bg-white outline-none focus:ring-2 focus:ring-emerald-200 rounded font-bold text-slate-700"
            placeholder="-"
            value={localData.goodCount || ''}
            onChange={(e) => handleChange('goodCount', e.target.value)}
            onBlur={(e) => handleBlur('goodCount', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        {/* Toplam Göstergesi (Alt bilgi) */}
        {row.eggCount > 0 && (
            <div className="text-[9px] text-center text-slate-400 font-mono -mt-1">
                ∑ {row.eggCount}
            </div>
        )}
      </td>

      <td className="p-1 border-r border-slate-100 w-16 bg-amber-50/30">
        <input 
            type="number" 
            className="w-full h-8 text-center bg-transparent focus:bg-white outline-none focus:ring-2 focus:ring-amber-200 rounded text-amber-700 font-medium"
            placeholder="-"
            value={localData.brokenEggCount || ''}
            onChange={(e) => handleChange('brokenEggCount', e.target.value)}
            onBlur={(e) => handleBlur('brokenEggCount', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </td>

      <td className="p-1 border-r border-slate-100 w-16 bg-slate-50/50">
        <input 
            type="number" 
            className="w-full h-8 text-center bg-transparent focus:bg-white outline-none focus:ring-2 focus:ring-slate-200 rounded text-slate-600 font-medium"
            placeholder="-"
            value={localData.dirtyEggCount || ''}
            onChange={(e) => handleChange('dirtyEggCount', e.target.value)}
            onBlur={(e) => handleBlur('dirtyEggCount', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </td>

      {/* 6. Gramaj */}
      <td className="p-1 border-r border-slate-100 w-16">
        <input 
            type="number" 
            step="0.1"
            className="w-full h-8 text-center bg-transparent focus:bg-white outline-none focus:ring-2 focus:ring-indigo-200 rounded text-indigo-700 font-bold"
            placeholder="-"
            value={localData.avgWeight || ''}
            onChange={(e) => handleChange('avgWeight', e.target.value)}
            onBlur={(e) => handleBlur('avgWeight', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </td>

      {/* 7. Yem ve Su */}
      <td className="p-1 border-r border-slate-100 w-20 bg-amber-50/10">
        <input 
            type="number" 
            className="w-full h-8 text-center bg-transparent focus:bg-white outline-none focus:ring-2 focus:ring-amber-200 rounded text-amber-800"
            placeholder="kg"
            value={localData.feedConsumed || ''}
            onChange={(e) => handleChange('feedConsumed', e.target.value)}
            onBlur={(e) => handleBlur('feedConsumed', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </td>

      <td className="p-1 border-r border-slate-100 w-20 bg-blue-50/10">
        <input 
            type="number" 
            className="w-full h-8 text-center bg-transparent focus:bg-white outline-none focus:ring-2 focus:ring-blue-200 rounded text-blue-800"
            placeholder="lt"
            value={localData.waterConsumed || ''}
            onChange={(e) => handleChange('waterConsumed', e.target.value)}
            onBlur={(e) => handleBlur('waterConsumed', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </td>

      {/* 8. Notlar */}
      <td className="p-1 relative">
         <input 
            type="text" 
            className="w-full h-8 px-2 text-left text-xs bg-transparent focus:bg-white outline-none focus:ring-2 focus:ring-slate-200 rounded text-slate-600 truncate focus:text-clip"
            placeholder="Not ekle..."
            value={localData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            onBlur={(e) => handleBlur('notes', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
         {/* Değişiklik İndikatörü */}
         {row.isDirty && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full" title="Kaydedilmedi" />
         )}
      </td>
    </tr>
  );
});

// React.memo için display name (Debugging için)
ProductionTableRow.displayName = 'ProductionTableRow';