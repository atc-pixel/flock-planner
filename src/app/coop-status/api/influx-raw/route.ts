// src/app/coop-status/api/influx-raw/route.ts
import { NextResponse } from 'next/server';
import { getInflux, INFLUX_ORG, INFLUX_BUCKET } from '@/lib/influx';

export const dynamic = "force-dynamic";

const DEVICE_MAP: Record<string, string> = {
  'T1': 'MKR1310-K1-WaterMeter',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coopId = searchParams.get('coopId') || 'T1';
  const range = searchParams.get('range') || '6h'; 

  const deviceName = DEVICE_MAP[coopId] || DEVICE_MAP['T1'];

  // Limit'i 5000 yaptık ki geniş aralıklarda toplam doğru çıksın.
  const query = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: -${range})
      |> filter(fn: (r) => r["_measurement"] =~ /device_frmpayload_data_WaterMeter[1-4]/)
      |> filter(fn: (r) => r["device_name"] == "${deviceName}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> pivot(rowKey:["_time"], columnKey: ["_measurement"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 5000) 
  `;

  try {
    const influx = getInflux();
    const queryApi = influx.getQueryApi(INFLUX_ORG!);
    const rows: any[] = [];

    await new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row: any, tableMeta: any) {
          const o = tableMeta.toObject(row);
          rows.push(o);
        },
        error(error: any) {
          reject(error);
        },
        complete() {
          resolve(true);
        },
      });
    });

    return NextResponse.json({ 
      success: true,
      count: rows.length,
      data: rows 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}