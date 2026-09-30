import { describe, it, expect } from 'vitest';
import type { Order } from '../types';
import { averagePreparationMinutes, onTimeDeliveryRate } from './dispatchKpis';

const base = { customerName: 'x', total: 1, items: [] } as unknown as Order;
const mk = (p: Partial<Order>): Order => ({ ...base, id: Math.random().toString(), ...p } as Order);

describe('averagePreparationMinutes', () => {
  it('hazırlığa alınma ile sevk arasındaki ortalamayı hesaplar', () => {
    const r = averagePreparationMinutes([
      mk({ status: 'shipped', statusHistory: [
        { status: 'preparing', timestamp: '2026-09-01T09:00:00Z' },
        { status: 'shipped', timestamp: '2026-09-01T09:30:00Z' },
      ] }),
      mk({ status: 'delivered', statusHistory: [
        { status: 'approved', timestamp: '2026-09-01T10:00:00Z' },
        { status: 'shipped', timestamp: '2026-09-01T11:00:00Z' },
      ] }),
    ]);
    expect(r.value).toBe(45);
    expect(r.sample).toBe(2);
  });
  it('veri yoksa null döner, iptal ve eksik kayıtları saymaz', () => {
    const r = averagePreparationMinutes([
      mk({ status: 'cancelled', statusHistory: [
        { status: 'preparing', timestamp: '2026-09-01T09:00:00Z' },
        { status: 'shipped', timestamp: '2026-09-01T09:10:00Z' },
      ] }),
      mk({ status: 'pending' }),
    ]);
    expect(r).toEqual({ value: null, sample: 0 });
  });
});

describe('onTimeDeliveryRate', () => {
  it('planlanan gün içinde teslim edilenleri zamanında sayar', () => {
    const r = onTimeDeliveryRate([
      mk({ status: 'delivered', deliveryDate: '2026-09-10T00:00:00', deliveredAt: '2026-09-10T15:00:00' }),
      mk({ status: 'delivered', deliveryDate: '2026-09-10T00:00:00', deliveredAt: '2026-09-11T09:00:00' }),
      mk({ status: 'delivered', deliveryDate: '2026-09-10T00:00:00', deliveredAt: '2026-09-09T09:00:00' }),
      mk({ status: 'shipped', deliveryDate: '2026-09-10T00:00:00' }),
      mk({ status: 'delivered' }),
    ]);
    expect(r.sample).toBe(3);
    expect(r.onTime).toBe(2);
    expect(r.value).toBeCloseTo(66.67, 1);
  });
  it('ölçülebilir teslimat yoksa null döner', () => {
    expect(onTimeDeliveryRate([]).value).toBeNull();
  });
});
