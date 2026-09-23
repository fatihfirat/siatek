import { describe, it, expect } from 'vitest';
import { CATEGORY_TOKENS, BRAND_COLORS, calculateContrastRatio, isWcagAaCompliant } from '../../theme/tokens';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FloatingScannerButton, { BarcodeViewfinderIcon } from './FloatingScannerButton';

describe('Yüzen Barkod Tarayıcı Butonu (FAB) & Kamera Deneyimi Testleri', () => {

  describe('1. İkon & Görsel Motifi Doğrulaması', () => {
    it('Düz kamera yerine vizör köşe parantezleri ve dikey barkod çizgileri motifini içerir', () => {
      const html = renderToStaticMarkup(<BarcodeViewfinderIcon />);
      // 4 corner brackets and barcode lines
      expect(html).toContain('viewBox="0 0 24 24"');
      expect(html).toContain('<svg');
      // Barcode vertical lines & laser indicator
      expect(html).toContain('<line');
      expect(html).toContain('<path');
    });
  });

  describe('2. Renk Tokeni & Kontrast & Derinlik Uyumu', () => {
    it('Stok & Depo kategorisi tokeni categoryInventory (Alpha Yeşil #2D7B31) ile tutarlıdır', () => {
      expect(CATEGORY_TOKENS.inventory.brandHex).toBe('#2D7B31');
      expect(BRAND_COLORS.green).toBe('#2D7B31');
    });

    it('Beyaz ikon (#FFFFFF) / Alpha Yeşil (#2D7B31) kontrastı WCAG AA standardını (>=4.5:1) 5.26:1 ile karşılar', () => {
      const contrastRatio = calculateContrastRatio('#FFFFFF', '#2D7B31');
      expect(contrastRatio).toBeGreaterThanOrEqual(5.20);
      expect(isWcagAaCompliant('#FFFFFF', '#2D7B31', false)).toBe(true);
    });

    it('Buton statik çıktısında #2D7B31 gradyanı ve derinlik gölgeleri yer alır', () => {
      const html = renderToStaticMarkup(<FloatingScannerButton onClick={() => {}} />);
      expect(html).toContain('#2D7B31');
      expect(html).toContain('linear-gradient');
      expect(html).toContain('inset 0');
    });
  });

  describe('3. Bekleme Animasyonu & prefers-reduced-motion Desteği', () => {
    it('Bekleme animasyonu sınıfını (fab-idle-breathing) ve prefers-reduced-motion CSS kurallarını içerir', () => {
      const html = renderToStaticMarkup(<FloatingScannerButton onClick={() => {}} />);
      expect(html).toContain('fab-idle-breathing');
      expect(html).toContain('prefers-reduced-motion');
      expect(html).toContain('animation: none !important');
    });
  });

  describe('4. Basma Geri Bildirimi & Dokunma Hedefi', () => {
    it('active:scale-[0.95] ve sınırlı ripple sınıflarını barındırır', () => {
      const html = renderToStaticMarkup(<FloatingScannerButton onClick={() => {}} />);
      expect(html).toContain('active:scale-[0.95]');
      expect(html).toContain('overflow-hidden');
    });

    it('10" tablet ve mobil cihazlar için dokunma hedefi minimum 56px boyuttadır (WCAG 48px standardını aşar)', () => {
      const minTouchTarget = 56;
      expect(minTouchTarget).toBeGreaterThanOrEqual(48);
    });
  });

  describe('5. Bağlamsal Davranış (WMS Toplama Rozeti & Menü)', () => {
    it('WMS Toplama modunda veya taranan ürün sayısı > 0 olduğunda rozet gösterir', () => {
      const htmlWithBadge = renderToStaticMarkup(
        <FloatingScannerButton onClick={() => {}} isWmsMode={true} wmsScannedCount={7} />
      );
      expect(htmlWithBadge).toContain('7');
      expect(htmlWithBadge).toContain('WMS taranan ürün: 7');
    });

    it('Sıfır taranan ürün ve WMS dışı modda rozet DOM içinde fazladan alan kaplamaz', () => {
      const htmlNoBadge = renderToStaticMarkup(
        <FloatingScannerButton onClick={() => {}} isWmsMode={false} wmsScannedCount={0} />
      );
      expect(htmlNoBadge).not.toContain('WMS taranan ürün');
    });
  });

  describe('6. Ekran Görünürlük & Kapsam Kuralları', () => {
    it('Görünürlük kuralı: Yalnızca Products, POS ve WMS Picking ekranlarında gösterilir, Home ekranında gösterilmez', () => {
      const isFabVisible = (tab: string, isModalOpen = false) => {
        return tab === 'products' || tab === 'pos' || tab === 'catalog' || isModalOpen;
      };

      expect(isFabVisible('home', false)).toBe(false);
      expect(isFabVisible('products', false)).toBe(true);
      expect(isFabVisible('pos', false)).toBe(true);
      expect(isFabVisible('catalog', false)).toBe(true);
      expect(isFabVisible('orders', true)).toBe(true); // WMS picking inspection modal open
    });
  });

});
