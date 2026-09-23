import type { Order, Quote } from '../types';
import { saveQuoteToFirestore } from './firestoreService';
import { auth } from './firebase';
import { createTransactionalOrder } from './transactionService';

/**
 * Kaydin sahibini belirler.
 *
 * GUVENLIK: Kimlik BURADA, dogrudan Firebase Auth'tan okunur; bilesenden gelen
 * prop'a veya form alanina GUVENILMEZ. Boylece hem baskasi adina kayit acilmasi
 * engellenir, hem de ekranda eski (localStorage'dan gelen) bir kullanici
 * gorunuyorken yanlis hesaba yazilmasi imkansiz hale gelir.
 *
 * Donen uid/email, Firestore kurallarinin bekledigi degerlerle birebir aynidir.
 */
function aktifKimlik(): { uid: string; email: string } {
  const u = auth.currentUser;
  if (!u) {
    throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  }
  return {
    uid: u.uid,
    email: (u.email || '').trim().toLowerCase(),
  };
}

const pendingKeys = new Map<string, string>();

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if randomUUID fails in restricted context
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isFirebaseHosting(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('web.app') || host.includes('firebaseapp.com') || host.includes('alphateknikhvac.com');
}

async function submit<T>(path: string, payload: Record<string, unknown>, kind: string): Promise<T> {
  const body = JSON.stringify(payload);
  const scope = `${kind}:${body}`;
  const key = pendingKeys.get(scope) || generateIdempotencyKey();
  pendingKeys.set(scope, key);
  
  // Olu sunucu on-istegi KALDIRILDI (19.09.2026): sunucu yok, her siparis/teklif
  // gonderiminde bosuna bir tur atiliyordu. Firestore zaten tek kaynak.

  // Siparis; stok, hareket, bildirim ve idempotency ile sunucuda atomik yazilir.
  if (kind === 'order') {
    const newOrder = await createTransactionalOrder(payload, 'customer');

    // Cache locally
    try {
      const cached = JSON.parse(localStorage.getItem('alpha_cached_orders') || '[]');
      localStorage.setItem('alpha_cached_orders', JSON.stringify([newOrder, ...cached]));
      window.dispatchEvent(new CustomEvent('alpha:order-created', { detail: newOrder }));
    } catch {}

    pendingKeys.delete(scope);
    return { success: true, order: newOrder } as unknown as T;
  }

  if (kind === 'quote') {
    const kimlik = aktifKimlik();
    const quoteId = `quote-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const quoteNumber = `TEK-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toISOString();

    const newQuote: Quote = {
      id: quoteId,
      quoteNumber,
      customerUid: kimlik.uid,
      customerName: String(payload.customerName || 'Müşteri'),
      customerEmail: kimlik.email,
      customerPhone: String(payload.customerPhone || ''),
      customerCompany: String(payload.companyName || payload.customerCompany || ''),
      projectTitle: String(payload.projectTitle || 'Teklif Talebi'),
      items: (payload.items as any[]) || [],
      notes: payload.notes ? String(payload.notes) : undefined,
      status: 'pending_review',
      createdAt: now,
      updatedAt: now,
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await saveQuoteToFirestore(newQuote);

    try {
      const cached = JSON.parse(localStorage.getItem('alpha_cached_quotes') || '[]');
      localStorage.setItem('alpha_cached_quotes', JSON.stringify([newQuote, ...cached]));
      window.dispatchEvent(new CustomEvent('alpha:quote-created', { detail: newQuote }));
    } catch {}

    pendingKeys.delete(scope);
    return { success: true, quote: newQuote } as unknown as T;
  }

  throw new Error('İşlem kaydı doğrulanamadı.');
}

export interface ShoppingService {
  createOrder: (payload: Record<string, unknown>) => Promise<Order>;
  requestQuote: (payload: Record<string, unknown>) => Promise<void>;
}

export const shoppingService: ShoppingService = {
  async createOrder(payload) {
    const data = await submit<{ success: boolean; order: Order }>('/api/orders', payload, 'order');
    if (!data.success || !data.order?.id || !data.order?.orderNumber) {
      throw new Error('Order save not confirmed');
    }
    return data.order as Order;
  },
  async requestQuote(payload) {
    const data = await submit<{ success: boolean; quote: Quote }>('/api/quotes/request', payload, 'quote');
    if (!data.success) {
      throw new Error('Quote save not confirmed');
    }
  }
};
