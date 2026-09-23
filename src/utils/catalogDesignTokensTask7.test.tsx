import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

import CustomerPortal from '../components/customer/CustomerPortal';
import ShoppingCatalog from '../components/customer/ShoppingCatalog';
import ShoppingCheckout from '../components/customer/ShoppingCheckout';
import AuthModal from '../components/AuthModal';
import { Product, Order, Quote, User } from '../types';
import { BRAND_COLORS, SEMANTIC_COLORS } from '../theme/tokens';

// Mock localStorage for Node test runner
beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      key: (index: number) => Object.keys(store)[index] || null,
      length: 0,
    } as Storage;
  }
});

const mockUser: User = {
  id: 'u1',
  name: 'Ahmet Yılmaz',
  email: 'ahmet@example.com',
  phone: '5551234567',
  address: 'İstanbul',
  role: 'customer',
  createdAt: new Date().toISOString()
};

const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'VİTRİFİYE & BANYO Lavabo Bataryası Krom',
    description: 'Pirinç gövde seramik kartuş batarya',
    imageUrl: '/placeholder.jpg',
    price: 1250,
    category: 'VİTRİFİYE & BANYO',
    subCategory: 'BATARYALAR',
    stock: 45,
    unit: 'Adet',
    minOrderQuantity: 1,
    sku: 'VIT-LAV-01'
  },
  {
    id: 'p2',
    name: 'SIZDIRMAZLIK & HIRDAVAT Teflon Bant 12mm x 10m',
    description: 'Yüksek yoğunluklu PTFE sızdırmazlık bandı',
    imageUrl: '/placeholder.jpg',
    price: 15,
    category: 'SIZDIRMAZLIK & HIRDAVAT',
    subCategory: 'SIZDIRMAZLIK VE YAPIŞTIRICI',
    stock: 250,
    unit: 'Rulo',
    minOrderQuantity: 10,
    sku: 'SIZ-TEF-12'
  }
];

