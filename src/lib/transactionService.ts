import type { Order, OrderStatus } from '../types';
import { STOCK_PDF_PRODUCTS } from '../data/stockProducts';
import { prepareOrder, type CanonicalProduct } from '../utils/orderCore';
import { auth, db, collection, doc, getDoc, runTransaction, setDoc } from './firebase';

const pendingKeys = new Map<string, string>();
const baselineProducts = new Map(STOCK_PDF_PRODUCTS.map((product) => [product.id, product]));

function createKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const text = (value: unknown, max = 500): string => String(value || '').trim().slice(0, max);

function activeUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  return user;
}

function provisionalOrder(payload: Record<string, unknown>, id: string, key: string): Order {
  const user = activeUser();
  const now = new Date().toISOString();
  const rawItems = Array.isArray(payload.items) ? payload.items as any[] : [];
  if (rawItems.length === 0 || rawItems.length > 100) throw new Error('Sipariş ürünleri geçersiz.');
  const items = rawItems.map((item) => {
    const quantity = Number(item.quantity);
    if (!item.productId || !Number.isFinite(quantity) || quantity <= 0) throw new Error('Ürün miktarı geçersiz.');
    return {
      productId: text(item.productId, 120), productName: text(item.productName || 'Ürün', 200), quantity,
      unit: text(item.unit || 'ADET', 30), unitPrice: 0, totalPrice: 0,
      ...(item.note ? { note: text(item.note, 500) } : {}),
    };
  });
  return {
    id, orderNumber: `TALEP-${new Date().getFullYear()}-${key.slice(0, 8).toUpperCase()}`,
    customerUid: user.uid, customerName: text(payload.customerName || user.displayName || 'Müşteri', 120),
    customerEmail: String(user.email || '').trim().toLowerCase(), customerPhone: text(payload.customerPhone, 30),
    customerAddress: text(payload.customerAddress, 500), items, subtotal: 0, discount: 0, tax: 0, total: 0,
    status: 'pending', paymentMethod: text(payload.paymentMethod || 'Havale/EFT', 40), notes: text(payload.notes, 2000),
    encryptedPayload: text(payload.encryptedPayload, 10000), createdAt: now, updatedAt: now,
    pricingVerified: false, stockState: 'unreserved', idempotencyKey: key,
    statusHistory: [{ status: 'pending', timestamp: now, note: 'Sipariş talebi alındı; fiyat ve stok yönetici onayı bekliyor.' }],
  };
}

export async function createTransactionalOrder(payload: Record<string, unknown>, mode: 'customer' | 'pos'): Promise<Order> {
  return mode === 'pos' ? createPosOrder(payload) : createPendingOrder(payload);
}

async function createPendingOrder(payload: Record<string, unknown>): Promise<Order> {
  const user = activeUser();
  const scope = `order:customer:${JSON.stringify(payload)}`;
  const key = pendingKeys.get(scope) || createKey();
  pendingKeys.set(scope, key);
  const id = `order-${key}`;
  const ref = doc(db, 'orders', id);
  const order = provisionalOrder(payload, id, key);
  try {
    await setDoc(ref, order);
    pendingKeys.delete(scope);
    return order;
  } catch (error) {
    const existing = await getDoc(ref).catch(() => null);
    if (existing?.exists()) {
      const data = { id: existing.id, ...existing.data() } as Order;
      if (data.customerUid === user.uid && data.idempotencyKey === key) {
        pendingKeys.delete(scope);
        return data;
      }
    }
    throw error;
  }
}

async function readCanonicalProducts(transaction: any, productIds: string[]): Promise<Map<string, CanonicalProduct>> {
  const result = new Map<string, CanonicalProduct>();
  for (const productId of productIds) {
    const snap = await transaction.get(doc(db, 'products', productId));
    const baseline = baselineProducts.get(productId);
    const override = snap.exists() ? snap.data() : {};
    if (!baseline && !override?.name) throw new Error(`Ürün katalogda bulunamadı: ${productId}`);
    result.set(productId, { ...(baseline || {}), ...(override || {}), id: productId } as CanonicalProduct);
  }
  return result;
}

