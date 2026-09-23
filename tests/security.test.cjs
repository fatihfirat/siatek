const assert = require('node:assert/strict');
const { test } = require('node:test');
process.env.NODE_ENV = 'test';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'test-admin-password-for-security-suite';
const { app } = require('../dist/server.cjs');

async function json(base, route, method = 'GET', body, token) {
  const response = await fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}

test('guest, two customers and admin permission boundaries', async () => {
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const customer = async (email, name) => {
      const result = await json(base, '/api/auth/register', 'POST', { email, password: 'test-password', name, companyName: name, phone: '5551234567' });
      assert.equal(result.status, 201);
      return result.data.token;
    };
    const a = await customer('test-a@example.invalid', 'Shared Name');
    const b = await customer('test-b@example.invalid', 'Shared Name');
    const guest = await json(base, '/api/orders');
    assert.equal(guest.status, 401);
    const catalog = await json(base, '/api/products');
    const product = catalog.data.products.find(item => item.stock > 0 && item.minOrderQuantity <= item.stock);
    const order = await json(base, '/api/orders', 'POST', { customerName: 'Shared Name', customerEmail: 'test-b@example.invalid', items: [{ productId: product.id, quantity: product.minOrderQuantity, unitPrice: 10 }] }, a);
    assert.equal(order.status, 201);
    assert.equal(order.data.order.customerEmail, 'test-a@example.invalid');
    const aOrders = await json(base, '/api/orders', 'GET', null, a);
    const bOrders = await json(base, '/api/orders', 'GET', null, b);
    assert.ok(aOrders.data.orders.some(item => item.id === order.data.order.id));
    assert.ok(!bOrders.data.orders.some(item => item.id === order.data.order.id));
    const quote = await json(base, '/api/quotes/request', 'POST', { customerName: 'Shared Name', customerEmail: 'test-b@example.invalid', requestedItems: [{ productName: 'Test Item', requestedQuantity: 1 }] }, a);
    assert.equal(quote.status, 201);
    assert.equal(quote.data.quote.customerEmail, 'test-a@example.invalid');
    const bQuotes = await json(base, '/api/quotes', 'GET', null, b);
    assert.ok(!bQuotes.data.quotes.some(item => item.id === quote.data.quote.id));
    assert.equal((await json(base, `/api/quotes/${quote.data.quote.id}/accept`, 'POST', null, b)).status, 403);
    assert.equal((await json(base, `/api/orders/${order.data.order.id}/status`, 'PATCH', { status: 'approved' }, a)).status, 403);
    assert.equal((await json(base, '/api/products', 'POST', { name: 'Forbidden' }, a)).status, 403);
    assert.equal((await json(base, '/api/events', 'GET', null, a)).status, 403);
    assert.equal((await json(base, '/api/backup/import/dry-run', 'POST', { backupData: { data: { products: [] } } }, a)).status, 403);
    assert.equal((await json(base, '/api/bank-statements/import', 'POST', { entries: [{ amount: 100 }] }, a)).status, 403);
    assert.equal((await json(base, '/api/invoices/inv-1003/send-gib', 'POST', null, a)).status, 403);
    const adminLogin = await json(base, '/api/auth/login', 'POST', { emailOrUsername: 'admin', password: 'test-admin-password-for-security-suite' });
    assert.equal(adminLogin.status, 200);
    assert.equal((await json(base, `/api/orders/${order.data.order.id}/status`, 'PATCH', { status: 'approved' }, adminLogin.data.token)).status, 200);
    const disabledGib = await json(base, '/api/invoices/inv-1003/send-gib', 'POST', null, adminLogin.data.token);
    assert.equal(disabledGib.status, 503);
    process.env.GIB_INTEGRATION_ENABLED = 'true';
    const sentGib = await json(base, '/api/invoices/inv-1003/send-gib', 'POST', null, adminLogin.data.token);
    assert.equal(sentGib.status, 200);
    assert.equal(sentGib.data.invoice.status, 'sent');
    assert.ok(sentGib.data.gib.requestId.startsWith('GIB-TEST-'));
    const dryRun = await json(base, '/api/backup/import/dry-run', 'POST', { backupData: { data: { products: [{ id: 'p-test', name: 'Test', price: 1 }] } } }, adminLogin.data.token);
    assert.equal(dryRun.status, 200);
    assert.equal(dryRun.data.dryRun, true);
    const bankImport = await json(base, '/api/bank-statements/import', 'POST', { entries: [{ description: order.data.order.orderNumber, amount: order.data.order.total, referenceNo: 'BANK-TEST' }] }, adminLogin.data.token);
    assert.equal(bankImport.status, 201);
    assert.equal(bankImport.data.matchedCount, 1);
  } finally {
    delete process.env.GIB_INTEGRATION_ENABLED;
    server.close();
  }
});
