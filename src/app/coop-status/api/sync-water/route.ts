// src/app/coop-status/api/sync-water/route.ts
import { NextResponse } from 'next/server';
import { getInflux, INFLUX_ORG, INFLUX_BUCKET } from '@/lib/influx';
import { db } from '@/lib/firebase';
import { writeBatch, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

export const dynamic = "force-dynamic";

const DEVICE_MAP: Record<string, string> = {
  'T1': 'MKR1310-K1-WaterMeter',
  // T2, T3 ileride buraya eklenecek
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coopId = searchParams.get('coopId') || 'T1';
  const deviceName = DEVICE_MAP[coopId] || DEVICE_MAP['T1'];

  try {
    // 1. META KONTROLÜ: En son nerede kaldık?
    const metaRef = doc(db, 'water_meta', coopId);
    const metaSnap = await getDoc(metaRef);
    
    // DEĞİŞİKLİK 1: Varsayılan olarak son 7 günü (1 hafta) baz alıyoruz.
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);
    
    let startRange = defaultStartDate.toISOString();
    let lastSyncTime: number = 0;

    if (metaSnap.exists()) {
        const data = metaSnap.data();
        if (data.lastImportedTime) {
            const lastDate = data.lastImportedTime.toDate();
            // Flux sorgusu için ISO string
            startRange = lastDate.toISOString(); 
            lastSyncTime = lastDate.getTime();
            console.log(`[Sync] Son kayıt: ${startRange}. Sadece yeni veriler çekilecek.`);
        }
    } else {
        console.log(`[Sync] Meta kaydı yok. Son 7 gün taranacak.`);
    }

    // 2. INFLUX SORGUSU (HİZALANMIŞ RAW VERİ)
    // DEĞİŞİKLİK 2 & 3: every: 5m ve fn: last
    // - 5 dakikalık periyotlara bölüyoruz.
    // - last ile o 5 dk içindeki en son veriyi alıp zamanı hizalıyoruz (örn: 10:03 -> 10:05).
    // - Böylece 4 batarya aynı zamana denk gelip tek satırda birleşiyor.
    const query = `
      from(bucket: "${INFLUX_BUCKET}")
        |> range(start: time(v: "${startRange}"))
        |> filter(fn: (r) => r["device_name"] == "${deviceName}")
        |> filter(fn: (r) => r["_measurement"] =~ /device_frmpayload_data_WaterMeter[1-4]/)
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

    // Mükerrer veri kontrolü (Influx bazen sınır değerini tekrar yollar)
    const newRows = rows.filter(r => new Date(r._time).getTime() > lastSyncTime);

    if (newRows.length === 0) {
      return NextResponse.json({ message: "Sistem güncel, yeni veri yok." });
    }

    console.log(`[Sync] ${newRows.length} adet hizalanmış (5dk) yeni veri bulundu.`);

    // 3. FIRESTORE'A YAZMA
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
            
            // Tek Timestamp, 4 Batarya verisi
            const docId = `${coopId}_${timestamp.toISOString()}`;
            const docRef = doc(db, 'water_readings', docId);

            batch.set(docRef, {
                coopId,
                timestamp: timestamp,
                b1, b2, b3, b4
            }, { merge: true });
        });

        await batch.commit();
        totalWritten += chunk.length;
    }

    // 4. META GÜNCELLEME
    if (totalWritten > 0) {
        await setDoc(metaRef, {
            lastImportedTime: Timestamp.fromMillis(maxTime),
            lastSyncCheck: Timestamp.now()
        }, { merge: true });
    }

    return NextResponse.json({ 
      success: true, 
      importedCount: totalWritten,
      message: `${totalWritten} yeni kayıt (5dk aralıklı) başarıyla eklendi.` 
    });

  } catch (error: any) {
    console.error('[Sync Hatası]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}