const mockOrders: Order[] = [
  {
    id: 'o1',
    orderNumber: 'SIP-2026-001',
    customerId: 'u1',
    customerName: 'Ahmet Yılmaz',
    customerEmail: 'ahmet@example.com',
    customerPhone: '5551234567',
    customerAddress: 'İstanbul',
    items: [],
    subtotal: 2500,
    discount: 0,
    tax: 500,
    total: 2500,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockQuotes: Quote[] = [];

const defaultShoppingCatalogProps = {
  products: mockProducts,
  allProducts: mockProducts,
  cart: [],
  user: mockUser,
  search: <div>Search</div>,
  filters: <div>Filters</div>,
  query: '',
  total: 2,
  page: 1,
  pages: 1,
  pageSize: 24,
  view: 'grid' as const,
  onView: () => {},
  onPage: () => {},
  onPageSize: () => {},
  onReset: () => {},
  onLogin: () => {},
  onQuote: () => {},
  onBulk: () => {},
  getQuantity: () => 1,
  onQuantity: () => {},
  onAdd: () => {},
};

describe('GÖREV 7 — Ürün Kataloğu Ekranı: Kontrast, Taşma ve Token Kopması Doğrulama Testleri', () => {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Aktif Sekme & Seçili Kategori Pili Görünürlüğü ve Kontrastı
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Aktif Sekme & Kategori Pili Kontrastı (Görünmez Metin Bugı Tespiti ve Çözümü)', () => {

    it('CustomerPortal aktif "Ürün Kataloğu" sekmesi bg-base-surface ve text-text-primary ile yüksek kontrastlı render edilir', () => {
      const html = renderToString(
        <CustomerPortal
          currentUser={mockUser}
          products={mockProducts}
          orders={mockOrders}
          quotes={mockQuotes}
          activeTab="catalog"
          onRefresh={() => {}}
          onOpenAI={() => {}}
          onOpenAuth={() => {}}
        />
      );

      // Tab must NOT have broken 'bg-ui-primary text-white' causing invisible white-on-white text
      const catalogTabMatch = html.match(/id="tab-customer-catalog"[^>]*class="([^"]*)"/);
      expect(catalogTabMatch).toBeTruthy();
      const classNames = catalogTabMatch![1];
      
      expect(classNames).toContain('text-text-primary');
      expect(classNames).toContain('bg-base-surface');
      expect(classNames).not.toContain('bg-ui-primary text-white');
    });

    it('Kategori filtre pillerinde seçili durum bg-base-surface-2 text-text-primary ve shrink-0 ile taşmaya karşı dayanıklıdır', () => {
      const html = renderToString(
        <CustomerPortal
          currentUser={mockUser}
          products={mockProducts}
          orders={mockOrders}
          quotes={mockQuotes}
          activeTab="catalog"
          onRefresh={() => {}}
          onOpenAI={() => {}}
          onOpenAuth={() => {}}
        />
      );

      // Every category button must have shrink-0 to prevent narrow viewport squeezing/clipping
      expect(html).toContain('shrink-0');
      // Selected pill must use high-contrast token
      expect(html).toContain('bg-base-surface-2 text-text-primary border-border-strong shadow-xs font-bold');
      // SIZDIRMAZLIK & HIRDAVAT pill must be present
      expect(html).toContain('SIZDIRMAZLIK &amp; HIRDAVAT');
      expect(html).toContain('VİTRİFİYE &amp; BANYO');
    });

    it('Sekme çubuğunun sağındaki "Sepetim" butonu (#btn-cart-toggle) bg-info-fill text-white ile canlı ve görünürdür', () => {
      const html = renderToString(
        <CustomerPortal
          currentUser={mockUser}
          products={mockProducts}
          orders={mockOrders}
          quotes={mockQuotes}
          activeTab="catalog"
          onRefresh={() => {}}
          onOpenAI={() => {}}
          onOpenAuth={() => {}}
        />
      );

      const cartBtnMatch = html.match(/id="btn-cart-toggle"[^>]*class="([^"]*)"/);
      expect(cartBtnMatch).toBeTruthy();
      const classNames = cartBtnMatch![1];

      // Must be styled with info-fill and white text (Alpha Blue, not white-on-white box)
      expect(classNames).toContain('bg-info-fill');
      expect(classNames).toContain('text-white');
      expect(html).toContain('Sepetim');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ShoppingCatalog & ShoppingCheckout Tasarım Tokenı Doğrulaması
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Ürün Kataloğu ve Sepet Bileşenlerinde Token Entegrasyonu', () => {

    it('ShoppingCatalog görünüm değiştirici butonları (grid/table) bg-info-fill tokenı kullanır', () => {
      const htmlGrid = renderToString(
        <ShoppingCatalog {...defaultShoppingCatalogProps} view="grid" />
      );
      expect(htmlGrid).toContain('bg-info-fill text-white');
      expect(htmlGrid).not.toContain('bg-ui-primary text-white');

      const htmlTable = renderToString(
        <ShoppingCatalog {...defaultShoppingCatalogProps} view="table" />
      );
      expect(htmlTable).toContain('bg-info-fill text-white');
      expect(htmlTable).not.toContain('bg-ui-primary text-white');
    });

    it('ShoppingCheckout sepet çekmecesinde text-ui-primary yerine semantik token sınıfları kullanılır', () => {
      const html = renderToString(
        <ShoppingCheckout
          open={true}
          onClose={() => {}}
          cart={[{ product: mockProducts[0], quantity: 2 }]}
          user={mockUser}
          onLogin={() => {}}
          onQuantity={() => {}}
          onRemove={() => {}}
          onClear={() => {}}
          fields={{ name: 'Test', email: 'test@test.com', phone: '123', address: 'Adr', notes: '' }}
          onField={() => {}}
          onSite={() => {}}
          payment="bank_transfer"
          onPayment={() => {}}
          banks={[{ bankName: 'Ziraat', accountName: 'Alpha Ltd', iban: 'TR123', branch: 'Merkez' }]}
          bankIndex={0}
          onBank={() => {}}
          onCopy={() => {}}
          copied={null}
          subtotal={2500}
          tax={500}
          total={3000}
          busy={false}
          error=""
          onSubmit={() => {}}
        />
      );

      // Should not contain broken text-ui-primary
      expect(html).not.toContain('text-ui-primary');
      expect(html).toContain('text-info-text');
      expect(html).toContain('text-text-primary');
    });

    it('AuthModal giriş butonunda bg-info-fill kullanılır ve demo butonları bulunmaz', () => {
      const html = renderToString(
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          onLoginSuccess={() => {}}
          initialTab="login"
        />
      );

      expect(html).toContain('bg-info-fill');
      expect(html).not.toContain('bg-ui-primary');
      expect(html).not.toContain('admin123');
      expect(html).not.toContain('bayi123');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CSS ve Design Token Single Source of Truth Eşleşmesi
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Design Token Tutarlılığı (src/theme/tokens.ts Tek Doğruluk Kaynağı)', () => {

    it('index.css @theme bloğu --color-ui-primary değişkenini ve doğru semantik dark/light renkleri içerir', () => {
      const indexCss = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf-8');

      // Tokens from tokens.ts
      expect(indexCss).toContain('--color-ui-primary: var(--ui-primary);');
      expect(indexCss).toContain(`--color-success-dark: ${SEMANTIC_COLORS.success.textLight};`); // #1B5E20
      expect(indexCss).toContain(`--color-warning-dark: ${SEMANTIC_COLORS.warning.textLight};`); // #8A4F00
      expect(indexCss).toContain(`--color-info-dark: ${SEMANTIC_COLORS.info.textLight};`);       // #005C8F

      // Arbitrary non-token values must NOT exist
      expect(indexCss).not.toContain('#098B5E');
      expect(indexCss).not.toContain('#7F4600');
      expect(indexCss).not.toContain('#005284');
    });

    it('ui.css dosyası tokens.ts semantik değerleriyle birebir uyumludur', () => {
      const uiCss = fs.readFileSync(path.resolve(__dirname, '../components/ui/ui.css'), 'utf-8');

      expect(uiCss).toContain(`--ui-primary-dark: ${SEMANTIC_COLORS.success.textLight};`); // #1B5E20
      expect(uiCss).toContain(`--ui-warning-dark: ${SEMANTIC_COLORS.warning.textLight};`); // #8A4F00
      expect(uiCss).toContain(`--ui-info-dark: ${SEMANTIC_COLORS.info.textLight};`);       // #005C8F

      // Arbitrary non-token values must NOT exist
      expect(uiCss).not.toContain('#098B5E');
      expect(uiCss).not.toContain('#7F4600');
      expect(uiCss).not.toContain('#005284');
    });

    it('shopping.css ürün adı linki ve fiyatlandırma renklerinde green suiistimali önlenmiş ve semantik tokenlara bağlanmıştır', () => {
      const shoppingCss = fs.readFileSync(path.resolve(__dirname, '../components/customer/shopping.css'), 'utf-8');

      // Product name hover should use text-info-color
      expect(shoppingCss).toContain('.shopping-product-meta .ui-button-link:hover { color: var(--text-info-color); text-decoration: underline; }');
      // Price tag strong should use text-primary-color (not forced green)
      expect(shoppingCss).toContain('color: var(--text-primary-color);');
      expect(shoppingCss).not.toContain('color: var(--ui-primary);');
    });
  });

});
