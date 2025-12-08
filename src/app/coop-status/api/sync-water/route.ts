// src/app/coop-status/api/sync-water/route.ts
import { NextResponse } from 'next/server';
import { getInflux, INFLUX_ORG, INFLUX_BUCKET } from '@/lib/influx';
import { db } from '@/lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';

export const dynamic = "force-dynamic"; // Vercel için statik build almasını engeller

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coopId = searchParams.get('coopId') || 'T1';

  // InfluxDB Sorgusu: Pivot kullanarak bataryaları sütunlara çeviriyoruz
  const query = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: -30d) 
      |> filter(fn: (r) => r["_measurement"] == "mqtt_consumer")
      |> filter(fn: (r) => r["topic"] == "v3/kümes-otomasyon@ttn/devices/${coopId.toLowerCase()}/up")
      |> filter(fn: (r) => r["_field"] =~ /device_frmpayload_data_WaterMeter[1-4]/)
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  `;

  try {
    const influx = getInflux();
    const queryApi = influx.getQueryApi(INFLUX_ORG!);
    const rows: any[] = [];

    // Veriyi çek
    await new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row: any, tableMeta: any) {
          const o = tableMeta.toObject(row);
          rows.push(o);
        },
        error(error: any) {
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

    // Firestore'a toplu yazma (Batching)
    // Firestore bir batch'te en fazla 500 işleme izin verir, bu yüzden parçalıyoruz.
    const BATCH_SIZE = 450; 
    let totalWritten = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = rows.slice(i, i + BATCH_SIZE);

        chunk.forEach((row) => {
            const timestamp = new Date(row._time);
            
            const b1 = Number(row['device_frmpayload_data_WaterMeter1'] || 0);
            const b2 = Number(row['device_frmpayload_data_WaterMeter2'] || 0);
            const b3 = Number(row['device_frmpayload_data_WaterMeter3'] || 0);
            const b4 = Number(row['device_frmpayload_data_WaterMeter4'] || 0);
            const total = b1 + b2 + b3 + b4;

            if (total > 0) {
                // Yeni Doküman ID Formatı: T1_2024-03-25T14:00:00.000Z
                const docId = `${coopId}_${timestamp.toISOString()}`;
                const docRef = doc(db, 'water_readings', docId);

                batch.set(docRef, {
                    coopId,
                    timestamp: timestamp,
                    b1, b2, b3, b4, total
                }, { merge: true });
            }
        });

        await batch.commit();
        totalWritten += chunk.length;
    }

    return NextResponse.json({ 
      success: true, 
      importedCount: totalWritten,
      message: `${totalWritten} adet zaman dilimi eşitlendi.` 
    });

  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}