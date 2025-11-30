'use client';

import React from 'react';
import { Save, Loader2 } from 'lucide-react';
import { TableRowData } from './types';

interface ProductionToolbarProps {
  onSave: () => void;
  rows: TableRowData[];
  saving: boolean;
}

export function ProductionToolbar({ onSave, rows, saving }: ProductionToolbarProps) {
  const isSaveDisabled = !rows.some(r => r.isDirty) || saving;
  
  return (
    <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex justify-end items-center sticky top-0 z-20 backdrop-blur-sm h-12">
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