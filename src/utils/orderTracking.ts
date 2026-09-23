import type {Order, User} from '../types';
import {ORDER_STATUS_CONFIG} from './statusConfig';

// Read compatibility only: never rewrite persisted legacy values.
export function trackingStatus(status: string) {
  const key = status === 'shipped' ? 'out_for_delivery' : status;
  return Object.hasOwn(ORDER_STATUS_CONFIG, key) ? ORDER_STATUS_CONFIG[key as keyof typeof ORDER_STATUS_CONFIG] : null;
}
/**
 * Musterinin kendi siparisleri.
 *
 * Oncelik UID'dedir: degismez ve taklit edilemez. E-posta esitligi yalnizca
 * customerUid alani HENUZ OLMAYAN eski kayitlar icin yedek yoldur; dolgu
 * scripti calistiktan sonra bu dal pratikte devre disi kalir.
 */
export function customerOrders(orders: Order[], user: User | null) {
  const uid = user?.id;
  const email = user?.email?.trim().toLowerCase();
  const safeOrders = Array.isArray(orders) ? orders : [];
  if (!uid && !email) return [];
  return safeOrders.filter(order => {
    if (!order) return false;
    if (order.customerUid) return !!uid && order.customerUid === uid;
    return !!email && order.customerEmail?.trim().toLowerCase() === email;
  });
}
export function orderDate(value: string) {
  return Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('tr-TR', {dateStyle:'medium', timeStyle:'short'}) : 'Tarih belirtilmemiş';
}
