"use client";

import React, { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Bird, LogOut, LayoutGrid } from "lucide-react";

import DailyEntryLLM from "@/components/daily-entry/DailyEntryLLM";
import ManualSlipEntry from "@/components/daily-entry/ManualSlipEntry";

type TabKey = "llm" | "manual";

export default function DailyEntryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserEmail(user.email ?? null);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const tab = (sp.get("tab") as TabKey) || "llm";

  const setTab = (t: TabKey) => {
    const params = new URLSearchParams(sp.toString());
    params.set("tab", t);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const subtitle = useMemo(
    () => (tab === "llm" ? "LLM ile Oku" : "Manuel Giriş"),
    [tab]
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header — production/planner stili */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-lg text-white">
            <Bird size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Tarım Gıda
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Günlük Girişler
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-400 hidden sm:block">
            {userEmail}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-bold transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="text-slate-400" />
          <div>
            <h2 className="text-lg font-bold text-slate-600">Günlük Girişler</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>

        {/* Tabs */}
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
    </div>
  );
}
