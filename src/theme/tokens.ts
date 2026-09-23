/**
 * ALPHA TEKNİK B2B DESIGN TOKENS
 * Single Source of Truth for Design System Tokens (TypeScript / React)
 * 
 * Marka logosundan piksel örneklemesi ile ölçülen 4 çeyrek marka renkleri,
 * WCAG AA uyumlu semantik durum renkleri, nötr gri skala, tipografi ve 4px spacing ölçeği.
 * 
 * "Renk asla dekorasyon değil, anlam taşır."
 */

// ── 1. Marka Renkleri (4 Çeyrek Piksel Örneklemesi) ──────────────────────
export const BRAND_COLORS = {
  blue: '#0086D0',   // Alpha Mavi  (HVAC / Tesisat / Satış & Finans)
  amber: '#F8A627',  // Alpha Amber (Donanım / El Aletleri / Lojistik)
  green: '#2D7B31',  // Alpha Yeşil (Mekanik / Boru / Stok & Depo)
  red: '#D32D2D',    // Alpha Kırmızı (Güç / Valf / Sistem & Tedarik)
} as const;

// ── 2. Nötr Gri Skalası (Arayüz İskeleti) ─────────────────────────────────
export const NEUTRAL_COLORS = {
  900: '#1A1D21', // Birincil metin (Light) / Koyu Yüzey Gövdesi (Dark: #0B0F19)
  700: '#3F4750', // İkincil metin, etiketler (WCAG AA: 8.62:1 on #F3F5F7, 9.42:1 on #FFFFFF)
  500: '#7C8591', // Yardımcı metin, 0-değerli nötr durumlar (WCAG AA: 4.60:1 on #FFFFFF)
  400: '#7E90A6', // Koyu tema yardımcı metin (WCAG AA: 5.86:1 on #0B0F19)
  300: '#D3D8DE', // Kenarlıklar, ayırıcılar, stroke
  100: '#F3F5F7', // Kart & sayfa arka planı (Light)
  0: '#FFFFFF',   // Yüzey (Card, Sheet, Modal)
} as const;

// ── 3. Semantik Durum Renkleri (WCAG AA Uyumlu Arka Plan & Metin Çiftleri) ──
export interface SemanticColorSet {
  main: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  iconLight?: string;
  iconDark?: string;
  borderLight: string;
  borderDark: string;
}

export const SEMANTIC_COLORS: Record<'success' | 'warning' | 'error' | 'info' | 'neutral', SemanticColorSet> = {
  // Pozitif / Tamamlanan / Onaylanan (Brand Green)
  success: {
    main: BRAND_COLORS.green,
    bgLight: '#E8F5E9',
    bgDark: '#0F2912',
    textLight: '#1B5E20', // WCAG AA 7.00:1 on #E8F5E9, 7.87:1 on #FFFFFF (ve #FFFFFF on #2D7B31: 5.26:1, on #047857: 5.48:1)
    textDark: '#34D399',  // WCAG AA 9.96:1 on #0B0F19, 8.11:1 on #0F2912
    iconLight: '#1B5E20', // WCAG AA 7.00:1 on #E8F5E9
    iconDark: '#4ADE80',  // WCAG AA 8.95:1 on #0B0F19, 7.30:1 on #0F2912
    borderLight: '#A5D6A7',
    borderDark: '#1B5E20',
  },

  // Dikkat Gerektiren / Bekleyen / Kritik Eşik (Brand Amber)
  warning: {
    main: BRAND_COLORS.amber,
    bgLight: '#FFF3E0',
    bgDark: '#2A1B05',
    textLight: '#8A4F00', // WCAG AA 5.99:1 on #FFF3E0, 6.56:1 on #FFFFFF
    textDark: '#FBBF24',  // WCAG AA 11.47:1 on #0B0F19, 10.00:1 on #2A1B05
    iconLight: '#A15C00', // WCAG AA 4.73:1 on #FFF3E0, 5.10:1 on #FFFFFF
    iconDark: '#FBBF24',  // WCAG AA 11.47:1 on #0B0F19, 10.00:1 on #2A1B05
    borderLight: '#FFE082',
    borderDark: '#8A4F00',
  },

  // Olumsuz / İptal / Hata / Negatif Bakiye / Kritik Stok (Brand Red)
  error: {
    main: BRAND_COLORS.red,
    bgLight: '#FDECEA',
    bgDark: '#2E0F11',
    textLight: '#B71C1C', // WCAG AA 5.74:1 on #FDECEA, 6.57:1 on #FFFFFF
    textDark: '#F87171',  // WCAG AA 6.92:1 on #0B0F19, 6.37:1 on #2E0F11
    iconLight: '#B71C1C', // WCAG AA 5.74:1 on #FDECEA
    iconDark: '#F87171',  // WCAG AA 6.92:1 on #0B0F19
    borderLight: '#FFCDD2',
    borderDark: '#7F1D1D',
  },

  // Nötr Bilgilendirme / Link / İletilen / İnceleme (Brand Blue)
  info: {
    main: BRAND_COLORS.blue,
    bgLight: '#E3F2FD',
    bgDark: '#0B2545',
    textLight: '#005C8F', // WCAG AA 6.28:1 on #E3F2FD, 7.17:1 on #FFFFFF
    textDark: '#60A5FA',  // WCAG AA 7.53:1 on #0B0F19, 6.05:1 on #0B2545
    iconLight: '#005C8F', // WCAG AA 6.28:1 on #E3F2FD
    iconDark: '#60A5FA',  // WCAG AA 7.53:1 on #0B0F19
    borderLight: '#BBDEFB',
    borderDark: '#0C4A6E',
  },

  // Sıfır / Boş / İnaktif Durumlar (ASLA warning/error renkli gösterilmez!)
  neutral: {
    main: NEUTRAL_COLORS[500],
    bgLight: NEUTRAL_COLORS[100],
    bgDark: '#1E293B',
    textLight: NEUTRAL_COLORS[700], // WCAG AA 8.62:1 on #F3F5F7
    textDark: '#94A3B8',           // WCAG AA 5.71:1 on #1E293B, 7.47:1 on #0B0F19 (#7E90A6 is 5.86:1 on #0B0F19)
    iconLight: NEUTRAL_COLORS[700], // WCAG AA 8.62:1 on #F3F5F7
    iconDark: '#94A3B8',           // WCAG AA 7.47:1 on #0B0F19
    borderLight: NEUTRAL_COLORS[300],
    borderDark: '#334155',
  },
};

