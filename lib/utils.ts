import { addWeeks } from 'date-fns';

// --- TİPLER ---
export type Coop = { id: string; name: string; };

export type Flock = { 
  id: string; 
  coopId: string; 
  hatchDate: Date; 
  isMolting: boolean;
  lane: 0 | 1; // YENİ EKLENDİ: 0 = Sol, 1 = Sağ
};

// --- SABİTLER ---
export const INITIAL_COOPS: Coop[] = [
  { id: 'T1', name: 'Kümes T1' }, { id: 'T2', name: 'Kümes T2' },
  { id: 'T3', name: 'Kümes T3' }, { id: 'T4', name: 'Kümes T4' },
  { id: 'T5', name: 'Kümes T5' }, { id: 'T6', name: 'Kümes T6' },
];

export const RULES = {
  transferWeek: 16,
  peakMaxWeek: 24,
  stdExitWeek: 80,
  moltingExitWeek: 120,
  sanitationWeeks: 3,
  pixelsPerWeek: 24,
};

// --- HESAPLAMA ---
export const calculateTimeline = (flock: Flock) => {
  if (!flock.hatchDate) return null;

  const transfer = addWeeks(flock.hatchDate, RULES.transferWeek);
  const peak = addWeeks(flock.hatchDate, RULES.peakMaxWeek);
  
  const exitWeek = flock.isMolting ? RULES.moltingExitWeek : RULES.stdExitWeek;
  const exit = addWeeks(flock.hatchDate, exitWeek);
  
  const sanWeeks = RULES.sanitationWeeks || 3; 
  const sanitationEnd = addWeeks(exit, sanWeeks);
  
  return { transfer, peak, exit, sanitationEnd };
};