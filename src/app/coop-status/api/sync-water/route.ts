// src/app/coop-status/api/sync-water/route.ts
import { NextResponse } from 'next/server';
import { getInflux, INFLUX_ORG, INFLUX_BUCKET } from '@/lib/influx';
import { db } from '@/lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coopId = searchParams.get('coopId') || 'T1';

  // 1. InfluxDB Sorgusu
  const query = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: -24h)
      |> filter(fn: (r) => r["_measurement"] == "mqtt_consumer")
      |> filter(fn: (r) => r["topic"] == "v3/kümes-otomasyon@ttn/devices/${coopId.toLowerCase()}/up")
      |> filter(fn: (r) => r["_field"] =~ /device_frmpayload_data_WaterMeter[1-4]/)
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  `;

  try {
    const influx = getInflux(); // İstemciyi al
    const queryApi = influx.getQueryApi(INFLUX_ORG!);
    const rows: any[] = [];

    // Veriyi Influx'tan çek
    await new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row: any, tableMeta: any) { // Tip hatası düzeltildi: :any eklendi
          const o = tableMeta.toObject(row);
          rows.push(o);
        },
        error(error: any) { // Tip hatası düzeltildi: :any eklendi
          reject(error);
        },
        complete() {
          resolve(true);
        },
      });
    });

    if (rows.length === 0) {
      return NextResponse.json({ message: "InfluxDB'den veri gelmedi." });
    }

    // 2. Veriyi İşle ve Firestore Batch Hazırla
    const batch = writeBatch(db);
    let count = 0;

    rows.forEach((row) => {
      const timestamp = new Date(row._time);
      
      // Değerleri sayıya çevir, yoksa 0 al
      const b1 = Number(row['device_frmpayload_data_WaterMeter1'] || 0);
      const b2 = Number(row['device_frmpayload_data_WaterMeter2'] || 0);
      const b3 = Number(row['device_frmpayload_data_WaterMeter3'] || 0);
      const b4 = Number(row['device_frmpayload_data_WaterMeter4'] || 0);

      const total = b1 + b2 + b3 + b4;

      // Sadece veri varsa kaydet
      if (total > 0) {
        // ID: T1_2024-01-01T10:00:00.000Z
        const docId = `${coopId}_${timestamp.toISOString()}`;
        const docRef = doc(db, 'water_readings', docId);

        batch.set(docRef, {
          coopId,
          timestamp: timestamp, // Firestore Timestamp olarak kaydeder
          b1,
          b2,
          b3,
          b4,
          total
        }, { merge: true });

        count++;
      }
    });

    // 3. Veriyi Yaz
    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      importedCount: count,
      message: `${count} adet kayıt eşitlendi.` 
    });

  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}