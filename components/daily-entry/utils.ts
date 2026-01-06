import type { Cell, Row, DerivedDaily, ParsedSlip } from "./types";

export function isDash(v: unknown): v is "-" {
  return v === "-";
}

export function toNumberOrZero(v: Cell): number {
  return isDash(v) ? 0 : v;
}

export function ensureAllLevels(rows: Row[]): Row[] {
  const byLevel = new Map(rows.map((r) => [r.level, r]));
  const out: Row[] = [];
  for (let level = 7; level >= 1; level--) {
    out.push(
      byLevel.get(level) ?? {
        level,
        solid: "-",
        dirty: "-",
        broken: "-",
      }
    );
  }
  return out;
}


export function parseCell(v: string): Cell {
  const t = v.trim();
  if (!t || t === "-") return "-";
  const normalized = t.replace(/\./g, "").replace(/,/g, "");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return "-";
  return Math.trunc(n);
}

export function parseAvgWeight(v: string): number | null {
  const t = v.trim();
  if (!t || t === "-") return null;
  const normalized = t.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function parseDDMMYYYYToDate(dateStr: string): Date | null {
  const t = dateStr.trim();
  if (!t || t === "-") return null;
  const m = t.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
}

export function deriveDaily(slip: ParsedSlip): DerivedDaily {
  // 1) max sağlam
  const maxSolid = slip.rows.reduce((max, r) => {
    const v = r.solid;
    if (isDash(v)) return max;
    return Math.max(max, v);
  }, 0);

  // 2) Kat toplamları
  const dirtyFromFloors = slip.rows.reduce(
    (acc, r) => acc + toNumberOrZero(r.dirty),
    0
  );
  const brokenFromFloors = slip.rows.reduce(
    (acc, r) => acc + toNumberOrZero(r.broken),
    0
  );

  // 3) Arka
  const backDirty = toNumberOrZero(slip.back?.dirty ?? "-");
  const backBroken = toNumberOrZero(slip.back?.broken ?? "-");

  // 4) Yeni kurallar
  // dirtyEggCount = (kolonlar kirli + arka kirli) * 30
  const dirtyEggCount = (dirtyFromFloors + backDirty) * 30;
  // brokenEggCount = (kolonlar kırık + arka kırık) * 30
  const brokenEggCount = (brokenFromFloors + backBroken) * 30;
  // eggCount = Sağlamdaki en büyük rakam + (kolonlar kirli + kolonlar kırık) * 30
  const eggCount = maxSolid + (dirtyFromFloors + brokenFromFloors) * 30;

  const avgWeight = parseAvgWeight(slip.bottomRight);
  const dateObj = parseDDMMYYYYToDate(slip.date);

  return {
    eggCount: Math.max(eggCount, 0), // negatif olmasın
    dirtyEggCount,
    brokenEggCount,
    avgWeight,
    dateObj,
  };
}

export function todayMidnightLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function formatYYYYMMDD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

