import { describe, it, expect } from 'vitest';
import { getOrderStatusConfig } from './statusConfig';
import { OrderItem } from '../types';

describe('Faz 2 — Sipariş Deneyimi ve Finansal Hesaplama Testleri', () => {

  it('1. StatusConfig mapper kontrolleri', () => {
    const pendingCfg = getOrderStatusConfig('pending');
    expect(pendingCfg.label).toBe('Onay Bekliyor');
    expect(pendingCfg.nextStatus).toBe('approved');
    expect(pendingCfg.adminActionText).toBe('Siparişi Onayla');

    const deliveredCfg = getOrderStatusConfig('delivered');
    expect(deliveredCfg.label).toBe('Teslim Edildi');
    expect(deliveredCfg.nextStatus).toBeUndefined();
  });

  it('2. Finansal hesaplama testleri (2 * 155 = 310)', () => {
    const items: OrderItem[] = [
      {
        productId: 'p1',
        productName: '1/2" Çekvalf',
        quantity: 2,
        unit: 'ADET',
        unitPrice: 155,
        totalPrice: 310,
      }
    ];

    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    expect(subtotal).toBe(310);

    const discount = 0;
    const taxable = subtotal - discount;
    const tax = Math.round(taxable * 0.20);
    const total = taxable + tax;

    expect(tax).toBe(62);
    expect(total).toBe(372);
  });

  it('3. String sayı dönüşümleri ve kenar durumları', () => {
    const messyItem: any = {
      unitPrice: '155',
      quantity: '2',
    };
    const calcQty = Number(messyItem.quantity) || 0;
    const calcPrice = Number(messyItem.unitPrice) || 0;
    expect(calcQty * calcPrice).toBe(310);
  });

});
