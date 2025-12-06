// src/app/coop-status/api/instant-water/route.ts
import { NextResponse } from "next/server";
import {
  getInstantWaterFromFirestore,
} from "../../../../../lib/firestoreSensors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const coopId = searchParams.get("coopId") || "T1";
  const hoursParam = searchParams.get("hours");
  const hours = hoursParam ? Number(hoursParam) : 24;

  if (Number.isNaN(hours) || hours <= 0) {
    return NextResponse.json(
      { error: "hours must be a positive number" },
      { status: 400 }
    );
  }

  try {
    const data = await getInstantWaterFromFirestore(coopId, hours || 24);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("instant-water (Firestore) API error", error);
    return NextResponse.json(
      { error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}
