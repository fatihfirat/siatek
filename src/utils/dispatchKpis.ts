import type { Order } from '../types';

export interface DispatchKpiResult {
  /** Ölçülebilen sipariş yoksa null. */
  value: number | null;
  sample: number;
}

const toMs = (iso?: string): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
};

const firstStatusTime = (order: Order, statuses: Array<Order['status']>): number | null => {
  const times = (order.statusHistory || [])
    .filter(h => statuses.includes(h.status))
    .map(h => toMs(h.timestamp))
    .filter((t): t is number => t !== null);
  return times.length > 0 ? Math.min(...times) : null;
};

/** Planlanan teslim gününün sonu (yerel saat). Saat bilgisi yoksa gün sonuna kadar zamanında sayılır. */
const endOfPlannedDay = (deliveryDate?: string): number | null => {
  const t = toMs(deliveryDate);
  if (t === null) return null;
  const d = new Date(t);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

/** Ortalama hazırlama süresi (dakika): hazırlığa alınma -> sevk. */
export function averagePreparationMinutes(orders: Order[]): DispatchKpiResult {
  const durations: number[] = [];
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    const start = firstStatusTime(o, ['preparing', 'approved']);
    const end = firstStatusTime(o, ['shipped', 'out_for_delivery', 'delivered']) ?? toMs(o.pickedAt);
    if (start !== null && end !== null && end >= start) durations.push((end - start) / 60000);
  }
  if (durations.length === 0) return { value: null, sample: 0 };
  return { value: durations.reduce((a, b) => a + b, 0) / durations.length, sample: durations.length };
}

/** Zamanında teslim oranı (0-100): teslim anı planlanan gün sonundan geç değilse zamanında. */
export function onTimeDeliveryRate(orders: Order[]): DispatchKpiResult & { onTime: number } {
  let total = 0;
  let onTime = 0;
  for (const o of orders) {
    if (o.status !== 'delivered') continue;
    const deliveredAt = toMs(o.deliveredAt) ?? firstStatusTime(o, ['delivered']);
    const planned = endOfPlannedDay(o.deliveryDate);
    if (deliveredAt === null || planned === null) continue;
    total += 1;
    if (deliveredAt <= planned) onTime += 1;
  }
  return { value: total > 0 ? (onTime / total) * 100 : null, sample: total, onTime };
}
