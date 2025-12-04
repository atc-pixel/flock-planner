// src/components/coop-status/CoopWaterOverviewChart.tsx
"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Line,
} from "recharts";


type Point = {
  date: string;
  battery1: number;
  battery2: number;
  battery3: number;
  battery4: number;
  total: number;
};

type Props = {
  coopId?: string;
  days?: number;
};

export function CoopWaterOverviewChart({ coopId = "T1", days = 7 }: Props) {
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
          `/coop-status/api/water-overview?coopId=${coopId}&days=${days}`
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
        Bu dönem için su verisi bulunamadı.
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
            formatter={(value: any, name: any) => {
              if (typeof value === "number") {
                return [`${value.toFixed(0)} L`, name];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `Tarih: ${label}`}
          />
          <Legend />
          {/* 4 batarya için ayrı barlar */}
          <Bar dataKey="battery1" name="Batarya 1" />
          <Bar dataKey="battery2" name="Batarya 2" />
          <Bar dataKey="battery3" name="Batarya 3" />
          <Bar dataKey="battery4" name="Batarya 4" />
          <Line
            type="monotone"
            dataKey="total"
            name="Toplam"
            dot={false}
            />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