function writeStockEffects(transaction: any, order: Order, prepared: ReturnType<typeof prepareOrder>, now: string, actorUid: string) {
  for (const item of prepared.items) {
    const stock = prepared.stockUpdates.get(item.productId)!;
    transaction.set(doc(db, 'products', item.productId), { stock: stock.after, updatedAt: now }, { merge: true });
    transaction.set(doc(collection(db, 'stock_movements')), {
      productId: item.productId, productName: item.productName, type: 'sale_reservation', quantityDelta: -item.quantity,
      quantityBefore: stock.before, quantityAfter: stock.after, referenceType: 'order', referenceId: order.id,
      createdAt: now, createdByUid: actorUid,
    });
    if (stock.after <= stock.threshold) {
      transaction.set(doc(db, 'notifications', `low-stock-${item.productId}`), {
        title: 'Kritik Stok Uyarısı',
        message: `${item.productName} stoğu ${stock.after} ${item.unit} seviyesine düştü. Eşik: ${stock.threshold}.`,
        type: 'low_stock', targetRole: 'admin', referenceId: item.productId, referenceType: 'product',
        read: false, timestamp: now,
      }, { merge: true });
    }
  }
}

async function createPosOrder(payload: Record<string, unknown>): Promise<Order> {
  const user = activeUser();
  const scope = `order:pos:${JSON.stringify(payload)}`;
  const key = pendingKeys.get(scope) || createKey();
  pendingKeys.set(scope, key);
  const orderId = `order-pos-${key}`;
  const orderRef = doc(db, 'orders', orderId);
  const rawItems = Array.isArray(payload.items) ? payload.items as any[] : [];
  const productIds = [...new Set(rawItems.map((item) => text(item.productId, 120)).filter(Boolean))];
  const cariId = text(payload.cariId, 120);

  const order = await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(orderRef);
    if (existing.exists()) return { id: existing.id, ...existing.data() } as Order;
    const products = await readCanonicalProducts(transaction, productIds);
    const cariRef = cariId ? doc(db, 'cari_accounts', cariId) : null;
    const cariSnap = cariRef ? await transaction.get(cariRef) : null;
    const prepared = prepareOrder({ items: rawItems, products, isAdmin: true, requestedDiscount: Number(payload.discount || 0) });
    const now = new Date().toISOString();
    const orderNumber = `POS-${new Date().getFullYear()}-${key.slice(0, 8).toUpperCase()}`;
    const result: Order = {
      id: orderId, orderNumber, customerUid: user.uid, customerName: text(payload.customerName || 'Perakende Müşteri', 120),
      customerEmail: text(payload.customerEmail, 160).toLowerCase(), customerPhone: text(payload.customerPhone, 30),
      customerAddress: 'Hızlı Kasa / Tezgah Siparişi', items: prepared.items, subtotal: prepared.subtotal,
      discount: prepared.discount, tax: prepared.tax, total: prepared.total, status: 'approved',
      paymentMethod: text(payload.paymentMethod || 'Nakit', 40), ...(cariId ? { cariId } : {}),
      notes: text(payload.notes, 2000), createdAt: now, updatedAt: now, pricingVerified: true,
      stockState: 'reserved', idempotencyKey: key,
      statusHistory: [{ status: 'approved', timestamp: now, note: 'POS kasa satışı' }],
    };
    if (result.paymentMethod === 'Cari Hesap' && (!cariRef || !cariSnap?.exists())) throw new Error('Cari hesap bulunamadı.');
    transaction.set(orderRef, result);
    writeStockEffects(transaction, result, prepared, now, user.uid);
    if (result.paymentMethod === 'Cari Hesap' && cariRef && cariSnap?.exists()) {
      const cari = cariSnap.data();
      transaction.set(doc(db, 'cari_transactions', `CTX-${orderId}`), {
        id: `CTX-${orderId}`, cariId, date: now.slice(0, 10), type: 'sale_invoice', direction: 'debit',
        amount: result.total, description: `POS Satış: ${orderNumber} — ${result.customerName}`,
        documentNo: orderNumber, orderId, createdAt: now,
      });
      transaction.update(cariRef, {
        balance: Number(cari.balance || 0) + result.total, totalDebit: Number(cari.totalDebit || 0) + result.total,
        lastTransactionDate: now, lastTransactionDesc: `POS Satış: ${orderNumber}`, updatedAt: now,
      });
    }
    return result;
  });
  pendingKeys.delete(scope);
  return order;
}

