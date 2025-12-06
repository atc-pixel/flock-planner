// lib/firestoreSensors.ts
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";


// 4 batarya key'i için tip
type BatteryKey = "battery1" | "battery2" | "battery3" | "battery4";

// Anlık seri (10 dk) için tip
export type InstantWaterPoint = {
  time: string; // ISO string
  battery1: number;
  battery2: number;
  battery3: number;
  battery4: number;
};

// Günlük toplamlar (4 batarya + toplam)
export type DailyWaterPoint = {
  date: string; // "YYYY-MM-DD"
  battery1: number;
  battery2: number;
  battery3: number;
  battery4: number;
  total: number;
};

function batteryIndexToKey(battery: number): BatteryKey | null {
  switch (battery) {
    case 1:
      return "battery1";
    case 2:
      return "battery2";
    case 3:
      return "battery3";
    case 4:
      return "battery4";
    default:
      return null;
  }
}

/**
 * Firestore'dan son `hours` saatin 10 dakikalık verisini okur.
 */
export async function getInstantWaterFromFirestore(
  coopId: string,
  hours: number = 24
): Promise<InstantWaterPoint[]> {
  const now = new Date();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

  const colRef = collection(db, "water_readings");
  const q = query(
    colRef,
    where("ts", ">=", Timestamp.fromDate(start)),
    orderBy("ts", "asc")
  );

  const snap = await getDocs(q);

  // timeISO -> point
  const byTime = new Map<string, InstantWaterPoint>();

  snap.forEach((docSnap) => {
    const data = docSnap.data() as any;
    const ts = data.ts as Timestamp;
    const timeISO = ts.toDate().toISOString();
    const battery = Number(data.battery);
    const liters10m = Number(data.liters10m);
    const coop = data.coopId as string | undefined;

    // İstediğimiz kümes değilse at
    if (coop !== coopId) return;
    if (!battery || Number.isNaN(liters10m)) return;

    let entry = byTime.get(timeISO);
    if (!entry) {
      entry = {
        time: timeISO,
        battery1: 0,
        battery2: 0,
        battery3: 0,
        battery4: 0,
      };
    }

    const key = batteryIndexToKey(battery);
    if (!key) return;

    entry[key] = liters10m;

    byTime.set(timeISO, entry);
  });

  const result = Array.from(byTime.values());
  result.sort((a, b) => (a.time < b.time ? -1 : 1));

  return result;
}


// ... InstantWaterPoint, DailyWaterPoint, batteryIndexToKey, getInstantWaterFromFirestore aynen kalsın

/**
 * Firestore'dan son `days` günün günlük toplamlarını hesaplar.
 *
 * Mantık:
 *  - Local time'a göre bugün dâhil son `days` tam günü al
 *  - start = (bugün - (days - 1)) 00:00
 *  - ts >= start olan tüm kayıtları çek
 *  - local güne (YYYY-MM-DD) göre gruplayıp batarya bazında toplar
 */
export async function getDailyWaterFromFirestore(
  coopId: string,
  days: number = 7
): Promise<DailyWaterPoint[]> {
  // 1) Local time'a göre tarih sınırlarını belirle
  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  // Örn. days = 7 ise → 7 gün = bugün + önceki 6 gün
  const startDate = new Date(
    todayMidnight.getTime() - (days - 1) * 24 * 60 * 60 * 1000
  );

  const colRef = collection(db, "water_readings");
  const q = query(
    colRef,
    where("ts", ">=", Timestamp.fromDate(startDate)),
    orderBy("ts", "asc")
  );

  const snap = await getDocs(q);

  const byDate = new Map<string, DailyWaterPoint>();

  snap.forEach((docSnap) => {
    const data = docSnap.data() as any;
    const ts = data.ts as Timestamp;
    const tsDate = ts.toDate();
    const coop = data.coopId as string | undefined;
    const battery = Number(data.battery);
    const liters10m = Number(data.liters10m);

    // İstediğimiz kümes değilse at
    if (coop !== coopId) return;
    if (!battery || Number.isNaN(liters10m)) return;

    // Local güne göre tarih key'i oluştur
    const year = tsDate.getFullYear();
    const month = tsDate.getMonth() + 1;
    const day = tsDate.getDate();

    const mm = month.toString().padStart(2, "0");
    const dd = day.toString().padStart(2, "0");
    const dateKey = `${year}-${mm}-${dd}`;

    let entry = byDate.get(dateKey);
    if (!entry) {
      entry = {
        date: dateKey,
        battery1: 0,
        battery2: 0,
        battery3: 0,
        battery4: 0,
        total: 0,
      };
    }

    switch (battery) {
      case 1:
        entry.battery1 += liters10m;
        break;
      case 2:
        entry.battery2 += liters10m;
        break;
      case 3:
        entry.battery3 += liters10m;
        break;
      case 4:
        entry.battery4 += liters10m;
        break;
      default:
        // 1–4 dışı batarya varsa şimdilik yok say
        break;
    }

    entry.total =
      entry.battery1 +
      entry.battery2 +
      entry.battery3 +
      entry.battery4;

    byDate.set(dateKey, entry);
  });

  let result = Array.from(byDate.values());
  result.sort((a, b) => (a.date < b.date ? -1 : 1));

  // Her ihtimale karşı yine sadece son `days` günü bırak
  if (result.length > days) {
    result = result.slice(result.length - days);
  }

  return result;
}
