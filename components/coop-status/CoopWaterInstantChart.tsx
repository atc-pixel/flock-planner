// src/components/coop-status/CoopWaterInstantChart.tsx
"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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

export function CoopWaterInstantChart({ coopId = "T1", hours = 24 }: Props) {
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
  }, [coopId, hours]);

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

  // X ekseni için label: "HH:MM"
  const formattedData = data.map((d) => ({
    ...d,
    timeLabel: new Date(d.time).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timeLabel" />
          <YAxis />
          <Tooltip
            formatter={(value: any, name: any) => {
              if (typeof value === "number") {
                return [`${value.toFixed(0)} L/10dk`, name];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `Zaman: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="battery1"
            name="Batarya 1"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="battery2"
            name="Batarya 2"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="battery3"
            name="Batarya 3"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="battery4"
            name="Batarya 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
