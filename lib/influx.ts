// lib/influx.ts
import { InfluxDB } from "@influxdata/influxdb-client";

const INFLUX_URL = process.env.INFLUX_URL;
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
export const INFLUX_ORG = process.env.INFLUX_ORG;
export const INFLUX_BUCKET = process.env.INFLUX_BUCKET;

let _influx: InfluxDB | null = null;

// Bu fonksiyonu ve değişkenleri export ediyoruz
export function getInflux(): InfluxDB {
  if (!_influx) {
    if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
      throw new Error(
        "Influx env variables missing."
      );
    }
    _influx = new InfluxDB({
      url: INFLUX_URL,
      token: INFLUX_TOKEN,
    });
  }
  return _influx;
}