'use client';

import React from 'react';
import { Save, Table, BarChart3, LayoutList } from 'lucide-react';
import { TableRowData } from './types';

interface ProductionToolbarProps {
  onSave: () => void;
  rows: TableRowData[];
  saving: boolean;
  viewMode: 'table' | 'chart' | 'weekly';
  setViewMode: (mode: 'table' | 'chart' | 'weekly') => void;
}

export function ProductionToolbar({ onSave, rows, saving, viewMode, setViewMode }: ProductionToolbarProps) {
  // Basit İstatistikler (Sadece Table modunda gösterilebilir veya genel kalabilir)
  const totalBirds = rows.length > 0 ? rows[rows.length - 1].currentBirds : 0;
  const totalEggs = rows.reduce((acc, row) => acc + row.eggCount, 0);

  return (
    <div className="flex items-center justify-between p-2 border-b border-slate-200 bg-white sticky top-0 z-30 h-14">
      {/* SOL: Özet Bilgi */}
      <div className="flex items-center gap-4 px-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mevcut Tavuk</span>
          <span className="text-sm font-black text-slate-700 font-mono">{totalBirds.toLocaleString()}</span>
        </div>
        <div className="h-6 w-px bg-slate-200"></div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top. Yumurta</span>
          <span className="text-sm font-black text-amber-600 font-mono">{totalEggs.toLocaleString()}</span>
        </div>
      </div>

      {/* SAĞ: Görünüm Modları ve Kaydet */}
      <div className="flex items-center gap-4">
        
        {/* Görünüm Değiştirici (Segmented Control) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${
              viewMode === 'table' 
                ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Günlük Giriş"
          >
            <Table size={16} />
            <span className="hidden sm:inline">Günlük</span>
          </button>

          <button
            onClick={() => setViewMode('weekly')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${
              viewMode === 'weekly' 
                ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Haftalık Özet"
          >
            <LayoutList size={16} />
            <span className="hidden sm:inline">Haftalık</span>
          </button>

          <button
            onClick={() => setViewMode('chart')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${
              viewMode === 'chart' 
                ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Grafikler"
          >
            <BarChart3 size={16} />
            <span className="hidden sm:inline">Grafik</span>
          </button>
        </div>

        {/* Kaydet Butonu - Sadece Tablo modunda aktif */}
        <button 
          onClick={onSave}
          disabled={saving || viewMode !== 'table'} 
          className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all
              ${viewMode !== 'table' ? 'opacity-0 pointer-events-none w-0 px-0 overflow-hidden' : 'opacity-100 w-auto'} 
              ${saving ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg active:scale-95'}
          `}
        >
          <Save size={16} />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}