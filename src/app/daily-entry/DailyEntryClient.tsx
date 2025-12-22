"use client";

import React, { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import DailyEntryLLM from "@/components/daily-entry/DailyEntryLLM";
import ManualSlipEntry from "@/components/daily-entry/ManualSlipEntry";
import { LayoutGrid } from "lucide-react";

type TabKey = "llm" | "manual";

export default function DailyEntryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const tab = (sp.get("tab") as TabKey) || "llm";

  const setTab = (t: TabKey) => {
    const params = new URLSearchParams(sp.toString());
    params.set("tab", t);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const subtitle = useMemo(() => (tab === "llm" ? "LLM ile Oku" : "Manuel Giriş"), [tab]);

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-4">
      <div className="flex items-center gap-2">
        <LayoutGrid className="text-slate-400" />
        <div>
          <h2 className="text-lg font-bold text-slate-600">Günlük Girişler</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab("llm")}
            className={[
              "rounded-xl px-3 py-2 text-sm font-semibold transition",
              tab === "llm"
                ? "bg-slate-900 text-white"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100",
            ].join(" ")}
          >
            LLM ile Oku
          </button>

          <button
            type="button"
            onClick={() => setTab("manual")}
            className={[
              "rounded-xl px-3 py-2 text-sm font-semibold transition",
              tab === "manual"
                ? "bg-slate-900 text-white"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100",
            ].join(" ")}
          >
            Manuel Giriş
          </button>
        </div>
      </div>

      {tab === "llm" ? <DailyEntryLLM /> : <ManualSlipEntry />}
    </main>
  );
}
