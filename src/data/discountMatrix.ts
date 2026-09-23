import { CategoryDiscountRule, BrandDiscountRule } from '../types';

export const DEFAULT_CATEGORY_DISCOUNT_RULES: CategoryDiscountRule[] = [
  {
    category: 'Plastik Boru & Ek Parçalar',
    categoryLabel: 'PPRC & PVC Plastik Boru Grubu',
    tierA_Percent: 42,
    tierB_Percent: 35,
    tierC_Percent: 25,
  },
  {
    category: 'Vanalar & Metal Ek Parçalar',
    categoryLabel: 'Küresel Vana, Çekvalf & Pirinç',
    tierA_Percent: 32,
    tierB_Percent: 25,
    tierC_Percent: 18,
  },
  {
    category: 'Kombi & Isıtma Grubu',
    categoryLabel: 'Kombi, Şofben & Cihazlar',
    tierA_Percent: 12,
    tierB_Percent: 8,
    tierC_Percent: 5,
  },
  {
    category: 'Radyatör & Yerden Isıtma',
    categoryLabel: 'Panel Radyatör, Havlupan & Kollektör',
    tierA_Percent: 28,
    tierB_Percent: 22,
    tierC_Percent: 15,
  },
  {
    category: 'Doğalgaz Tesisat Malzemeleri',
    categoryLabel: 'Doğalgaz Boru, Sayaç & Flex',
    tierA_Percent: 22,
    tierB_Percent: 16,
    tierC_Percent: 10,
  },
  {
    category: 'İzolasyon & Sızdırmazlık',
    categoryLabel: 'Boru Kılıfı, Macun & Teflon',
    tierA_Percent: 38,
    tierB_Percent: 30,
    tierC_Percent: 20,
  },
  {
    category: 'Sıhhi Tesisat & Armatür',
    categoryLabel: 'Batarya, Musluk & Gider',
    tierA_Percent: 30,
    tierB_Percent: 24,
    tierC_Percent: 15,
  }
];

export const DEFAULT_BRAND_DISCOUNTS: BrandDiscountRule[] = [
  { brand: 'Pilsa', discountPercent: 40 },
  { brand: 'Kalde', discountPercent: 38 },
  { brand: 'E.C.A.', discountPercent: 28 },
  { brand: 'DemirDöküm', discountPercent: 12 },
  { brand: 'Baymak', discountPercent: 10 },
  { brand: 'Dizayn', discountPercent: 35 },
  { brand: 'VitrA', discountPercent: 25 },
  { brand: 'General Life', discountPercent: 20 },
];

/**
 * Calculates discount percent for a product based on customer tier
 */
export function getDiscountForProduct(category: string, tier: string = 'A_TIER'): number {
  const rule = DEFAULT_CATEGORY_DISCOUNT_RULES.find(r => 
    r.category.toLowerCase().includes(category.toLowerCase()) || 
    category.toLowerCase().includes(r.category.toLowerCase())
  );
  
  if (!rule) {
    return tier === 'A_TIER' ? 25 : tier === 'B_TIER' ? 18 : 10;
  }

  switch (tier) {
    case 'A_TIER':
      return rule.tierA_Percent;
    case 'B_TIER':
      return rule.tierB_Percent;
    case 'C_TIER':
      return rule.tierC_Percent;
    default:
      return rule.tierA_Percent;
  }
}
