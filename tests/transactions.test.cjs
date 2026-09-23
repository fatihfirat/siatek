const assert = require('node:assert/strict');
const { test } = require('node:test');
process.env.NODE_ENV = 'test';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'test-admin-password-for-security-suite';
const { app } = require('../dist/server.cjs');

test('order, quote and status API transactions', async () => {
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const api = async (route, method = 'GET', body, token, key) => {
      const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, data: await response.json() };
    };
    const registration = await api('/api/auth/register', 'POST', { email: 'transaction@example.invalid', password: 'test-password', name: 'Transaction Buyer', companyName: 'Transaction Buyer', phone: '5551234567' });
    assert.equal(registration.status, 201);
    const buyer = registration.data.token;
    const login = await api('/api/auth/login', 'POST', { emailOrUsername: 'admin', password: 'test-admin-password-for-security-suite' });
    assert.equal(login.status, 200);
    const admin = login.data.token;
    const catalog = await api('/api/products');
    const product = catalog.data.products.find(p => p.stock >= Math.max(p.minOrderQuantity, 3) && p.price > 0);
    assert.ok(product);
    const item = { productId: product.id, quantity: product.minOrderQuantity, unitPrice: 0.01 };
    const body = { customerName: 'Transaction Buyer', items: [item] };
    const key = 'transaction-order-123';
    const before = product.stock;
    const order = await api('/api/orders', 'POST', body, buyer, key);
    assert.equal(order.status, 201);
    assert.equal(order.data.order.subtotal, product.price * item.quantity);
    assert.equal((await api('/api/orders', 'POST', body, buyer, key)).data.order.id, order.data.order.id);
    assert.equal((await api('/api/orders', 'POST', { ...body, notes: 'changed' }, buyer, key)).status, 409);
    assert.equal((await api('/api/orders', 'POST', { ...body, items: [{ ...item, quantity: before + 1 }] }, buyer)).status, 409);
    assert.equal((await api('/api/products')).data.products.find(p => p.id === product.id).stock, before - item.quantity);
    assert.equal((await api(`/api/orders/${order.data.order.id}/status`, 'PATCH', { status: 'delivered' }, admin)).status, 409);
    assert.equal((await api(`/api/orders/${order.data.order.id}/status`, 'PATCH', { status: 'approved' }, admin)).status, 200);
    assert.equal((await api(`/api/orders/${order.data.order.id}/status`, 'PATCH', { status: 'approved' }, admin)).status, 409);
    assert.equal((await api(`/api/orders/${order.data.order.id}/status`, 'PATCH', { status: 'cancelled' }, admin)).status, 200);
    assert.equal((await api(`/api/orders/${order.data.order.id}/status`, 'PATCH', { status: 'cancelled' }, admin)).status, 409);
    assert.equal((await api('/api/products')).data.products.find(p => p.id === product.id).stock, before);
    const quoteBody = { customerName: 'Transaction Buyer', requestedItems: [{ productId: product.id, productName: product.name, requestedQuantity: 1 }] };
    const quote = await api('/api/quotes/request', 'POST', quoteBody, buyer, 'transaction-quote-123');
    assert.equal(quote.status, 201);
    assert.equal((await api('/api/quotes/request', 'POST', quoteBody, buyer, 'transaction-quote-123')).data.quote.id, quote.data.quote.id);
    assert.equal((await api(`/api/quotes/${quote.data.quote.id}/accept`, 'POST', undefined, buyer)).status, 409);
    assert.equal((await api(`/api/quotes/${quote.data.quote.id}/respond`, 'POST', { offeredItems: [{ productId: product.id, productName: product.name, quantity: 1, offeredUnitPrice: 12.34 }], discountAmount: 13 }, admin)).status, 400);
    const response = await api(`/api/quotes/${quote.data.quote.id}/respond`, 'POST', { offeredItems: [{ productId: product.id, productName: product.name, quantity: 1, offeredUnitPrice: 12.34 }], discountAmount: 1.34, shippingFee: 2 }, admin);
    assert.equal(response.status, 200);
    assert.equal(response.data.quote.grandTotal, 15.2);
    assert.equal((await api(`/api/quotes/${quote.data.quote.id}/respond`, 'POST', { offeredItems: [] }, admin)).status, 409);
    const accepted = await api(`/api/quotes/${quote.data.quote.id}/accept`, 'POST', undefined, buyer);
    assert.equal(accepted.status, 200);
    assert.equal(accepted.data.order.total, 15.2);
    assert.equal((await api(`/api/quotes/${quote.data.quote.id}/accept`, 'POST', undefined, buyer)).data.order.id, accepted.data.order.id);
  } finally {
    server.close();
  }
});

