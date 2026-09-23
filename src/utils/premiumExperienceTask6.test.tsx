import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

import ShoppingCatalog from '../components/customer/ShoppingCatalog';
import CustomerPortal from '../components/customer/CustomerPortal';
import OrderTracking from '../components/customer/OrderTracking';
import AdminPortal from '../components/admin/AdminPortal';
import AdminWorkspaceShell from '../components/admin/AdminWorkspaceShell';
import DriverDispatchRouteModal from '../components/admin/DriverDispatchRouteModal';
import ProductFastEditTable from '../components/admin/ProductFastEditTable';
import NotificationCenter from '../components/NotificationCenter';
import { Product, Order, Quote, User } from '../types';

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
    name: 'PPRC Doğalgaz Borusu 20mm',
    description: 'PPRC Doğalgaz Borusu',
    imageUrl: '/placeholder.jpg',
    price: 150,
    category: 'BORULAR',
    stock: 25,
    unit: 'Metre',
    minOrderQuantity: 1,
    sku: 'BORU-20'
  },
  {
    id: 'p2',
    name: 'Kombisi E.C.A Proteus Plus',
    description: 'Kombisi E.C.A Proteus Plus',
    imageUrl: '/placeholder.jpg',
    price: 18500,
    category: 'ISITMA',
    stock: 2,
    unit: 'Adet',
    minOrderQuantity: 1,
    sku: 'KMB-ECA'
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

const mockQuotes: Quote[] = [
  {
    id: 'q1',
    quoteNumber: 'TEK-2026-001',
    customerId: 'u1',
    customerName: 'Ahmet Yılmaz',
    customerEmail: 'ahmet@example.com',
    customerPhone: '5551234567',
    requestedItems: [],
    offeredItems: [],
    subtotal: 10000,
    discount: 500,
    tax: 1900,
    total: 11400,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

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

describe('GÖREV 6 — Premium Deneyim: Bilişsel Yük, Nefes Alanı, Hareket Testleri', () => {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Birincil Buton Sayısı Sınırı (Her ana ekranda dolgulu buton sayısı <= 3)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Görsel Hiyerarşi: Birincil Dolgulu Buton Sayısı Doğrulaması', () => {
    
    it('ShoppingCatalog ekranında araç çubuğunda ve genel yapıda dolgulu birincil buton sayısı <= 3', () => {
      const html = renderToString(
        <ShoppingCatalog {...defaultShoppingCatalogProps} />
      );

      const filledAccentButtons = (html.match(/class="[^"]*(?:bg-brand-orange|bg-success-fill|bg-ui-primary)[^"]*"/g) || []).length;
      expect(filledAccentButtons).toBeLessThanOrEqual(3);
    });

    it('AdminPortal ana sayfasında (Hızlı Operasyon Masası) dolgulu birincil buton sayısı <= 3', () => {
      const html = renderToString(
        <AdminPortal
          products={mockProducts}
          orders={mockOrders}
          quotes={mockQuotes}
          activeTab="home"
          onRefresh={() => {}}
          onOpenAI={() => {}}
        />
      );

      const filledAccentButtons = (html.match(/class="[^"]*(?:bg-brand-orange|bg-success-fill|bg-primary-fill)[^"]*"/g) || []).length;
      expect(filledAccentButtons).toBeLessThanOrEqual(3);
    });

    it('ProductFastEditTable araç çubuğunda tek birincil aksiyon "Yeni Ürün" butonudur (Dolgulu buton <= 3)', () => {
      const html = renderToString(
        <ProductFastEditTable
          products={mockProducts}
          onRefresh={() => {}}
          onOpenAddModal={() => {}}
          onEditProduct={() => {}}
        />
      );

      const filledButtons = (html.match(/class="[^"]*bg-success-fill[^"]*"/g) || []).length;
      expect(filledButtons).toBeLessThanOrEqual(3);
      expect(html).toContain('Yeni Ürün');
      expect(html).toContain('+50 İkmal');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Aksiyona Yönlendiren Boş Durumlar (Empty States with Actionable CTAs)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Eyleme Geçiren Boş Durumlar (Actionable Empty States)', () => {
    
    it('ShoppingCatalog arama/filtre sonucu boş olduğunda (total: 0) "Filtreleri Temizle" ve "Özel Teklif İste" CTA butonları sunar', () => {
      const html = renderToString(
        <ShoppingCatalog
          {...defaultShoppingCatalogProps}
          products={[]}
          total={0}
          query="olmayan_urun"
        />
      );

      expect(html).toContain('Aradığınız kriterlere uygun ürün bulunamadı');
      expect(html).toContain('Filtreleri Temizle');
      expect(html).toContain('Özel Teklif İste');
    });

    it('CustomerPortal teklifler sekmesi boş olduğunda "İlk Teklifinizi İsteyin" ve "Kataloğa Dön" butonları sunar', () => {
      const html = renderToString(
        <CustomerPortal
          currentUser={mockUser}
          products={mockProducts}
          orders={mockOrders}
          quotes={[]}
          activeTab="quotes"
          onRefresh={() => {}}
          onOpenAI={() => {}}
          onOpenAuth={() => {}}
        />
      );

      expect(html).toContain('Henüz kayıtlı teklif talebiniz bulunmuyor');
      expect(html).toContain('İlk Teklifinizi İsteyin');
      expect(html).toContain('Kataloğa Dön');
    });

    it('OrderTracking boş durumda eyleme geçiren "Kataloğu İncele" CTA butonu sunar', () => {
      const html = renderToString(
        <OrderTracking
          orders={[]}
          user={mockUser}
          onRetry={() => {}}
          onLogin={() => {}}
        />
      );

      expect(html).toContain('Henüz siparişiniz yok');
      expect(html).toContain('Kataloğu İncele');
    });

    it('ProductFastEditTable boş durumda "Filtreleri Temizle" ve "Yeni Ürün Ekle" CTA butonları sunar', () => {
      const html = renderToString(
        <ProductFastEditTable
          products={[]}
          onRefresh={() => {}}
          onOpenAddModal={() => {}}
          onEditProduct={() => {}}
        />
      );

      expect(html).toContain('Aranan kriterlere uygun ürün bulunamadı');
      expect(html).toContain('Yeni Ürün Ekle');
    });

    it('NotificationCenter, CariManagementDashboard ve EInvoiceDashboard boş durumlarında eyleme geçiren CTA butonları sunar', () => {
      const notifHtml = renderToString(
        <NotificationCenter
          isOpen={true}
          onClose={() => {}}
          notifications={[]}
          currentRole="admin"
          onMarkAllRead={() => {}}
          onMarkRead={() => {}}
        />
      );
      expect(notifHtml).toContain('Görüntülenecek bildirim bulunamadı.');
      expect(notifHtml).toContain('Pencereyi Kapat');

      const cariSrc = fs.readFileSync(path.resolve(__dirname, '../components/admin/CariFinanceWorkspace.tsx'), 'utf-8');
      expect(cariSrc).toContain('Eşleşen cari bulunamadı');
      expect(cariSrc).toContain('Yeni cari oluştur');
      expect(cariSrc).toContain('Filtreleri temizle');

      const invoiceSrc = fs.readFileSync(path.resolve(__dirname, '../components/admin/EInvoiceDashboard.tsx'), 'utf-8');
      expect(invoiceSrc).toContain('E-Fatura Kaydı Bulunamadı');
      expect(invoiceSrc).toContain('Yeni E-Fatura Düzenle');
      expect(invoiceSrc).toContain('Filtreleri Temizle');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Kullanıcının 4 Özel Şartının Doğrulaması
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Kullanıcı Özel Şartları Doğrulaması', () => {

    it('(1) CustomerPortal aktif sekme / pil kontrastı "text-slate-950 font-bold" sınıfı ile yüksek kontrasta sahiptir', () => {
      const html = renderToString(
        <CustomerPortal
          currentUser={mockUser}
          products={mockProducts}
          orders={mockOrders}
          quotes={mockQuotes}
          activeTab="quotes"
          onRefresh={() => {}}
          onOpenAI={() => {}}
          onOpenAuth={() => {}}
        />
      );

      expect(html).toContain('text-slate-950 font-bold');
    });

    it('(1) Kategori pilleri yatay kaydırma ve kenar taşması için .ui-scroll-pills-container ve .ui-scroll-fade-edge ile sarılmıştır', () => {
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

      expect(html).toContain('ui-scroll-pills-container');
      expect(html).toContain('ui-scroll-pills');
      expect(html).toContain('ui-scroll-fade-edge');
    });

    it('(1) #1B5E20, #8A4F00, #005C8F semantik renkleri design token olarak CSS dosyalarına tanımlanmıştır', () => {
      const indexCss = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf-8');
      const uiCss = fs.readFileSync(path.resolve(__dirname, '../components/ui/ui.css'), 'utf-8');

      expect(indexCss).toContain('#1B5E20');
      expect(indexCss).toContain('#8A4F00');
      expect(indexCss).toContain('#005C8F');

      expect(uiCss).toContain('#1B5E20');
      expect(uiCss).toContain('#8A4F00');
      expect(uiCss).toContain('#005C8F');
    });

    it('(2) pendingOrdersCount > 0 durumundaki küçük animate-pulse göstergesi korunmuştur', () => {
      const html = renderToString(
        <AdminPortal
          products={mockProducts}
          orders={mockOrders}
          quotes={mockQuotes}
          activeTab="home"
          onRefresh={() => {}}
          onOpenAI={() => {}}
        />
      );

      expect(html).toContain('animate-pulse');
      expect(html).toContain('w-2 h-2 rounded-full bg-warning-fill animate-pulse');
    });

    it('(3) Yönetim ayarları ana masada tekrarlanmaz ve sol menü altında gruplanır', () => {
      const html = renderToString(
        <AdminPortal
          products={mockProducts}
          orders={mockOrders}
          quotes={mockQuotes}
          activeTab="home"
          onRefresh={() => {}}
          onOpenAI={() => {}}
        />
      );

      // Check that current grouped operational navigation exists
      expect(html).toContain('Satış &amp; Sipariş');
      expect(html).toContain('Finans &amp; Ödeme');
      expect(html).toContain('Stok &amp; Raporlar');
      expect(html).toContain('Operasyon &amp; Yönetim');

      // Check current operation modules
      expect(html).toContain('Şoför Sevkiyat');
      expect(html).toContain('WMS Toplama');
      expect(html).not.toContain('Kullanıcı Rolleri');
      expect(html).not.toContain('Firma Ayarları');

      const shellHtml = renderToString(
        <AdminWorkspaceShell
          activeTab="settings"
          onTabChange={() => {}}
          onOpenAI={() => {}}
          onOpenNotifications={() => {}}
          currentUser={{ ...mockUser, role: 'admin' }}
          onLogout={() => {}}
        >
          <AdminPortal
            products={mockProducts}
            orders={mockOrders}
            quotes={mockQuotes}
            activeTab="settings"
            onRefresh={() => {}}
            onOpenAI={() => {}}
          />
        </AdminWorkspaceShell>
      );
      expect(shellHtml).toContain('Ayarlar');
      expect(shellHtml).toContain('Firma Ayarları');
      expect(shellHtml).toContain('Kullanıcı &amp; Roller');
    });

    it('(4) Sayfa ve sekme geçişleri için .ui-tab-fade ve .ui-page-transition sınıfları entegre edilmiştir', () => {
      const catalogHtml = renderToString(
        <ShoppingCatalog {...defaultShoppingCatalogProps} />
      );
      expect(catalogHtml).toContain('ui-tab-fade');

      const orderHtml = renderToString(
        <OrderTracking
          orders={mockOrders}
          user={mockUser}
          onRetry={() => {}}
          onLogin={() => {}}
        />
      );
      expect(orderHtml).toContain('ui-tab-fade');
    });

    it('(5) DriverDispatchRouteModal 3 farklı sekmeyi ve doğru varsayılan görünümleri (preparation, dispatch, map) ayrı ayrı render eder', () => {
      // 1. Teslimat Hazırlığı & Paketleme sekmesi
      const prepHtml = renderToString(
        <DriverDispatchRouteModal
          isOpen={true}
          onClose={() => {}}
          orders={mockOrders}
          initialTab="preparation"
        />
      );
      expect(prepHtml).toContain('Teslimat Hazırlığı &amp; Paketleme');
      expect(prepHtml).toContain('Depo Çeki Listesi &amp; Malzeme Hazırlık Kontrolü');
      expect(prepHtml).toContain('Sevkiyat Ref No');

      // 2. Şoför Atama & Rota Çizelgesi sekmesi
      const dispatchHtml = renderToString(
        <DriverDispatchRouteModal
          isOpen={true}
          onClose={() => {}}
          orders={mockOrders}
          initialTab="dispatch"
        />
      );
      expect(dispatchHtml).toContain('Şoför Atama &amp; Rota Çizelgesi');
      expect(dispatchHtml).toContain('Özmal Araç / Plaka:');
      expect(dispatchHtml).toContain('Çizelgeyi Yazdır (A4)');

      // 3. Canlı Sevkiyat Haritası & Şantiyeler sekmesi
      const mapHtml = renderToString(
        <DriverDispatchRouteModal
          isOpen={true}
          onClose={() => {}}
          orders={mockOrders}
          initialTab="map"
        />
      );
      expect(mapHtml).toContain('Canlı Şantiye Sevkiyat Haritası');
      expect(mapHtml).toContain('Navigasyonda Aç');
    });
  });
});
