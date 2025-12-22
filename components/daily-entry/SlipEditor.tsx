"use client";

import React from "react";
import type { ParsedSlip, Row, Cell, DerivedDaily } from "./types";
import { parseCell } from "./utils";
import type { Flock } from "@/lib/utils";

type Props = {
  slip: ParsedSlip;
  derived: DerivedDaily;
  flocksLoading: boolean;
  flocks: Flock[];
  selectedFlockId: string;
  mortality: number;

  onHeaderChange: <K extends keyof Omit<ParsedSlip, "rows">>(
    key: K,
    value: ParsedSlip[K]
  ) => void;
  onCellChange: (
    level: number,
    key: keyof Omit<Row, "level">,
    value: Cell
  ) => void;

  onFlockChange: (id: string) => void;
  onMortalityChange: (n: number) => void;
};

export default function SlipEditor({
  slip,
  derived,
  flocksLoading,
  flocks,
  selectedFlockId,
  mortality,
  onHeaderChange,
  onCellChange,
  onFlockChange,
  onMortalityChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">
          Dijital Sayım Fişi
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Hücreleri değiştirince JSON otomatik güncellenir. Boşlar “-”.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <div className="text-xs font-medium text-slate-600">Kümes</div>
          <input
            value={slip.coop}
            onChange={(e) =>
              onHeaderChange("coop", (e.target.value.trim() || "-") as ParsedSlip["coop"])
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            placeholder="T3"
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-slate-600">
            Tarih (DD-MM-YYYY)
          </div>
          <input
            value={slip.date}
            onChange={(e) =>
              onHeaderChange("date", (e.target.value.trim() || "-") as ParsedSlip["date"])
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            placeholder="13-12-2015"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <div className="text-xs font-medium text-slate-600">Flock</div>
          <select
            value={selectedFlockId}
            onChange={(e) => onFlockChange(e.target.value)}
            disabled={flocksLoading || slip.coop === "-"}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {flocksLoading ? (
              <option value="">Yükleniyor...</option>
            ) : slip.coop === "-" ? (
              <option value="">Önce kümes seç</option>
            ) : (
              flocks
                .filter((f) => f.coopId === slip.coop)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.id.slice(0, 6)}…
                  </option>
                ))
            )}
          </select>
        </label>

        <label className="block">
          <div className="text-xs font-medium text-slate-600">Mortality</div>
          <input
            value={String(mortality)}
            onChange={(e) => onMortalityChange(Number(e.target.value || 0))}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            inputMode="numeric"
          />
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left w-20">Kat</th>
              <th className="px-3 py-2 text-left">Sağlam</th>
              <th className="px-3 py-2 text-left">İri</th>
              <th className="px-3 py-2 text-left">Kirli</th>
              <th className="px-3 py-2 text-left">Kırık</th>
            </tr>
          </thead>

          <tbody>
            {slip.rows.map((r) => (
              <tr key={r.level} className="border-t border-slate-200">
                <td className="px-3 py-2 font-semibold text-slate-900">
                  {r.level}. Kat
                </td>

                {(["solid", "large", "dirty", "broken"] as const).map((k) => (
                  <td key={k} className="px-2 py-2">
                    <input
                      value={r[k] === "-" ? "-" : String(r[k])}
                      onChange={(e) => onCellChange(r.level, k, parseCell(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                      placeholder="-"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr>
              <td className="px-3 py-2 font-semibold text-slate-900">Toplam</td>
              <td className="px-3 py-2 font-semibold text-slate-900">
                {derived.eggCount}
              </td>
              <td className="px-3 py-2 font-semibold text-slate-900">-</td>
              <td className="px-3 py-2 font-semibold text-slate-900">
                {derived.dirtyEggCount}
              </td>
              <td className="px-3 py-2 font-semibold text-slate-900">
                {derived.brokenEggCount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <div className="text-xs font-medium text-slate-600">Not</div>
          <input
            value={slip.note}
            onChange={(e) =>
              onHeaderChange("note", (e.target.value.trim() || "-") as ParsedSlip["note"])
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            placeholder="-"
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-slate-600">
            Ortalama gramaj (avgWeight)
          </div>
          <input
            value={slip.bottomRight}
            onChange={(e) =>
              onHeaderChange(
                "bottomRight",
                (e.target.value.trim() || "-") as ParsedSlip["bottomRight"]
              )
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            placeholder="63,4"
          />
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
        <div className="font-semibold mb-2">Daily Log Özeti</div>
        <div className="grid grid-cols-1 gap-1 text-xs">
          <div>
            eggCount (1. kat sağlam): <b>{derived.eggCount}</b>
          </div>
          <div>
            dirtyEggCount (toplam): <b>{derived.dirtyEggCount}</b>
          </div>
          <div>
            brokenEggCount (toplam): <b>{derived.brokenEggCount}</b>
          </div>
          <div>
            avgWeight: <b>{derived.avgWeight ?? "-"}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
