// src/app/coop-status/api/water-overview/route.ts
import { NextResponse } from "next/server";
import { getMultiBatteryDailyWater } from "../../../../../lib/influx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const coopId = searchParams.get("coopId") || "T1";
  const daysParam = searchParams.get("days");
  const days = daysParam ? Number(daysParam) : 7;

  try {
    const data = await getMultiBatteryDailyWater(coopId, days || 7);

    // Şimdilik sadece su verisi; hayvan mevcudunu sonra bağlayacağız.
    // Şema: { date, battery1, battery2, battery3, battery4, total }
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("water-overview API error", error);
    return NextResponse.json(
      { error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}
