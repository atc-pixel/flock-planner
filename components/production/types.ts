export type TableRowData = {
  date: Date;
  logId?: string;
  mortality: number;
  
  // Yumurta Verileri
  goodCount: number;
  brokenEggCount: number;
  dirtyEggCount: number;
  eggCount: number; // DB'deki Toplam
  
  avgWeight: number;
  feedConsumed: number;
  waterConsumed: number;
  
  notes: string;
  
  // Hesaplananlar
  currentBirds: number; 
  yield: number;
  brokenRate: number;
  dirtyRate: number;
  ageInWeeks: number;
  
  isDirty: boolean;
  
  specialEvent?: {
    title: string;
    color: string;
  } | null;
};

// BU TİP GÜNCELLENDİ: avgWeight EKLENDİ
export type WeeklyData = {
    key: string;
    weekNum: number;
    startDate: Date;
    endDate: Date;
    
    totalMortality: number;
    totalEggs: number;
    totalBroken: number;
    totalDirty: number;
    
    avgWeight: number; // <-- HATA ALINAN ALAN BURADAYDI
    birdDays: number;
    startBirds: number;
    days: number;
    
    notes: Set<string>;
};