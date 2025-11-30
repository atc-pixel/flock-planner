'use client';

import React from 'react';
import { format } from 'date-fns';
import { Save, Loader2 } from 'lucide-react';
import { TableRowData } from './types';

interface ProductionToolbarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onSave: () => void;
  rows: TableRowData[];
  saving: boolean;
}

export function ProductionToolbar({ currentMonth, onMonthChange, onSave, rows, saving }: ProductionToolbarProps) {
  const isSaveDisabled = !rows.some(r => r.isDirty) || saving;
  
  // Özet Hesaplamaları
  const totalEgg = rows.reduce((a, b) => a + b.eggCount, 0);
  const totalFeed = rows.reduce((a, b) => a + b.feedConsumed, 0);

  return (
    <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex justify-between items-center sticky top-0 z-20 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="relative">
          <input 
            type="month" 
            value={format(currentMonth, 'yyyy-MM')}
            onChange={(e) => onMonthChange(new Date(e.target.value))}
            className="bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm cursor-pointer hover:border-emerald-400 transition-colors"
          />
        </div>
        
        {/* Özet Bilgi */}
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-500 font-medium px-3 border-l border-slate-300">
          <span>Top. Yumurta: <strong className="text-amber-600">{totalEgg.toLocaleString()}</strong></span>
          <span>Top. Yem: <strong className="text-blue-600">{totalFeed.toLocaleString()} kg</strong></span>
        </div>
      </div>

      <button 
        onClick={onSave}
        disabled={isSaveDisabled}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
      >
        {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </div>
  );
}