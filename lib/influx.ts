// lib/influx.ts
import { InfluxDB } from "@influxdata/influxdb-client";

/**
 * 1) Ortak env değişkenleri
 */
const INFLUX_URL = process.env.INFLUX_URL;
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const INFLUX_ORG = process.env.INFLUX_ORG;
const INFLUX_BUCKET = process.env.INFLUX_BUCKET;

if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
  throw new Error(
    "Influx env variables are missing. Please set INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET in .env.local"
  );
}

// TypeScript için netleştirelim
const ORG = INFLUX_ORG as string;
const BUCKET = INFLUX_BUCKET as string;

/**
 * 2) Senin su sayaçlarına özel sabitler
 *
 * Grafana'dan gelen query:
 *
 * from(bucket: "kumesShieldV4Sensors")
 *   |> filter(fn: (r) => r["device_name"] == "MKR1310-K1-WaterMeter")
 *   |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_WaterMeter1")
 *   |> filter(fn: (r) => r["_field"] == "value")
 *   |> aggregateWindow(every: 10m, fn: mean)
 */

const WATER_FIELD = "value"; // 10 dk'da geçen litre

// 4 batarya için measurement isimleri
const WATER_MEASUREMENT_1 = "device_frmpayload_data_WaterMeter1";
const WATER_MEASUREMENT_2 = "device_frmpayload_data_WaterMeter2";
const WATER_MEASUREMENT_3 = "device_frmpayload_data_WaterMeter3";
const WATER_MEASUREMENT_4 = "device_frmpayload_data_WaterMeter4";

const WATER_MEASUREMENTS = [
  WATER_MEASUREMENT_1,
  WATER_MEASUREMENT_2,
  WATER_MEASUREMENT_3,
  WATER_MEASUREMENT_4,
];

// T1 için device_name
const DEVICE_NAME_T1 = "MKR1310-K1-WaterMeter";

/**
 * İleride T2, T3 eklenecekse buraya yeni device_name'ler eklenir.
 */
const DEVICE_NAME_BY_COOP: Record<string, string> = {
  T1: DEVICE_NAME_T1,
};

/**
 * Measurement -> hangi batarya?
 */
function getBatteryIndex(
  measurement: string
): 1 | 2 | 3 | 4 | null {
  switch (measurement) {
    case WATER_MEASUREMENT_1:
      return 1;
    case WATER_MEASUREMENT_2:
      return 2;
    case WATER_MEASUREMENT_3:
      return 3;
    case WATER_MEASUREMENT_4:
      return 4;
    default:
      return null;
  }
}

/**
 * 3) Influx client
 */
const influx = new InfluxDB({
  url: INFLUX_URL,
  token: INFLUX_TOKEN,
});

/**
 * 4) Tipler
 */

// Sadece toplam isteyen basit günlük tip
export type DailyWaterPoint = {
  date: string;        // "YYYY-MM-DD"
  totalLiters: number; // o gün tüm bataryaların toplamı
};

// 4 batarya + toplam için günlük özet
export type MultiBatteryDailyPoint = {
  date: string; // "YYYY-MM-DD"
  battery1: number;
  battery2: number;
  battery3: number;
  battery4: number;
  total: number;
};

// 10 dakikalık anlık seri (4 batarya)
export type MultiBatteryInstantPoint = {
  time: string; // ISO string (Influx _time)
  battery1: number;
  battery2: number;
  battery3: number;
  battery4: number;
};

/**
 * 5) Yardımcı: coopId -> device_name
 */
function resolveDeviceName(coopId: string): string {
  return DEVICE_NAME_BY_COOP[coopId] ?? DEVICE_NAME_T1;
}

/**
 * 6) 10 dakikalık seri:
 *
 * Aynı device altındaki 4 batarya için, son X saatlik
 * 10 dakikalık ortalama tüketim serisini döner.
 */
