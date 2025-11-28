'use client';

import React from 'react';
import { Flock } from '@/lib/utils';
import { ChickCard } from './ChickCard';
import { ChickenCard } from './ChickenCard';

interface FlockCardProps {
  flock: Flock;
  timelineStart: Date;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string, e: React.MouseEvent) => void;
  onUpdate: (flock: Flock) => void;
}

export function FlockCard({ flock, timelineStart, isSelected, onSelect, onRemove, onUpdate }: FlockCardProps) {
  
  // Lane 0 = CİVCİV KARTI
  if (flock.lane === 0) {
    return (
      <ChickCard 
        flock={flock} 
        timelineStart={timelineStart} 
        isSelected={isSelected} 
        onSelect={onSelect}
        onUpdate={onUpdate}
        onRemove={onRemove} // ARTIK CİVCİV DE SİLİNEBİLİR
      />
    );
  }

  // Lane 1 = TAVUK KARTI
  return (
    <ChickenCard 
      flock={flock} 
      timelineStart={timelineStart} 
      isSelected={isSelected} 
      onSelect={onSelect}
      onRemove={onRemove}
    />
  );
}