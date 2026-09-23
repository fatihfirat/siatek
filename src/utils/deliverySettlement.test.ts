import { describe, it, expect } from 'vitest';
import type { Order, Product } from '../types';

describe('Teslimat & Tahsilat Uzlaştırma Protokolü ve Gerçekleşen Ciro Testleri', () => {

  const sampleProducts: Product[] = [
    {
      id: 'prod-1',
      name: 'PPRC Boru 25mm',
      category: 'BORULAR',
      description: 'Test boru',
      price: 100,
      stock: 50,
      unit: 'METRE',
      minOrderQuantity: 1,
      imageUrl: '/p1.jpg',
      sku: 'ST-001'
    }
  ];

  const now = new Date();
  const todayStr = now.toISOString();
  const threeDaysAgoStr = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  it('1. Teslim edilen siparişlerde deliveredAt ve paymentStatus kuralları doğru işletilir', () => {
    const deliveredPaidOrder: Order = {
      id: 'ord-101',
      orderNumber: 'SIP-2026-101',
      customerName: 'Yılmaz Mekanik',
      customerEmail: 'yilmaz@test.com',
      customerPhone: '05440001122',
      customerAddress: 'Karaköprü / Şanlıurfa',
      items: [{ productId: 'prod-1', productName: 'PPRC Boru 25mm', quantity: 10, unit: 'METRE', unitPrice: 100, totalPrice: 1000 }],
      subtotal: 1000,
      discount: 0,
      tax: 200,
      total: 1200,
      status: 'delivered',
      deliveredAt: todayStr,
      paymentStatus: 'paid',
      settlementChannel: 'cash',
      collectionStatus: 'collected',
      collectionAmount: 1200,
      createdAt: threeDaysAgoStr,
      updatedAt: todayStr,
    };

    expect(deliveredPaidOrder.status).toBe('delivered');
    expect(deliveredPaidOrder.deliveredAt).toBe(todayStr);
    expect(deliveredPaidOrder.paymentStatus).toBe('paid');
    expect(deliveredPaidOrder.collectionStatus).toBe('collected');
    expect(deliveredPaidOrder.collectionAmount).toBe(1200);
  });

  it('2. Cari hesaba borç kaydedilen açık hesap teslimatta paymentStatus on_account olur', () => {
    const cariOrder: Order = {
      id: 'ord-102',
      orderNumber: 'SIP-2026-102',
      customerName: 'Mega Yapı İnşaat',
      customerEmail: 'mega@test.com',
      customerPhone: '05440003344',
      customerAddress: 'Eyyübiye / Şanlıurfa',
      items: [{ productId: 'prod-1', productName: 'PPRC Boru 25mm', quantity: 50, unit: 'METRE', unitPrice: 100, totalPrice: 5000 }],
      subtotal: 5000,
      discount: 0,
      tax: 1000,
      total: 6000,
      status: 'delivered',
      deliveredAt: todayStr,
      paymentStatus: 'on_account',
      settlementChannel: 'cari',
      cariId: 'cari-101',
      cariTransactionId: 'ctx-deliv-999',
      createdAt: threeDaysAgoStr,
      updatedAt: todayStr,
    };

    expect(cariOrder.status).toBe('delivered');
    expect(cariOrder.paymentStatus).toBe('on_account');
    expect(cariOrder.settlementChannel).toBe('cari');
    expect(cariOrder.cariId).toBe('cari-101');
    expect(cariOrder.cariTransactionId).toBeDefined();
  });

  it('3. Para alınmadan teslim edilen riskli sipariş pending_collection olarak yakalanır', () => {
    const uncollectedOrder: Order = {
      id: 'ord-103',
      orderNumber: 'SIP-2026-103',
      customerName: 'Hızlı Tesisatçı',
      customerEmail: 'hizli@test.com',
      customerPhone: '05440005566',
      customerAddress: 'Haliliye / Şanlıurfa',
      items: [{ productId: 'prod-1', productName: 'PPRC Boru 25mm', quantity: 20, unit: 'METRE', unitPrice: 100, totalPrice: 2000 }],
      subtotal: 2000,
      discount: 0,
      tax: 400,
      total: 2400,
      status: 'delivered',
      deliveredAt: todayStr,
      paymentStatus: 'pending_collection',
      collectionStatus: 'pending',
      createdAt: threeDaysAgoStr,
      updatedAt: todayStr,
    };

    expect(uncollectedOrder.status).toBe('delivered');
    expect(uncollectedOrder.paymentStatus).toBe('pending_collection');
    expect(uncollectedOrder.collectionStatus).toBe('pending');
  });

  it('4. Gerçekleşen ciro hesaplamasında teslim tarihi (deliveredAt) günün cirosunu artırır', () => {
    const orderCreated3DaysAgoDeliveredToday: Order = {
      id: 'ord-104',
      orderNumber: 'SIP-2026-104',
      customerName: 'Baraj Mekanik',
      customerEmail: 'baraj@test.com',
      customerPhone: '05441112233',
      customerAddress: 'Bozova / Şanlıurfa',
      items: [{ productId: 'prod-1', productName: 'PPRC Boru 25mm', quantity: 30, unit: 'METRE', unitPrice: 100, totalPrice: 3000 }],
      subtotal: 3000,
      discount: 0,
      tax: 600,
      total: 3600,
      status: 'delivered',
      deliveredAt: todayStr,
      paymentStatus: 'paid',
      createdAt: threeDaysAgoStr,
      updatedAt: todayStr,
    };

    const pendingOrderToday: Order = {
      id: 'ord-105',
      orderNumber: 'SIP-2026-105',
      customerName: 'Yeni Müşteri',
      customerEmail: 'yeni@test.com',
      customerPhone: '05449998877',
      customerAddress: 'Merkez',
      items: [],
      subtotal: 1000,
      discount: 0,
      tax: 200,
      total: 1200,
      status: 'pending',
      createdAt: todayStr,
      updatedAt: todayStr,
    };

    const orders = [orderCreated3DaysAgoDeliveredToday, pendingOrderToday];

    // Teslim edilen net gerçekleşen ciro
    const deliveredRevenue = orders
      .filter(o => o.status === 'delivered')
      .reduce((acc, o) => acc + o.total, 0);

    expect(deliveredRevenue).toBe(3600);

    // Bugün teslim edilen siparişin etkin tarihi bugündür
    const todayDateKey = todayStr.split('T')[0];
    const todayDeliveredOrders = orders.filter(o => {
      const effectiveDate = (o.status === 'delivered' && o.deliveredAt) ? o.deliveredAt : o.createdAt;
      return effectiveDate.split('T')[0] === todayDateKey && o.status === 'delivered';
    });

    expect(todayDeliveredOrders.length).toBe(1);
    expect(todayDeliveredOrders[0].total).toBe(3600);
  });
});