export async function updateTransactionalOrderStatus(orderId: string, status: OrderStatus, details: Record<string, unknown> = {}): Promise<void> {
  const user = activeUser();
  const orderRef = doc(db, 'orders', orderId);
  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error('Sipariş bulunamadı.');
    const order = { id: orderSnap.id, ...orderSnap.data() } as Order;
    if (order.status === status) return;
    const now = new Date().toISOString();

    const requiresReservation = ['approved', 'preparing', 'ready', 'shipped', 'out_for_delivery', 'delivered'].includes(status);
    if (requiresReservation && order.stockState !== 'reserved') {
      const productIds = [...new Set(order.items.map((item) => item.productId))];
      const products = await readCanonicalProducts(transaction, productIds);
      const prepared = prepareOrder({ items: order.items, products, isAdmin: false, requestedDiscount: 0 });
      writeStockEffects(transaction, order, prepared, now, user.uid);
      transaction.update(orderRef, {
        items: prepared.items, subtotal: prepared.subtotal, discount: prepared.discount, tax: prepared.tax,
        total: prepared.total, status, pricingVerified: true, stockState: 'reserved', updatedAt: now,
        statusHistory: [...(order.statusHistory || []), { status, timestamp: now, note: 'Fiyat ve stok doğrulandı; stok rezerve edildi.', updatedBy: user.email || user.uid }],
      });
      return;
    }

    if (status === 'cancelled' && order.stockState === 'reserved') {
      const productSnaps = [];
      for (const item of order.items) productSnaps.push(await transaction.get(doc(db, 'products', item.productId)));
      order.items.forEach((item, index) => {
        const baseline = baselineProducts.get(item.productId);
        const override = productSnaps[index].exists() ? productSnaps[index].data() : {};
        const before = Number(override?.stock ?? baseline?.stock ?? 0);
        const after = money(before + Number(item.quantity || 0));
        transaction.set(doc(db, 'products', item.productId), { stock: after, updatedAt: now }, { merge: true });
        transaction.set(doc(collection(db, 'stock_movements')), {
          productId: item.productId, productName: item.productName, type: 'order_cancel_reversal',
          quantityDelta: item.quantity, quantityBefore: before, quantityAfter: after,
          referenceType: 'order', referenceId: order.id, createdAt: now, createdByUid: user.uid,
        });
      });
    }

    const safeDetails = Object.fromEntries(Object.entries(details).filter(([key]) => [
      'trackingNumber', 'shippingCompany', 'deliveryVehicle', 'deliveryPersonnel', 'packageCount',
      'pickingStatus', 'deliveryStatus', 'notes',
    ].includes(key)));
    transaction.update(orderRef, {
      status, ...(status === 'cancelled' ? { stockState: order.stockState === 'reserved' ? 'released' : 'unreserved' } : {}),
      ...safeDetails, updatedAt: now,
      statusHistory: [...(order.statusHistory || []), {
        status, timestamp: now, note: text(safeDetails.notes || 'Durum güncellendi.', 500), updatedBy: user.email || user.uid,
        ...(safeDetails.trackingNumber ? { trackingNumber: safeDetails.trackingNumber } : {}),
      }],
    });
  });
}
