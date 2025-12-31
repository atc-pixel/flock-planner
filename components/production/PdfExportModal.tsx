'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, FileDown, RefreshCw, AlertTriangle, Printer } from 'lucide-react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isValid,
  startOfMonth,
  
} from 'date-fns';
import { Flock } from '@/lib/utils';

type DailyLog = {
  date: Date;
  eggCount?: number; // toplam yumurta (sağlam+kırık+kirli)
  brokenEggCount?: number; // kırık
  dirtyEggCount?: number; // kirli
  mortality?: number;
};

type ManualMonthlyInputs = {
  feedTons?: number;
  feedPricePer1000kg?: number;
  violPackPrice?: number;
  laborCost?: number;
  electricityCost?: number;
  // NOTE: violCost is no longer manually entered; it is auto-calculated from violPackPrice
  pulletPrice?: number;
  eggsAt80Weeks?: number;
};

type MonthlyAuto = {
  monthKey: string; // yyyy-MM
  monthLabel: string;
  daysInMonth: number;

  totalEggs: number;
  avgYieldPct: number;
  totalGood: number;
  totalCracked: number;
  crackedPct: number;
  totalDirty: number;
  dirtyPct: number;

  birdsFirstDay: number;
  birds15thDay: number;
  eggsPerBird: number;

  totalMortality: number;
  mortalityPct: number;
};

function safeNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseTrDecimal(input: string): number | undefined {
  const v = input.trim();
  if (v === '') return undefined;

  const normalized = v.replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function fmtNumberTR(n: number, digits = 0): string {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtMoneyTR(n: number): string {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function fmtPctTR(n: number): string {
  return `${fmtNumberTR(n, 2)}%`; // <-- 4 hane
}

function buildPrintHtml(params: {
  flock: Flock;
  months: Array<MonthlyAuto & { manual: ManualMonthlyInputs } & { derived: any }>;
}): string {
  const { flock, months } = params;

  const style = `
    <style>
      * { box-sizing: border-box; }
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; color: #0f172a; }
      h1 { font-size: 18px; margin: 0 0 6px 0; }
      .meta { font-size: 12px; color: #475569; margin-bottom: 16px; }
      .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
      .titleRow { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
      .monthTitle { font-size: 14px; font-weight: 800; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-size: 12px; vertical-align: top; }
      td.label { color: #475569; width: 55%; }
      td.value { font-weight: 700; text-align: right; width: 45%; }
      .section { margin-top: 10px; font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
      @media print {
        body { margin: 10mm; }
        .card { break-inside: avoid; }
      }
    </style>
  `;

  const cards = months
    .map((m) => {
      const d = m.derived;
      return `
        <div class="card">
          <div class="titleRow">
            <div class="monthTitle">${m.monthLabel}</div>
            <div style="font-size:11px;color:#64748b;font-weight:700;">Kümes: ${flock.coopId} · Sürü: ${flock.name}</div>
          </div>

          <div class="section">Üretim Özeti</div>
          <table>
            <tr><td class="label">Toplam Yumurta</td><td class="value">${fmtNumberTR(m.totalEggs)} adet</td></tr>
            <tr><td class="label">Toplam Sağlam Yumurta</td><td class="value">${fmtNumberTR(m.totalGood)} adet</td></tr>
            <tr><td class="label">Toplam Kırık Yumurta</td><td class="value">${fmtNumberTR(m.totalCracked)} adet</td></tr>
            <tr><td class="label">Aylık Kırık Yumurta Yüzdesi</td><td class="value">${fmtPctTR(m.crackedPct)}</td></tr>
            <tr><td class="label">Toplam Kirli Yumurta</td><td class="value">${fmtNumberTR(m.totalDirty)} adet</td></tr>
            <tr><td class="label">Aylık Kirli Yumurta Yüzdesi</td><td class="value">${fmtPctTR(m.dirtyPct)}</td></tr>
            <tr><td class="label">Aylık Ortalama Verim</td><td class="value">${fmtPctTR(m.avgYieldPct)}</td></tr>
            <tr><td class="label">Aylık Hayvan Başı Yumurta Sayısı</td><td class="value">${fmtNumberTR(m.eggsPerBird, 4)} adet</td></tr>
          </table>

          <div class="section">Mevcut & Ölüm</div>
          <table>
            <tr><td class="label">Ayın İlk Günü Hayvan Mevcudu</td><td class="value">${fmtNumberTR(m.birdsFirstDay)} adet</td></tr>
            <tr><td class="label">Aylık Toplam Ölüm</td><td class="value">${fmtNumberTR(m.totalMortality)} adet</td></tr>
            <tr><td class="label">Aylık Ölüm Oranı</td><td class="value">${fmtPctTR(m.mortalityPct)}</td></tr>
          </table>

          <div class="section">Gider & Maliyet</div>
          <table>
            <tr><td class="label">Toplam Yem Tüketimi</td><td class="value">${fmtNumberTR(safeNumber(m.manual.feedTons))} ton</td></tr>
            <tr><td class="label">Aylık Toplam Viol Gideri</td><td class="value">${fmtMoneyTR(d.violCostAuto)}</td></tr>
            <tr><td class="label">Hay. Başına Günlük Yem Tük.</td><td class="value">${fmtNumberTR(d.hayBasinaGunlukYemKg, 2)} kg</td></tr>
            <tr><td class="label">Yum. Başına Yem Tüketimi</td><td class="value">${fmtNumberTR(d.yumBasinaYemKg, 2)} kg</td></tr>
            <tr><td class="label">Yem Fiyatı / 1000kg</td><td class="value">${fmtMoneyTR(safeNumber(m.manual.feedPricePer1000kg))} TL </td></tr>
            <tr><td class="label">Viol Paket Fiyatı</td><td class="value">${fmtMoneyTR(safeNumber(m.manual.violPackPrice))} TL </td></tr>
            <tr><td class="label">Aylık İşçilik Gideri</td><td class="value">${fmtMoneyTR(safeNumber(m.manual.laborCost))} TL </td></tr>
            <tr><td class="label">Aylık Elektrik Gideri</td><td class="value">${fmtMoneyTR(safeNumber(m.manual.electricityCost))} TL </td></tr>
            <tr><td class="label">Yarka Fiyatı</td><td class="value">${fmtMoneyTR(safeNumber(m.manual.pulletPrice))} TL </td></tr>
            <tr><td class="label">80 Haftada Ortalama Yumurta Adedi</td><td class="value">${fmtNumberTR(safeNumber(m.manual.eggsAt80Weeks), 0)}</td></tr>
          </table>

          <div class="section">Birim Maliyet (Yumurta Başına)</div>
          <table>
            <tr><td class="label">Yem / Yumurta Maliyeti</td><td class="value">${fmtMoneyTR(d.cost_feedPerEgg)}</td></tr>
            <tr><td class="label">Yarka / Yumurta Maliyeti</td><td class="value">${fmtMoneyTR(d.cost_pulletPerEgg)}</td></tr>
            <tr><td class="label">İşçilik / Yumurta Maliyeti</td><td class="value">${fmtMoneyTR(d.cost_laborPerEgg)}</td></tr>
            <tr><td class="label">Elektrik / Yumurta Maliyeti</td><td class="value">${fmtMoneyTR(d.cost_electricityPerEgg)}</td></tr>
            <tr><td class="label">Viol / Yumurta Maliyeti</td><td class="value">${fmtMoneyTR(d.cost_violPerEgg)}</td></tr>
            <tr><td class="label">Toplam Maliyet</td><td class="value">${fmtMoneyTR(d.cost_totalPerEgg)}</td></tr>
          </table>
        </div>
      `;
    })
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Production Monthly PDF</title>
        ${style}
      </head>
      <body>
        <h1>Üretim Aylık Özet</h1>
        <div class="meta">Sürü: <strong>${flock.name}</strong> · Kümes: <strong>${flock.coopId}</strong> · Başlangıç: <strong>${flock.hatchDate ? flock.hatchDate.toLocaleDateString('tr-TR') : '-'}</strong></div>
        ${cards}
      </body>
    </html>
  `;
}

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  flock: Flock;
}

export function PdfExportModal({ isOpen, onClose, flock }: PdfExportModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);

  const [manualByMonth, setManualByMonth] = useState<Record<string, ManualMonthlyInputs>>({});
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      return;
    }

    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, 'daily_logs'),
          where('flockId', '==', flock.id),
          orderBy('date', 'asc')
        );
        const snap = await getDocs(q);
        const list: DailyLog[] = [];
        snap.forEach((doc) => {
          const d: any = doc.data();
          const date = d.date?.toDate ? d.date.toDate() : null;
          if (!date || !isValid(date)) return;

          list.push({
            date,
            eggCount: safeNumber(d.eggCount),
            brokenEggCount: safeNumber(d.brokenEggCount),
            dirtyEggCount: safeNumber(d.dirtyEggCount),
            mortality: safeNumber(d.mortality),
          });
        });
        setLogs(list);
      } catch (e) {
        console.error(e);
        setError('Günlük kayıtlar okunamadı.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [isOpen, flock.id]);

  const populationByDateKey = useMemo(() => {
    const map: Record<string, number> = {};
    if (!flock.hatchDate || !isValid(flock.hatchDate)) return map;

    const logByKey: Record<string, DailyLog> = {};
    for (const l of logs) {
      const k = format(l.date, 'yyyy-MM-dd');
      logByKey[k] = l;
    }

    const start = flock.hatchDate;
    const lastLogDate = logs.length ? logs[logs.length - 1].date : start;
    const end = isAfter(new Date(), lastLogDate) ? new Date() : lastLogDate;

    let running = safeNumber(flock.initialCount);
    for (let d = start; !isAfter(d, end); d = addDays(d, 1)) {
      const key = format(d, 'yyyy-MM-dd');
      const mort = safeNumber(logByKey[key]?.mortality);
      running = Math.max(0, running - mort);
      map[key] = running;
    }
    return map;
  }, [logs, flock.hatchDate, flock.initialCount]);

  const monthlyAuto = useMemo<MonthlyAuto[]>(() => {
    if (!flock.hatchDate || !isValid(flock.hatchDate)) return [];

    // Ay listesi: hatchDate ayından başla, her zaman bugünün ayı + 2 ay'a kadar göster.
    // Veri yoksa zaten 0'lar gelir.
    const start = flock.hatchDate;

    // timelineEnd sadece günlük log okumayı sınırlandırmak için.
    // (İleride importla ileri tarihli log gelirse yine kapsasın)
    const lastLogDate = logs.length ? logs[logs.length - 1].date : start;
    const today = new Date();
    const timelineEnd = isAfter(today, lastLogDate) ? today : lastLogDate;

    // Ay dropdown üst sınırı: bugünün ayı + 2 ay
    const monthsUpperBound = endOfMonth(addMonths(today, 2));




    const logByKey: Record<string, DailyLog> = {};
    for (const l of logs) {
      const k = format(l.date, 'yyyy-MM-dd');
      logByKey[k] = l;
    }

    const months: MonthlyAuto[] = [];

    let mStart = startOfMonth(start);
    // İçinde bulunduğumuz ay mutlaka listelensin.
    // Eğer günlük log'lar bugünden ileri tarihteyse (import vs.), o ayları da kapsasın.
    const todayMonth = startOfMonth(new Date());
    const endMonth = startOfMonth(monthsUpperBound);
    const mEnd = isAfter(endMonth, todayMonth) ? endMonth : todayMonth;


    while (!isAfter(mStart, mEnd)) {
      const monthKey = format(mStart, 'yyyy-MM');
      const monthLabel = format(mStart, 'MMMM yyyy');
      const monthEnd = endOfMonth(mStart);
      const daysInMonth = Number(format(monthEnd, 'd'));

      let totalGood = 0;
      let totalCracked = 0;
      let totalDirty = 0;
      let totalMortality = 0;

      let yieldSum = 0;
      let yieldCount = 0;

      for (let d = mStart; !isAfter(d, monthEnd); d = addDays(d, 1)) {
        if (isBefore(d, start) || isAfter(d, timelineEnd)) continue;

        const key = format(d, 'yyyy-MM-dd');
        const log = logByKey[key];

        const eggCount = safeNumber(log?.eggCount);
        const broken = safeNumber(log?.brokenEggCount);
        const dirty = safeNumber(log?.dirtyEggCount);
        const mort = safeNumber(log?.mortality);

        const good = Math.max(0, eggCount - broken - dirty);

        totalGood += good;
        totalCracked += broken;
        totalDirty += dirty;
        totalMortality += mort;

        const birds = safeNumber(populationByDateKey[key]);
        if (birds > 0 && eggCount > 0) {
          const y = (eggCount / birds) * 100;
          if (Number.isFinite(y)) {
            yieldSum += y;
            yieldCount += 1;
          }
        }
      }

      const totalEggs = totalGood + totalCracked + totalDirty;
      const crackedPct = totalEggs > 0 ? (totalCracked / totalEggs) * 100 : 0;
      const dirtyPct = totalEggs > 0 ? (totalDirty / totalEggs) * 100 : 0;
      const avgYieldPct = yieldCount > 0 ? yieldSum / yieldCount : 0;

      const firstKey = format(mStart, 'yyyy-MM-dd');
      const fifteenthKey = format(addDays(mStart, 14), 'yyyy-MM-dd');
      const birdsFirstDay =
        safeNumber(populationByDateKey[firstKey]) || safeNumber(flock.initialCount);
      const birds15thDay = safeNumber(populationByDateKey[fifteenthKey]) || birdsFirstDay;

      const eggsPerBird = birdsFirstDay > 0 ? totalEggs / birdsFirstDay : 0;
      const mortalityPct = birdsFirstDay > 0 ? (totalMortality / birdsFirstDay) * 100 : 0;

      months.push({
        monthKey,
        monthLabel,
        daysInMonth,
        totalEggs,
        avgYieldPct,
        totalGood,
        totalCracked,
        crackedPct,
        totalDirty,
        dirtyPct,
        birdsFirstDay,
        birds15thDay,
        eggsPerBird,
        totalMortality,
        mortalityPct,
      });

      mStart = addDays(endOfMonth(mStart), 1);
    }

    return months;
  }, [flock.hatchDate, flock.initialCount, logs, populationByDateKey]);

  const monthsWithDerivatives = useMemo(() => {
    return monthlyAuto.map((m) => {
      const manual = manualByMonth[m.monthKey] || {};

      const feedTons = safeNumber(manual.feedTons);
      const feedKg = feedTons * 1000;

      const birds15 = m.birds15thDay > 0 ? m.birds15thDay : 0;
      const hayBasinaGunlukYemKg =
        birds15 > 0 && m.daysInMonth > 0 ? (feedKg / m.daysInMonth) / birds15 : 0;

      const yumBasinaYemKg = m.totalEggs > 0 ? feedKg / m.totalEggs : 0;

      const feedPricePer1000kg = safeNumber(manual.feedPricePer1000kg);
      const pricePerKg = feedPricePer1000kg / 1000;
      const cost_feedPerEgg = (yumBasinaYemKg * pricePerKg) / 1000 ;

      const pulletPrice = safeNumber(manual.pulletPrice);
      const eggsAt80Weeks = safeNumber(manual.eggsAt80Weeks);
      const cost_pulletPerEgg = eggsAt80Weeks > 0 ? pulletPrice / eggsAt80Weeks : 0;

      const laborCost = safeNumber(manual.laborCost);
      const electricityCost = safeNumber(manual.electricityCost);

      // Aylık toplam viol gideri = ((aylık toplam yumurta / 30 ) * viol paket fiyatı ) / 100
      const violPackPrice = safeNumber(manual.violPackPrice);
      const violCostAuto = m.totalEggs > 0 ? ((m.totalEggs / 30) * violPackPrice) / 100 : 0;

      const cost_laborPerEgg = m.totalEggs > 0 ? laborCost / m.totalEggs : 0;
      const cost_electricityPerEgg = m.totalEggs > 0 ? electricityCost / m.totalEggs : 0;
      const cost_violPerEgg = m.totalEggs > 0 ? violCostAuto / m.totalEggs : 0;

      const cost_totalPerEgg =
        cost_feedPerEgg +
        cost_pulletPerEgg +
        cost_laborPerEgg +
        cost_electricityPerEgg +
        cost_violPerEgg;

      return {
        ...m,
        manual,
        derived: {
          hayBasinaGunlukYemKg,
          yumBasinaYemKg,
          violCostAuto,
          cost_feedPerEgg,
          cost_pulletPerEgg,
          cost_laborPerEgg,
          cost_electricityPerEgg,
          cost_violPerEgg,
          cost_totalPerEgg,
        },
      };
    });
  }, [monthlyAuto, manualByMonth]);

  useEffect(() => {
    if (!isOpen) return;
    if (monthsWithDerivatives.length === 0) {
      setSelectedMonthKey('');
      return;
    }
    const exists = monthsWithDerivatives.some((m) => m.monthKey === selectedMonthKey);
    if (!exists) {
      setSelectedMonthKey(monthsWithDerivatives[monthsWithDerivatives.length - 1].monthKey);
    }
  }, [isOpen, monthsWithDerivatives, selectedMonthKey]);

  const selectedMonth = useMemo(() => {
    return monthsWithDerivatives.find((m) => m.monthKey === selectedMonthKey) || null;
  }, [monthsWithDerivatives, selectedMonthKey]);

  if (!isOpen) return null;

  const updateManual = (monthKey: string, patch: Partial<ManualMonthlyInputs>) => {
    setManualByMonth((prev) => ({
      ...prev,
      [monthKey]: {
        ...(prev[monthKey] || {}),
        ...patch,
      },
    }));
  };

  const handleExport = () => {
    if (!selectedMonth) return;

    const html = buildPrintHtml({
      flock,
      months: [selectedMonth],
    });

    const w = window.open('', '_blank');
    if (!w) {
      alert('Popup engellendi. Lütfen popup izni verin.');
      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();

    setTimeout(() => {
      w.focus();
      w.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white border border-slate-200 rounded-xl">
              <FileDown size={18} className="text-slate-700" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900">PDF Export · Aylık Özet</div>
              <div className="text-xs text-slate-500 font-medium">
                Sürü: {flock.name} · Kümes: {flock.coopId}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl transition-colors"
            title="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-3 flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl">
              <AlertTriangle size={16} />
              <span className="font-bold">{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Ay seç → otomatik hesaplanan satırlar dolsun → manuel alanları gir → PDF Export.
              PDF almak için <strong>Yazdır</strong> penceresi açılır (PDF olarak kaydedebilirsiniz).
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => setLoading(false), 250);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Yenile"
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Yenile
              </button>

              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                disabled={loading || !selectedMonth}
                title="PDF Export (Yazdır)"
              >
                <Printer size={14} />
                PDF Export
              </button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="text-xs font-black text-slate-700">Ay Seç:</div>
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              disabled={loading || monthsWithDerivatives.length === 0}
            >
              {monthsWithDerivatives.length === 0 ? (
                <option value="">Ay yok</option>
              ) : (
                monthsWithDerivatives.map((m) => (
                  <option key={m.monthKey} value={m.monthKey}>
                    {m.monthLabel}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-auto max-h-[70vh]">
            {loading ? (
              <div className="p-6 text-center text-slate-400 font-bold text-sm">Yükleniyor...</div>
            ) : !selectedMonth ? (
              <div className="p-6 text-center text-slate-400 font-bold text-sm">
                Seçili ay için veri bulunamadı.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200">
                  <tr className="text-slate-600 font-bold">
                    <th className="text-left p-2">Kalem</th>
                    <th className="text-right p-2">Değer</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      colSpan={2}
                      className="p-2 bg-slate-50 text-[11px] font-black text-slate-600 uppercase tracking-wider"
                    >
                      Otomatik Hesaplanan
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Toplam Yumurta</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtNumberTR(selectedMonth.totalEggs)} adet
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Aylık Ortalama Verim</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtPctTR(selectedMonth.avgYieldPct)}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Toplam Sağlam Yumurta</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtNumberTR(selectedMonth.totalGood)} adet
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Toplam Kırık Yumurta</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtNumberTR(selectedMonth.totalCracked)} adet
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Aylık Kırık Yumurta Yüzdesi</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtPctTR(selectedMonth.crackedPct)}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Toplam Kirli Yumurta</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtNumberTR(selectedMonth.totalDirty)} adet
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Aylık Kirli Yumurta Yüzdesi</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtPctTR(selectedMonth.dirtyPct)}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Aylık Hayvan Başı Yumurta Sayısı</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtNumberTR(selectedMonth.eggsPerBird, 2)} adet
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Aylık Toplam Ölüm</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtNumberTR(selectedMonth.totalMortality)} adet
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Aylık Ölüm Oranı</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtPctTR(selectedMonth.mortalityPct)}
                    </td>
                  </tr>

                  <tr>
                    <td
                      colSpan={2}
                      className="p-2 bg-slate-50 text-[11px] font-black text-slate-600 uppercase tracking-wider"
                    >
                      Manuel Giriş
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Toplam Yem Tüketimi (ton)</td>
                    <td className="p-2 text-right">
                      <input
                        value={selectedMonth.manual.feedTons ?? ''}
                        onChange={(e) =>
                          updateManual(selectedMonth.monthKey, {
                            feedTons: parseTrDecimal(e.target.value),
                          })
                        }
                        inputMode="decimal"
                        className="w-36 text-right font-mono px-2 py-1 rounded border border-slate-200 focus:ring-2 focus:ring-slate-200"
                        placeholder="ton"
                      />
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Yem Fiyatı / ton</td>
                    <td className="p-2 text-right">
                      <input
                        value={selectedMonth.manual.feedPricePer1000kg ?? ''}
                        onChange={(e) =>
                          updateManual(selectedMonth.monthKey, {
                            feedPricePer1000kg: parseTrDecimal(e.target.value),
                          })
                        }
                        inputMode="decimal"
                        className="w-36 text-right font-mono px-2 py-1 rounded border border-slate-200 focus:ring-2 focus:ring-slate-200"
                        placeholder="₺"
                      />
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Viol Paket Fiyatı</td>
                    <td className="p-2 text-right">
                      <input
                        value={selectedMonth.manual.violPackPrice ?? ''}
                        onChange={(e) =>
                          updateManual(selectedMonth.monthKey, {
                            violPackPrice: parseTrDecimal(e.target.value),
                          })
                        }
                        inputMode="decimal"
                        className="w-36 text-right font-mono px-2 py-1 rounded border border-slate-200 focus:ring-2 focus:ring-slate-200"
                        placeholder="₺"
                      />
                    </td>
                  </tr>

                  {/* This stays here but is auto-calculated */}
                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Aylık Viol Gideri</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtMoneyTR(selectedMonth.derived.violCostAuto)}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Aylık İşçilik Gideri</td>
                    <td className="p-2 text-right">
                      <input
                        value={selectedMonth.manual.laborCost ?? ''}
                        onChange={(e) =>
                          updateManual(selectedMonth.monthKey, {
                            laborCost: parseTrDecimal(e.target.value),
                          })
                        }
                        inputMode="decimal"
                        className="w-36 text-right font-mono px-2 py-1 rounded border border-slate-200 focus:ring-2 focus:ring-slate-200"
                        placeholder="₺"
                      />
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Aylık Elektrik Gideri</td>
                    <td className="p-2 text-right">
                      <input
                        value={selectedMonth.manual.electricityCost ?? ''}
                        onChange={(e) =>
                          updateManual(selectedMonth.monthKey, {
                            electricityCost: parseTrDecimal(e.target.value),
                          })
                        }
                        inputMode="decimal"
                        className="w-36 text-right font-mono px-2 py-1 rounded border border-slate-200 focus:ring-2 focus:ring-slate-200"
                        placeholder="₺"
                      />
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Yarka Fiyatı</td>
                    <td className="p-2 text-right">
                      <input
                        value={selectedMonth.manual.pulletPrice ?? ''}
                        onChange={(e) =>
                          updateManual(selectedMonth.monthKey, {
                            pulletPrice: parseTrDecimal(e.target.value),
                          })
                        }
                        inputMode="decimal"
                        className="w-36 text-right font-mono px-2 py-1 rounded border border-slate-200 focus:ring-2 focus:ring-slate-200"
                        placeholder="₺"
                      />
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">80 Haftada Ortalama Yumurta Adedi</td>
                    <td className="p-2 text-right">
                      <input
                        value={selectedMonth.manual.eggsAt80Weeks ?? ''}
                        onChange={(e) =>
                          updateManual(selectedMonth.monthKey, {
                            eggsAt80Weeks: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        inputMode="numeric"
                        className="w-36 text-right font-mono px-2 py-1 rounded border border-slate-200 focus:ring-2 focus:ring-slate-200"
                        placeholder="adet"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td
                      colSpan={2}
                      className="p-2 bg-slate-50 text-[11px] font-black text-slate-600 uppercase tracking-wider"
                    >
                      Otomatik Hesaplanan (Maliyet)
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Hay. Başına Günlük Yem Tük.</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtNumberTR(selectedMonth.derived.hayBasinaGunlukYemKg, 2)} kg
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Yum. Başına Yem Tüketimi</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtNumberTR(selectedMonth.derived.yumBasinaYemKg, 2)} kg
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Yem / Yumurta Maliyeti</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtMoneyTR(selectedMonth.derived.cost_feedPerEgg)}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Yarka / Yumurta Maliyeti</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtMoneyTR(selectedMonth.derived.cost_pulletPerEgg)}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">İşçilik / Yumurta Maliyeti</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtMoneyTR(selectedMonth.derived.cost_laborPerEgg)}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Elektrik / Yumurta Maliyeti</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtMoneyTR(selectedMonth.derived.cost_electricityPerEgg)}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="p-2 text-slate-700">Viol / Yumurta Maliyeti</td>
                    <td className="p-2 text-right font-mono font-black">
                      {fmtMoneyTR(selectedMonth.derived.cost_violPerEgg)}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-2 text-slate-900 font-black">Toplam Maliyet</td>
                    <td className="p-2 text-right font-mono font-black text-slate-900">
                      {fmtMoneyTR(selectedMonth.derived.cost_totalPerEgg)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            Not: <strong>Aylık viol gideri</strong>, <strong>viol paket fiyatı</strong> üzerinden otomatik hesaplanır:
            <span className="font-mono"> ((Toplam Yumurta / 30) × Viol Paket Fiyatı) / 100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
