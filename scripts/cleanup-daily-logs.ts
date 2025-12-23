import "dotenv/config";
import admin from "firebase-admin";

// service account
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require("../serviceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/* ---------------- helpers ---------------- */

function toNum(v: any): number | null {
  if (typeof v === "number") return v; // NaN dahil
  if (typeof v === "string") {
    const s = v.trim();
    if (!s || s === "-") return null;
    const n = Number(s);
    return n;
  }
  return null;
}

function isZeroOrBad(n: number | null): boolean {
  if (n === null) return true;        // yok / "-"
  if (Number.isNaN(n)) return true;   // NaN
  if (!Number.isFinite(n)) return true;
  return n === 0;
}

/* ---------------- main ---------------- */

async function cleanup() {
  const cutoff = admin.firestore.Timestamp.fromDate(
    new Date("2025-12-20T00:00:00")
  );

  // ❗ Sadece date filtresi → index gerekmez
  const snap = await db
    .collection("daily_logs")
    .where("date", ">=", cutoff)
    .get();

  console.log(`🔎 (date>=2025-12-20) toplam kayıt: ${snap.size}`);

  const toDelete: admin.firestore.QueryDocumentSnapshot[] = [];

  for (const d of snap.docs) {
    const x = d.data() as any;

    const eggRaw =
      x.eggCount ?? x.eggs ?? x.egg_count ?? null;
    const mortRaw =
      x.mortality ?? x.dead ?? x.mortalityCount ?? null;

    const egg = toNum(eggRaw);
    const mort = toNum(mortRaw);

    // 🔴 KURAL: hem yumurta hem ölü 0 / NaN / null ise
    if (isZeroOrBad(egg) && isZeroOrBad(mort)) {
      toDelete.push(d);
    }
  }

  console.log(`🧹 Silinecek aday sayısı: ${toDelete.length}`);

  // örnek log
  for (const d of toDelete.slice(0, 10)) {
    const x = d.data() as any;
    console.log(
      ` - ${d.id} | egg=${String(x.eggCount)} | mort=${String(x.mortality)}`
    );
  }

  /* -------- DRY RUN -------- */
  const DO_DELETE = true; // 🔴 önce false!

  if (!DO_DELETE) {
    console.log("🟡 DRY RUN: Silme yapılmadı. DO_DELETE=true yap.");
    return;
  }

  /* -------- batch delete -------- */
  let batch = db.batch();
  let count = 0;
  let deleted = 0;

  for (const d of toDelete) {
    batch.delete(d.ref);
    count++;
    deleted++;

    if (count === 450) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) await batch.commit();

  console.log(`✅ Temizlik tamamlandı. Silinen kayıt: ${deleted}`);
}

cleanup().catch((err) => {
  console.error("🔥 Hata:", err);
  process.exit(1);
});