test('financial cari transactions require idempotency and reverse instead of delete', async () => {
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const api = async (route, method = 'GET', body, token, key) => {
      const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, data: await response.json() };
    };
    const admin = (await api('/api/auth/login', 'POST', { emailOrUsername: 'admin', password: 'test-admin-password-for-security-suite' })).data.token;
    const cariler = await api('/api/cariler', 'GET', undefined, admin);
    assert.equal(cariler.status, 200);
    const cari = cariler.data.cariler.find(c => c.type !== 'supplier');
    assert.ok(cari);
    const beforeBalance = cari.balance;
    const body = { type: 'payment_received', amount: 1234.56, direction: 'credit', description: 'Faz 2 tahsilat testi', documentNo: 'TAH-FAZ2-1', paymentMethod: 'Havale/EFT' };
    assert.equal((await api(`/api/cariler/${cari.id}/transactions`, 'POST', body, admin)).status, 400);
    const created = await api(`/api/cariler/${cari.id}/transactions`, 'POST', body, admin, 'cari-payment-faz2-1');
    assert.equal(created.status, 201);
    assert.equal((await api(`/api/cariler/${cari.id}/transactions`, 'POST', body, admin, 'cari-payment-faz2-1')).data.transaction.id, created.data.transaction.id);
    assert.equal((await api(`/api/cariler/${cari.id}/transactions`, 'POST', { ...body, amount: 999 }, admin, 'cari-payment-faz2-1')).status, 409);
    const afterCreate = await api(`/api/cariler/${cari.id}`, 'GET', undefined, admin);
    assert.equal(afterCreate.data.cari.balance, Math.round((beforeBalance - 1234.56) * 100) / 100);
    const reversed = await api(`/api/cariler/${cari.id}/transactions/${created.data.transaction.id}`, 'DELETE', { reason: 'test reversal' }, admin, 'cari-reverse-faz2-1');
    assert.equal(reversed.status, 200);
    assert.equal(reversed.data.transaction.direction, 'debit');
    const afterReverse = await api(`/api/cariler/${cari.id}`, 'GET', undefined, admin);
    assert.equal(afterReverse.data.transactions.some(t => t.id === created.data.transaction.id), true);
    assert.equal(afterReverse.data.transactions.some(t => t.documentNo === `IPT-${created.data.transaction.id}`), true);
    assert.equal(afterReverse.data.cari.balance, beforeBalance);
    assert.equal((await api(`/api/cariler/${cari.id}/transactions/${created.data.transaction.id}`, 'DELETE', { reason: 'test reversal' }, admin, 'cari-reverse-faz2-1')).data.transaction.id, reversed.data.transaction.id);
  } finally {
    server.close();
  }
});

