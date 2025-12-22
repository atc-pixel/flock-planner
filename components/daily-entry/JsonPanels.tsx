"use client";

import React from "react";
import type { ParsedSlip, FirestoreDraft } from "./types";

export default function JsonPanels({
  slip,
  draft,
}: {
  slip: ParsedSlip;
  draft: FirestoreDraft;
}) {
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
            Henüz yazmıyoruz. Bir sonraki adımda date Timestamp olacak.
          </p>
        </div>
        <pre className="max-h-[340px] overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
{JSON.stringify(draft, null, 2)}
        </pre>
      </div>
    </div>
  );
}
