// src/app/coop-status/api/get-readings/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coopId = searchParams.get('coopId') || 'T1';
  const timeRange = searchParams.get('range') || '24h'; // '24h', '7d', '30d'

  // Tarih aralığını hesapla
  const now = new Date();
  let startDate = new Date();

  if (timeRange === '24h') startDate.setHours(now.getHours() - 24);
  else if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
  else if (timeRange === '30d') startDate.setDate(now.getDate() - 30);
  else startDate.setHours(now.getHours() - 24); // Varsayılan

  try {
    const q = query(
      collection(db, 'water_readings'),
      where('coopId', '==', coopId),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(q);
    
    // Veriyi temiz formatta döndür
    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        // Timestamp'i ISO string'e çeviriyoruz ki frontend rahat kullansın
        time: d.timestamp.toDate().toISOString(), 
        b1: d.b1,
        b2: d.b2,
        b3: d.b3,
        b4: d.b4,
        total: d.total
      };
    });

    return NextResponse.json({ data });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}