// src/app/coop-status/api/sync-water/route.ts
import { NextResponse } from "next/server";
import { getMultiBatteryInstantWater } from "../../../../../lib/influx";
import { db } from "../../../../../lib/firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";

export const dynamic = "force-dynamic";

type LastImportedMeta = {
  lastImportedTime?: Date | Timestamp | { toDate?: () => Date };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const coopId = searchParams.get("coopId") || "T1";

  const daysParam = searchParams.get("days");
  const days = daysParam ? Number(daysParam) : 30;

  if (Number.isNaN(days) || days <= 0) {
    return NextResponse.json(
      { error: "days must be a positive number" },
      { status: 400 }
    );
  }

  try {
    /**
     * 1) Meta dokümandan son import zamanını al
     */
    const metaDocRef = doc(collection(db, "water_meta"), coopId);
    const metaSnap = await getDoc(metaDocRef);

    let lastImported: Date | null = null;

    if (metaSnap.exists()) {
      const data = metaSnap.data() as LastImportedMeta;
      const v = data?.lastImportedTime;

      if (v instanceof Date) {
        lastImported = v;
      } else if (v instanceof Timestamp) {
        lastImported = v.toDate();
      } else if (v && typeof v === "object" && "toDate" in v) {
        // Emniyet için
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lastImported = (v as any).toDate();
      }
    }

    const now = new Date();
    let fromTimeMs: number;
    let hours: number;

    if (lastImported) {
      // Daha önce sync yapılmış → incremental
      const start = new Date(lastImported.getTime() - 30 * 60 * 1000); // 30 dk geri
      fromTimeMs = start.getTime();
      const diffMs = now.getTime() - fromTimeMs;
      hours = Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000)));

      console.log(
        `[sync-water] Coop ${coopId} incremental sync. Last: ${lastImported.toISOString()}, start: ${start.toISOString()}, hours: ${hours}`
      );
    } else {
      // İlk sync → son X günü al
      const start = new Date(
        now.getTime() - days * 24 * 60 * 60 * 1000
      );
      fromTimeMs = start.getTime();
      hours = days * 24;

      console.log(
        `[sync-water] Coop ${coopId} first sync. Taking last ${days} days (${hours}h) starting from ${start.toISOString()}`
      );
    }

    /**
     * 2) Influx'tan 10 dk serisini al
     */
    const instantPoints = await getMultiBatteryInstantWater(coopId, hours);

    if (!instantPoints.length) {
      return NextResponse.json({
        message: "Influx'tan veri gelmedi (belirtilen aralıkta).",
        importedCount: 0,
        coopId,
        days,
      });
    }

    /**
     * 3) Firestore'a yazılacak dokümanları hazırla
     */
    type WriteDoc = {
      docId: string;
      coopId: string;
      battery: number;
      ts: Date;
      liters10m: number;
    };

    const docsToWrite: WriteDoc[] = [];

    for (const p of instantPoints) {
      const ts = new Date(p.time);
      const tsMs = ts.getTime();

      // Başlangıç zamanından önceki slotları at
      if (tsMs < fromTimeMs) continue;

      for (let battery = 1; battery <= 4; battery++) {
        const key = `battery${battery}` as const;
        const value = (p as any)[key];

        if (typeof value !== "number" || Number.isNaN(value)) {
          continue;
        }

        const docId = `${coopId}_${battery}_${ts.toISOString()}`;

        docsToWrite.push({
          docId,
          coopId,
          battery,
          ts,
          liters10m: value,
        });
      }
    }

    if (!docsToWrite.length) {
      return NextResponse.json({
        message:
          "Seçilen aralıkta, son importedTime'dan sonra yeni slot bulunamadı.",
        importedCount: 0,
        coopId,
        days,
      });
    }

    console.log(
      `[sync-water] Firestore'a yazılacak slot sayısı: ${docsToWrite.length}`
    );

    /**
     * 4) Batch ile Firestore'a yaz
     */
    const batchSize = 400;
    let written = 0;

    for (let i = 0; i < docsToWrite.length; i += batchSize) {
      const batch = writeBatch(db);
      const slice = docsToWrite.slice(i, i + batchSize);

      for (const d of slice) {
        const docRef = doc(
          collection(db, "water_readings"),
          d.docId
        );

        batch.set(
          docRef,
          {
            coopId: d.coopId,
            battery: d.battery,
            ts: Timestamp.fromDate(d.ts),
            liters10m: d.liters10m,
          },
          { merge: true }
        );
      }

      await batch.commit();
      written += slice.length;

      console.log(
        `[sync-water] Batch commit. Toplam yazılan: ${written}`
      );
    }

    /**
     * 5) Meta dokümanı güncelle (en yeni zaman)
     */
    const newestTs = docsToWrite.reduce((max, d) => {
      return d.ts > max ? d.ts : max;
    }, docsToWrite[0].ts);

    await setDoc(
      metaDocRef,
      {
        lastImportedTime: Timestamp.fromDate(newestTs),
      },
      { merge: true }
    );

    console.log(
      `[sync-water] lastImportedTime güncellendi: ${newestTs.toISOString()}`
    );

    return NextResponse.json({
      message: "Sync tamamlandı.",
      coopId,
      days,
      importedCount: written,
      from: new Date(fromTimeMs).toISOString(),
      to: newestTs.toISOString(),
    });
  } catch (error: any) {
    console.error("[sync-water] Hata:", error);
    return NextResponse.json(
      { error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}
