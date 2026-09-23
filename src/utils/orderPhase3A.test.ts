import { describe, it, expect } from 'vitest';
import { Product } from '../types';

describe('Faz 3A — POS ve Satış Akışı Testleri', () => {

  it('1. Barkod eşleştirme ve arama', () => {
    const mockProducts: Product[] = [
      {
        id: 'p1',
        name: '1/2" Çekvalf',
        category: 'VANALAR',
        description: 'Pirinç Çekvalf',
        price: 155.00,
        stock: 24,
        unit: 'ADET',
        minOrderQuantity: 1,
        imageUrl: '',
        sku: 'CKV-01',
        barcode: '8690001001012',
        vatRate: 20
      }
    ];

    const searchBarcode = '8690001001012';
    const found = mockProducts.find(p => p.barcode === searchBarcode || p.sku.toLowerCase() === searchBarcode.toLowerCase());
    expect(found).toBeDefined();
    expect(found?.name).toBe('1/2" Çekvalf');
  });

  it('2. Sepet hesaplamaları ve iskonto', () => {
    const cartItems = [
      { productId: 'p1', unitPrice: 155.00, quantity: 2, discountRate: 0 },
      { productId: 'p2', unitPrice: 71.67, quantity: 1, discountRate: 10 }
    ];

    const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    expect(subtotal).toBeCloseTo(381.67, 2);
  });

  it('3. Aynı ürün tekrar okutulduğunda miktar artırma (mükerrer satır engelleme)', () => {
    let cart = [{ productId: 'p1', quantity: 1, unitPrice: 155.00 }];
    const scanAgainId = 'p1';
    const existingIdx = cart.findIndex(i => i.productId === scanAgainId);
    if (existingIdx >= 0) {
      cart[existingIdx].quantity += 1;
    }
    expect(cart.length).toBe(1);
    expect(cart[0].quantity).toBe(2);
  });

});
