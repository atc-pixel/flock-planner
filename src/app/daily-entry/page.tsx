import React, { Suspense } from "react";
import DailyEntryClient from "./DailyEntryClient";

import { Bird } from "lucide-react";
import DailyEntryAuthHeader from "./DailyEntryAuthHeader";

export default function DailyEntryPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header (production/planner tarzı) */}
      <DailyEntryAuthHeader />

      {/* useSearchParams kullanan kısım Suspense içinde */}
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto p-6 text-slate-600">
            Yükleniyor...
          </div>
        }
      >
        <DailyEntryClient />
      </Suspense>
    </div>
  );
}
