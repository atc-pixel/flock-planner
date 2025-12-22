"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import type { Flock } from "@/lib/utils";

export function useFlocks() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [flocks, setFlocks] = useState<Flock[]>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const q = query(collection(db, "flocks"), orderBy("hatchDate", "desc"));
      const unsubData = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            ...data,
            hatchDate: data.hatchDate?.toDate?.() ?? data.hatchDate,
            transferDate: data.transferDate?.toDate?.() ?? data.transferDate,
            exitDate: data.exitDate?.toDate?.() ?? data.exitDate,
            name: data.name || "#??",
            initialCount: data.initialCount || 0,
          } as Flock;
        });

        setFlocks(list);
        setLoading(false);
      });

      return () => unsubData();
    });

    return () => unsubAuth();
  }, [router]);

  return { loading, flocks };
}
