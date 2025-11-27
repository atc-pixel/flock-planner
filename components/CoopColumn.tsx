'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Coop, Flock, RULES } from '@/lib/utils';
import { FlockCard } from './FlockCard';

interface CoopColumnProps {
  coop: Coop;
  height: number;
  totalWeeks: number;
  flocks: Flock[];
  timelineStart: Date;
  selectedFlockId: string | null;
  onSelectFlock: (id: string) => void;
  onRemoveFlock: (id: string, e: React.MouseEvent) => void;
}

export function CoopColumn({ coop, height, totalWeeks, flocks, timelineStart, selectedFlockId, onSelectFlock, onRemoveFlock }: CoopColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: coop.id,
    data: { coopId: coop.id }
  });

  return (
    <div 
        // Wrapper'a min-height verdik ki içerik kadar uzasın
        className="flex-1 min-w-[100px] flex flex-col border-r border-slate-200 bg-white"
        style={{ minHeight: `${height}px` }}
    >
      {/* Sticky Header */}
      <div className="sticky top-0 h-10 bg-white border-b border-slate-300 flex items-center justify-center font-bold text-slate-700 shadow-sm z-40 text-sm">
        {coop.name}
      </div>

      {/* Droppable Alan */}
      <div 
        ref={setNodeRef} 
        className={`relative flex-1 w-full transition-colors ${isOver ? 'bg-amber-50' : ''}`}
        style={{ height: `${height}px` }} 
      >
        {/* Izgara Çizgileri */}
        <div className="absolute inset-0 pointer-events-none flex flex-col">
          {Array.from({ length: totalWeeks }).map((_, i) => (
            <div 
                key={i} 
                // shrink-0: EKLENDİ (Satırların ezilmesini engeller)
                className="border-b border-slate-100 w-full shrink-0" 
                style={{ height: `${RULES.pixelsPerWeek}px` }}
            ></div>
          ))}
        </div>

        {/* Sürüler */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
           {flocks.map(flock => (
             <FlockCard 
               key={flock.id}
               flock={flock}
               timelineStart={timelineStart}
               isSelected={selectedFlockId === flock.id}
               onSelect={onSelectFlock}
               onRemove={onRemoveFlock}
             />
           ))}
        </div>
      </div>
    </div>
  );
}