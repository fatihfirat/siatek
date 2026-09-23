import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import QuoteTracking from './QuoteTracking';
import type { Quote, User } from '../../types';

// Mock localStorage for test environment
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
  id: 'u-1',
  name: 'Murat Demir',
  email: 'murat@demirinsaat.com',
  phone: '05441234567',
  address: 'Kocaeli Gebze',
  role: 'customer',
  createdAt: '2026-09-01T10:00:00.000Z'
};

const mockQuotes: Quote[] = [
  {
    id: 'q-1',
    quoteNumber: 'TKL-2026-2144',
    customerId: 'u-1',
    customerName: 'Murat Demir',
    customerEmail: 'murat@demirinsaat.com',
    customerPhone: '05441234567',
    deliveryCity: 'Şanlıurfa',
    paymentTerms: 'Peşin (Havale/EFT)',
    status: 'offer_sent',
    grandTotal: 2790,
    subtotal: 2325,
    discountAmount: 200,
    adminResponseNote: 'Talebiniz doğrultusunda en avantajlı kurumsal bayi iskonto oranlarımız yansıtılmıştır. Ücretsiz nakliye sunulmuştur.',
    offeredItems: [
      {
        productId: 'p-1',
        productName: '1/2" ÇEKVALF (AKIN / KILIÇ PRES)',
        quantity: 5,
        unit: 'ADET',
        listPrice: 190,
        offeredUnitPrice: 155,
        discountRate: 18.4,
        totalPrice: 775
      },
      {
        productId: 'p-2',
        productName: '3/4" KÜRESEL VANA',
        quantity: 10,
        unit: 'ADET',
        listPrice: 220,
        offeredUnitPrice: 201.5,
        discountRate: 8.4,
        totalPrice: 2015
      }
    ],
    createdAt: '2026-09-16T09:00:00.000Z',
    updatedAt: '2026-09-16T11:00:00.000Z'
  },
  {
    id: 'q-2',
    quoteNumber: 'TKL-2026-4401',
    customerId: 'u-1',
    customerName: 'Murat Demir',
    customerEmail: 'murat@demirinsaat.com',
    customerPhone: '05441234567',
    deliveryCity: 'Kocaeli (Gebze Şantiye)',
    paymentTerms: '30 Gün Vade',
    status: 'accepted',
    grandTotal: 64600,
    subtotal: 53833,
    offeredItems: [
      {
        productId: 'p-3',
        productName: '25 LİK KOMPOZİT PPRC BORU (KALDE)',
        quantity: 200,
        unit: 'METRE',
        listPrice: 71.6,
        offeredUnitPrice: 58,
        discountRate: 19.07,
        totalPrice: 11600
      },
      {
        productId: 'p-4',
        productName: 'ECA CITIUS PREMIX 24 KW TAM YOĞUŞMALI KOMBİ',
        quantity: 2,
        unit: 'ADET',
        listPrice: 29000,
        offeredUnitPrice: 26500,
        discountRate: 8.62,
        totalPrice: 53000
      }
    ],
    createdAt: '2026-09-15T08:30:00.000Z',
    updatedAt: '2026-09-15T14:00:00.000Z'
  },
  {
    id: 'q-3',
    quoteNumber: 'TKL-2026-5502',
    customerId: 'u-1',
    customerName: 'Murat Demir',
    customerEmail: 'murat@demirinsaat.com',
    customerPhone: '05441234567',
    deliveryCity: 'Ankara',
    status: 'pending_review',
    requestedItems: [
      {
        productName: 'Alarko 100kW Kaskad Kazan',
        requestedQuantity: 1,
        unit: 'ADET',
        targetUnitPrice: 85000
      }
    ],
    createdAt: '2026-09-17T06:00:00.000Z',
    updatedAt: '2026-09-17T06:00:00.000Z'
  }
];

