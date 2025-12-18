/**
 * PRODUCTION MODULE DESIGN STANDARDS
 * =============================================================================
 * BU DOSYA REFERANS AMAÇLIDIR. KOD TARAFINDAN IMPORT EDİLMEZ.
 * * Amaç: Gelecekteki geliştirmelerde veya yeniden tasarımlarda, projenin 
 * mevcut estetiğini, renk paletini ve tablo yapısını korumak için 
 * "Tek Doğruluk Kaynağı" (Single Source of Truth) olarak kullanılır.
 * =============================================================================
 */

export const ProductionDesignSpecs = {
  
  // ---------------------------------------------------------------------------
  // 1. TİPOGRAFİ & FONT BOYUTLARI
  // ---------------------------------------------------------------------------
  typography: {
    baseFont: "Inter / sans-serif (Tailwind default)",
    
    // Tablo Başlıkları
    header: {
      size: "text-[10px]", // Çok sıkışık veriler için küçültüldü
      weight: "font-bold",
      transform: "uppercase",
      color: "text-slate-600",
      tracking: "tracking-wider"
    },

    // Tablo Satırları
    row: {
      primarySize: "text-[10px]", // Ana veri (Rakamlar)
      secondarySize: "text-[9px]", // İkincil veri (Gün ismi, % işaretleri)
      numberFont: "font-mono", // Rakamların hizalı durması için
      inputWeight: "font-bold", // Girilen verinin okunabilirliği için
    }
  },

  // ---------------------------------------------------------------------------
  // 2. KOLON YAPISI & GENİŞLİKLERİ (Layout)
  // ---------------------------------------------------------------------------
  // Toplam 13 Kolon bulunmaktadır. Sticky (Sabit) kolon soldadır.
  columns: [
    { order: 1,  name: "Tarih",      width: "w-20",  type: "Sticky Left", notes: "Gün ve Gün İsmi alt alta" },
    { order: 2,  name: "Hafta",      width: "w-8",   type: "Static",      notes: "Sadece rakam" },
    { order: 3,  name: "Mevcut",     width: "w-14",  type: "Static",      notes: "Current Birds" },
    { order: 4,  name: "Ölü",        width: "w-12",  type: "Input",       color: "Red" },
    { order: 5,  name: "% Verim",    width: "w-14",  type: "Calculated",  color: "Dynamic (Emerald/Amber/Red)" },
    { order: 6,  name: "Sağlam",     width: "w-14",  type: "Input",       color: "Emerald" },
    { order: 7,  name: "Kırık",      width: "w-12",  type: "Input",       color: "Slate" },
    { order: 8,  name: "Kırık %",    width: "w-12",  type: "Calculated",  color: "Slate-500" },
    { order: 9,  name: "Kirli",      width: "w-12",  type: "Input",       color: "Slate" },
    { order: 10, name: "Kirli %",    width: "w-12",  type: "Calculated",  color: "Slate-500" },
    { order: 11, name: "Toplam",     width: "w-14",  type: "Calculated",  color: "Amber" },
    { order: 12, name: "Ort. Gr",    width: "w-12",  type: "Input",       color: "Indigo" },
    { order: 13, name: "Notlar",     width: "w-24",  type: "Input Text",  notes: "Kısaltılmış genişlik" },
  ],

  layout: {
    rowHeight: "h-8 (32px)", // Input yükseklikleri
    headerHeight: "Auto / Padding p-1",
    scrollOffset: "3 Rows", // "Bugün" satırına giderken üstten bırakılan boşluk
  },

  // ---------------------------------------------------------------------------
  // 3. RENK PALETİ & DURUMLAR (Semantic Colors)
  // ---------------------------------------------------------------------------
  colors: {
    // Genel Zeminler
    background: {
      header: "bg-slate-100",
      body: "bg-white",
      zebraStripes: "bg-slate-50", // Çift haftalarda (Even Weeks)
      today: "bg-amber-50/60", // Bugünün satır rengi
    },

    // Veri Grupları (Input & Header Arka Planları)
    groups: {
      mortality: {
        bg: "bg-red-50",
        text: "text-red-700",
        ring: "focus:ring-red-200"
      },
      production_good: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        ring: "focus:ring-emerald-200"
      },
      production_waste: { // Kırık & Kirli
        bg: "bg-slate-100", // Input hali
        readOnlyBg: "bg-slate-50", // % sütunları
        text: "text-slate-600",
        ring: "focus:ring-slate-200"
      },
      total: {
        bg: "bg-amber-50",
        text: "text-amber-800",
        font: "font-black"
      },
      weight: {
        bg: "bg-indigo-50", // Input focus rengi referansı
        text: "text-indigo-600", // Header rengi
        ring: "focus:ring-indigo-200"
      }
    },

    // Verim (Yield) Renk Skalası (Koşullu Biçimlendirme)
    yieldThresholds: {
      high: { min: 90, color: "text-emerald-700" }, // %90 üstü
      medium: { min: 80, max: 89, color: "text-amber-700" }, // %80 - %90 arası
      low: { max: 79, color: "text-amber-600" } // %80 altı (Eskiden kırmızıydı, yumuşatıldı)
    },

    // Özel Etkinlikler (Special Events)
    events: {
      transfer: { color: "blue", bg: "bg-blue-50", border: "border-blue-100" },
      molting: { color: "emerald", bg: "bg-emerald-50", border: "border-emerald-100" }
    }
  },

  // ---------------------------------------------------------------------------
  // 4. GÖRSEL EFEKTLER & ETKİLEŞİMLER
  // ---------------------------------------------------------------------------
  effects: {
    // "Bugün" Göstergesi
    todayIndicator: {
      lineColor: "border-red-300", // Yumuşak kırmızı çizgi
      shadow: "shadow-[0_1px_3px_rgba(252,165,165,0.4)]", // Hafif kırmızı gölge
      labelBg: "bg-red-400", // "BUGÜN" etiketi arka planı
      position: "Satırın üst çizgisi (border-t)"
    },

    // Input Alanları
    inputs: {
      defaultState: "bg-transparent", // Odaklanmamışken şeffaf
      focusState: "bg-white ring-2 ring-inset", // Odaklanınca beyaz ve çerçeveli
      borderRadius: "rounded",
    },

    // Zebra Deseni Mantığı
    zebraLogic: "Sadece çift numaralı haftalarda (Week % 2 === 0) uygulanır. Tek günlerde değil.",
  }
};