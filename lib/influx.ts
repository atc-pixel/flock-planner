// lib/influx.ts
import { InfluxDB } from "@influxdata/influxdb-client";

/**
 * 1) Env değişkenleri
 */
const INFLUX_URL = process.env.INFLUX_URL;
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
export const INFLUX_ORG = process.env.INFLUX_ORG;       // Export eklendi
export const INFLUX_BUCKET = process.env.INFLUX_BUCKET; // Export eklendi

// Boş da olsa sabit string olsun, query içinde kullanacağız
const ORG = (INFLUX_ORG || "") as string;
const BUCKET = (INFLUX_BUCKET || "") as string;

/**
 * 2) Lazy Influx client
 */
let _influx: InfluxDB | null = null;

// Export eklendi: Artık bu fonksiyonu başka dosyalarda kullanabiliriz
export function getInflux(): InfluxDB {
  if (!_influx) {
    if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
      throw new Error(
        "Influx env variables missing. Please set INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET on the server."
      );
    }
    _influx = new InfluxDB({
      url: INFLUX_URL,
      token: INFLUX_TOKEN,
    });
  }
  return _influx;
}

// ... (Geri kalan eski kodlar durabilir veya temizlik için silebilirsin, şu an için zararı yok)