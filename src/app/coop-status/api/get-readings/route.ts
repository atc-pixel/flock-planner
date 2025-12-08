// src/app/coop-status/api/get-readings/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coopId = searchParams.get('coopId') || 'T1';
  const timeRange = searchParams.get('range') || '24h'; // '24h', '7d'

  const now = new Date();
  const startDate = new Date();

  // Basit tarih filtreleme
  if (timeRange === '24h') startDate.setHours(now.getHours() - 24);
  else if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
  
  try {
    const q = query(
      collection(db, 'water_readings'),
      where('coopId', '==', coopId),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(q);
    
    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        // Timestamp'i string olarak gönderiyoruz
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