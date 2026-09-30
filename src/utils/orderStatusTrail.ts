import type { Order, OrderStatusHistoryItem } from '../types';

/**
 * Durum değişikliğini `statusHistory`'ye ekler ve teslimde `deliveredAt` üretir.
 * Zamanında teslim ve ortalama hazırlama KPI'ları bu kayıtlara dayanır.
 */
export function withStatusTrail(
  existing: OrderStatusHistoryItem[] | undefined,
  status: Order['status'],
  now: string,
  options: { historyItem?: OrderStatusHistoryItem; updatedBy?: string; note?: string } = {}
): { statusHistory: OrderStatusHistoryItem[]; deliveredAt?: string } {
  const history = existing || [];
  const entry: OrderStatusHistoryItem = options.historyItem ?? {
    status,
    timestamp: now,
    ...(options.note ? { note: options.note } : {}),
    ...(options.updatedBy ? { updatedBy: options.updatedBy } : {}),
  };
  return {
    statusHistory: [...history, entry],
    ...(status === 'delivered' ? { deliveredAt: now } : {}),
  };
}

/** Bugünün yerel tarihi, `YYYY-MM-DD`. */
export function todayLocalIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
