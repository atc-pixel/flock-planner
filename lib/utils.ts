import { addWeeks } from 'date-fns';


// --- TİPLER ---
export type Coop = { id: string; name: string; };

export type Flock = { 
  id: string; 
  name: string;         // YENİ: Örn "#01"
  coopId: string; 
  hatchDate: Date; 
  initialCount: number; // YENİ: Mevcut hesaplaması için başlangıç sayısı
  isMolting: boolean; 
  lane: 0 | 1; 
  
  // OPSİYONEL TARİHLER
  moltDate?: Date;
  transferDate?: Date;
  exitDate?: Date;
};

// --- SABİTLER ---
export const INITIAL_COOPS: Coop[] = [
  { id: 'T1', name: 'Kümes T1' }, { id: 'T2', name: 'Kümes T2' },
  { id: 'T3', name: 'Kümes T3' }, { id: 'T4', name: 'Kümes T4' },
  { id: 'T5', name: 'Kümes T5' }, { id: 'T6', name: 'Kümes T6' },
];

export const RULES = {
  // GÜNCELLEME: 14-18. Haftalar arası (14. haftanın başı = 13 hafta bitmiş demektir)
  transferRangeStart: 13, 
  // GÜNCELLEME: 14, 15, 16, 17, 18 (Toplam 5 hafta)
  transferRangeDuration: 5, 
  
  peakMaxWeek: 24,
  
  // Varsayılan Süreler
  stdExitWeek: 90,       
  moltingExitWeek: 125,  
  
  sanitationWeeks: 3,
  pixelsPerWeek: 24,
};

export type ProductionLog = {
  id?: string;
  flockId: string;      // Ana referansımız Sürü ID'si
  coopId: string;       // Tarihçesi için tutuyoruz
  date: Date;           // Timestamp
  
  // Girdiler
  mortality: number;    // Ölü
  cull: number;         // Iskarta/Kesim (Opsiyonel ama gerekli olabilir)
  eggCount: number;     // Toplam Üretilen Yumurta
  brokenEggCount: number; // Hasarlı
  dirtyEggCount: number;  // Kirli
  
  // Tüketim
  feedConsumed: number; // kg
  waterConsumed: number; // litre
  
  updatedAt?: Date;
};

// --- HESAPLAMA MOTORU ---
export const calculateTimeline = (flock: Flock) => {
  if (!flock.hatchDate) return null;

  // 1. Transfer
  const transfer = flock.transferDate 
    ? flock.transferDate 
    : addWeeks(flock.hatchDate, RULES.transferRangeStart);

  // 2. Pik
  const peak = addWeeks(flock.hatchDate, RULES.peakMaxWeek);
  
  // 3. Çıkış (Exit)
  let exit: Date;
  if (flock.exitDate) {
    exit = flock.exitDate;
  } else {
    const exitWeek = flock.isMolting ? RULES.moltingExitWeek : RULES.stdExitWeek;
    exit = addWeeks(flock.hatchDate, exitWeek);
  }
  
  // 4. Sanitasyon
  const sanWeeks = RULES.sanitationWeeks || 3; 
  const sanitationEnd = addWeeks(exit, sanWeeks);
  
  return { transfer, peak, exit, sanitationEnd };
};