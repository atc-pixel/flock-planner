'use client';

import React from 'react';
import { format, isValid, parseISO } from 'date-fns';
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

export function SidebarRight({ selectedFlock, onUpdateFlock }: SidebarRightProps) {
  
  const handleDateChange = (key: keyof Flock, valueStr: string) => {
    if (!selectedFlock) return;
    
    if (!valueStr) {
        // Temizle
        onUpdateFlock({ ...selectedFlock, [key]: undefined });
        return;
    }

    const newDate = parseISO(valueStr);
    if (isValid(newDate)) {
       onUpdateFlock({ ...selectedFlock, [key]: newDate });
    }
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col overflow-y-auto">
      {/* HEADER */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
         <Bird size={24} className="text-amber-500" />
         <h2 className="font-bold text-slate-800 text-xl">Sürü Yönetimi</h2>
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

            {/* 2. CİVCİV GİRİŞ (ZORUNLU - SİLİNEMEZ) */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Edit3 size={12} /> Civciv Giriş Tarihi
                </label>
                <input 
                  type="date" 
                  value={formatDateForInput(selectedFlock.hatchDate)}
                  onChange={(e) => handleDateChange('hatchDate', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 outline-none font-mono transition-all hover:bg-white focus:bg-white"
                />
            </div>

            <hr className="border-slate-100" />

            {/* 3. TRANSFER (OPSİYONEL & SİLİNEBİLİR) */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-1.5">
                  <ArrowRightCircle size={12} /> Transfer Tarihi
                </label>
                <div className="relative">
                    <input 
                    type="date" 
                    value={formatDateForInput(selectedFlock.transferDate)}
                    onChange={(e) => handleDateChange('transferDate', e.target.value)}
                    // pr-8 ekledik ki yazı butona girmesin
                    className="w-full bg-blue-50/50 border border-blue-200 text-blue-900 text-sm rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-blue-500 outline-none font-mono transition-all hover:bg-white focus:bg-white"
                    />
                    {selectedFlock.transferDate && (
                        <button 
                            onClick={() => handleDateChange('transferDate', '')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-red-500 p-1 rounded-full hover:bg-blue-100 transition-colors"
                            title="Varsayılan'a Dön (Temizle)"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <p className="text-[9px] text-slate-400 pl-1">
                    {selectedFlock.transferDate ? 'Özel tarih ayarlandı.' : 'Otomatik (16-18. Hafta)'}
                </p>
            </div>

            {/* 4. ÇIKIŞ / KESİM (OPSİYONEL & SİLİNEBİLİR) */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-red-600 uppercase flex items-center gap-1.5">
                  <LogOut size={12} /> Çıkış Tarihi (Kesim)
                </label>
                <div className="relative">
                    <input 
                    type="date" 
                    value={formatDateForInput(selectedFlock.exitDate)}
                    onChange={(e) => handleDateChange('exitDate', e.target.value)}
                    className="w-full bg-red-50/50 border border-red-200 text-red-900 text-sm rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-red-500 outline-none font-mono transition-all hover:bg-white focus:bg-white"
                    />
                    {selectedFlock.exitDate && (
                        <button 
                            onClick={() => handleDateChange('exitDate', '')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition-colors"
                            title="Otomatik Hesaplamaya Dön"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <p className="text-[9px] text-slate-400 pl-1">
                    {selectedFlock.exitDate 
                        ? 'Manuel tarih. Temizlik bundan sonra başlar.' 
                        : `Otomatik hesaplanıyor (${selectedFlock.isMolting ? '125' : '90'}. Hafta)`}
                </p>
            </div>

            <hr className="border-slate-100" />

            {/* 5. MOLTING AYARLARI */}
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

               {/* Molting Tarihi (Sadece Açıksa) */}
               {selectedFlock.isMolting && (
                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 relative">
                        <div className="relative">
                            <input 
                                type="date" 
                                value={formatDateForInput(selectedFlock.moltDate)}
                                onChange={(e) => handleDateChange('moltDate', e.target.value)}
                                className="w-full bg-white border border-emerald-300 text-emerald-900 text-sm rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                            />
                            {selectedFlock.moltDate && (
                                <button 
                                    onClick={() => handleDateChange('moltDate', '')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-red-500 p-1 rounded-full hover:bg-emerald-50 transition-colors"
                                    title="Tarihi Temizle"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <p className="text-[9px] text-emerald-600 mt-1.5 font-medium">
                            Seçilen tarihten itibaren: <br/>
                            • 7 gün hazırlık (Gri)<br/>
                            • 23 gün dinlenme (Yeşil)
                        </p>
                   </div>
               )}
            </div>

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