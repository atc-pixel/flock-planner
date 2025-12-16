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
  feedConsumed: number; // Günlükte tutulmaya devam edebilir ama haftalıkta override edilecek
  waterConsumed: number;
  
  notes: string; // YENİ: Günlük Notlar
  
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