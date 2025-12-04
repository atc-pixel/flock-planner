// src/app/coop-status/api/daily-water/route.ts
import { NextResponse } from "next/server";
import { getDailyWater } from "@/lib/influx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const coopId = searchParams.get("coopId") || "T1";
  const daysParam = searchParams.get("days");
  const days = daysParam ? Number(daysParam) : 7;

  try {
    const data = await getDailyWater(coopId, days || 7);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("daily-water API error", error);
    return NextResponse.json(
      { error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}
