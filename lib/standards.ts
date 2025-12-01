// Basitleştirilmiş Irk Standardı (Örn: Lohmann Brown)
// Hafta -> Hedef Verim %
export const getBreedStandard = (week: number): number => {
    if (week < 18) return 0; // 18. haftadan önce yumurta yok
    if (week === 18) return 5;
    if (week === 19) return 15;
    if (week === 20) return 50; // %50 Verim (Kritik Eşik)
    if (week === 21) return 80;
    if (week === 22) return 92;
    if (week >= 23 && week <= 30) return 96; // PİK DÖNEMİ
    
    // 30. haftadan sonra her hafta çok az düşüş (Doğal yaşlanma)
    const decline = (week - 30) * 0.12; 
    return Math.max(0, 96 - decline);
};