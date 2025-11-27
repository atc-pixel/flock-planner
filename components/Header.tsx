'use client';

import React from 'react';
import { Bird, GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export function Header() {
  return (
    <header className="flex justify-between items-center p-3 bg-white border-b border-slate-200 shadow-sm z-50 shrink-0 h-16">
      <div className="flex items-center gap-2">
        <Bird className="w-6 h-6 text-amber-500" />
        <h1 className="text-xl font-bold text-slate-800">FlockCycle</h1>
      </div>
      <DraggableSource />
    </header>
  );
}

function DraggableSource() {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'new-flock-source',
    data: { type: 'source' }
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} 
         className="cursor-grab active:cursor-grabbing flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded shadow-md font-medium text-sm z-50 transition-colors">
      <GripVertical size={16} />
      <span>Yeni Sürü</span>
    </div>
  );
}
