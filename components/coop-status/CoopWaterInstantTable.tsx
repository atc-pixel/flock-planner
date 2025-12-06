// src/components/coop-status/CoopWaterInstantTable.tsx
"use client";

import { useEffect, useState } from "react";

type Point = {
  time: string;
  battery1: number;
  battery2: number;
  battery3: number;
  battery4: number;
};

type Props = {
  coopId?: string;
  hours?: number;
};

export function CoopWaterInstantTable({ coopId = "T1", hours = 24 }: Props) {
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/coop-status/api/instant-water?coopId=${coopId}&hours=${hours}`
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json.data ?? []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Tablo verisi alınamadı.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [coopId, hours]);

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground mt-2">
        Tablo verisi yükleniyor…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-500 mt-2">
        {error}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="text-xs text-muted-foreground mt-2">
        Bu dönem için 10 dakikalık veri bulunamadı.
      </div>
    );
  }

  // Zamanı okunur formatta gösterelim (gün + saat:dakika)
  const rows = data.map((d) => ({
    ...d,
    timeLabel: new Date(d.time).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <div className="mt-4 border rounded-lg overflow-hidden">
      <div className="max-h-80 overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <th className="px-2 py-1 text-left font-medium">Zaman</th>
              <th className="px-2 py-1 text-right font-medium">Batarya 1</th>
              <th className="px-2 py-1 text-right font-medium">Batarya 2</th>
              <th className="px-2 py-1 text-right font-medium">Batarya 3</th>
              <th className="px-2 py-1 text-right font-medium">Batarya 4</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.time}
                className="border-t last:border-b"
              >
                <td className="px-2 py-1 whitespace-nowrap">
                  {row.timeLabel}
                </td>
                <td className="px-2 py-1 text-right">
                  {row.battery1.toFixed(2)}
                </td>
                <td className="px-2 py-1 text-right">
                  {row.battery2.toFixed(2)}
                </td>
                <td className="px-2 py-1 text-right">
                  {row.battery3.toFixed(2)}
                </td>
                <td className="px-2 py-1 text-right">
                  {row.battery4.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-2 py-1 text-[10px] text-muted-foreground border-t">
        Son {hours} saatin 10 dakikalık tüketim kayıtları (her satır 1 interval).
      </div>
    </div>
  );
}
