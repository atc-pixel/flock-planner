"use client";

import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Bird, LogOut } from "lucide-react";

export default function DailyEntryAuthHeader() {
  const router = useRouter();
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

  if (loading) {
    return (
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="text-slate-500 text-sm">Yükleniyor...</div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="bg-amber-500 p-2 rounded-lg text-white">
          <Bird size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Tarım Gıda</h1>
          <p className="text-xs text-slate-500 font-medium">Günlük Girişler</p>
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
  );
}
