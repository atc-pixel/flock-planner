"use client";

import React from "react";
import type { ParsedSlip, Row } from "./types";
import { ensureAllLevels, parseCell } from "./utils";

type RowKey = "solid" | "dirty" | "broken";

export default function SlipEditor({
  slip,
  onChange,
}: {
  slip: ParsedSlip;
  onChange: (next: ParsedSlip) => void;
}) {
  const rows = ensureAllLevels(Array.isArray(slip.rows) ? slip.rows : []);

  const columns: Array<{ key: RowKey; label: string }> = [
    { key: "solid", label: "Sağlam" },
    { key: "dirty", label: "Kirli" },
    { key: "broken", label: "Kırık" },
  ];

  const onCellChange = (level: number, key: RowKey, value: any) => {
    const nextRows: Row[] = rows.map((r) => (r.level === level ? { ...r, [key]: value } : r));
    onChange({ ...slip, rows: nextRows });
  };

  const onBackChange = (key: "dirty" | "broken", value: any) => {
    onChange({
      ...slip,
      back: {
        dirty: slip.back?.dirty ?? "-",
        broken: slip.back?.broken ?? "-",
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Üst bilgiler */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <div className="text-xs font-medium text-slate-600">Kümes</div>
            <input
              value={slip.coop === "-" ? "" : slip.coop}
              onChange={(e) => onChange({ ...slip, coop: (e.target.value.trim() || "-") as any })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="T3"
            />
          </label>

          <label className="block">
            <div className="text-xs font-medium text-slate-600">Tarih (DD-MM-YYYY)</div>
            <input
              value={slip.date === "-" ? "" : slip.date}
              onChange={(e) => onChange({ ...slip, date: (e.target.value.trim() || "-") as any })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="22-07-2025"
            />
          </label>

          <label className="block sm:col-span-2">
            <div className="text-xs font-medium text-slate-600">Ortalama gramaj</div>
            <input
              value={slip.bottomRight === "-" ? "" : slip.bottomRight}
              onChange={(e) =>
                onChange({ ...slip, bottomRight: (e.target.value.trim() || "-") as any })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="56,6"
            />
          </label>
        </div>
      </div>

      {/* Kat tablosu */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th className="px-2 py-2 w-[90px]">Kat</th>
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-2">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.level} className="border-t border-slate-100">
                <td className="px-2 py-2 font-semibold text-slate-800">{r.level}. Kat</td>

                {columns.map((c) => (
                  <td key={c.key} className="px-2 py-2">
                    <input
                      value={r[c.key] === "-" ? "" : String(r[c.key])}
                      onChange={(e) => onCellChange(r.level, c.key, parseCell(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                      placeholder="-"
                      inputMode="numeric"
                    />
                  </td>
                ))}
              </tr>
            ))}

            {/* ARKA satırı */}
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-2 py-2 font-semibold text-slate-800">Arka</td>

              {/* Arka'da sağlam yok */}
              <td className="px-2 py-2 text-slate-500">—</td>

              <td className="px-2 py-2">
                <input
                  value={slip.back?.dirty === "-" ? "" : String(slip.back?.dirty ?? "-")}
                  onChange={(e) => onBackChange("dirty", parseCell(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                  placeholder="-"
                  inputMode="numeric"
                />
              </td>

              <td className="px-2 py-2">
                <input
                  value={slip.back?.broken === "-" ? "" : String(slip.back?.broken ?? "-")}
                  onChange={(e) => onBackChange("broken", parseCell(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                  placeholder="-"
                  inputMode="numeric"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
