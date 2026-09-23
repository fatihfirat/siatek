import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import AdminPortal from '../components/admin/AdminPortal';
import OverviewMetricsBar from '../components/common/OverviewMetricsBar';
import { Product, Order, Quote } from '../types';

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

describe('GÖREV 4 — Bilgi Mimarisi & Tekrar Giderilme Doğrulama Testleri', () => {

  it('1. Paylaşılan OverviewMetricsBar bileşeni ciro ve ürün sayısını doğru hesaplar', () => {
    const html = renderToString(
      <OverviewMetricsBar
        products={mockProducts}
        orders={mockOrders}
      />
    );

    expect(html).toContain('Toplam Sipariş &amp; Ciro');
    expect(html).toContain('2.500'); // 2500 TL formatted
    expect(html).toContain('Aktif Ürün Kataloğu &amp; Fiyatlar');
    expect(html).toContain('2'); // 2 Ürün Tanımlı
  });

  it('2. activeTab === "home" iken Hızlı Operasyon Masası ve Dashboard blokları eksiksiz render edilir', () => {
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

    expect(html).toContain('ALPHA HIZLI OPERASYON MASASI');
    expect(html).toContain('Bekleyen Aksiyonlar');
    expect(html).toContain('Toplam Sipariş &amp; Ciro');
    expect(html).toContain('Aktif Ürün Kataloğu &amp; Fiyatlar');
    expect(html).toContain('Hızlı Satış &amp; Barkod');
    expect(html).toContain('WMS Toplama');
    expect(html).not.toContain('Gelen Siparişler &amp; Sevkiyat Yönetimi');
  });

  it('3. activeTab === "products" (Ürünler) sekmesinde Hızlı Operasyon Masası ve Overview blokları ASLA render EDİLMEZ', () => {
    const html = renderToString(
      <AdminPortal
        products={mockProducts}
        orders={mockOrders}
        quotes={mockQuotes}
        activeTab="products"
        onRefresh={() => {}}
        onOpenAI={() => {}}
      />
    );

    // Tekrar eden blokların bulunmadığını teyit et
    expect(html).not.toContain('ALPHA HIZLI OPERASYON MASASI');
    expect(html).not.toContain('Bekleyen Aksiyonlar');
    expect(html).not.toContain('card-total-orders-island');
    expect(html).not.toContain('card-active-products-island');

    // Ürünler sekmesinin kendi özgün içeriğinin render edildiğini doğrula
    expect(html).toContain('Ürün &amp; Fiyat Yönetim Masası');
    expect(html).toContain('PPRC Doğalgaz Borusu 20mm');
  });

  it('4. activeTab === "pos" (Satış/POS) sekmesinde Hızlı Operasyon Masası ve Overview blokları ASLA render EDİLMEZ', () => {
    const html = renderToString(
      <AdminPortal
        products={mockProducts}
        orders={mockOrders}
        quotes={mockQuotes}
        activeTab="pos"
        onRefresh={() => {}}
        onOpenAI={() => {}}
      />
    );

    // Tekrar eden blokların bulunmadığını teyit et
    expect(html).not.toContain('ALPHA HIZLI OPERASYON MASASI');
    expect(html).not.toContain('Bekleyen Aksiyonlar');
    expect(html).not.toContain('card-total-orders-island');
    expect(html).not.toContain('card-active-products-island');

    // POS sekmesinin kendi özgün içeriğinin render edildiğini doğrula
    expect(html).toContain('Hızlı Satış / POS Terminali');
  });

  it('5. activeTab === "orders" (Siparişler) sekmesinde Hızlı Operasyon Masası ve Overview blokları ASLA render EDİLMEZ', () => {
    const html = renderToString(
      <AdminPortal
        products={mockProducts}
        orders={mockOrders}
        quotes={mockQuotes}
        activeTab="orders"
        onRefresh={() => {}}
        onOpenAI={() => {}}
      />
    );

    // Tekrar eden blokların bulunmadığını teyit et
    expect(html).not.toContain('ALPHA HIZLI OPERASYON MASASI');
    expect(html).not.toContain('Bekleyen Aksiyonlar');
    expect(html).not.toContain('card-total-orders-island');
    expect(html).not.toContain('card-active-products-island');

    // Siparişler sekmesinin kendi özgün içeriğinin render edildiğini doğrula
    expect(html).toContain('Gelen Siparişler');
  });

});
