'use client';

import React from 'react';
import { format, isValid, parseISO, addWeeks, differenceInWeeks } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Bird, RefreshCw, ArrowRightCircle, LogOut, Edit3, X } from 'lucide-react';
import { Flock, INITIAL_COOPS } from '@/lib/utils';

interface SidebarRightProps {
  selectedFlock: Flock | null | undefined;
  onUpdateFlock: (updatedFlock: Flock) => void;
}

const formatDateForInput = (date: Date | undefined) => {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
};

const formatDateShort = (date: Date) => {
  return format(date, 'd MMM yyyy', { locale: tr });
};

export function SidebarRight({ selectedFlock, onUpdateFlock }: SidebarRightProps) {
  
  const handleHatchDateChange = (valueStr: string) => {
    if (!selectedFlock) return;
    const newDate = parseISO(valueStr);
    if (isValid(newDate)) {
       onUpdateFlock({ ...selectedFlock, hatchDate: newDate });
    }
  };

  // --- DÜZELTME 1: SEÇİM MANTIĞI ---
  const handleWeekSelect = (key: keyof Flock, weekStr: string) => {
    if (!selectedFlock || !selectedFlock.hatchDate) return;

    if (!weekStr) {
        onUpdateFlock({ ...selectedFlock, [key]: undefined });
        return;
    }

    const week = parseInt(weekStr, 10);
    
    // Transfer ve Molting, haftanın "BAŞLANGICINDA" olur.
    // Örn: 16. Hafta transferi için 15 tam hafta geçmesi gerekir. (week - 1)
    // Çıkış (Exit) ise bir "BİTİŞ" olayıdır. 90. hafta çıkışı için 90 hafta dolmalıdır.
    let weeksToAdd = week;
    if (key === 'transferDate' || key === 'moltDate') {
        weeksToAdd = week - 1;
    }

    const targetDate = addWeeks(selectedFlock.hatchDate, weeksToAdd);
    onUpdateFlock({ ...selectedFlock, [key]: targetDate });
  };

  // --- DÜZELTME 2: GÖRÜNTÜLEME MANTIĞI ---
  const getCurrentWeekValue = (key: keyof Flock, targetDate: Date | undefined) => {
    if (!targetDate || !selectedFlock?.hatchDate) return "";
    let diff = differenceInWeeks(targetDate, selectedFlock.hatchDate);
    
    // Transfer/Molt için veritabanında "Hafta Başı" (örn: 15) kayıtlı.
    // Ama kullanıcıya "16. Hafta" demeliyiz. O yüzden +1 ekliyoruz.
    if (key === 'transferDate' || key === 'moltDate') {
        diff += 1;
    }
    
    return diff.toString();
  };

  const getExitWeekRange = () => {
    if (selectedFlock?.isMolting) {
        return { start: 112, end: 130 };
    }
    return { start: 70, end: 90 };
  };

  const exitRange = getExitWeekRange();
  const exitWeekCount = exitRange.end - exitRange.start + 1;

  return (
    <div className="w-80 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col overflow-y-auto">
      {/* HEADER */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
         <Bird size={24} className="text-amber-500" />
         <h2 className="font-bold text-slate-800 text-xl">SidebarRight</h2>
      </div>

      {selectedFlock ? (
         <div className="p-5 space-y-6">
            
            {/* 1. KÜMES BİLGİSİ */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="relative z-10">
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">KÜMES</div>
                  <div className="text-3xl font-black text-slate-800">
                    {INITIAL_COOPS.find(c => c.id === selectedFlock.coopId)?.name}
                  </div>
                  <div className="mt-2">
                    <span className={`text-[10px] px-2 py-1 rounded-full text-white font-bold ${selectedFlock.isMolting ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                        {selectedFlock.isMolting ? 'MOLTING DÖNEMİ' : 'STANDART ÜRETİM'}
                    </span>
                  </div>
               </div>
            </div>

            {/* 2. CİVCİV GİRİŞ */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Edit3 size={12} /> Civciv Giriş Tarihi
                </label>
                <input 
                  type="date" 
                  value={formatDateForInput(selectedFlock.hatchDate)}
                  onChange={(e) => handleHatchDateChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 outline-none font-mono transition-all hover:bg-white focus:bg-white"
                />
            </div>

            <hr className="border-slate-100" />

            {/* 3. TRANSFER */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-1.5">
                  <ArrowRightCircle size={12} /> Transfer Haftası
                </label>
                <div className="relative">
                    <select 
                        value={getCurrentWeekValue('transferDate', selectedFlock.transferDate)}
                        onChange={(e) => handleWeekSelect('transferDate', e.target.value)}
                        className="w-full bg-blue-50/50 border border-blue-200 text-blue-900 text-sm rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-blue-500 outline-none font-mono appearance-none cursor-pointer hover:bg-white transition-colors"
                    >
                        <option value="">Otomatik (16. Hafta)</option>
                        {Array.from({ length: 11 }, (_, i) => i + 10).map(week => (
                            // DÜZELTME 3: Listede tarih gösterirken de (week - 1) kullanıyoruz ki
                            // kullanıcı o haftanın BAŞLANGIÇ tarihini görsün.
                            <option key={week} value={week}>
                                {week}. Hafta - {formatDateShort(addWeeks(selectedFlock.hatchDate, week - 1))}
                            </option>
                        ))}
                    </select>
                    
                    {selectedFlock.transferDate && (
                        <button 
                            onClick={() => handleWeekSelect('transferDate', '')}
                            className="absolute right-8 top-1/2 -translate-y-1/2 text-blue-400 hover:text-red-500 p-1 rounded-full hover:bg-blue-100 transition-colors z-10"
                            title="Sıfırla"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                </div>
            </div>

            {/* 4. MOLTING AYARLARI */}
            <div className={`p-4 rounded-xl border transition-all duration-300 ${selectedFlock.isMolting ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
               <label className="flex items-center justify-between cursor-pointer mb-3">
                  <span className={`text-xs font-bold uppercase flex items-center gap-2 ${selectedFlock.isMolting ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <RefreshCw size={14} />
                    Molting (Tüy Dökümü)
                  </span>
                  <div className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${selectedFlock.isMolting ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <span className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform shadow ${selectedFlock.isMolting ? 'translate-x-5' : 'translate-x-1'}`} />
                    <input 
                        type="checkbox" 
                        className="absolute opacity-0 w-full h-full cursor-pointer"
                        checked={selectedFlock.isMolting}
                        onChange={() => onUpdateFlock({...selectedFlock, isMolting: !selectedFlock.isMolting})}
                    />
                  </div>
               </label>

               {selectedFlock.isMolting && (
                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 relative">
                        <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">
                            Molting Başlangıç Haftası
                        </label>
                        <div className="relative">
                            <select 
                                value={getCurrentWeekValue('moltDate', selectedFlock.moltDate)}
                                onChange={(e) => handleWeekSelect('moltDate', e.target.value)}
                                className="w-full bg-white border border-emerald-300 text-emerald-900 text-sm rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-emerald-500 outline-none font-mono appearance-none cursor-pointer hover:bg-emerald-50/50 transition-colors"
                            >
                                <option value="">Seçiniz...</option>
                                {Array.from({ length: 26 }, (_, i) => i + 70).map(week => (
                                    <option key={week} value={week}>
                                        {week}. Hafta - {formatDateShort(addWeeks(selectedFlock.hatchDate, week - 1))}
                                    </option>
                                ))}
                            </select>

                            {selectedFlock.moltDate && (
                                <button 
                                    onClick={() => handleWeekSelect('moltDate', '')}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-red-500 p-1 rounded-full hover:bg-emerald-100 transition-colors z-10"
                                    title="Sıfırla"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                        </div>
                        
                        <p className="text-[9px] text-emerald-600 mt-2 font-medium bg-white/50 p-2 rounded border border-emerald-100">
                            ℹ️ Seçilen haftadan itibaren:<br/>
                            • 7 gün hazırlık (Gri)<br/>
                            • 23 gün dinlenme (Yeşil)
                        </p>
                   </div>
               )}
            </div>

            {/* 5. ÇIKIŞ / KESİM */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-red-600 uppercase flex items-center gap-1.5">
                  <LogOut size={12} /> Çıkış Haftası (Kesim)
                </label>
                <div className="relative">
                    <select 
                        value={getCurrentWeekValue('exitDate', selectedFlock.exitDate)}
                        onChange={(e) => handleWeekSelect('exitDate', e.target.value)}
                        className="w-full bg-red-50/50 border border-red-200 text-red-900 text-sm rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-red-500 outline-none font-mono appearance-none cursor-pointer hover:bg-white transition-colors"
                    >
                        <option value="">Otomatik ({selectedFlock.isMolting ? '125' : '90'}. Hafta)</option>
                        {Array.from({ length: exitWeekCount }, (_, i) => i + exitRange.start).map(week => (
                            <option key={week} value={week}>
                                {/* Çıkış tarihi bir Bitiş olduğu için week-1 yapmıyoruz, tam hafta sayısını ekliyoruz */}
                                {week}. Hafta - {formatDateShort(addWeeks(selectedFlock.hatchDate, week))}
                            </option>
                        ))}
                    </select>

                    {selectedFlock.exitDate && (
                        <button 
                            onClick={() => handleWeekSelect('exitDate', '')}
                            className="absolute right-8 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition-colors z-10"
                            title="Sıfırla"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-red-400">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                </div>
            </div>

            <hr className="border-slate-100" />

         </div>
      ) : (
         <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10 text-center bg-slate-50/30">
            <Bird size={64} className="mb-6 opacity-10" />
            <p className="text-base font-medium text-slate-600">Bir sürü seçilmedi.</p>
            <p className="text-xs mt-2 opacity-70">Düzenlemek istediğiniz sürünün üzerine tıklayın.</p>
         </div>
      )}
    </div>
  );
}