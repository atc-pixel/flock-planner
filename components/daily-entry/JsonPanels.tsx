"use client";

import React from "react";
import type { ParsedSlip, FirestoreDraft } from "./types";
import type { Flock } from "@/lib/utils";

type JsonPanelsProps = {
  slip: ParsedSlip;
  draft: FirestoreDraft;
  onSave?: () => void;
  saving?: boolean;
  saveMsg?: string | null;
  saveErr?: string | null;
  selectedFlockId?: string;
  onFlockChange?: (flockId: string) => void;
  flocks?: Flock[];
  mortality?: number;
  onMortalityChange?: (value: number) => void;
};

export default function JsonPanels({
  slip,
  draft,
  onSave,
  saving = false,
  saveMsg,
  saveErr,
  selectedFlockId,
  onFlockChange,
  flocks = [],
  mortality = 0,
  onMortalityChange,
}: JsonPanelsProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">JSON Çıktısı (Fiş)</h3>
        </div>
        <pre className="max-h-[340px] overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
{JSON.stringify(slip, null, 2)}
        </pre>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">Firestore Draft (Daily Log)</h3>
          <p className="mt-1 text-xs text-slate-600">
            Kontrol et, gerekirse düzenle, sonra kaydet.
          </p>
        </div>

        {/* Flock seçimi */}
        {onFlockChange && flocks.length > 0 && (
          <div className="mb-4">
            <label className="block">
              <div className="text-xs font-medium text-slate-600 mb-1">Flock</div>
              <select
                value={selectedFlockId || ""}
                onChange={(e) => onFlockChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Flock seçin...</option>
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.coopId})
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* Mortality input */}
        {onMortalityChange !== undefined && (
          <div className="mb-4">
            <label className="block">
              <div className="text-xs font-medium text-slate-600 mb-1">Ölü Sayısı</div>
              <input
                type="number"
                min="0"
                value={mortality}
                onChange={(e) => onMortalityChange(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
          </div>
        )}

        <pre className="max-h-[240px] overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100 mb-4">
{JSON.stringify(draft, null, 2)}
        </pre>

        {/* Kaydet butonu */}
        {onSave && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !selectedFlockId}
              className={[
                "w-full rounded-xl px-4 py-2 text-sm font-semibold text-white transition",
                saving || !selectedFlockId
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-slate-900 hover:opacity-95",
              ].join(" ")}
            >
              {saving ? "Kaydediliyor..." : "Firestore'a Kaydet"}
            </button>

            {saveMsg && (
              <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
                {saveMsg}
              </div>
            )}

            {saveErr && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 whitespace-pre-wrap">
                {saveErr}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
