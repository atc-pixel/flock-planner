"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ParsedSlip, Row, Cell } from "./types";
import {
  ensureAllLevels,
  deriveDaily,
  parseCell,
  todayMidnightLocal,
  formatYYYYMMDD,
} from "./utils";
import { useFlocks } from "./useFlocks";

import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";

function makeEmptySlip(): ParsedSlip {
  return {
    coop: "T3",
    date: "-", // UI’da gösterilmiyor, timestamp otomatik
    rows: ensureAllLevels([]),
    back: { dirty: "-", broken: "-" },
    note: "-",
    bottomRight: "-",
  };
}

export default function ManualSlipEntry() {
  const { loading: flocksLoading, flocks } = useFlocks();

  const [slip, setSlip] = useState<ParsedSlip>(() => makeEmptySlip());
  const [selectedFlockId, setSelectedFlockId] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Bugünün tarihi (local midnight) — hem date timestamp hem docId için
  const today = useMemo(() => todayMidnightLocal(), []);
  const todayYmd = useMemo(() => formatYYYYMMDD(today), [today]);

  const derived = useMemo(() => deriveDaily(slip), [slip]);

  function resetFormKeepCoopAndFlock() {
    setSlip((prev) => ({
      ...makeEmptySlip(),
      coop: prev.coop, // kümes kalsın
    }));
    // flock KALSIN
  }

  // coop değişince flock default seç (sadece lane=1)
  useEffect(() => {
    if (flocksLoading) return;
    if (slip.coop === "-") return;

    const coopFlocks = flocks.filter((f: any) => {
      const sameCoop =
        String(f?.coopId || "").toUpperCase() === slip.coop;
      const isLane1 = Number(f?.lane) === 1;
      return sameCoop && isLane1;
    });

    if (coopFlocks.length === 0) {
      setSelectedFlockId("");
      return;
    }

    const stillValid = coopFlocks.some(
      (f: any) => f.id === selectedFlockId
    );

    if (!stillValid) {
      setSelectedFlockId(coopFlocks[0].id);
    }
  }, [slip.coop, flocks, flocksLoading, selectedFlockId]);

  function setHeader<K extends keyof Omit<ParsedSlip, "rows">>(
    key: K,
    value: ParsedSlip[K]
  ) {
    setSlip((prev) => ({ ...prev, [key]: value }));
  }

  function setCell(
    level: number,
    key: keyof Omit<Row, "level">,
    value: Cell
  ) {
    setSlip((prev) => {
      const rows = prev.rows.map((r) =>
        r.level === level ? { ...r, [key]: value } : r
      );
      return { ...prev, rows };
    });
  }

  async function saveToFirestore() {
    setSaveErr(null);
    setSaveMsg(null);

    const coopId = slip.coop === "-" ? "" : slip.coop;
    if (!coopId) {
      setSaveErr("Kümes boş olamaz.");
      return;
    }
    if (!selectedFlockId) {
      setSaveErr("Bu kümes için aktif (lane=1) flock bulunamadı.");
      return;
    }

    setSaving(true);
    try {
      const dateTs = Timestamp.fromDate(today); // 00:00
      const createdAt = serverTimestamp();

      const docId = `${selectedFlockId}_${todayYmd}`;

      const payload = {
        coopId,
        flockId: selectedFlockId,

        eggCount: derived.eggCount,
        dirtyEggCount: derived.dirtyEggCount,
        brokenEggCount: derived.brokenEggCount,
        avgWeight: derived.avgWeight ?? null,

        mortality: 0,

        date: dateTs,
        createdAt,
        createdBy: "manual_entry",
      };

      await setDoc(doc(db, "daily_logs", docId), payload, { merge: true });

      setSaveMsg("Kaydedildi ✅");
      resetFormKeepCoopAndFlock();
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: any) {
      setSaveErr(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Manuel Dijital Sayım Fişi
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Günlük giriş – sadece aktif sürüler (lane=1)
            </p>
          </div>

          <button
            type="button"
            onClick={saveToFirestore}
            disabled={saving}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold text-white",
              saving
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-emerald-600 hover:opacity-95",
            ].join(" ")}
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>

        {saveErr && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {saveErr}
          </div>
        )}

        {saveMsg && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {saveMsg}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <div className="text-xs font-medium text-slate-600">Kümes</div>
            <input
              value={slip.coop === "-" ? "" : slip.coop}
              onChange={(e) =>
                setHeader(
                  "coop",
                  (e.target.value.trim().toUpperCase() || "-") as any
                )
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base"
              placeholder="T3"
            />
          </label>

          <label className="block">
            <div className="text-xs font-medium text-slate-600">Tarih</div>
            <input
              value={todayYmd}
              readOnly
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-3 text-base text-slate-700"
            />
          </label>

          <label className="block sm:col-span-2">
            <div className="text-xs font-medium text-slate-600">
              Flock (aktif – lane=1)
            </div>
            <select
              value={selectedFlockId}
              onChange={(e) => setSelectedFlockId(e.target.value)}
              disabled={flocksLoading || slip.coop === "-"}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base"
            >
              {flocksLoading ? (
                <option value="">Yükleniyor...</option>
              ) : slip.coop === "-" ? (
                <option value="">Önce kümes gir</option>
              ) : (
                flocks
                  .filter((f: any) => {
                    const sameCoop =
                      String(f?.coopId || "").toUpperCase() === slip.coop;
                    const isLane1 = Number(f?.lane) === 1;
                    return sameCoop && isLane1;
                  })
                  .map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {String(f.id).slice(0, 6)}…
                    </option>
                  ))
              )}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <div className="text-xs font-medium text-slate-600">
              Ortalama gramaj
            </div>
            <input
              value={slip.bottomRight === "-" ? "" : slip.bottomRight}
              onChange={(e) =>
                setHeader("bottomRight", (e.target.value.trim() || "-") as any)
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base"
              placeholder="56,6"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Kat Bazlı Giriş
          </h3>
        </div>

        <div className="grid grid-cols-[90px_1fr_1fr_1fr] gap-2 text-xs font-semibold text-slate-600 px-1">
          <div>Kat</div>
          <div>Sağlam</div>
          <div>Kirli</div>
          <div>Kırık</div>
        </div>

        <div className="mt-2 space-y-2">
          {slip.rows.map((r) => (
            <div
              key={r.level}
              className="grid grid-cols-[90px_1fr_1fr_1fr] gap-2 rounded-2xl border border-slate-200 bg-white p-2"
            >
              <div className="flex items-center text-sm font-semibold text-slate-900">
                {r.level}. Kat
              </div>

              <input
                value={r.solid === "-" ? "" : String(r.solid)}
                onChange={(e) =>
                  setCell(r.level, "solid", parseCell(e.target.value))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
                inputMode="numeric"
                placeholder="-"
              />

              <input
                value={r.dirty === "-" ? "" : String(r.dirty)}
                onChange={(e) =>
                  setCell(r.level, "dirty", parseCell(e.target.value))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
                inputMode="numeric"
                placeholder="-"
              />

              <input
                value={r.broken === "-" ? "" : String(r.broken)}
                onChange={(e) =>
                  setCell(r.level, "broken", parseCell(e.target.value))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
                inputMode="numeric"
                placeholder="-"
              />
            </div>
          ))}

          <div className="grid grid-cols-[90px_1fr_1fr_1fr] gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <div className="flex items-center text-sm font-semibold text-slate-900">
              Arka
            </div>

            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
              —
            </div>

            <input
              value={slip.back.dirty === "-" ? "" : String(slip.back.dirty)}
              onChange={(e) =>
                setSlip((prev) => ({
                  ...prev,
                  back: { ...prev.back, dirty: parseCell(e.target.value) },
                }))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
              inputMode="numeric"
              placeholder="-"
            />

            <input
              value={slip.back.broken === "-" ? "" : String(slip.back.broken)}
              onChange={(e) =>
                setSlip((prev) => ({
                  ...prev,
                  back: { ...prev.back, broken: parseCell(e.target.value) },
                }))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
              inputMode="numeric"
              placeholder="-"
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Özet</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-800">
            <div>eggCount: <b>{derived.eggCount}</b></div>
            <div>avgWeight: <b>{derived.avgWeight ?? "-"}</b></div>
            <div>dirtyEggCount: <b>{derived.dirtyEggCount}</b></div>
            <div>brokenEggCount: <b>{derived.brokenEggCount}</b></div>
          </div>
        </div>
      </section>
    </div>
  );
}
