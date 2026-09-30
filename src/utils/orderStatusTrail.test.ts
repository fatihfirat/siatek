import { describe, it, expect } from 'vitest';
import { withStatusTrail, todayLocalIsoDate } from './orderStatusTrail';

describe('withStatusTrail', () => {
  it('durum kaydını mevcut geçmişe ekler', () => {
    const r = withStatusTrail([{ status: 'approved', timestamp: 'a' }], 'shipped', 'b', { updatedBy: 'ops' });
    expect(r.statusHistory).toEqual([
      { status: 'approved', timestamp: 'a' },
      { status: 'shipped', timestamp: 'b', updatedBy: 'ops' },
    ]);
    expect(r.deliveredAt).toBeUndefined();
  });
  it('teslimde deliveredAt üretir', () => {
    expect(withStatusTrail(undefined, 'delivered', '2026-09-30T10:00:00Z').deliveredAt).toBe('2026-09-30T10:00:00Z');
  });
  it('çağıran kayıt verdiyse onu kullanır', () => {
    const item = { status: 'shipped' as const, timestamp: 'x', trackingNumber: 'T1' };
    expect(withStatusTrail([], 'shipped', 'y', { historyItem: item }).statusHistory).toEqual([item]);
  });
});

describe('todayLocalIsoDate', () => {
  it('yerel tarihi YYYY-MM-DD verir', () => {
    expect(todayLocalIsoDate(new Date(2026, 8, 5))).toBe('2026-09-05');
  });
});
