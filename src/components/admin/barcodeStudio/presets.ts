import { LabelStudioConfig, PresetTemplate } from './types';

export const DEFAULT_LABEL_CONFIG: LabelStudioConfig = {
  dimensions: {
    widthMm: 80,
    heightMm: 50,
    paddingMm: 3,
    borderRadiusMm: 2,
  },
  typography: {
    headerFontSizePt: 9,
    productNameFontSizePt: 11,
    productNameWeight: 'bold',
    priceFontSizePt: 15,
    priceWeight: 'black',
    barcodeTextFontSizePt: 8,
    detailsFontSizePt: 7,
  },
  barcode: {
    type: 'CODE128',
    barcodeHeightMm: 16,
    barcodeWidthScale: 1.5,
    qrSizeMm: 18,
    showText: true,
    invertHeader: true,
    barcodeOffsetYMm: 0,
    barcodeOffsetXMm: 0,
    autoFitContent: true,
  },
  badges: {
    showDomesticProductBadge: true,
    showShelfLocation: true,
    shelfLocationText: 'RAF: A-04 / KOR-2',
    showLotNumber: true,
    lotNumberText: 'LOT-2026/09',
    showDiscountStrike: false,
    showVatInfo: true,
    vatType: 'included',
    showCurrencyEquivalent: false,
    campaignBannerText: '',
  },
  calibration: {
    offsetXmm: 0,
    offsetYmm: 0,
    density: 'high-contrast',
  },
  headerText: 'ALPHA TEKNİK ENDÜSTRİYEL',
  showHeader: true,
  showProductName: true,
  showSku: true,
  showPrice: true,
  showCategory: true,
  showUnit: true,
  colorTheme: 'monochrome',
};

export const STUDIO_PRESETS: PresetTemplate[] = [
  {
    id: 'industrial-shelf-80x50',
    name: 'Sanayi & Depo Raf Etiketi (80x50 mm)',
    description: 'Yüksek kontrastlı CODE128 barkod, belirgin raf adresi, OEM parça kodu ve parti takip numarası.',
    presetKey: 'thermal-80x50',
    config: {
      dimensions: { widthMm: 80, heightMm: 50, paddingMm: 3, borderRadiusMm: 1.5 },
      barcode: { type: 'CODE128', barcodeHeightMm: 14, barcodeWidthScale: 1.5, qrSizeMm: 15, showText: true, invertHeader: true, barcodeOffsetYMm: 0, barcodeOffsetXMm: 0, autoFitContent: true },
      typography: { headerFontSizePt: 8, productNameFontSizePt: 10, productNameWeight: 'bold', priceFontSizePt: 14, priceWeight: 'black', barcodeTextFontSizePt: 8, detailsFontSizePt: 7 },
      badges: { showDomesticProductBadge: true, showShelfLocation: true, shelfLocationText: 'RAF: B2 / GÖZ: 4', showLotNumber: true, lotNumberText: 'LOT-2026/A', showDiscountStrike: false, showVatInfo: true, vatType: 'included', showCurrencyEquivalent: false }
    }
  },
  {
    id: 'retail-shelf-talker',
    name: 'Perakende Showroom & Raf (Shelf Talker)',
    description: 'Büyük fiyat vurgusu, üstü çizili liste fiyatı, net bayi fiyatı ve teknik föy için QR kod.',
    presetKey: 'shelf-talker',
    config: {
      dimensions: { widthMm: 100, heightMm: 70, paddingMm: 3.5, borderRadiusMm: 3 },
      barcode: { type: 'DUAL', barcodeHeightMm: 11, barcodeWidthScale: 1.3, qrSizeMm: 18, showText: true, invertHeader: false, barcodeOffsetYMm: 0, barcodeOffsetXMm: 0, autoFitContent: true },
      typography: { headerFontSizePt: 9, productNameFontSizePt: 11, productNameWeight: 'bold', priceFontSizePt: 16, priceWeight: 'black', barcodeTextFontSizePt: 8, detailsFontSizePt: 7.5 },
      badges: { showDomesticProductBadge: true, showShelfLocation: false, showLotNumber: false, showDiscountStrike: true, discountListPrice: 1.25, showVatInfo: true, vatType: 'included', showCurrencyEquivalent: true, campaignBannerText: 'ÖZEL B2B İSKONTO' }
    }
  },
  {
    id: 'compact-part-50x30',
    name: 'Kompakt Parça & Kutu Etiketi (50x30 mm)',
    description: 'Vana, rekor, bağlantı parçaları ve küçük ambalajlar için optimize edilmiş mikro etiket.',
    presetKey: 'thermal-50x30',
    config: {
      dimensions: { widthMm: 50, heightMm: 30, paddingMm: 2, borderRadiusMm: 1 },
      barcode: { type: 'CODE128', barcodeHeightMm: 11, barcodeWidthScale: 1.2, qrSizeMm: 12, showText: true, invertHeader: true },
      typography: { headerFontSizePt: 7, productNameFontSizePt: 8, productNameWeight: 'semibold', priceFontSizePt: 10, priceWeight: 'bold', barcodeTextFontSizePt: 7, detailsFontSizePt: 6 },
      badges: { showDomesticProductBadge: false, showShelfLocation: true, shelfLocationText: 'K-03', showLotNumber: false, showDiscountStrike: false, showVatInfo: false, vatType: 'included', showCurrencyEquivalent: false }
    }
  },
  {
    id: 'logistics-pallet-100x150',
    name: 'Lojistik Koli & Sevk Palet Etiketi (100x150 mm)',
    description: 'Lojistik ve sevkiyat için GS1 uyumlu kargo barkodu, müşteri unvanı, koli içi adet ve ağırlık.',
    presetKey: 'thermal-100x150',
    config: {
      dimensions: { widthMm: 100, heightMm: 150, paddingMm: 5, borderRadiusMm: 0 },
      barcode: { type: 'DUAL', barcodeHeightMm: 28, barcodeWidthScale: 2.2, qrSizeMm: 30, showText: true, invertHeader: true },
      typography: { headerFontSizePt: 12, productNameFontSizePt: 14, productNameWeight: 'black', priceFontSizePt: 14, priceWeight: 'bold', barcodeTextFontSizePt: 10, detailsFontSizePt: 9 },
      badges: { showDomesticProductBadge: true, showShelfLocation: true, shelfLocationText: 'SEVK DEPOSU: PERON 2', showLotNumber: true, lotNumberText: 'PALET-00428', showDiscountStrike: false, showVatInfo: true, vatType: 'included', showCurrencyEquivalent: false, campaignBannerText: 'DİKKAT: KIRILABİLİR' }
    }
  }
];
