const assert = require('node:assert/strict');
const { test } = require('node:test');
process.env.NODE_ENV = 'test';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'test-admin-password';
const { app } = require('../dist/server.cjs');

test('CustomerPortal full order flow simulation', async () => {
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const api = async (route, method = 'GET', body, token, key) => {
      const response = await fetch(base + route, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(key ? { 'Idempotency-Key': key } : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      return { status: response.status, data };
    };

    // 1. Customer registration/login
    const login = await api('/api/auth/register', 'POST', {
      email: 'customer-flow@example.invalid',
      password: 'test-password',
      name: 'Customer Flow Buyer',
      companyName: 'Customer Flow Buyer',
      phone: '5551234567',
      address: 'Şanlıurfa'
    });
    console.log('Login result:', login.status, login.data.user?.email);
    assert.equal(login.status, 201);
    const token = login.data.token;
    const user = login.data.user;

    // 2. Fetch products
    const prodRes = await api('/api/products');
    assert.equal(prodRes.status, 200);
    const products = prodRes.data.products;
    const prod = products.find(p => p.stock > 10 && p.price > 0);
    assert.ok(prod);

    // 3. CustomerPortal handleCreateOrder payload
    const paymentMethod = 'bank_transfer';
    const bankName = 'Ziraat Bankası';
    const paymentInfo = `Banka Havalesi / EFT (${bankName})`;
    const orderNotes = 'Lütfen teslimattan önce arayınız';
    const fullNotes = `${orderNotes} | Ödeme: ${paymentInfo}`;

    const cart = [{
      product: prod,
      quantity: prod.minOrderQuantity || 1,
      customerNote: ''
    }];

    const payload = {
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone,
      customerAddress: user.address || 'Şanlıurfa',
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unit: item.product.unit,
        unitPrice: item.product.price,
        note: item.customerNote,
      })),
      notes: fullNotes,
      encryptedPayload: 'mock-encrypted-data'
    };

    const key = 'a1b2c3d4-e5f6-7890-1234-56789abcdef0';
    const orderRes = await api('/api/orders', 'POST', payload, token, key);
    console.log('Order status:', orderRes.status, 'Data:', orderRes.data);
    assert.equal(orderRes.status, 201);
    assert.ok(orderRes.data.order?.id);
    assert.ok(orderRes.data.order?.orderNumber);

  } finally {
    server.close();
  }
});
