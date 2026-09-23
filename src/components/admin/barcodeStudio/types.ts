export type PaperPreset = 
  | 'thermal-50x30' 
  | 'thermal-80x50' 
  | 'thermal-100x150' 
  | 'shelf-talker' 
  | 'a4-24' 
  | 'a4-40' 
  | 'a4-14';

export type BarcodeType = 'CODE128' | 'EAN13' | 'QR' | 'DUAL';

export interface LabelDimensions {
  widthMm: number;
  heightMm: number;
  paddingMm: number;
  borderRadiusMm: number;
}

export interface TypographyConfig {
  headerFontSizePt: number;
  productNameFontSizePt: number;
  productNameWeight: 'normal' | 'semibold' | 'bold' | 'black';
  priceFontSizePt: number;
  priceWeight: 'bold' | 'black';
  barcodeTextFontSizePt: number;
  detailsFontSizePt: number;
}

export interface BarcodeVisualConfig {
  type: BarcodeType;
  barcodeHeightMm: number;
  barcodeWidthScale: number; // 1 to 3
  qrSizeMm: number;
  showText: boolean;
  invertHeader: boolean; // Siyah zemin beyaz yazı başlık bandı
  barcodeOffsetYMm?: number; // Barkodu yukarı/aşağı kaydırma (+/- mm)
  barcodeOffsetXMm?: number; // Barkodu sağa/sola kaydırma (+/- mm)
  autoFitContent?: boolean;  // İçeriğin etikete otomatik sıkıştırılması
}

export interface BadgeConfig {
  showDomesticProductBadge: boolean; // Yerli Üretim / Türk Malı
  showShelfLocation: boolean;        // Raf: A-12 / Koridor: 3
  shelfLocationText?: string;
  showLotNumber: boolean;            // Parti / LOT No
  lotNumberText?: string;
  showDiscountStrike: boolean;       // Üstü çizili liste fiyatı + net fiyat
  discountListPrice?: number;
  showVatInfo: boolean;              // + KDV Dahil / Hariç
  vatType: 'included' | 'excluded';
  showCurrencyEquivalent: boolean;   // TCMB USD/EUR eşdeğeri
  campaignBannerText?: string;       // Örn: "NET FİYAT", "ÖZEL İSKONTO"
}

export interface PrintCalibration {
  offsetXmm: number; // -5mm to +5mm
  offsetYmm: number; // -5mm to +5mm
  density: 'normal' | 'dark' | 'high-contrast';
}

export interface LabelStudioConfig {
  dimensions: LabelDimensions;
  typography: TypographyConfig;
  barcode: BarcodeVisualConfig;
  badges: BadgeConfig;
  calibration: PrintCalibration;
  headerText: string;
  showHeader: boolean;
  showProductName: boolean;
  showSku: boolean;
  showPrice: boolean;
  showCategory: boolean;
  showUnit: boolean;
  colorTheme: 'monochrome' | 'industrial-blue' | 'high-visibility';
}

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  presetKey: PaperPreset;
  config: Partial<LabelStudioConfig>;
}
