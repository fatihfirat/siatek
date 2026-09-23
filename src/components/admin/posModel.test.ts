import { describe, it, expect } from 'vitest';
import { posTotals, posStockIssue, type PosCartItem } from './posModel';
import type { Product } from '../../types';
const item: PosCartItem = { productId: 'a', sku: 'A', name: 'Ürün', unit: 'ADET', quantity: 2, unitPrice: 120, discountRate: 10, totalPrice: 216 };
describe('POS existing financial rules', () => {
    it('applies line discount before global discount; preserves included rounded VAT', () => { expect(posTotals([item], 5, '250')).toEqual({ subtotal: 240, totalDiscount: 34.8, grandTotal: 246.24, numericReceived: 250, changeAmount: 3.76, tax: 41.04 }); });
    it('keeps zero and empty cash semantics and nonnegative change', () => { expect(posTotals([item], 0, '').numericReceived).toBe(0); expect(posTotals([item], 0, '10').changeAmount).toBe(0); expect(posTotals([], 0, '').grandTotal).toBe(0); });
    it('supports fractional quantity without changing unit prices', () => { expect(posTotals([{ ...item, quantity: 1.5, discountRate: 0 }], 0, '').grandTotal).toBe(216); });
});
describe('POS stock guard', () => {
    const products = [{ id: 'a', stock: 2 }] as Product[];
    it('accepts exact available stock', () => expect(posStockIssue([item], products)).toBeUndefined());
    it('rejects changed or missing stock', () => { expect(posStockIssue([item], [{ id: 'a', stock: 1 }] as Product[])).toBe(item); expect(posStockIssue([item], [])).toBe(item); });
    it('rejects nonfinite and invalid quantities', () => { for (const quantity of [NaN, Infinity, 0, -1])
        expect(posStockIssue([{ ...item, quantity }], products)).toBeTruthy(); });
});
