'use client';

import React from 'react';
import { Save, Loader2, Table, BarChart2 } from 'lucide-react';
import { TableRowData } from './types';

interface ProductionToolbarProps {
  onSave: () => void;
  rows: TableRowData[];
  saving: boolean;
  viewMode: 'table' | 'chart'; // YENİ PROP
  setViewMode: (mode: 'table' | 'chart') => void; // YENİ PROP
}

export function ProductionToolbar({ onSave, rows, saving, viewMode, setViewMode }: ProductionToolbarProps) {
  const isSaveDisabled = !rows.some(r => r.isDirty) || saving;
  
  const totalEgg = rows.reduce((a, b) => a + b.eggCount, 0);

  return (
    <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex justify-between items-center sticky top-0 z-20 backdrop-blur-sm h-14">
      
      {/* SOL: Görünüm Değiştirici (Tabs) */}
      <div className="flex bg-slate-200/50 p-1 rounded-lg">
        <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'table' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
        >
            <Table size={14} /> Tablo
        </button>
        <button
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'chart' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
        >
            <BarChart2 size={14} /> Grafikler
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Özet (Sadece Tablo modunda gösterilebilir veya her zaman) */}
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-500 font-medium border-r border-slate-300 pr-4 mr-1">
          <span>Toplam Yumurta: <strong className="text-amber-600">{totalEgg.toLocaleString()}</strong></span>
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
    </div>
  );
}