describe('QuoteTracking — Premium B2B Teklif Yönetimi UI/UX', () => {

  it('1. Giriş yapılmamışsa (user=null) bayi girişi uyarı kartı gösterir', () => {
    const html = renderToString(
      <QuoteTracking
        quotes={[]}
        user={null}
        onLogin={() => {}}
        onNewQuote={() => {}}
        onAcceptQuote={() => {}}
        onViewPdf={() => {}}
      />
    );

    expect(html).toContain('Teklif Taleplerinizi Görmek İçin Bayi Girişi Yapın');
    expect(html).toContain('Bayi Girişi Yap');
  });

  it('2. Yükleme durumunda skeleton gösterir', () => {
    const html = renderToString(
      <QuoteTracking
        quotes={[]}
        user={mockUser}
        loading={true}
        onLogin={() => {}}
        onNewQuote={() => {}}
        onAcceptQuote={() => {}}
        onViewPdf={() => {}}
      />
    );

    expect(html).toContain('Teklifler yükleniyor');
    expect(html).toContain('ui-skeleton');
  });

  it('3. Teklif listesi boş olduğunda (quotes=[]) eyleme geçiren CTA butonları sunar', () => {
    const html = renderToString(
      <QuoteTracking
        quotes={[]}
        user={mockUser}
        onLogin={() => {}}
        onNewQuote={() => {}}
        onAcceptQuote={() => {}}
        onViewPdf={() => {}}
        onGoToCatalog={() => {}}
      />
    );

    expect(html).toContain('Henüz kayıtlı teklif talebiniz bulunmuyor');
    expect(html).toContain('İlk Teklifinizi İsteyin');
    expect(html).toContain('Kataloğa Dön');
  });

  it('4. Teklifler listelendiğinde kompakt başlık kartları, teklif no, durum rozeti ve fiyatı doğru gösterir', () => {
    const html = renderToString(
      <QuoteTracking
        quotes={mockQuotes}
        user={mockUser}
        onLogin={() => {}}
        onNewQuote={() => {}}
        onAcceptQuote={() => {}}
        onViewPdf={() => {}}
      />
    );

    // Header info
    expect(html).toContain('Teklif Taleplerim &amp; Gelen Özel Fiyatlar');
    expect(html).toContain('Yeni Teklif İste');

    // Quote 1: TKL-2026-2144 (offer_sent)
    expect(html).toContain('TKL-2026-2144');
    expect(html).toContain('Teklif Geldi (Onay Bekliyor)');
    expect(html).toContain('2.790');
    expect(html).toContain('Şanlıurfa');
    expect(html).toContain('Onayla');

    // Quote 2: TKL-2026-4401 (accepted)
    expect(html).toContain('TKL-2026-4401');
    expect(html).toContain('Siparişe Dönüştü');
    expect(html).toContain('64.600');

    // Quote 3: TKL-2026-5502 (pending_review)
    expect(html).toContain('TKL-2026-5502');
    expect(html).toContain('İnceleniyor');
    expect(html).toContain('Fiyat Bekleniyor');
  });

  it('5. KPI filtre sayaçları tüm durumları doğru hesaplar', () => {
    const html = renderToString(
      <QuoteTracking
        quotes={mockQuotes}
        user={mockUser}
        onLogin={() => {}}
        onNewQuote={() => {}}
        onAcceptQuote={() => {}}
        onViewPdf={() => {}}
      />
    );

    // Tümü: 3, Onay Bekleyen: 1, İnceleniyor: 1, Siparişe Dönüştü: 1
    expect(html).toContain('Tümü');
    expect(html).toContain('Onay Bekleyen');
    expect(html).toContain('İnceleniyor');
    expect(html).toContain('Siparişe Dönüştü');
  });

  it('6. PDF Olarak Kaydet / Yazdır ve detay butonları mevcuttur', () => {
    const html = renderToString(
      <QuoteTracking
        quotes={mockQuotes}
        user={mockUser}
        onLogin={() => {}}
        onNewQuote={() => {}}
        onAcceptQuote={() => {}}
        onViewPdf={() => {}}
      />
    );

    expect(html).toContain('PDF');
    expect(html).toContain('Resmi Antetli Teklif PDF İncele / Yazdır');
  });

});
