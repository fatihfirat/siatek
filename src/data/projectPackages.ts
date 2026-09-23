import { ProjectPackage } from '../types';

export const DEFAULT_PROJECT_PACKAGES: ProjectPackage[] = [
  {
    id: 'pkg-daire-3plus1',
    title: '3+1 Daire Tam Sıhhi Tesisat Paketi',
    category: 'daire_tesisat',
    categoryLabel: 'Daire İçi Tesisat',
    description: '1 adet mutfak, 2 adet banyo/WC için komple PPRC boru, ek parçalar, küresel vanalar ve test tapaları hazır seti.',
    estimatedTotal: 6850,
    iconName: 'Home',
    isCustom: false,
    createdAt: new Date().toISOString(),
    items: [
      { productId: 'prod-pprc-20', productName: 'PPRC Boru PN20 20mm (Boy 4m)', sku: 'ST00001', quantity: 15, unit: 'METRE', unitPrice: 38.5 },
      { productId: 'prod-pprc-25', productName: 'PPRC Boru PN20 25mm (Boy 4m)', sku: 'ST00002', quantity: 10, unit: 'METRE', unitPrice: 58.0 },
      { productId: 'prod-dirsek-20', productName: 'PPRC 90° Dirsek 20mm', sku: 'ST00003', quantity: 40, unit: 'ADET', unitPrice: 4.8 },
      { productId: 'prod-dirsek-25', productName: 'PPRC 90° Dirsek 25mm', sku: 'ST00004', quantity: 20, unit: 'ADET', unitPrice: 7.2 },
      { productId: 'prod-te-20', productName: 'PPRC Eşit Te 20mm', sku: 'ST00005', quantity: 25, unit: 'ADET', unitPrice: 6.5 },
      { productId: 'prod-manson-20', productName: 'PPRC Manşon 20mm', sku: 'ST00006', quantity: 20, unit: 'ADET', unitPrice: 4.2 },
      { productId: 'prod-batarya-bag', productName: 'PPRC Çiftli Batarya Bağlantısı', sku: 'ST00007', quantity: 4, unit: 'ADET', unitPrice: 95.0 },
      { productId: 'prod-vana-25', productName: 'Pirinç PN16 Küresel Vana 3/4"', sku: 'ST00015', quantity: 3, unit: 'ADET', unitPrice: 220.0 },
      { productId: 'prod-teflon', productName: 'Teflon Bant Kalın (10 Adet Paket)', sku: 'ST00028', quantity: 2, unit: 'Paket', unitPrice: 85.0 },
    ]
  },
  {
    id: 'pkg-yerden-isitma',
    title: 'Kollektör & Yerden Isıtma Kurulum Seti (120 m²)',
    category: 'yerden_isitma',
    categoryLabel: 'Yerden Isıtma',
    description: '8 ağızlı paslanmaz debi ayarlı kollektör, oksijen bariyerli PE-RT boru, köpük modülü ve kenar izolasyon bandı paketi.',
    estimatedTotal: 28400,
    iconName: 'Flame',
    isCustom: false,
    createdAt: new Date().toISOString(),
    items: [
      { productId: 'prod-kollektor-8', productName: 'Debi Ayarlı Paslanmaz Kollektör 8 Ağızlı', sku: 'ST00042', quantity: 1, unit: 'SET', unitPrice: 3850.0 },
      { productId: 'prod-pe-rt-boru', productName: 'PE-RT Oksijen Bariyerli Yerden Isıtma Borusu 16x2mm (Top 240m)', sku: 'ST00043', quantity: 4, unit: 'Top', unitPrice: 4200.0 },
      { productId: 'prod-kollektor-dolabi', productName: 'Gömme Kollektör Dolabı (80x65 cm)', sku: 'ST00044', quantity: 1, unit: 'ADET', unitPrice: 890.0 },
      { productId: 'prod-otomatik-purjor', productName: 'Otomatik Hava Pürjörü & Tahliye Seti', sku: 'ST00045', quantity: 2, unit: 'ADET', unitPrice: 165.0 },
      { productId: 'prod-vana-1inc', productName: 'Rakorlu Kollektör Vanası 1" Kırmızı/Mavi', sku: 'ST00046', quantity: 2, unit: 'ADET', unitPrice: 340.0 },
    ]
  },
  {
    id: 'pkg-kombi-montaj',
    title: 'Kombi & Radyatör Montaj Bağlantı Seti',
    category: 'kombi_montaj',
    categoryLabel: 'Kombi & Isıtma',
    description: 'Kombi altı 8 parça filtreli bağlantı seti, gaz flexi, emniyet ventili ve radyatör kompakt vana seti.',
    estimatedTotal: 4200,
    iconName: 'Cpu',
    isCustom: false,
    createdAt: new Date().toISOString(),
    items: [
      { productId: 'prod-kombi-bag-seti', productName: 'Kombi Altı Pirinç Bağlantı Seti (Filtreli Vanalar Dahil)', sku: 'ST00051', quantity: 1, unit: 'SET', unitPrice: 650.0 },
      { productId: 'prod-gaz-flex-50', productName: 'Doğalgaz E.C.A. Flex Hortum 3/4" 50cm (Makaronlu)', sku: 'ST00052', quantity: 1, unit: 'ADET', unitPrice: 285.0 },
      { productId: 'prod-radyator-vana-duz', productName: 'Termostatik Radyatör Vanası 1/2" Düz', sku: 'ST00053', quantity: 6, unit: 'ADET', unitPrice: 275.0 },
      { productId: 'prod-radyator-vana-geri', productName: 'Geri Dönüş Radyatör Vanası 1/2"', sku: 'ST00054', quantity: 6, unit: 'ADET', unitPrice: 110.0 },
      { productId: 'prod-emniyet-ventili', productName: 'Kazan / Kombi Emniyet Ventili 3 Bar 1/2"', sku: 'ST00055', quantity: 1, unit: 'ADET', unitPrice: 195.0 },
    ]
  },
  {
    id: 'pkg-kazan-yangin',
    title: 'Kazan Dairesi & Emniyet Vana İstasyonu Seti',
    category: 'kazan_yangin',
    categoryLabel: 'Kazan & Yangın',
    description: 'Flanşlı vanalar, pislik tutucu, çekvalf ve gliserinli manometrelerden oluşan merkezi sistem emniyet paketi.',
    estimatedTotal: 19800,
    iconName: 'Shield',
    isCustom: false,
    createdAt: new Date().toISOString(),
    items: [
      { productId: 'prod-kelebek-vana-dn50', productName: 'Wafer Tip Kelebek Vana DN50', sku: 'ST00061', quantity: 2, unit: 'ADET', unitPrice: 1450.0 },
      { productId: 'prod-pislik-tutucu-dn50', productName: 'Flanşlı Pislik Tutucu Filtre DN50', sku: 'ST00062', quantity: 1, unit: 'ADET', unitPrice: 2100.0 },
      { productId: 'prod-calpara-cekvalf-dn50', productName: 'Çalpara Çekvalf Flanşlı DN50', sku: 'ST00063', quantity: 1, unit: 'ADET', unitPrice: 2650.0 },
      { productId: 'prod-manometre-gliserin', productName: 'Gliserinli Manometre 0-10 Bar (Radyal)', sku: 'ST00064', quantity: 2, unit: 'ADET', unitPrice: 380.0 },
      { productId: 'prod-termometre-bimetal', productName: 'Bimetalik Termometre 0-120°C Dikey', sku: 'ST00065', quantity: 2, unit: 'ADET', unitPrice: 340.0 },
    ]
  }
];
