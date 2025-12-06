// src/app/coop-status/api/daily-water/route.ts
import { NextResponse } from "next/server";
import { getSimpleDailyTotalsFromFirestore } from "@/lib/firestoreSensors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const coopId = searchParams.get("coopId") || "T1";
  const daysParam = searchParams.get("days");
  const days = daysParam ? Number(daysParam) : 7;

  if (Number.isNaN(days) || days <= 0) {
    return NextResponse.json(
      { error: "days must be a positive number" },
      { status: 400 }
    );
  }

  try {
    const data = await getSimpleDailyTotalsFromFirestore(coopId, days || 7);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("daily-water (Firestore) API error", error);
    return NextResponse.json(
      { error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}
