export type TableRowData = {
  date: Date;
  logId?: string;
  mortality: number;
  eggCount: number;
  avgWeight: number; // YENİ
  brokenEggCount: number;
  dirtyEggCount: number;
  feedConsumed: number;
  waterConsumed: number;
  
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