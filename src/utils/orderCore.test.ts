import { describe, expect, it } from 'vitest';
import { prepareOrder } from './orderCore';

const product = { id: 'st-00001', name: 'Test Ürün', price: 125, stock: 8, unit: 'ADET', minOrderQuantity: 2, minStockAlert: 5 };

describe('atomik sipariş iş kuralları', () => {
  it('müşteri fiyatını yok sayıp katalog fiyatını kullanır', () => {
    const result = prepareOrder({ items: [{ productId: product.id, quantity: 2, unitPrice: 0.01 }], products: new Map([[product.id, product]]), isAdmin: false, requestedDiscount: 0 });
    expect(result.subtotal).toBe(250);
    expect(result.stockUpdates.get(product.id)?.after).toBe(6);
  });

  it('aynı ürün satırlarını birleştirip fazla satışı engeller', () => {
    expect(() => prepareOrder({ items: [{ productId: product.id, quantity: 5 }, { productId: product.id, quantity: 4 }], products: new Map([[product.id, product]]), isAdmin: false, requestedDiscount: 0 })).toThrow(/stok yetersiz/i);
  });

  it('kritik eşik geçişini işaretler', () => {
    const result = prepareOrder({ items: [{ productId: product.id, quantity: 3 }], products: new Map([[product.id, product]]), isAdmin: false, requestedDiscount: 0 });
    expect(result.stockUpdates.get(product.id)?.crossedLowStockThreshold).toBe(true);
  });

  it('asgari sipariş kuralını uygular', () => {
    expect(() => prepareOrder({ items: [{ productId: product.id, quantity: 1 }], products: new Map([[product.id, product]]), isAdmin: false, requestedDiscount: 0 })).toThrow(/asgari/i);
  });

  it('indirimi KDV matrahından düşer', () => {
    const result = prepareOrder({ items: [{ productId: product.id, quantity: 2, unitPrice: 100 }], products: new Map([[product.id, product]]), isAdmin: true, requestedDiscount: 10 });
    expect(result).toMatchObject({ subtotal: 200, discount: 10, tax: 38, total: 228 });
  });
});
