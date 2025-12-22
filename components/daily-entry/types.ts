export type Cell = number | "-";

export type Row = {
  level: number;     // 7..1
  solid: Cell;       // sadece katlarda
  dirty: Cell;
  broken: Cell;
};


export type ParsedSlip = {
  coop: string | "-";
  date: string | "-"; // DD-MM-YYYY
  rows: Row[];        // 7..1
  back: { dirty: Cell; broken: Cell }; // ARKA
  note: string | "-";
  bottomRight: string | "-"; // avgWeight (örn 56,6)
};


export type DerivedDaily = {
  eggCount: number;
  dirtyEggCount: number;
  brokenEggCount: number;
  avgWeight: number | null;
  dateObj: Date | null;
};

export type FirestoreDraft = {
  coopId: string | null;
  date: string; // şimdilik string; sonra Timestamp
  eggCount: number;
  dirtyEggCount: number;
  brokenEggCount: number;
  avgWeight: number | null;
  flockId: string | null;
  mortality: number;
};
