import "dotenv/config";
import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("../serviceAccount.json", import.meta.url), "utf-8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function cleanup() {
  const COOP_ID = "T6";
  const cutoffDate = new Date("2025-08-16T00:00:00.000Z");

  // 🔴 önce false
  const DO_DELETE = true;

  console.log(`🔎 Hedef: daily_logs | coopId=${COOP_ID} | date < 2025-08-16`);
  console.log(`🧪 Mod: ${DO_DELETE ? "DELETE" : "DRY RUN"}`);
  console.log(`ℹ️ Index beklememek için: sadece coopId query + local date filtresi kullanılıyor.`);

  let totalFetched = 0;
  let totalMatched = 0;
  let totalDeleted = 0;

  const pageSize = 450;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;

  while (true) {
    // ✅ Sadece tek-field where + orderBy(__name__) => composite index istemez
    let q = db
      .collection("daily_logs")
      .where("coopId", "==", COOP_ID)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);

    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    totalFetched += snap.size;

    // Local filtre: date < cutoff
    const candidates = snap.docs.filter((d) => {
      const x = d.data() as any;
      const ts = x?.date;

      // Firestore Timestamp bekliyoruz
      const dt: Date | null = ts?.toDate?.() instanceof Date ? ts.toDate() : null;
      if (!dt) return false;

      return dt < cutoffDate;
    });

    totalMatched += candidates.length;

    // ilk sayfadan örnek
    if (totalFetched === snap.size) {
      console.log(`📄 İlk sayfa (fetch=${snap.size}) | eşleşen=${candidates.length} örnek:`);
      for (const d of candidates.slice(0, 10)) {
        const x = d.data() as any;
        console.log(` - ${d.id} | date=${x.date?.toDate?.()?.toISOString()}`);
      }
    }

    if (DO_DELETE && candidates.length > 0) {
      const batch = db.batch();
      for (const d of candidates) batch.delete(d.ref);
      await batch.commit();
      totalDeleted += candidates.length;
      console.log(`🧹 Silindi: +${candidates.length} (Toplam: ${totalDeleted})`);
    } else {
      console.log(`🟡 DRY RUN: Bu sayfa fetch=${snap.size} | silinecek=${candidates.length} | toplam aday=${totalMatched}`);
    }

    lastDoc = snap.docs[snap.docs.length - 1];
  }

  console.log("\n✅ Bitti");
  console.log(`Toplam çekilen (coopId=T6): ${totalFetched}`);
  console.log(`Toplam eşleşen (date<cutoff): ${totalMatched}`);
  console.log(`Toplam silinen: ${DO_DELETE ? totalDeleted : 0}`);

  if (!DO_DELETE) {
    console.log("\n➡️ Gerçek silme için DO_DELETE=true yapıp tekrar çalıştır.");
  }
}

cleanup().catch((err) => {
  console.error("🔥 Fatal:", err);
  process.exit(1);
});
