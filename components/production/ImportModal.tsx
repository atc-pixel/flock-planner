'use client';

import React, { useState, useEffect } from 'react';
import { X, UploadCloud, AlertTriangle, CheckCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { writeBatch, doc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { parse, isValid, format } from 'date-fns';
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
  const [fetchingExisting, setFetchingExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mevcut kayıtların haritası: 'YYYY-MM-DD' -> 'DocumentID'
  const [existingMap, setExistingMap] = useState<Record<string, string>>({});

  // Seçili satırları tutan state
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Modal açıldığında mevcut kayıtları çek (Duplicate kontrolü için)
  useEffect(() => {
    if (isOpen) {
        const fetchExistingLogs = async () => {
            setFetchingExisting(true);
            try {
                const q = query(
                    collection(db, "daily_logs"), 
                    where("flockId", "==", flock.id)
                );
                const snapshot = await getDocs(q);
                const map: Record<string, string> = {};
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    // Firestore Timestamp -> Date dönüşümü
                    if (data.date && data.date.toDate) {
                        const dateKey = format(data.date.toDate(), 'yyyy-MM-dd');
                        map[dateKey] = doc.id;
                    }
                });
                setExistingMap(map);
            } catch (err) {
                console.error("Mevcut kayıtlar çekilemedi:", err);
            } finally {
                setFetchingExisting(false);
            }
        };
        fetchExistingLogs();
    } else {
        // Reset state
        setPasteData('');
        setParsedData([]);
        setStep(1);
        setError(null);
        setSelectedIndices(new Set());
    }
  }, [isOpen, flock.id]);

  if (!isOpen) return null;

  const handlePreview = () => {
    setError(null);
    if (!pasteData.trim()) {
        setError("Lütfen veri yapıştırın.");
        return;
    }

    const lines = pasteData.trim().split('\n');
    const records = [];
    
    // YENİ KOLON YAPISI:
    // 0: Tarih
    // 1: Gramaj (3 haneli, ör: 594 -> 59.4 olacak)
    // 2: Ölü Sayısı
    // 3: Sağlam (Good)
    // 4: Kırık
    // 5: Kirli
    // 6: Yem (İGNOR EDİLECEK)
    
    // Otomatik Ayırıcı Belirleme (Tab, Virgül veya Noktalı Virgül)
    let delimiter = '\t';
    const firstLine = lines[0];
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';
    else if (firstLine.includes(',')) delimiter = ',';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(delimiter);
        // En az tarih ve 1 veri olmalı. Bazen excel boş kolonlar ekler, o yüzden esnek olalım.
        if (cols.length < 2) continue; 

        let dateVal: Date | null = null;
        const dateStr = cols[0].trim().replace(/['"]/g, ''); // Tırnak varsa temizle
        
        // Olası tarih formatları
        const formats = [
            'd.M.yyyy', 'dd.MM.yyyy', 
            'd/M/yyyy', 'dd/MM/yyyy', 
            'yyyy-MM-dd', 'yyyy/MM/dd'
        ];
        
        for (const fmt of formats) {
            const d = parse(dateStr, fmt, new Date());
            if (isValid(d) && d.getFullYear() > 2000) { // Geçerli ve mantıklı bir yıl mı?
                dateVal = d;
                break;
            }
        }

        if (!dateVal) {
            console.warn(`Satır ${i+1} atlandı: Geçersiz tarih formatı (${dateStr})`);
            continue; 
        }

        // Rakamları parse et (Virgül/Nokta karmaşasını çöz)
        const parseNum = (val: string) => {
            if (!val) return 0;
            // "1.200,50" veya "1200.50" gibi durumları basitleştirelim:
            // Sadece sayı, nokta ve virgül bırak
            const clean = val.replace(/[^0-9.,-]/g, '');
            // Eğer virgül varsa ve nokta yoksa -> virgülü noktaya çevir (TR standartı)
            // Eğer hem nokta hem virgül varsa -> sonuncusu ayraçtır.
            // Basit çözüm: TR excelden geliyorsa virgül ondalıktır.
            return Number(clean.replace(',', '.') || 0);
        };

        // Kolon indeksleri (Excel sırasına göre)
        const rawWeight = parseNum(cols[1]); // Ör: 594
        const mortality = parseNum(cols[2]);
        const goodCount = parseNum(cols[3]); // Sağlam
        const broken = parseNum(cols[4]); // Kırık
        const dirty = parseNum(cols[5]);  // Kirli
        
        // Yem (Index 6) -> Göz ardı ediliyor.

        // MANTIK DÖNÜŞÜMLERİ:
        // 1. Gramajı 10'a böl (594 -> 59.4)
        // Eğer zaten küçükse (örn 59.4 geldiyse) bölme. Genelde gramaj > 100 gelir tamsayı olarak.
        const avgWeight = rawWeight > 100 ? rawWeight / 10 : rawWeight;

        // 2. Toplam Yumurta = Sağlam + Kırık + Kirli
        const totalEgg = goodCount + broken + dirty;

        // Var olan kayıt var mı?
        const dateKey = format(dateVal, 'yyyy-MM-dd');
        const exists = !!existingMap[dateKey];

        const record = {
            date: dateVal,
            dateKey,
            avgWeight: avgWeight,
            mortality: mortality,
            eggCount: totalEgg,        // DB'ye giden Toplam
            brokenEggCount: broken,
            dirtyEggCount: dirty,
            exists // Arayüzde göstermek için
        };

        records.push(record);
    }

    if (records.length === 0) {
        setError("Hiçbir satır okunamadı. Tarih formatını (GG.AA.YYYY) kontrol edin.");
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
    const dataToImport = parsedData.filter((_, i) => selectedIndices.has(i));

    if (dataToImport.length === 0) {
        setError("Lütfen içe aktarılacak en az bir satır seçin.");
        return;
    }

    setLoading(true);
    try {
        const batchSize = 500;
        let updatedCount = 0;
        let createdCount = 0;

        for (let i = 0; i < dataToImport.length; i += batchSize) {
            const chunk = dataToImport.slice(i, i + batchSize);
            const batch = writeBatch(db);

            chunk.forEach(record => {
                // Kayıt var mı kontrol et
                const existingId = existingMap[record.dateKey];
                
                let docRef;
                if (existingId) {
                    // VARSA: O ID'yi kullan ve güncelle (merge)
                    docRef = doc(db, "daily_logs", existingId);
                    updatedCount++;
                } else {
                    // YOKSA: Yeni oluştur
                    docRef = doc(collection(db, "daily_logs"));
                    createdCount++;
                }

                // merge: true kullanarak sadece ilgili alanları güncelliyoruz, 
                // diğer alanlar (varsa su, notlar vs.) silinmez.
                batch.set(docRef, {
                    flockId: flock.id,
                    coopId: flock.coopId,
                    date: record.date,
                    
                    mortality: record.mortality,
                    eggCount: record.eggCount,        // Toplam
                    brokenEggCount: record.brokenEggCount,
                    dirtyEggCount: record.dirtyEggCount,
                    
                    avgWeight: record.avgWeight,      
                }, { merge: true }); // ÖNEMLİ: Üstüne yazma (overwrite/merge) işlemi
            });

            await batch.commit();
        }

        onSuccess();
        onClose();
        alert(`İşlem Tamamlandı!\n\n🆕 Yeni Eklenen: ${createdCount}\n🔄 Güncellenen: ${updatedCount}`);

    } catch (err) {
        console.error(err);
        setError("Aktarım sırasında bir hata oluştu. Konsolu kontrol edin.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <FileSpreadsheet size={24} />
            </div>
            <div>
                <h2 className="font-bold text-slate-800 text-lg">Excel'den Üretim Verisi Aktar</h2>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Hedef: <span className="text-emerald-600 font-bold">{flock.name}</span></span>
                    {fetchingExisting && <span className="text-blue-500 flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> DB Kontrol ediliyor...</span>}
                </div>
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
                        <h4 className="font-bold flex items-center gap-2 mb-2"><AlertTriangle size={16}/> Sütun Sırası Önemli!</h4>
                        <p className="mb-2">Excel'deki verileri şu sırayla kopyalayın (Başlıksız):</p>
                        
                        <div className="flex flex-wrap gap-1 pb-2">
                            {['1. Tarih', '2. Gramaj (xxx)', '3. Ölü', '4. Sağlam', '5. Kırık', '6. Kirli', '7. Yem (Yok sayılır)'].map((col, i) => (
                                <span key={i} className="bg-white border border-blue-200 px-2 py-1 rounded text-xs font-mono font-bold whitespace-nowrap text-blue-600">
                                    {col}
                                </span>
                            ))}
                        </div>
                        <ul className="list-disc list-inside text-xs opacity-80 space-y-1">
                             <li><strong>Tarih:</strong> 01.01.2024 formatında olmalıdır.</li>
                             <li><strong>Gramaj:</strong> 3 haneli girilmelidir (Örn: 594 -&gt; Sistem 59.4 olarak kaydeder).</li>
                             <li><strong>Üstüne Yazma:</strong> Aynı tarihe ait veri varsa, yeni yüklediğiniz değerler eskisinin üzerine yazılır.</li>
                        </ul>
                    </div>

                    <textarea 
                        className="w-full h-64 border border-slate-300 rounded-xl p-4 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        placeholder={`Örnek Veri Yapısı:\n01.05.2024\t594\t2\t14500\t120\t50\t1800\n02.05.2024\t596\t1\t14550\t110\t45\t1810\n...`}
                        value={pasteData}
                        onChange={(e) => setPasteData(e.target.value)}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-700">Önizleme ({selectedIndices.size} / {parsedData.length} Seçili)</h3>
                        <div className="flex gap-2">
                             <button onClick={() => setStep(1)} className="text-xs text-blue-600 font-bold hover:underline">Düzenle</button>
                        </div>
                    </div>
                    
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
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
                                    <th className="p-2 text-center">Durum</th>
                                    <th className="p-2 text-right text-indigo-600">Gramaj</th>
                                    <th className="p-2 text-right text-red-600">Ölü</th>
                                    <th className="p-2 text-right text-green-600">Sağlam</th>
                                    <th className="p-2 text-right text-amber-600">Kırık</th>
                                    <th className="p-2 text-right text-slate-600">Kirli</th>
                                    <th className="p-2 text-right font-black bg-slate-200">∑ TOPLAM</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {parsedData.slice(0, 100).map((row, i) => (
                                    <tr key={i} className={selectedIndices.has(i) ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 opacity-50'}>
                                        <td className="p-2 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIndices.has(i)}
                                                onChange={() => toggleSelection(i)}
                                                className="cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-2 font-mono whitespace-nowrap">{row.date.toLocaleDateString('tr-TR')}</td>
                                        <td className="p-2 text-center">
                                            {row.exists ? 
                                                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold">GÜNCELLE</span> : 
                                                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold">YENİ</span>
                                            }
                                        </td>
                                        <td className="p-2 text-right font-bold">{row.avgWeight.toFixed(1)}</td>
                                        <td className="p-2 text-right">{row.mortality}</td>
                                        <td className="p-2 text-right">{row.eggCount - row.brokenEggCount - row.dirtyEggCount}</td>
                                        <td className="p-2 text-right">{row.brokenEggCount}</td>
                                        <td className="p-2 text-right">{row.dirtyEggCount}</td>
                                        <td className="p-2 text-right font-bold bg-slate-50">{row.eggCount}</td>
                                    </tr>
                                ))}
                                {parsedData.length > 100 && (
                                    <tr>
                                        <td colSpan={9} className="p-2 text-center text-slate-400 italic">... ve {parsedData.length - 100} kayıt daha</td>
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                    <CheckCircle size={18} /> Önizle
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