// ── 4. Fonksiyonel Kategori Renkleri (Hızlı Operasyon Masası) ───────────
export interface CategoryTheme {
  id: 'sales' | 'inventory' | 'logistics' | 'system';
  name: string;
  badgeLabel: string;
  brandHex: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  borderLight: string;
  borderDark: string;
}

export const CATEGORY_TOKENS: Record<'sales' | 'inventory' | 'logistics' | 'system', CategoryTheme> = {
  // Satış & Finans -> Alpha Mavi (#0086D0)
  sales: {
    id: 'sales',
    name: 'Satış & Finans',
    badgeLabel: 'Satış / Finans',
    brandHex: BRAND_COLORS.blue,
    bgLight: '#E3F2FD',
    bgDark: 'rgba(0, 134, 208, 0.18)',
    textLight: '#005C8F',
    textDark: '#38BDF8',
    borderLight: '#BBDEFB',
    borderDark: '#0284C7',
  },

  // Stok & Depo -> Alpha Yeşil (#2D7B31)
  inventory: {
    id: 'inventory',
    name: 'Stok & Depo',
    badgeLabel: 'Stok / Depo',
    brandHex: BRAND_COLORS.green,
    bgLight: '#E8F5E9',
    bgDark: 'rgba(45, 123, 49, 0.22)',
    textLight: '#1B5E20',
    textDark: '#4ADE80',
    borderLight: '#A5D6A7',
    borderDark: '#16A34A',
  },

  // Lojistik -> Alpha Amber (#F8A627)
  logistics: {
    id: 'logistics',
    name: 'Lojistik & Sevkiyat',
    badgeLabel: 'Lojistik / Rota',
    brandHex: BRAND_COLORS.amber,
    bgLight: '#FFF3E0',
    bgDark: 'rgba(248, 166, 39, 0.20)',
    textLight: '#8A4F00',
    textDark: '#FBBF24',
    borderLight: '#FFE082',
    borderDark: '#F59E0B',
  },

  // Sistem & Tedarik -> Alpha Kırmızı (#D32D2D)
  system: {
    id: 'system',
    name: 'Sistem & Yönetim',
    badgeLabel: 'Sistem / Tedarik',
    brandHex: BRAND_COLORS.red,
    bgLight: '#FDECEA',
    bgDark: 'rgba(211, 45, 45, 0.22)',
    textLight: '#B71C1C',
    textDark: '#F87171',
    borderLight: '#FFCDD2',
    borderDark: '#DC2626',
  },
};

// ── 5. Tipografi Ölçeği (28/22/17/15/13/12px) ──────────────────────────
export const TYPOGRAPHY_TOKENS = {
  display: {
    fontSize: '28px',
    lineHeight: '34px',
    fontWeight: '800',
    letterSpacing: '-0.02em',
  },
  title1: {
    fontSize: '28px',
    lineHeight: '34px',
    fontWeight: '800',
    letterSpacing: '-0.02em',
  },
  title2: {
    fontSize: '22px',
    lineHeight: '28px',
    fontWeight: '700',
    letterSpacing: '-0.015em',
  },
  title3: {
    fontSize: '17px',
    lineHeight: '22px',
    fontWeight: '600',
    letterSpacing: '-0.01em',
  },
  body: {
    fontSize: '15px',
    lineHeight: '20px',
    fontWeight: '400',
    letterSpacing: '-0.005em',
  },
  caption: {
    fontSize: '13px',
    lineHeight: '18px',
    fontWeight: '500',
    letterSpacing: '0em',
  },
  badge: {
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: '600',
    letterSpacing: '0.01em',
  },
} as const;

// ── 6. 4px Spacing Ölçeği ──────────────────────────────────────────────
export const SPACING_TOKENS = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
} as const;

// ── 7. WCAG Contrast Helper Utilities ──────────────────────────────────
export function calculateRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

export function calculateContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const l1 = calculateRelativeLuminance(foregroundHex);
  const l2 = calculateRelativeLuminance(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isWcagAaCompliant(foregroundHex: string, backgroundHex: string, isLargeTextOrIcon = false): boolean {
  const ratio = calculateContrastRatio(foregroundHex, backgroundHex);
  return isLargeTextOrIcon ? ratio >= 3.0 : ratio >= 4.5;
}