test('inventory ledger tracks reservations, receipts, counts and transfers', async () => {
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const api = async (route, method = 'GET', body, token, key) => {
      const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, data: await response.json() };
    };

    const admin = (await api('/api/auth/login', 'POST', { emailOrUsername: 'admin', password: 'test-admin-password-for-security-suite' })).data.token;
    const registration = await api('/api/auth/register', 'POST', { email: 'inventory@example.invalid', password: 'test-password', name: 'Inventory Buyer', companyName: 'Inventory Buyer', phone: '5551234567' });
    assert.equal(registration.status, 201);
    const buyer = registration.data.token;
    const product = (await api('/api/products')).data.products.find(p => p.stock >= Math.max(p.minOrderQuantity, 4) && p.price > 0);
    assert.ok(product);
    const before = product.stock;

    assert.equal((await api('/api/inventory/movements', 'GET', undefined, buyer)).status, 403);
    const opening = await api(`/api/inventory/movements?productId=${encodeURIComponent(product.id)}`, 'GET', undefined, admin);
    assert.equal(opening.status, 200);
    assert.equal(opening.data.movements.some(m => m.referenceId === 'opening-stock' && m.quantityDelta > 0), true);

    const orderBody = { customerName: 'Inventory Buyer', items: [{ productId: product.id, quantity: product.minOrderQuantity, unitPrice: 0.01 }] };
    const order = await api('/api/orders', 'POST', orderBody, buyer, 'inventory-ledger-order');
    assert.equal(order.status, 201);
    const afterOrder = await api(`/api/inventory/movements?referenceId=${encodeURIComponent(order.data.order.id)}`, 'GET', undefined, admin);
    assert.equal(afterOrder.data.movements.some(m => m.type === 'sale_reservation' && m.quantityDelta === -product.minOrderQuantity), true);

    assert.equal((await api(`/api/orders/${order.data.order.id}/status`, 'PATCH', { status: 'cancelled' }, admin)).status, 200);
    const afterCancel = await api(`/api/inventory/movements?referenceId=${encodeURIComponent(order.data.order.id)}`, 'GET', undefined, admin);
    assert.equal(afterCancel.data.movements.some(m => m.type === 'order_cancel_reversal' && m.quantityDelta === product.minOrderQuantity), true);

    const count = await api('/api/inventory/count-adjustments', 'POST', { productId: product.id, countedQuantity: before + 3, note: 'Sayım testi' }, admin);
    assert.equal(count.status, 201);
    assert.equal(count.data.movement.quantityDelta, 3);
    const receipt = await api('/api/inventory/purchase-receipts', 'POST', { documentNo: 'PUR-LEDGER-1', supplierName: 'Test Tedarikçi', items: [{ productId: product.id, quantity: 2 }] }, admin);
    assert.equal(receipt.status, 201);
    assert.equal(receipt.data.movements[0].quantityDelta, 2);
    const transfer = await api('/api/inventory/transfers', 'POST', { productId: product.id, quantity: 1, warehouseFrom: 'Ana Depo', warehouseTo: 'Sevk Alanı' }, admin);
    assert.equal(transfer.status, 201);
    assert.equal(transfer.data.movement.type, 'warehouse_transfer');
    assert.equal((await api('/api/products')).data.products.find(p => p.id === product.id).stock, before + 5);
    assert.equal((await api('/api/inventory/reorder-suggestions', 'GET', undefined, admin)).status, 200);
  } finally {
    server.close();
  }
});


// POS yeniden ele alınınca aktifleştirilecek
test.skip('POS order uses server VAT, pending state, stock guard and idempotency', async () => {
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const api = async (path, method = 'GET', body, token, key) => {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, body: body ? JSON.stringify(body) : undefined });
      return { status: response.status, data: await response.json() };
    };
    const admin = (await api('/api/auth/login', 'POST', { emailOrUsername: 'admin', password: 'test-admin-password' })).data.token;
    const catalog = (await api('/api/products')).data.products;
    const product = catalog.find(p => p.stock >= p.minOrderQuantity + 1 && p.price > 0);
    assert.ok(product);
    const before = product.stock;
    const body = { customerName: 'POS Buyer', items: [{ productId: product.id, quantity: product.minOrderQuantity, unitPrice: product.price }], discount: 1, paymentMethod: 'Nakit' };
    const first = await api('/api/orders', 'POST', body, admin, 'pos-order-unique');
    assert.equal(first.status, 201);
    assert.equal(first.data.order.status, 'pending');
    assert.equal(first.data.order.paymentMethod, 'Nakit');
    assert.equal(first.data.order.tax, Math.round((first.data.order.subtotal - 1) * 20) / 100);
    assert.equal(first.data.order.total, first.data.order.subtotal - 1 + first.data.order.tax);
    assert.equal((await api('/api/orders', 'POST', body, admin, 'pos-order-unique')).data.order.id, first.data.order.id);
    assert.equal((await api('/api/products')).data.products.find(p => p.id === product.id).stock, before - product.minOrderQuantity);
    const competing = await Promise.all([api('/api/orders', 'POST', { ...body, items: [{ ...body.items[0], quantity: before - product.minOrderQuantity }] }, admin), api('/api/orders', 'POST', { ...body, items: [{ ...body.items[0], quantity: before - product.minOrderQuantity }] }, admin)]);
    assert.deepEqual(competing.map(r => r.status).sort(), [201, 409]);
    assert.equal((await api('/api/products')).data.products.find(p => p.id === product.id).stock, 0);
    assert.equal((await api('/api/products/low-stock', 'GET', undefined, admin)).data.products?.some(p => p.id === product.id) ?? (await api('/api/products/low-stock', 'GET', undefined, admin)).data.lowStockProducts?.some(p => p.id === product.id), true);
  } finally { server.close(); }
});