export async function getMultiBatteryInstantWater(
  coopId: string,
  hours: number = 24
): Promise<MultiBatteryInstantPoint[]> {
  const deviceName = resolveDeviceName(coopId);
  const queryApi = influx.getQueryApi(ORG);

  const measurementsFilter = WATER_MEASUREMENTS
    .map((m) => `r["_measurement"] == "${m}"`)
    .join(" or ");

  const fluxQuery = `
from(bucket: "${BUCKET}")
  |> range(start: -${hours}h)
  |> filter(fn: (r) => r["device_name"] == "${deviceName}")
  |> filter(fn: (r) => ${measurementsFilter})
  |> filter(fn: (r) => r["_field"] == "${WATER_FIELD}")
  |> aggregateWindow(every: 10m, fn: mean, createEmpty: false)
  |> yield(name: "10m_mean")
`;

  try {
    const rows = (await queryApi.collectRows(fluxQuery)) as any[];

    // time -> MultiBatteryInstantPoint
    const byTime = new Map<string, MultiBatteryInstantPoint>();

    for (const o of rows) {
      const timeStr = String(o._time ?? "");
      const value = Number(o._value);
      const measurement = String(o._measurement ?? "");

      if (!timeStr || isNaN(value)) continue;

      const batteryIndex = getBatteryIndex(measurement);
      if (!batteryIndex) continue;

      let entry = byTime.get(timeStr);
      if (!entry) {
        entry = {
          time: timeStr,
          battery1: 0,
          battery2: 0,
          battery3: 0,
          battery4: 0,
        };
      }

      entry[`battery${batteryIndex}` as const] = value;

      byTime.set(timeStr, entry);
    }

    const result = Array.from(byTime.values());

    // Zamana göre sırala
    result.sort((a, b) => (a.time < b.time ? -1 : 1));

    return result;
  } catch (err: any) {
    console.error("Influx multi-battery instant query error:", err);
    throw new Error(
      `Influx multi-battery instant query failed: ${
        err?.message ?? String(err)
      }`
    );
  }
}

/**
 * 7) Günlük toplamlar (4 batarya + toplam):
 *
 * - Influx'tan 10 dakikalık seriyi alır (son days * 24 saat)
 * - JS tarafında LOCAL güne göre (server timezone) gruplayarak
 *   günlük toplamları hesaplar.
 *
 * Böylece:
 * - aggregateWindow(every:1d) + timezone kayması derdi yok
 * - Anlık grafikte gördüğün ile birebir tutarlı gün toplamları elde edilir
 */
export async function getMultiBatteryDailyWater(
  coopId: string,
  days: number = 7
): Promise<MultiBatteryDailyPoint[]> {
  // 1) Son days gün için 10 dk verisini al
  const hours = days * 24;
  const instant = await getMultiBatteryInstantWater(coopId, hours);

  // 2) Local güne göre grupla: YYYY-MM-DD
  const byDate = new Map<string, MultiBatteryDailyPoint>();

  for (const p of instant) {
    const d = new Date(p.time);

    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 0-based
    const day = d.getDate();

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

    entry.battery1 += p.battery1 || 0;
    entry.battery2 += p.battery2 || 0;
    entry.battery3 += p.battery3 || 0;
    entry.battery4 += p.battery4 || 0;

    entry.total =
      entry.battery1 +
      entry.battery2 +
      entry.battery3 +
      entry.battery4;

    byDate.set(dateKey, entry);
  }

  // 3) Map -> array
  let result = Array.from(byDate.values());

  // 4) Tarihe göre sırala
  result.sort((a, b) => (a.date < b.date ? -1 : 1));

  // 5) Son `days` günü bırak (eski günler varsa kırp)
  if (result.length > days) {
    result = result.slice(result.length - days);
  }

  return result;
}

/**
 * 8) Sadece toplam isteyenler için basit sarıcı:
 *
 * getMultiBatteryDailyWater çıktısından:
 *  { date, totalLiters } array'i üretir.
 *
 * Şu anda /coop-status/api/daily-water endpoint'i bunu kullanabilir.
 */
export async function getDailyWater(
  coopId: string,
  days: number = 7
): Promise<DailyWaterPoint[]> {
  const multi = await getMultiBatteryDailyWater(coopId, days);

  const result: DailyWaterPoint[] = multi.map((d) => ({
    date: d.date,
    totalLiters: d.total,
  }));

  return result;
}
