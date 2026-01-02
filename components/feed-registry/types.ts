export type FeedLog = {
  id?: string;
  coopId: string; // Yem silosunun bulunduğu kümes
  flockId: string; // Hangi sürü için (transfer öncesi civciv kümesinde, sonrası tavuk kümesinde)
  date: Date;
  producedFeed: number; // Yapılan yem (kg)
  currentFeed: number | null; // Mevcut yem (kg) - null ise henüz girilmemiş
  avgConsumption?: number; // Ortalama tüketim (gram/hayvan/gün) - otomatik hesaplanacak
};

export type FeedTableRowData = {
  date: Date;
  coopData: Record<string, {
    logId?: string;
    producedFeed: number;
    currentFeed: number | null;
    avgConsumption: number | null;
    isDirty: boolean;
  }>;
};

