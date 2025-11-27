'use client';

import React from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Bird, TrendingUp, Calendar, Scissors, Droplets, Edit3 } from 'lucide-react';
import { Flock, calculateTimeline, INITIAL_COOPS } from '@/lib/utils';

interface SidebarRightProps {
  selectedFlock: Flock | null | undefined;
  onUpdateFlock: (updatedFlock: Flock) => void;
}

const safeFormat = (date: Date | undefined, fmt: string) => {
  if (!date || !isValid(date)) return '---';
  return format(date, fmt, { locale: tr });
};

// Input için YYYY-MM-DD formatı gerekir
const formatDateForInput = (date: Date) => {
  return format(date, 'yyyy-MM-dd');
};

export function SidebarRight({ selectedFlock, onUpdateFlock }: SidebarRightProps) {
  const selectedDetails = selectedFlock ? calculateTimeline(selectedFlock) : null;
  const safeDetails = selectedDetails || { transfer: undefined, peak: undefined, exit: undefined, sanitationEnd: undefined };

  // Tarih değişince çalışacak
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedFlock) return;
    const newDateStr = e.target.value;
    if (!newDateStr) return;
    
    // String tarihi Date objesine çevir
    const newDate = parseISO(newDateStr);
    if (isValid(newDate)) {
       onUpdateFlock({ ...selectedFlock, hatchDate: newDate });
    }
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
         <h2 className="font-bold text-slate-800 text-lg">Sürü Detayı</h2>
         <p className="text-xs text-slate-500">Seçili sürüyü düzenle</p>
      </div>

      {selectedFlock ? (
         <div className="p-4 space-y-6">
            
            {/* 1. Üst Bilgi Kartı */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition">
                 <Bird size={64} className="text-slate-800" />
               </div>
               <div className="flex justify-between items-start mb-2 relative z-10">
                  <span className="text-2xl font-bold text-slate-800">#{selectedFlock.id}</span>
                  <span className={`text-[10px] px-2 py-1 rounded-full text-white font-bold ${selectedFlock.isMolting ? 'bg-emerald-500' : 'bg-green-500'}`}>
                     {selectedFlock.isMolting ? 'MOLTING' : 'STANDART'}
                  </span>
               </div>
               <div className="text-sm text-slate-500 relative z-10">
                  Konum: <span className="font-semibold text-slate-700">{INITIAL_COOPS.find(c => c.id === selectedFlock.coopId)?.name}</span>
               </div>
            </div>

            {/* 2. Tarih Düzenleme Alanı */}
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <label className="text-[10px] font-bold text-amber-700 uppercase mb-1 flex items-center gap-1">
                  <Edit3 size={10} />
                  Kuluçka Tarihi (Başlangıç)
                </label>
                <input 
                  type="date" 
                  value={formatDateForInput(selectedFlock.hatchDate)}
                  onChange={handleDateChange}
                  className="w-full bg-white border border-amber-200 text-slate-700 text-sm rounded p-2 focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
                <p className="text-[10px] text-amber-600 mt-1 italic">
                  Not: Bu tarihi değiştirince tüm plan otomatik kayar.
                </p>
            </div>

            {/* 3. Hesaplanan Kritik Tarihler */}
            <div className="space-y-4 pt-2">
               <div className="relative pl-4 border-l-2 border-slate-200 space-y-5 ml-2">
                  
                  {/* Transfer */}
                  <div className="flex items-start gap-3 -ml-[21px]">
                     <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border-2 border-white ring-1 ring-slate-100"><TrendingUp size={10}/></div>
                     <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Transfer (16. H)</div>
                        <div className="text-sm font-semibold text-slate-800">{safeFormat(safeDetails.transfer, 'dd MMM yyyy')}</div>
                     </div>
                  </div>

                  {/* Pik */}
                  <div className="flex items-start gap-3 -ml-[21px]">
                     <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center border-2 border-white ring-1 ring-slate-100"><Calendar size={10}/></div>
                     <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Pik Verim (24. H)</div>
                        <div className="text-sm font-semibold text-slate-800">{safeFormat(safeDetails.peak, 'dd MMM yyyy')}</div>
                     </div>
                  </div>

                  {/* Çıkış */}
                  <div className="flex items-start gap-3 -ml-[21px]">
                     <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center border-2 border-white ring-1 ring-slate-100"><Scissors size={10}/></div>
                     <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Kesim / Çıkış</div>
                        <div className="text-sm font-semibold text-slate-800">{safeFormat(safeDetails.exit, 'dd MMM yyyy')}</div>
                     </div>
                  </div>
               </div>

               {/* Sanitasyon */}
               <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-lg border border-purple-100">
                  <div className="w-8 h-8 rounded bg-white text-purple-600 flex items-center justify-center shadow-sm"><Droplets size={16}/></div>
                  <div>
                     <div className="text-[10px] text-purple-500 font-bold uppercase">Temizlik Bitiş</div>
                     <div className="text-sm font-bold text-slate-800">{safeFormat(safeDetails.sanitationEnd, 'dd MMM yyyy')}</div>
                  </div>
               </div>
            </div>

            {/* 4. Molting Switch */}
            <div className="pt-4 border-t border-slate-100">
               <label className="flex items-center justify-between cursor-pointer p-3 hover:bg-slate-50 rounded-lg transition border border-transparent hover:border-slate-200">
                  <span className="text-sm font-medium text-slate-700">Molting (Tüy Dökümü)</span>
                  <div className={`w-10 h-5 rounded-full p-1 transition-colors duration-300 ${selectedFlock.isMolting ? 'bg-amber-500' : 'bg-slate-200'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform duration-300 ${selectedFlock.isMolting ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                  <input 
                     type="checkbox" 
                     checked={selectedFlock.isMolting}
                     onChange={() => onUpdateFlock({...selectedFlock, isMolting: !selectedFlock.isMolting})}
                     className="hidden"
                  />
               </label>
            </div>
         </div>
      ) : (
         <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center bg-slate-50/30">
            <Bird size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Düzenlemek için tablodan bir sürü seçin.</p>
         </div>
      )}
    </div>
  );
}