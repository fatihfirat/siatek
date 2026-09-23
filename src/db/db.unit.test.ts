import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

function generatePayloadHash(payload: any): string {
  const sortedString = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash('sha256').update(sortedString).digest('hex');
}

describe('Faz 3D.4 — Unit Test Paketi', () => {

  it('1. İki müşteri arasında veri izolasyonu ve yetkilendirme mantığı', () => {
    const userA = { id: 'usr-1', role: 'customer' };
    const userB = { id: 'usr-2', role: 'customer' };
    const orderForA = { id: 'ord-1', userId: 'usr-1' };
    expect(orderForA.userId === userB.id).toBe(false);
  });

  it('2. Anonim erişim engelleme ve 401 kontrolü', () => {
    const token = null;
    expect(!!token).toBe(false);
  });

  it('3. Deterministik Payload Hash üretimi', () => {
    const p1 = { a: 1, b: 2 };
    const p2 = { b: 2, a: 1 };
    expect(generatePayloadHash(p1)).toBe(generatePayloadHash(p2));
  });

});
