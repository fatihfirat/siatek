export interface CanonicalProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  minOrderQuantity: number;
  minStockAlert?: number;
}

export interface RequestedItem {
  productId: string;
  quantity: number;
  unitPrice?: number;
  note?: string;
}

export interface PreparedOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  note?: string;
}

export interface StockUpdate {
  before: number;
  after: number;
  threshold: number;
  crossedLowStockThreshold: boolean;
}

const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export function prepareOrder(input: {
  items: RequestedItem[];
  products: Map<string, CanonicalProduct>;
  isAdmin: boolean;
  requestedDiscount: number;
}) {
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 100) {
    throw new Error('Sipariş en az 1, en fazla 100 ürün satırı içermelidir.');
  }

  const grouped = new Map<string, { quantity: number; unitPrice?: number; note?: string }>();
  for (const item of input.items) {
    if (!item || typeof item.productId !== 'string' || !item.productId) throw new Error('Ürün bilgisi geçersiz.');
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error('Ürün miktarı geçersiz.');
    const current = grouped.get(item.productId);
    grouped.set(item.productId, {
      quantity: money((current?.quantity || 0) + item.quantity),
      unitPrice: item.unitPrice ?? current?.unitPrice,
      note: item.note || current?.note,
    });
  }

  let subtotal = 0;
  const items: PreparedOrderItem[] = [];
  const stockUpdates = new Map<string, StockUpdate>();

  for (const [productId, requested] of grouped) {
    const product = input.products.get(productId);
    if (!product) throw new Error(`Ürün katalogda bulunamadı: ${productId}`);
    if (!Number.isFinite(product.stock) || product.stock < 0) throw new Error(`${product.name} stok kaydı geçersiz.`);
    if (!input.isAdmin && requested.quantity < Math.max(1, Number(product.minOrderQuantity) || 1)) {
      throw new Error(`${product.name} için asgari sipariş miktarı ${product.minOrderQuantity} ${product.unit}.`);
    }
    if (requested.quantity > product.stock) {
      throw new Error(`${product.name} için stok yetersiz. Mevcut: ${product.stock} ${product.unit}.`);
    }

    const requestedPrice = Number(requested.unitPrice);
    const unitPrice = input.isAdmin && Number.isFinite(requestedPrice) && requestedPrice >= 0
      ? money(requestedPrice)
      : money(Number(product.price));
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`${product.name} fiyatı geçersiz.`);

    const totalPrice = money(requested.quantity * unitPrice);
    subtotal = money(subtotal + totalPrice);
    items.push({
      productId,
      productName: product.name,
      quantity: requested.quantity,
      unit: product.unit || 'ADET',
      unitPrice,
      totalPrice,
      ...(requested.note ? { note: String(requested.note).slice(0, 500) } : {}),
    });

    const after = money(product.stock - requested.quantity);
    const threshold = Math.max(0, Number(product.minStockAlert ?? 5));
    stockUpdates.set(productId, {
      before: product.stock,
      after,
      threshold,
      crossedLowStockThreshold: product.stock > threshold && after <= threshold,
    });
  }

  const discount = input.isAdmin ? money(Number(input.requestedDiscount) || 0) : 0;
  if (discount < 0 || discount > subtotal) throw new Error('İskonto geçersiz.');
  const discountedTotal = money(subtotal - discount);
  const tax = money(discountedTotal * 0.20);
  const total = money(discountedTotal + tax);
  return { items, subtotal, discount, tax, total, stockUpdates };
}

