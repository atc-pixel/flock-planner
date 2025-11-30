// Dosya: src/components/production/types.ts

export type TableRowData = {
  date: Date;
  logId?: string;
  mortality: number;
  eggCount: number;
  brokenEggCount: number;
  dirtyEggCount: number;
  feedConsumed: number;
  waterConsumed: number;
  currentBirds: number; 
  yield: number;
  isDirty: boolean;
};