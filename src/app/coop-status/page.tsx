// src/app/coop-status/page.tsx
import { CoopWaterOverviewChart } from "@/components/coop-status/CoopWaterOverviewChart";
import { CoopWaterInstantChart } from "@/components/coop-status/CoopWaterInstantChart";
import { CoopWaterInstantTable } from "@/components/coop-status/CoopWaterInstantTable";

export default function CoopStatusPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Kümes Durumu
        </h1>
        <p className="text-sm text-muted-foreground">
          T1 kümesi için su tüketim özetleri.
        </p>
      </header>

      {/* Günlük toplamlar (4 batarya + toplam) */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-medium">
            Günlük Toplam Su Tüketimi – Batarya Bazında (T1)
          </h2>
          <p className="text-xs text-muted-foreground">
            Son 7 günde her bir bataryanın günlük toplam tüketimi (L).
          </p>
        </div>
        <CoopWaterOverviewChart coopId="T1" days={7} />
      </section>

      {/* Anlık tüketim geçmişi (10 dakikalık) */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-medium">
            Anlık Su Tüketim Geçmişi – Batarya Bazında (T1)
          </h2>
          <p className="text-xs text-muted-foreground">
            Son 24 saatte, 10 dakikalık aralıklarla her bataryanın tüketimi (L/10dk).
          </p>
        </div>
        <CoopWaterInstantChart coopId="T1" hours={24} />
      </section>

            {/* Anlık tüketim grafiği + tablo */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-medium">
            Anlık Su Tüketim Geçmişi – Batarya Bazında (T1)
          </h2>
          <p className="text-xs text-muted-foreground">
            Son 24 saatte, 10 dakikalık aralıklarla her bataryanın tüketimi
            (L/10dk). Aşağıda aynı veriyi tablo halinde görebilirsin.
          </p>
        </div>

        {/* Grafik */}
        <CoopWaterInstantChart coopId="T1" hours={24} />

        {/* Tablo (grafikle aynı endpoint verisi) */}
        <CoopWaterInstantTable coopId="T1" hours={24} />
      </section>

    </div>
  );
}
