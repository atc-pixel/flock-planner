'use client';

import React from 'react';
import { Save, Bird, Egg } from 'lucide-react';

interface FeedToolbarProps {
  onSave: () => void;
  saving: boolean;
  selectedCoopType: 'hen' | 'chick';
  onCoopTypeChange: (type: 'hen' | 'chick') => void;
}

export function FeedToolbar({ onSave, saving, selectedCoopType, onCoopTypeChange }: FeedToolbarProps) {
  return (
    <div className="flex items-center justify-between p-2 border-b border-slate-200 bg-white sticky top-0 z-30 h-14">
      <div className="flex items-center gap-4 px-2">
        <span className="text-sm font-bold text-slate-700">Yem Kayıt Modülü</span>
        
        {/* Kümes Tipi Slider */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => onCoopTypeChange('hen')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all
              ${selectedCoopType === 'hen'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
              }
            `}
          >
            <Bird size={14} />
            Tavuk (6)
          </button>
          <button
            onClick={() => onCoopTypeChange('chick')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all
              ${selectedCoopType === 'chick'
                ? 'bg-lime-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
              }
            `}
          >
            <Egg size={14} />
            Civciv (2)
          </button>
        </div>
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all
          ${saving ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg active:scale-95'}
        `}
      >
        <Save size={16} />
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </div>
  );
}

