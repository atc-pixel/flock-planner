import { NextResponse } from 'next/server';
import { getInflux, INFLUX_ORG, INFLUX_BUCKET } from '@/lib/influx';
import { db } from '@/lib/firebase';
import { writeBatch, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

export const dynamic = "force-dynamic";

const DEVICE_MAP: Record<string, string> = {
  'T1': 'MKR1310-K1-WaterMeter',
  'T2': 'MKR1310-K2-WaterMeter',
  'T3': 'MKR1310-K3-WaterMeter',
  'T4': 'MKR1310-K4-WaterMeter',
  'T5': 'MKR1310-K5-WaterMeter',
  'T6': 'MKR1310-K6-WaterMeter',
  'C1': 'MKR1310-C1-WaterMeter',
  'C2': 'MKR1310-C2-WaterMeter',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coopId = searchParams.get('coopId') || 'T1';
  
  const deviceName = DEVICE_MAP[coopId];
  if (!deviceName) {
      return NextResponse.json({ success: false, error: "Geçersiz Kümes ID" }, { status: 400 });
  }

  try {
    const metaRef = doc(db, 'water_meta', coopId);
    const metaSnap = await getDoc(metaRef);
    
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);
    
    let startRange = defaultStartDate.toISOString();
    let lastSyncTime: number = 0;

    if (metaSnap.exists()) {
        const data = metaSnap.data();
        if (data.lastImportedTime) {
            const lastDate = data.lastImportedTime.toDate();
            startRange = lastDate.toISOString(); 
            lastSyncTime = lastDate.getTime();
            console.log(`[Sync ${coopId}] Son kayıt: ${startRange}. Yeni veriler çekiliyor...`);
        }
    } else {
        console.log(`[Sync ${coopId}] İlk kurulum. Son 7 gün taranacak.`);
    }

    // YENİ: [1-5] bataryayı kapsayan regex
    const query = `
      from(bucket: "${INFLUX_BUCKET}")
        |> range(start: time(v: "${startRange}"))
        |> filter(fn: (r) => r["device_name"] == "${deviceName}")
        |> filter(fn: (r) => r["_measurement"] =~ /device_frmpayload_data_WaterMeter[1-5]/)
        |> filter(fn: (r) => r["_field"] == "value")
        |> aggregateWindow(every: 5m, fn: last, createEmpty: false)
        |> pivot(rowKey:["_time"], columnKey: ["_measurement"], valueColumn: "_value")
    `;

    const influx = getInflux();
    const queryApi = influx.getQueryApi(INFLUX_ORG!);
    const rows: any[] = [];

    await new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row: any, tableMeta: any) {
          rows.push(tableMeta.toObject(row));
        },
        error(err: any) {
            console.error("Influx Query Error:", err);
            reject(err);
        },
        complete() { 
            resolve(true); 
        },
      });
    });

    const newRows = rows.filter(r => new Date(r._time).getTime() > lastSyncTime);

    if (newRows.length === 0) {
      return NextResponse.json({ message: "Sistem güncel, yeni veri yok." });
    }

    // YENİ: Batarya 5'i de işleme dahil ediyoruz
    const BATCH_SIZE = 450;
    let totalWritten = 0;
    let maxTime = lastSyncTime;

    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = newRows.slice(i, i + BATCH_SIZE);

        chunk.forEach((row) => {
            const timestamp = new Date(row._time);
            
            if (timestamp.getTime() > maxTime) {
                maxTime = timestamp.getTime();
            }

            const b1 = Number(row['device_frmpayload_data_WaterMeter1'] || 0);
            const b2 = Number(row['device_frmpayload_data_WaterMeter2'] || 0);
            const b3 = Number(row['device_frmpayload_data_WaterMeter3'] || 0);
            const b4 = Number(row['device_frmpayload_data_WaterMeter4'] || 0);
            // Batarya 5
            const b5 = Number(row['device_frmpayload_data_WaterMeter5'] || 0);
            
            const docId = `${coopId}_${timestamp.toISOString()}`;
            const docRef = doc(db, 'water_readings', docId);

            // Veritabanına b5'i de ekliyoruz
            batch.set(docRef, {
                coopId,
                timestamp: timestamp,
                b1, b2, b3, b4, b5
            }, { merge: true });
        });

        await batch.commit();
        totalWritten += chunk.length;
    }

    if (totalWritten > 0) {
        await setDoc(metaRef, {
            lastImportedTime: Timestamp.fromMillis(maxTime),
            lastSyncCheck: Timestamp.now()
        }, { merge: true });
    }

    return NextResponse.json({ 
      success: true, 
      importedCount: totalWritten,
      message: `${totalWritten} yeni kayıt eklendi.` 
    });

  } catch (error: any) {
    console.error('[Sync Hatası]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}