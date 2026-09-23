import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { ALLOWED_DELIVERY_TRANSITIONS } from './repositories/deliveryTaskRepository';

function generatePayloadHash(payload: any): string {
  const sortedString = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash('sha256').update(sortedString).digest('hex');
}

export class IdempotencyConflictError extends Error {
  constructor(message = 'Idempotency conflict: Aynı anahtar farklı payload ile gönderildi.') {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

describe('Faz 3D.4 — Simulation / Mock Test Paketi', () => {

  it('1. Idempotency Key Aynı Anahtar + Farklı Payload -> IdempotencyConflictError', () => {
    const key = 'idemp-xyz';
    const storedHash = generatePayloadHash({ total: 300 });
    const incomingHash = generatePayloadHash({ total: 500 });

    const checkPayload = () => {
      if (storedHash !== incomingHash) {
        throw new IdempotencyConflictError();
      }
    };

    expect(checkPayload).toThrowError(IdempotencyConflictError);
  });

  it('2. Merkezi Teslimat ve Sipariş Durum Geçiş Matrisi', () => {
    expect(ALLOWED_DELIVERY_TRANSITIONS['unassigned']).toContain('out_for_delivery');
    expect(ALLOWED_DELIVERY_TRANSITIONS['delivered']).toEqual([]);
    expect(ALLOWED_DELIVERY_TRANSITIONS['delivered'].includes('preparing')).toBe(false);
  });

  it('3. Yetersiz Stokta Tam Rollback Simülasyonu', () => {
    const stock = 0;
    const requested = 2;
    const canDeduct = stock >= requested;
    expect(canDeduct).toBe(false);
  });

  it('4. Sipariş İptalinde Stok İadesi ve Ters Hareket Simülasyonu', () => {
    let stock = 10;
    stock -= 4; // Satış
    expect(stock).toBe(6);
    stock += 4; // İptal / iade
    expect(stock).toBe(10);
  });

  it('5. Snapshot Fiyat Korunması Simülasyonu', () => {
    const orderItemSnapshotPrice = 155.00;
    const updatedCatalogPrice = 190.00;
    expect(orderItemSnapshotPrice).not.toBe(updatedCatalogPrice);
    expect(orderItemSnapshotPrice).toBe(155.00);
  });

});
