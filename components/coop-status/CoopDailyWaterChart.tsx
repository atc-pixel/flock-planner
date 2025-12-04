// src/components/coop-status/CoopDailyWaterChart.tsx
"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Point = {
  date: string;
  totalLiters: number;
};

type Props = {
  coopId?: string;
  days?: number;
};

export function CoopDailyWaterChart({ coopId = "T1", days = 7 }: Props) {
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
          `/coop-status/api/daily-water?coopId=${coopId}&days=${days}`
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
          setError("Veri alınamadı.");
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
  }, [coopId, days]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Yükleniyor…</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  if (!data.length) {
    return (
      <div className="text-sm text-muted-foreground">
        Bu dönem için veri bulunamadı.
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            formatter={(value: any) => [`${value.toFixed?.(0) ?? value} L`, "Toplam"]}
            labelFormatter={(label) => `Tarih: ${label}`}
          />
          <Bar dataKey="totalLiters" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
