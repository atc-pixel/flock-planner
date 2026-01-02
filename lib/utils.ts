import { addWeeks } from 'date-fns';

// --- TİPLER ---
// type özelliğini ekledik (UI'da ikon ve renk değişimi için)
export type Coop = { id: string; name: string; type: 'hen' | 'chick' };

export type Flock = { 
  id: string; 
  name: string;
  coopId: string; // Transfer sonrası tavuk kümesi (hen)
  chickCoopId?: string; // Transfer öncesi civciv kümesi (C1 veya C2) - sadece chick sürüleri için
  hatchDate: Date; 
  initialCount: number;
  isMolting: boolean; 
  lane: 0 | 1; 
  moltDate?: Date;
  transferDate?: Date;
  exitDate?: Date;
};

// --- SABİTLER ---
// 8 Kümes Tanımı (6 Tavuk, 2 Civciv)
export const INITIAL_COOPS: Coop[] = [
  // Tavuk Kümesleri (K)
  { id: 'T1', name: 'Kümes T1', type: 'hen' }, 
  { id: 'T2', name: 'Kümes T2', type: 'hen' },
  { id: 'T3', name: 'Kümes T3', type: 'hen' }, 
  { id: 'T4', name: 'Kümes T4', type: 'hen' },
  { id: 'T5', name: 'Kümes T5', type: 'hen' }, 
  { id: 'T6', name: 'Kümes T6', type: 'hen' },
  // Civciv Kümesleri (C)
  { id: 'C1', name: 'Civciv C1', type: 'chick' }, 
  { id: 'C2', name: 'Civciv C2', type: 'chick' },
];

export const RULES = {
  transferRangeStart: 13, 
  transferRangeDuration: 5, 
  peakMaxWeek: 24,
  stdExitWeek: 90,       
  moltingExitWeek: 125,  
  sanitationWeeks: 3,
  pixelsPerWeek: 24,
};

export type ProductionLog = {
  id?: string;
  flockId: string;
  coopId: string;
  date: Date;
  mortality: number;
  cull: number; // Iskarta/Kesim
  avgWeight?: number;
  eggCount: number;
  brokenEggCount: number;
  dirtyEggCount: number;
  feedConsumed: number;
  waterConsumed: number;
  updatedAt?: Date;
};

// --- HESAPLAMA MOTORU ---
export const calculateTimeline = (flock: Flock) => {
  if (!flock.hatchDate) return null;

  const transfer = flock.transferDate 
    ? flock.transferDate 
    : addWeeks(flock.hatchDate, RULES.transferRangeStart);

  const peak = addWeeks(flock.hatchDate, RULES.peakMaxWeek);
  
  let exit: Date;
  if (flock.exitDate) {
    exit = flock.exitDate;
  } else {
    const exitWeek = flock.isMolting ? RULES.moltingExitWeek : RULES.stdExitWeek;
    exit = addWeeks(flock.hatchDate, exitWeek);
  }
  
  const sanWeeks = RULES.sanitationWeeks || 3; 
  const sanitationEnd = addWeeks(exit, sanWeeks);
  
  return { transfer, peak, exit, sanitationEnd };
};