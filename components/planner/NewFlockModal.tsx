'use client';

import React, { useState, useEffect } from 'react'; // useEffect eklendi
import { X, Save, Egg, Bird } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfDay } from 'date-fns';

interface NewFlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  coopId: string;
  coopName?: string;
  userEmail?: string | null;
  onSuccess: (id: string) => void;
  nextFlockNumber: number; // YENİ PROP
}

export function NewFlockModal({ isOpen, onClose, coopId, coopName, userEmail, onSuccess, nextFlockNumber }: NewFlockModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [initialCount, setInitialCount] = useState('');
  const [hatchDate, setHatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<0 | 1>(0);

  // Modal açıldığında ismi otomatik ata (#01 formatında)
  useEffect(() => {
    if (isOpen) {
        const formattedNumber = nextFlockNumber.toString().padStart(2, '0');
        setName(`#${formattedNumber}`);
    }
  }, [isOpen, nextFlockNumber]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: name, // Artık state'den gelen otomatik ismi kullanıyoruz
        coopId: coopId,
        hatchDate: startOfDay(new Date(hatchDate)),
        initialCount: Number(initialCount),
        lane: type,
        isMolting: false,
        moltDate: null,
        transferDate: null,
        exitDate: null,
        updatedBy: userEmail,
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, "flocks"), payload);
      onSuccess(docRef.id);
      onClose();
      
      // Formu sıfırla
      setInitialCount('');
      setType(0);
    } catch (error) {
      console.error("Sürü ekleme hatası:", error);
      alert("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Yeni Sürü Girişi</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Hedef: <span className="text-blue-600 font-bold">{coopName || coopId}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Tip Seçimi (Aynı Kalacak) */}
          <div className="grid grid-cols-2 gap-3">
             {/* ... (Radio butonlar aynı) ... */}
             <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center gap-2 transition-all ${type === 0 ? 'border-lime-500 bg-lime-50 text-lime-800' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}>
              <input type="radio" name="type" className="hidden" checked={type === 0} onChange={() => setType(0)} />
              <Egg size={24} className={type === 0 ? 'text-lime-600' : 'text-slate-400'} />
              <span className="text-xs font-bold">Civciv (Büyütme)</span>
            </label>
            <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center gap-2 transition-all ${type === 1 ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}>
              <input type="radio" name="type" className="hidden" checked={type === 1} onChange={() => setType(1)} />
              <Bird size={24} className={type === 1 ? 'text-amber-600' : 'text-slate-400'} />
              <span className="text-xs font-bold">Tavuk (Devir)</span>
            </label>
          </div>

          {/* Sürü Adı (Otomatik Dolu) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Sürü Kodu (Otomatik)</label>
            <input 
              type="text" 
              className="w-full bg-slate-100 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
              value={name}
              onChange={e => setName(e.target.value)} // Kullanıcı isterse değiştirebilir
            />
          </div>

          {/* ... (Kalan inputlar ve buton aynı) ... */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Başlangıç Adedi</label>
              <input 
                type="number" 
                required
                min="1"
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                value={initialCount}
                onChange={e => setInitialCount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Giriş Tarihi</label>
              <input 
                type="date" 
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                value={hatchDate}
                onChange={e => setHatchDate(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <Save size={18} />
                Sürüyü Oluştur
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}