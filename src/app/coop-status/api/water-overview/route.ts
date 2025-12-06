// src/app/coop-status/api/water-overview/route.ts
import { NextResponse } from "next/server";
import {
  getDailyWaterFromFirestore,
} from "../../../../../lib/firestoreSensors";

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
    const data = await getDailyWaterFromFirestore(coopId, days || 7);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("water-overview (Firestore) API error", error);
    return NextResponse.json(
      { error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}
