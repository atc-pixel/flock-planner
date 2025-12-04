// src/app/coop-status/api/instant-water/route.ts
import { NextResponse } from "next/server";
import { getMultiBatteryInstantWater } from "../../../../../lib/influx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const coopId = searchParams.get("coopId") || "T1";
  const hoursParam = searchParams.get("hours");
  const hours = hoursParam ? Number(hoursParam) : 24;

  try {
    const data = await getMultiBatteryInstantWater(coopId, hours || 24);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("instant-water API error", error);
    return NextResponse.json(
      { error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}
