import type { Product } from '../../types';
export interface PosCartItem {
    productId: string;
    sku: string;
    name: string;
    unit: string;
    unitPrice: number;
    quantity: number;
    discountRate: number;
    totalPrice: number;
}
export function posTotals(cart: PosCartItem[] = [], discountPercent: number = 0, received: string = '') {
    const safeCart = Array.isArray(cart) ? cart : [];
    const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
    const subtotal = safeCart.reduce((sum, item) => money(sum + money((item.unitPrice || 0) * (item.quantity || 0))), 0);
    const itemDiscounts = safeCart.reduce((sum, item) => money(sum + money(money((item.unitPrice || 0) * (item.quantity || 0)) * (item.discountRate || 0) / 100)), 0);
    const totalDiscount = money(itemDiscounts + money((subtotal - itemDiscounts) * discountPercent / 100));
    const tax = money((subtotal - totalDiscount) * 0.2);
    const grandTotal = money(subtotal - totalDiscount + tax);
    const numericReceived = typeof received === 'string' && received.trim() ? Number(received) : 0;
    return { subtotal, totalDiscount, grandTotal, numericReceived, changeAmount: money(Math.max(0, numericReceived - grandTotal)), tax };
}
export function posStockIssue(cart: PosCartItem[] = [], products: Product[] = []) {
    const safeCart = Array.isArray(cart) ? cart : [];
    const safeProducts = Array.isArray(products) ? products : [];
    return safeCart.find(item => {
        if (item.productId.startsWith('custom-')) {
            return !Number.isFinite(item.quantity) || item.quantity <= 0;
        }
        const product = safeProducts.find(p => p && p.id === item.productId);
        return !product || !Number.isFinite(product.stock) || !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > product.stock;
    });
}

