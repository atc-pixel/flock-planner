'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FeedTable } from '@/components/feed-registry/FeedTable';
import { FeedHeader } from '@/components/feed-registry/FeedHeader';

export default function FeedRegistryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <FeedHeader />
      <main className="flex-1 p-4 md:p-6 max-w-[1920px] mx-auto w-full">
        <FeedTable />
      </main>
    </div>
  );
}

