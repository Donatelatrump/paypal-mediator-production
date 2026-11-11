import test from 'node:test';
import assert from 'node:assert/strict';
import { transactions, dossiers } from '../src/data/fixtures.js';
import { money } from '../src/lib/format.js';
import { createApi } from '../src/lib/api.js';

test('fixture transactions preserve document coverage and source relationships', () => {
  for (const transaction of transactions) {
    assert.equal(transaction.status, 'COMPLETED');
    assert.equal(typeof transaction.amount.value, 'string');
    assert.match(transaction.id, /^[0-9a-f-]{36}$/);
    const dossier = dossiers[transaction.id];
    assert.equal(dossier.transactionId, transaction.id);
    for (const check of transaction.readiness.checks) {
      for (const id of check.evidenceIds)
        assert.ok(dossier.items.some((item) => item.id === id));
    }
    if (transaction.readiness.status === 'READY')
      assert.ok(
        transaction.readiness.checks.every(
          (check) => check.status === 'PRESENT',
        ),
      );
    if (transaction.order) {
      const units = (value) => BigInt(value) * 100n;
      const order = transaction.order;
      const subtotal = order.items.reduce(
        (sum, item) => sum + units(item.unitAmount) * BigInt(item.quantity),
        0n,
      );
      assert.equal(
        subtotal +
          units(order.shippingAmount) +
          units(order.taxAmount) -
          units(order.discountAmount),
        units(order.totalAmount),
      );
    }
  }
});
test('money formatting keeps precision and currency', () => {
  assert.equal(
    money({ currencyCode: 'EUR', value: '9999999999999999.12345678' }),
    'EUR 9,999,999,999,999,999.12345678',
  );
  assert.equal(money({ currencyCode: 'USD', value: '1' }), 'USD 1.00');
  assert.equal(money(null), '—');
});
test('API client requires a session, sends exact supported filters, and preserves errors', async () => {
  const original = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return Response.json({ items: [], total: 0, page: 2, pageSize: 20 });
    };
    await assert.rejects(
      createApi({
        baseUrl: '/api',
        getAccessToken: async () => null,
      }).merchant(),
      (error) => error.status === 401,
    );
    assert.equal(calls.length, 0);
    const api = createApi({
      baseUrl: 'https://example.test/api/',
      getAccessToken: async () => 'user-access-token',
    });
    await api.transactions({ page: 2, paypalCaptureId: 'CAPTURE-1' });
    assert.equal(
      calls[0].url,
      'https://example.test/api/transactions?page=2&pageSize=20&paypalCaptureId=CAPTURE-1',
    );
    assert.equal(
      calls[0].options.headers.Authorization,
      'Bearer user-access-token',
    );
    globalThis.fetch = async () =>
      Response.json(
        { code: 'FORBIDDEN', message: 'Not permitted', requestId: 'request-1' },
        { status: 403 },
      );
    await assert.rejects(
      api.merchant(),
      (error) =>
        error.status === 403 &&
        error.requestId === 'request-1' &&
        error.code === 'FORBIDDEN',
    );
  } finally {
    globalThis.fetch = original;
  }
});
