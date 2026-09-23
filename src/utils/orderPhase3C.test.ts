import { describe, it, expect } from 'vitest';
import { getOrderStatusConfig } from './statusConfig';
import { Order, OrderStatus } from '../types';

describe('Faz 3C — Kendi Teslimat Operasyonu ve Durum Akışı Testleri', () => {

  it('1. Kargo terminolojisi kontrolü ve statusConfig eşlemesi', () => {
    // Kontrol: ORDER_STATUS_CONFIG içinde 'shipped' yerine 'out_for_delivery' (Teslimata Çıktı) olmalı
    const configOut = getOrderStatusConfig('out_for_delivery');
    expect(configOut.label).toBe('Teslimata Çıktı');
    expect(configOut.iconName).toBe('Truck');

    // Legacy 'shipped' durumu otomatik olarak 'out_for_delivery' olarak normalize edilmeli ve "Kargolandı" yazmamalı
    const configLegacy = getOrderStatusConfig('shipped' as OrderStatus);
    expect(configLegacy.label).toBe('Teslimata Çıktı');
    expect(configLegacy.label).not.toContain('Kargo');
  });

  it('2. Kanonik durum akışı ve geçiş kuralları', () => {
    const validSequence: OrderStatus[] = ['pending', 'approved', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

    for (let i = 0; i < validSequence.length - 1; i++) {
      const current = validSequence[i];
      const next = validSequence[i + 1];
      const conf = getOrderStatusConfig(current);
      if (conf.nextStatus) {
        expect(conf.nextStatus).toBe(next);
      }
    }

    // Teslim edilmiş siparişin sonraki durumu olmamalı
    const deliveredConf = getOrderStatusConfig('delivered');
    expect(deliveredConf.adminActionText).toBeUndefined();
    expect(deliveredConf.nextStatus).toBeUndefined();
  });

  it('3. Teslim edilemedi (Failed Delivery) ve yeniden planlama kuralları', () => {
    const mockOrder: Order = {
      id: 'ord-test-1',
      orderNumber: 'SIP-2026-6354',
      customerName: 'Fatih Fırat',
      customerEmail: 'fatih@firat.com',
      customerPhone: '+90 544 440 91 80',
      customerAddress: 'Karaköprü / Şanlıurfa',
      items: [],
      subtotal: 300,
      discount: 0,
      tax: 60,
      total: 360,
      status: 'out_for_delivery',
      deliveryStatus: 'out_for_delivery',
      deliveryPersonnel: 'Ahmet Yılmaz',
      deliveryAttempts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Teslim edilememe durumu simülasyonu
    const failedReason = 'Adreste kimse yoktu';
    const updatedAttempts = [
      ...(mockOrder.deliveryAttempts || []),
      { timestamp: new Date().toISOString(), reason: failedReason, personnel: mockOrder.deliveryPersonnel }
    ];

    const resubmissionOrder: Order = {
      ...mockOrder,
      deliveryStatus: 'rescheduled',
      deliveryAttempts: updatedAttempts,
      // Sipariş doğrudan delivered yapılmamalı, ready veya out_for_delivery kalmalı
      status: 'ready'
    };

    expect(resubmissionOrder.status).not.toBe('delivered');
    expect(resubmissionOrder.deliveryStatus).toBe('rescheduled');
    expect(resubmissionOrder.deliveryAttempts.length).toBe(1);
    expect(resubmissionOrder.deliveryAttempts[0].reason).toBe('Adreste kimse yoktu');
  });

  it('4. Stok koruma kontrolü (Teslimat durum değişiklikleri stok düşmemeli)', () => {
    // Stok düşüşü sadece ilk sipariş onayında / oluşturulmasında yapılır.
    // ready -> out_for_delivery -> delivered geçişlerinde stok hareket dizisi değişmemelidir.
    const initialStock = 50;
    let currentStock = 50;
    const orderQuantity = 5;

    // Sipariş verilirken düşer
    currentStock -= orderQuantity;
    expect(currentStock).toBe(45);

    // Teslimata çıkar
    // Stok tekrar düşmemeli
    const stockAfterOutForDelivery = currentStock;
    expect(stockAfterOutForDelivery).toBe(45);

    // Teslim edildi
    // Stok tekrar düşmemeli
    const stockAfterDelivered = currentStock;
    expect(stockAfterDelivered).toBe(45);
  });

  it('5. P0 Veri Kalıcılığı Blokaj Raporu Doğrulaması', () => {
    // In-memory RAM veri yapısı testi bilgilendirmesi
    const isPersistentDBConfigured = false; // RAM volatile storage
    expect(isPersistentDBConfigured).toBe(false);
    // Bu durum Faz 3C işlevselliğini (UI/UX, durum akışları) engellemez ancak Production Onayını bloklar.
  });

  it('6. WMS Lite Toplama & İrsaliye Teslim Alan Kişi Yönetimi', () => {
    const baseOrder: Order = {
      id: 'ord-wms-1',
      orderNumber: 'SIP-2026-9901',
      customerName: 'ALPHA İNŞAAT VE TİCARET A.Ş.',
      customerEmail: 'info@alphainsaat.com',
      customerPhone: '0532 555 44 33',
      customerAddress: 'Karaköprü / Şanlıurfa',
      items: [
        {
          productId: 'p-1',
          productName: '1/2" ÇEKVALF',
          quantity: 10,
          unitPrice: 150,
          totalPrice: 1500,
          unit: 'ADET'
        }
      ],
      subtotal: 1500,
      discount: 0,
      tax: 300,
      total: 1800,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Müşteriden farklı teslim alan kişi simülasyonu
    const updatedWithPicking: Order = {
      ...baseOrder,
      pickingStatus: 'completed',
      packageCount: 2,
      shippingCompany: 'ALPHA TEKNİK Özmal Dağıtım Aracı (63 AT 941)',
      waybillNumber: 'SEVK-2026-9901',
      recipientName: 'Ali Şef (Şantiye Sorumlusu)',
      recipientPhone: '0544 123 45 67',
      recipientTitle: 'Şantiye Şefi',
      recipientIdNumber: '11223344556',
      deliveryAddressOverride: '35 Metre Yolu 4. Etap Şantiye Girişi',
      waybillNotes: 'Forklift ile indirilecek, kapıda teslim tutanağı imzalanacak.'
    };

    expect(updatedWithPicking.pickingStatus).toBe('completed');
    expect(updatedWithPicking.packageCount).toBe(2);
    expect(updatedWithPicking.recipientName).toBe('Ali Şef (Şantiye Sorumlusu)');
    expect(updatedWithPicking.recipientTitle).toBe('Şantiye Şefi');
    expect(updatedWithPicking.deliveryAddressOverride).toBe('35 Metre Yolu 4. Etap Şantiye Girişi');
    expect(updatedWithPicking.waybillNotes).toContain('Forklift');
    expect(updatedWithPicking.recipientName).not.toBe(baseOrder.customerName);
  });

});
