'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, UploadCloud, AlertTriangle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { parse, isValid } from 'date-fns';
import { Flock } from '@/lib/utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  flock: Flock;
  onSuccess: () => void;
}

export function ImportModal({ isOpen, onClose, flock, onSuccess }: ImportModalProps) {
  const [step, setStep] = useState<1 | 2>(1); 
  const [pasteData, setPasteData] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // YENİ: Seçili satırları tutan state
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const handlePreview = () => {
    setError(null);
    const lines = pasteData.trim().split('\n');
    const records = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split('\t');
        if (cols.length < 2) continue;

        let dateVal: Date | null = null;
        const dateStr = cols[0].trim();
        const formats = ['d.M.yyyy', 'dd.MM.yyyy', 'd/M/yyyy', 'yyyy-MM-dd'];
        
        for (const fmt of formats) {
            const d = parse(dateStr, fmt, new Date());
            if (isValid(d)) {
                dateVal = d;
                break;
            }
        }

        if (!dateVal) continue; 

        const record = {
            date: dateVal,
            mortality: Number(cols[1]?.replace(',', '.') || 0),
            eggCount: Number(cols[2]?.replace(',', '.') || 0),
            brokenEggCount: Number(cols[3]?.replace(',', '.') || 0),
            dirtyEggCount: Number(cols[4]?.replace(',', '.') || 0),
            feedConsumed: Number(cols[5]?.replace(',', '.') || 0),
            waterConsumed: Number(cols[6]?.replace(',', '.') || 0),
        };

        records.push(record);
    }

    if (records.length === 0) {
        setError("Geçerli veri bulunamadı. Lütfen formatı kontrol edin.");
        return;
    }

    setParsedData(records);
    // Varsayılan olarak hepsini seç
    setSelectedIndices(new Set(records.map((_, i) => i)));
    setStep(2);
  };

  // Tekli Seçim
  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
        newSelection.delete(index);
    } else {
        newSelection.add(index);
    }
    setSelectedIndices(newSelection);
  };

  // Tümünü Seç/Kaldır
  const toggleAll = () => {
    if (selectedIndices.size === parsedData.length) {
        setSelectedIndices(new Set()); // Hepsini kaldır
    } else {
        setSelectedIndices(new Set(parsedData.map((_, i) => i))); // Hepsini seç
    }
  };

  const handleImport = async () => {
    // Sadece seçili olanları filtrele
    const dataToImport = parsedData.filter((_, i) => selectedIndices.has(i));

    if (dataToImport.length === 0) {
        setError("Lütfen içe aktarılacak en az bir satır seçin.");
        return;
    }

    setLoading(true);
    try {
        const batchSize = 500;
        for (let i = 0; i < dataToImport.length; i += batchSize) {
            const chunk = dataToImport.slice(i, i + batchSize);
            const batch = writeBatch(db);

            chunk.forEach(record => {
                const docRef = doc(collection(db, "daily_logs"));
                batch.set(docRef, {
                    flockId: flock.id,
                    coopId: flock.coopId,
                    date: record.date,
                    mortality: record.mortality,
                    eggCount: record.eggCount,
                    brokenEggCount: record.brokenEggCount,
                    dirtyEggCount: record.dirtyEggCount,
                    feedConsumed: record.feedConsumed,
                    waterConsumed: record.waterConsumed,
                });
            });

            await batch.commit();
        }

        onSuccess();
        onClose();
        setPasteData('');
        setStep(1);
        alert(`${dataToImport.length} kayıt başarıyla aktarıldı!`);

    } catch (err) {
        console.error(err);
        setError("Aktarım sırasında bir hata oluştu.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <FileSpreadsheet size={24} />
            </div>
            <div>
                <h2 className="font-bold text-slate-800 text-lg">Excel'den Veri Aktar</h2>
                <p className="text-xs text-slate-500 font-medium">Hedef Sürü: <span className="text-emerald-600 font-bold">{flock.name}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
            
            {step === 1 ? (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-800">
                        <h4 className="font-bold flex items-center gap-2 mb-2"><AlertTriangle size={16}/> Nasıl Yapılır?</h4>
                        <p className="mb-2">Excel dosyanızdaki sütunları şu sıraya getirin ve verileri (başlıksız) kopyalayıp aşağıya yapıştırın:</p>
                        <div className="flex gap-1 overflow-x-auto pb-2">
                            {['Tarih', 'Ölü', 'Yumurta', 'Kırık', 'Kirli', 'Yem', 'Su'].map((col, i) => (
                                <span key={i} className="bg-white border border-blue-200 px-2 py-1 rounded text-xs font-mono font-bold whitespace-nowrap">
                                    {col}
                                </span>
                            ))}
                        </div>
                        <p className="text-xs opacity-70 mt-1">* Tarih formatı: 01.01.2024 veya 2024-01-01 olmalıdır.</p>
                    </div>

                    <textarea 
                        className="w-full h-64 border border-slate-300 rounded-xl p-4 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        placeholder={`Örnek Veri:\n01.05.2024	2	14500	120	50	1800	3200\n02.05.2024	1	14550	110	45	1810	3210\n...`}
                        value={pasteData}
                        onChange={(e) => setPasteData(e.target.value)}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-700">Önizleme ({selectedIndices.size} / {parsedData.length} Seçili)</h3>
                        <button onClick={() => setStep(1)} className="text-xs text-blue-600 font-bold hover:underline">Düzenle</button>
                    </div>
                    
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 text-slate-500 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="p-2 w-8 text-center bg-slate-100">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIndices.size === parsedData.length && parsedData.length > 0}
                                            onChange={toggleAll}
                                            className="cursor-pointer"
                                        />
                                    </th>
                                    <th className="p-2">Tarih</th>
                                    <th className="p-2">Ölü</th>
                                    <th className="p-2">Yumurta</th>
                                    <th className="p-2">Kırık</th>
                                    <th className="p-2">Kirli</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {parsedData.slice(0, 100).map((row, i) => (
                                    <tr key={i} className={selectedIndices.has(i) ? 'bg-white' : 'bg-slate-50 opacity-50'}>
                                        <td className="p-2 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIndices.has(i)}
                                                onChange={() => toggleSelection(i)}
                                                className="cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-2 font-mono">{row.date.toLocaleDateString('tr-TR')}</td>
                                        <td className="p-2">{row.mortality}</td>
                                        <td className="p-2">{row.eggCount}</td>
                                        <td className="p-2">{row.brokenEggCount}</td>
                                        <td className="p-2">{row.dirtyEggCount}</td>
                                    </tr>
                                ))}
                                {parsedData.length > 100 && (
                                    <tr>
                                        <td colSpan={6} className="p-2 text-center text-slate-400 italic">... ve {parsedData.length - 100} kayıt daha (Tümü aktarılacak)</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-100">
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            {step === 1 ? (
                <button 
                    onClick={handlePreview}
                    disabled={!pasteData.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <CheckCircle size={18} /> Verileri Tara
                </button>
            ) : (
                <button 
                    onClick={handleImport}
                    disabled={loading || selectedIndices.size === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UploadCloud size={18} />}
                    {loading ? 'Aktarılıyor...' : `Seçili ${selectedIndices.size} Kaydı Aktar`}
                </button>
            )}
        </div>
      </div>
    </div>
  );
}