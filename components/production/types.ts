export type TableRowData = {
  date: Date;
  logId?: string;
  mortality: number;
  eggCount: number;
  brokenEggCount: number;
  dirtyEggCount: number;
  feedConsumed: number;
  waterConsumed: number;
  
  // Hesaplananlar
  currentBirds: number; 
  yield: number;
  brokenRate: number;
  dirtyRate: number;
  ageInWeeks: number; // YENİ: Tavuk Yaşı (Hafta)
  
  isDirty: boolean;
  
  specialEvent?: {
    title: string;
    color: string;
  } | null;
};