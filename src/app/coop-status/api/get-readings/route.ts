// src/app/coop-status/api/get-readings/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coopId = searchParams.get('coopId') || 'T1';
  const dateParam = searchParams.get('date');
  const rangeParam = searchParams.get('range');
  
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  const TR_OFFSET_HOURS = 3; 

  // Tarih Mantığı
  if (dateParam) {
    startDate = new Date(dateParam); 
    startDate.setUTCHours(0 - TR_OFFSET_HOURS, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  } 
  else if (rangeParam) {
    endDate = new Date(now); 
    startDate = new Date(now);
    if (rangeParam === '14d') startDate.setDate(now.getDate() - 14);
    else if (rangeParam === '30d') startDate.setDate(now.getDate() - 30);
    else startDate.setHours(now.getHours() - 24);
    startDate.setUTCHours(0 - TR_OFFSET_HOURS, 0, 0, 0);
  } 
  else {
    startDate = new Date(now);
    startDate.setUTCHours(0 - TR_OFFSET_HOURS, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  }

  try {
    const q = query(
      collection(db, 'water_readings'),
      where('coopId', '==', coopId),
      where('timestamp', '>', Timestamp.fromDate(startDate)),
      ...(dateParam ? [where('timestamp', '<=', Timestamp.fromDate(endDate))] : []),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(q);
    
    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      // ÖNEMLİ: Veritabanında total yok, burada anlık hesaplıyoruz.
      const calculatedTotal = (d.b1 || 0) + (d.b2 || 0) + (d.b3 || 0) + (d.b4 || 0);

      return {
        time: d.timestamp.toDate().toISOString(), 
        b1: d.b1,
        b2: d.b2,
        b3: d.b3,
        b4: d.b4,
        total: calculatedTotal // Frontend bu alanı bekliyor
      };
    });

    return NextResponse.json({ 
        count: data.length,
        startDate: startDate.toISOString(),
        data 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}