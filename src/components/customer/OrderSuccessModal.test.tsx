import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { OrderSuccessModal } from './OrderSuccessModal';
import { Order } from '../../types';

// Mock audio and confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}));

vi.mock('../../lib/audio', () => ({
  playNotificationSound: vi.fn()
}));

const mockOrder: Order = {
  id: 'ord-123',
  orderNumber: 'SIP-2026-9190',
  customerName: 'Ahmet Yılmaz (Yılmaz Tesisat)',
  customerEmail: 'ahmet@example.com',
  customerPhone: '5551234567',
  customerAddress: 'Kadıköy, İstanbul',
  items: [
    {
      productId: 'p1',
      productName: 'PPRC Doğalgaz Borusu 20mm',
      quantity: 10,
      unit: 'Metre',
      unitPrice: 150,
      totalPrice: 1500,
      note: 'Dış cephe için'
    },
    {
      productId: 'p2',
      productName: 'Kombisi E.C.A Proteus Plus',
      quantity: 1,
      unit: 'Adet',
      unitPrice: 750,
      totalPrice: 750
    }
  ],
  subtotal: 2250,
  discount: 0,
  tax: 0,
  total: 2250,
  status: 'pending',
  paymentMethod: 'bank_transfer',
  createdAt: '2026-09-17T09:18:00Z',
  updatedAt: '2026-09-17T09:18:00Z'
};

describe('OrderSuccessModal', () => {
  it('returns null when isOpen is false', () => {
    const html = renderToString(
      <OrderSuccessModal
        isOpen={false}
        order={mockOrder}
        onClose={vi.fn()}
        onGoToOrders={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('returns null when order is null', () => {
    const html = renderToString(
      <OrderSuccessModal
        isOpen={true}
        order={null}
        onClose={vi.fn()}
        onGoToOrders={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renders order number, formatted total, and bank transfer info', () => {
    const html = renderToString(
      <OrderSuccessModal
        isOpen={true}
        order={mockOrder}
        onClose={vi.fn()}
        onGoToOrders={vi.fn()}
        onViewPdf={vi.fn()}
        onUploadReceipt={vi.fn()}
        onShareWhatsApp={vi.fn()}
      />
    );

    expect(html).toContain('SIP-2026-9190');
    expect(html).toContain('Teşekkürler, Siparişiniz Kaydedildi!');
    expect(html).toContain('Banka Havalesi / EFT Bilgileri');
    expect(html).toContain('Siparişlerime Git &amp; Takip Et');
    expect(html).toContain('Sipariş PDF İndir');
    expect(html).toContain('WhatsApp ile Paylaş');
    expect(html).toContain('Dekont Yükle &amp; Bildir');
    expect(html).toContain('Kadıköy, İstanbul');
  });

  it('renders different payment method correctly for credit card', () => {
    const cardOrder: Order = {
      ...mockOrder,
      paymentMethod: 'credit_card'
    };

    const html = renderToString(
      <OrderSuccessModal
        isOpen={true}
        order={cardOrder}
        onClose={vi.fn()}
        onGoToOrders={vi.fn()}
      />
    );

    expect(html).toContain('Kredi Kartı / Online Ödeme');
    expect(html).not.toContain('Banka Havalesi / EFT Bilgileri');
  });
});
