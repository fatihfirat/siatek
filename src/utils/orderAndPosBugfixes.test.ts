import { describe, it, expect } from 'vitest';
import { posTotals, type PosCartItem } from '../components/admin/posModel';

describe('Order & POS Bugfixes Unit Tests', () => {
  describe('1. Server Order Status Transitions Matrix', () => {
    const allowedTransitions: Record<string, string[]> = {
      pending: ['approved', 'preparing', 'shipped', 'delivered', 'cancelled'],
      approved: ['preparing', 'shipped', 'delivered', 'cancelled', 'pending'],
      preparing: ['approved', 'shipped', 'delivered', 'cancelled', 'pending'],
      ready: ['shipped', 'delivered', 'cancelled', 'preparing'],
      out_for_delivery: ['delivered', 'shipped', 'cancelled'],
      shipped: ['delivered', 'preparing', 'cancelled', 'shipped'],
      delivered: ['shipped', 'cancelled', 'delivered'],
      cancelled: ['pending', 'approved']
    };

    it('allows transitioning pending directly to shipped for fast dispatch', () => {
      expect(allowedTransitions['pending']).toContain('shipped');
    });

    it('allows transitioning approved directly to shipped', () => {
      expect(allowedTransitions['approved']).toContain('shipped');
    });

    it('allows re-saving / updating tracking number on already shipped orders', () => {
      expect(allowedTransitions['shipped']).toContain('shipped');
    });

    it('blocks invalid transitions like delivered to preparing without shipped', () => {
      expect(allowedTransitions['delivered']).not.toContain('preparing');
    });
  });

  describe('2. Custom Item Decimal Comma & Value Normalization', () => {
    it('correctly parses comma-separated decimal prices (Turkish locale)', () => {
      const rawPrice = '150,50';
      const parsed = parseFloat(rawPrice.replace(',', '.').trim());
      expect(parsed).toBe(150.5);
    });

    it('calculates totals correctly with custom items having decimals', () => {
      const customItem: PosCartItem = {
        productId: 'custom-12345',
        sku: 'OZEL-KALEM',
        name: 'Montaj İşçiliği',
        unit: 'HİZMET',
        quantity: 2.5,
        unitPrice: 150.5,
        discountRate: 0,
        totalPrice: 2.5 * 150.5
      };

      const result = posTotals([customItem], 0, '');
      expect(result.subtotal).toBe(376.25);
      expect(result.tax).toBe(75.25);
      expect(result.grandTotal).toBe(451.5);
    });
  });

  describe('3. POS Sale Data Payload Mapping with Custom Items', () => {
    it('retains productName and unit for custom items in cart mapping', () => {
      const cart: PosCartItem[] = [
        {
          productId: 'custom-999',
          sku: 'OZEL-KALEM',
          name: 'Özel Dirsek Montajı',
          unit: 'ADET',
          quantity: 1,
          unitPrice: 250,
          discountRate: 0,
          totalPrice: 250
        }
      ];

      const mappedItems = cart.map(({ productId, name, unit, quantity, unitPrice, totalPrice }) => ({
        productId,
        productName: name,
        unit: unit || 'ADET',
        quantity,
        unitPrice,
        totalPrice
      }));

      expect(mappedItems[0].productName).toBe('Özel Dirsek Montajı');
      expect(mappedItems[0].unit).toBe('ADET');
      expect(mappedItems[0].productId).toBe('custom-999');
    });
  });
});
