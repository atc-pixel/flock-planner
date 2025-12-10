'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { ArrowLeft, RefreshCw, AlertTriangle, Database } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- İÇ BİLEŞEN (Asıl Mantık Burada) ---
function RawDataContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const coopId = searchParams.get('coopId') || 'T1';

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('6h'); 
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/coop-status/api/influx-raw?coopId=${coopId}&range=${range}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || "Bilinmeyen hata");
      
      if (json.success) {
        setData(json.data || []);
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range, coopId]);

  // Toplamlar (b5 dahil)
  const totals = useMemo(() => {
    const acc = { b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, total: 0 };
    data.forEach(row => {
        const b1 = row['device_frmpayload_data_WaterMeter1'] || 0;
        const b2 = row['device_frmpayload_data_WaterMeter2'] || 0;
        const b3 = row['device_frmpayload_data_WaterMeter3'] || 0;
        const b4 = row['device_frmpayload_data_WaterMeter4'] || 0;
        const b5 = row['device_frmpayload_data_WaterMeter5'] || 0;
        
        acc.b1 += b1;
        acc.b2 += b2;
        acc.b3 += b3;
        acc.b4 += b4;
        acc.b5 += b5;
        acc.total += (b1 + b2 + b3 + b4 + b5);
    });
    return acc;
  }, [data]);

  // T2 ise veya b5 verisi varsa 5. kolonu göster
  const showBattery5 = coopId === 'T2' || totals.b5 > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Database size={20} className="text-blue-600"/> {coopId} - InfluxDB Ham Veri
              </h1>
              <p className="text-xs text-slate-500">Aggregation uygulanmamış anlık veri paketleri</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select 
              value={range} 
              onChange={(e) => setRange(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg p-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="1h">Son 1 Saat</option>
              <option value="6h">Son 6 Saat</option>
              <option value="12h">Son 12 Saat</option>
              <option value="24h">Son 24 Saat</option>
              <option value="48h">Son 2 Gün</option>
              <option value="7d">Son 7 Gün</option>
            </select>
            <button 
                onClick={fetchData} 
                disabled={loading}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                <AlertTriangle size={20} />
                <span className="text-sm font-medium">Hata: {error}</span>
            </div>
        )}

        {/* Tablo */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-xs">
                <tr>
                  <th className="p-4 w-56">Zaman (UTC+3)</th>
                  <th className="p-4 text-right text-green-700">Batarya 1</th>
                  <th className="p-4 text-right text-blue-700">Batarya 2</th>
                  <th className="p-4 text-right text-pink-700">Batarya 3</th>
                  <th className="p-4 text-right text-amber-700">Batarya 4</th>
                  {showBattery5 && <th className="p-4 text-right text-indigo-700">Batarya 5</th>}
                  <th className="p-4 text-right bg-slate-200">Satır Toplam</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {/* TOPLAM SATIRI */}
                {!loading && data.length > 0 && (
                  <tr className="bg-blue-50 border-b-2 border-blue-100 font-black text-blue-900 sticky top-0 z-10 shadow-sm">
                    <td className="p-4 flex items-center gap-2">
                        <span>∑ GENEL TOPLAM</span>
                        <span className="text-[10px] font-normal text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">({data.length} satır)</span>
                    </td>
                    <td className="p-4 text-right">{totals.b1.toFixed(2)}</td>
                    <td className="p-4 text-right">{totals.b2.toFixed(2)}</td>
                    <td className="p-4 text-right">{totals.b3.toFixed(2)}</td>
                    <td className="p-4 text-right">{totals.b4.toFixed(2)}</td>
                    {showBattery5 && <td className="p-4 text-right">{totals.b5.toFixed(2)}</td>}
                    <td className="p-4 text-right bg-blue-100">{totals.total.toFixed(2)}</td>
                  </tr>
                )}

                {loading ? (
                  <tr><td colSpan={showBattery5 ? 7 : 6} className="p-12 text-center text-slate-400">Yükleniyor...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={showBattery5 ? 7 : 6} className="p-12 text-center text-slate-400">Bu aralıkta veri bulunamadı.</td></tr>
                ) : (
                  data.map((row, i) => {
                    const b1 = row['device_frmpayload_data_WaterMeter1'] || 0;
                    const b2 = row['device_frmpayload_data_WaterMeter2'] || 0;
                    const b3 = row['device_frmpayload_data_WaterMeter3'] || 0;
                    const b4 = row['device_frmpayload_data_WaterMeter4'] || 0;
                    const b5 = row['device_frmpayload_data_WaterMeter5'] || 0;
                    const rowTotal = b1 + b2 + b3 + b4 + b5;
                    
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono text-slate-600 border-r border-slate-100">
                          {new Date(row._time).toLocaleString('tr-TR')}
                        </td>
                        <td className="p-4 text-right font-medium text-emerald-600">{b1 !== 0 ? b1 : '-'}</td>
                        <td className="p-4 text-right font-medium text-blue-600">{b2 !== 0 ? b2 : '-'}</td>
                        <td className="p-4 text-right font-medium text-pink-600">{b3 !== 0 ? b3 : '-'}</td>
                        <td className="p-4 text-right font-medium text-amber-600">{b4 !== 0 ? b4 : '-'}</td>
                        {showBattery5 && <td className="p-4 text-right font-medium text-indigo-600">{b5 !== 0 ? b5 : '-'}</td>}
                        <td className="p-4 text-right font-bold text-slate-700 bg-slate-50">
                           {rowTotal > 0 ? rowTotal.toFixed(1) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}

// --- ANA SAYFA BİLEŞENİ (Export Edilen) ---
export default function RawDataPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center text-slate-500 gap-2">
           <RefreshCw className="animate-spin" /> Yükleniyor...
        </div>
      }>
        <RawDataContent />
      </Suspense>
    </div>
  );
}