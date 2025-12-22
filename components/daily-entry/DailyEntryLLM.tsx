"use client";

import React, { useMemo, useState, useEffect } from "react";
import DailyEntryUploader from "./DailyEntryUploader";
import SlipEditor from "./SlipEditor";
import JsonPanels from "./JsonPanels";
import { useFlocks } from "./useFlocks";

import type { ParsedSlip, Row, Cell, FirestoreDraft } from "./types";
import { ensureAllLevels, deriveDaily } from "./utils";

export default function DailyEntryLLM() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [slip, setSlip] = useState<ParsedSlip | null>(null);

  const { loading: flocksLoading, flocks } = useFlocks();
  const [selectedFlockId, setSelectedFlockId] = useState<string>("");
  const [mortality, setMortality] = useState<number>(0);

  async function analyze() {
    if (!imageDataUrl) return;
    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch("/api/daily-entry/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        setApiError(data?.error ? `${data.error}\n${data?.detail ?? ""}` : "API error");
        setLoading(false);
        return;
      }

      const parsed = data?.parsed as ParsedSlip;
      const rows = ensureAllLevels(Array.isArray(parsed?.rows) ? parsed.rows : []);

      setSlip({
        coop: parsed?.coop ?? "-",
        date: parsed?.date ?? "-",
        rows,
        back: {
          dirty: parsed?.back?.dirty ?? "-",
          broken: parsed?.back?.broken ?? "-",
        },
        note: parsed?.note ?? "-",
        bottomRight: parsed?.bottomRight ?? "-",
      });

    } catch (e: any) {
      setApiError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  // slip.coop geldikten sonra aynı coopId’ye ait flock’lardan ilkini default seç
  useEffect(() => {
    if (!slip) return;
    if (flocksLoading) return;
    if (slip.coop === "-") return;

    const coopFlocks = flocks.filter((f) => f.coopId === slip.coop);
    if (coopFlocks.length === 0) return;

    const stillValid = coopFlocks.some((f) => f.id === selectedFlockId);
    if (!stillValid) setSelectedFlockId(coopFlocks[0].id);
  }, [slip, flocks, flocksLoading, selectedFlockId]);

  const derived = useMemo(() => (slip ? deriveDaily(slip) : null), [slip]);

  const draft: FirestoreDraft | null = useMemo(() => {
    if (!slip || !derived) return null;

    return {
      coopId: slip.coop === "-" ? null : slip.coop,
      date: slip.date,
      eggCount: derived.eggCount,
      dirtyEggCount: derived.dirtyEggCount,
      brokenEggCount: derived.brokenEggCount,
      avgWeight: derived.avgWeight,
      flockId: selectedFlockId || null,
      mortality: mortality,
    };
  }, [slip, derived, selectedFlockId, mortality]);

  function onHeaderChange<K extends keyof Omit<ParsedSlip, "rows">>(key: K, value: ParsedSlip[K]) {
    setSlip((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function onCellChange(level: number, key: keyof Omit<Row, "level">, value: Cell) {
    setSlip((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.map((r) => (r.level === level ? { ...r, [key]: value } : r));
      return { ...prev, rows };
    });
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 md:p-8 space-y-6">
      <DailyEntryUploader
        onImageSelected={(f, url) => {
          setImageFile(f);
          setImageDataUrl(url);
          setSlip(null);
          setApiError(null);
        }}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-600">
          {imageFile ? (
            <span>
              Hazır: <span className="font-semibold text-slate-900">{imageFile.name}</span>
            </span>
          ) : (
            "Görsel seçince LLM’e gönderebilirsin."
          )}
        </div>

        <button
          type="button"
          onClick={analyze}
          disabled={!imageDataUrl || loading}
          className={[
            "rounded-xl px-4 py-2 text-sm font-semibold text-white",
            loading || !imageDataUrl ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:opacity-95",
          ].join(" ")}
        >
          {loading ? "Okunuyor..." : "LLM’e Gönder"}
        </button>
      </div>

      {apiError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 whitespace-pre-wrap">
          {apiError}
        </div>
      ) : null}

      {slip && derived && draft ? (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SlipEditor
            slip={slip}
            onChange={(next) => setSlip(next)}
          />
          <JsonPanels slip={slip} draft={draft} />
        </section>
      ) : null}
    </main>
  );
}
