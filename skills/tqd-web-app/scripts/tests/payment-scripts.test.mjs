import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptsDir = dirname(dirname(fileURLToPath(import.meta.url)));
const SePayWebhookVerifier = require('../sepay-webhook-verify.js');
const PolarWebhookVerifier = require('../polar-webhook-verify.js');
const CheckoutHelper = require('../checkout-helper.js');

const SAMPLE_SEPAY_PAYLOAD = {
  id: 92704,
  gateway: 'Vietcombank',
  transactionDate: '2026-03-15 10:30:00',
  accountNumber: '0123456789',
  code: 'DH001',
  content: 'DH001 thanh toan don hang',
  transferType: 'in',
  description: 'NGUYEN VAN A chuyen tien',
  transferAmount: 250000,
  accumulated: 1500000,
  referenceCode: 'FT2607412345'
};

test('SePayWebhookVerifier: none mode validates valid incoming and outgoing payloads', () => {
  const verifier = new SePayWebhookVerifier('none', null, { allowUnauthenticated: true });

  const incoming = verifier.process(SAMPLE_SEPAY_PAYLOAD);
  assert.equal(incoming.success, true);
  assert.equal(incoming.transaction.id, 92704);
  assert.equal(incoming.transaction.transferAmount, 250000);
  assert.equal(incoming.isIncoming, true);
  assert.equal(incoming.isOutgoing, false);
  assert.deepEqual(incoming.response, { status: 200, body: { success: true } });

  const outgoing = verifier.process({ ...SAMPLE_SEPAY_PAYLOAD, transferType: 'out' });
  assert.equal(outgoing.success, true);
  assert.equal(outgoing.isIncoming, false);
  assert.equal(outgoing.isOutgoing, true);
});

test('SePayWebhookVerifier: rejects invalid payload structure and amounts', () => {
  const verifier = new SePayWebhookVerifier('none', null, { allowUnauthenticated: true });

  const badType = verifier.process({ ...SAMPLE_SEPAY_PAYLOAD, transferType: 'refund' });
  assert.equal(badType.success, false);
  assert.match(badType.error, /Invalid transferType/);

  const zeroAmount = verifier.process({ ...SAMPLE_SEPAY_PAYLOAD, transferAmount: 0 });
  assert.equal(zeroAmount.success, false);
  assert.match(zeroAmount.error, /Invalid transferAmount/);

  const floatAmount = verifier.process({ ...SAMPLE_SEPAY_PAYLOAD, transferAmount: 99.5 });
  assert.equal(floatAmount.success, false);
  assert.match(floatAmount.error, /Invalid transferAmount/);

  const { referenceCode: _removed, ...missingField } = SAMPLE_SEPAY_PAYLOAD;
  const missing = verifier.process(missingField);
  assert.equal(missing.success, false);
  assert.match(missing.error, /Missing required field: referenceCode/);

  const badJson = verifier.process('{not-valid-json');
  assert.equal(badJson.success, false);
});

test('SePayWebhookVerifier: api_key mode validates header case-insensitively and rejects wrong keys', () => {
  const verifier = new SePayWebhookVerifier('api_key', 'sp_test_api_key_123');

  const valid = verifier.process(SAMPLE_SEPAY_PAYLOAD, {
    authorization: 'Apikey sp_test_api_key_123'
  });
  assert.equal(valid.success, true);

  const missingHeader = verifier.process(SAMPLE_SEPAY_PAYLOAD, {});
  assert.equal(missingHeader.success, false);
  assert.match(missingHeader.error, /Missing Authorization header/);

  const wrongKey = verifier.process(SAMPLE_SEPAY_PAYLOAD, {
    Authorization: 'Apikey wrong_key'
  });
  assert.equal(wrongKey.success, false);
  assert.match(wrongKey.error, /Invalid API key/);

  const noSecretVerifier = new SePayWebhookVerifier('api_key', '');
  assert.equal(noSecretVerifier.process(SAMPLE_SEPAY_PAYLOAD, { Authorization: 'Apikey x' }).success, false);
});

test('SePayWebhookVerifier: hmac mode verifies signature, rejects tampering, and enforces timestamp window', () => {
  const secret = 'sepay_hmac_secret_test';
  const fixedNow = 1770000000;
  const verifier = new SePayWebhookVerifier('hmac', secret, { now: () => fixedNow });
  const rawBody = JSON.stringify(SAMPLE_SEPAY_PAYLOAD);
  const ts = String(fixedNow - 30);

  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${rawBody}`)
    .digest('hex');

  assert.equal(SePayWebhookVerifier.sign(secret, ts, rawBody), expectedSig);

  const valid = verifier.process(rawBody, {
    'X-SePay-Signature': expectedSig,
    'X-SePay-Timestamp': ts
  });
  assert.equal(valid.success, true);
  assert.equal(valid.transaction.code, 'DH001');

  const validFromObject = verifier.process(
    SAMPLE_SEPAY_PAYLOAD,
    { 'x-sepay-signature': expectedSig, 'x-sepay-timestamp': ts },
    rawBody
  );
  assert.equal(validFromObject.success, true);

  const tampered = verifier.process(rawBody.replace('250000', '250001'), {
    'X-SePay-Signature': expectedSig,
    'X-SePay-Timestamp': ts
  });
  assert.equal(tampered.success, false);
  assert.equal(tampered.error, 'Invalid signature');

  const expiredTs = String(fixedNow - 301);
  const expiredSig = SePayWebhookVerifier.sign(secret, expiredTs, rawBody);
  const expired = verifier.process(rawBody, {
    'X-SePay-Signature': expiredSig,
    'X-SePay-Timestamp': expiredTs
  });
  assert.equal(expired.success, false);
  assert.equal(expired.error, 'Signature timestamp outside tolerance');

  const futureTs = String(fixedNow + 301);
  const futureSig = SePayWebhookVerifier.sign(secret, futureTs, rawBody);
  const future = verifier.process(rawBody, {
    'X-SePay-Signature': futureSig,
    'X-SePay-Timestamp': futureTs
  });
  assert.equal(future.success, false);
  assert.equal(future.error, 'Signature timestamp outside tolerance');

  const missingHeaders = verifier.process(rawBody, {});
  assert.equal(missingHeaders.success, false);
  assert.match(missingHeaders.error, /Missing X-SePay-Signature/);

  const missingRawBody = verifier.process(SAMPLE_SEPAY_PAYLOAD, {
    'X-SePay-Signature': expectedSig,
    'X-SePay-Timestamp': ts
  });
  assert.equal(missingRawBody.success, false);
  assert.match(missingRawBody.error, /Raw body required/);
});

test('SePayWebhookVerifier: isDuplicate detects seen transaction ids', () => {
  const verifier = new SePayWebhookVerifier('none', null, { allowUnauthenticated: true });
  const seen = new Set([92704]);
  assert.equal(verifier.isDuplicate(92704, seen), true);
  assert.equal(verifier.isDuplicate(92705, seen), false);
});

test('SePayWebhookVerifier: oauth2 requires verifier callback and supports Web Headers', () => {
  const noCallback = new SePayWebhookVerifier('oauth2');
  const rejected = noCallback.process(SAMPLE_SEPAY_PAYLOAD, new Headers({ Authorization: 'Bearer fake_token' }));
  assert.equal(rejected.success, false);
  assert.match(rejected.error, /OAuth2 token verifier callback required/);

  const withCallback = new SePayWebhookVerifier('oauth2', null, {
    verifyOAuth2Token: (token) => token === 'valid_secret_token'
  });
  const badToken = withCallback.process(SAMPLE_SEPAY_PAYLOAD, new Headers({ Authorization: 'Bearer fake_token' }));
  assert.equal(badToken.success, false);
  assert.match(badToken.error, /Invalid or expired OAuth2 Bearer token/);

  const goodToken = withCallback.process(SAMPLE_SEPAY_PAYLOAD, new Headers({ Authorization: 'Bearer valid_secret_token' }));
  assert.equal(goodToken.success, true);
});

test('fail-closed: constructor without authType throws', () => {
  assert.throws(() => new SePayWebhookVerifier(), /authType is required/);
  assert.throws(() => new SePayWebhookVerifier('basic'), /authType is required/);
});

test('fail-closed: none without allowUnauthenticated throws', () => {
  assert.throws(() => new SePayWebhookVerifier('none'), /allowUnauthenticated/);
  assert.throws(() => new SePayWebhookVerifier('none', null, { allowUnauthenticated: 'yes' }), /allowUnauthenticated/);
});

test('fail-closed: none is rejected when NODE_ENV=production', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    assert.throws(
      () => new SePayWebhookVerifier('none', null, { allowUnauthenticated: true }),
      /disabled when NODE_ENV=production/
    );
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

const BEARER = { Authorization: 'Bearer forged_token' };

test('fail-closed: sync process rejects an async oauth2 verifier', () => {
  for (const answer of [false, true]) {
    const verifier = new SePayWebhookVerifier('oauth2', null, { verifyOAuth2Token: async () => answer });
    const result = verifier.process(SAMPLE_SEPAY_PAYLOAD, BEARER);
    assert.equal(result.success, false);
    assert.match(result.error, /Promise/);
  }
});

test('fail-closed: processAsync rejects when async verifier resolves false', async () => {
  const verifier = new SePayWebhookVerifier('oauth2', null, { verifyOAuth2Token: async () => false });
  const result = await verifier.processAsync(SAMPLE_SEPAY_PAYLOAD, BEARER);
  assert.equal(result.success, false);
  assert.equal(result.error, 'Invalid or expired OAuth2 Bearer token');
});

test('fail-closed: processAsync accepts when async verifier resolves true', async () => {
  const verifier = new SePayWebhookVerifier('oauth2', null, {
    verifyOAuth2Token: async (token) => token === 'valid_secret_token'
  });
  const result = await verifier.processAsync(JSON.stringify(SAMPLE_SEPAY_PAYLOAD), {
    Authorization: 'Bearer valid_secret_token'
  });
  assert.equal(result.success, true);
  assert.equal(result.transaction.id, 92704);
});

test('fail-closed: oauth2 verifier returning a truthy non-true value is rejected', async () => {
  for (const answer of ['yes', 1, {}]) {
    const verifier = new SePayWebhookVerifier('oauth2', null, { verifyOAuth2Token: () => answer });
    const sync = verifier.process(SAMPLE_SEPAY_PAYLOAD, BEARER);
    assert.equal(sync.success, false);
    assert.equal(sync.error, 'Invalid or expired OAuth2 Bearer token');
    const viaAsync = await verifier.processAsync(SAMPLE_SEPAY_PAYLOAD, BEARER);
    assert.equal(viaAsync.success, false);
    assert.equal(viaAsync.error, 'Invalid or expired OAuth2 Bearer token');
  }
});

test('fail-closed: hmac result comes from the signed body, not the passed object', () => {
  const secret = 'sepay_hmac_secret_test';
  const fixedNow = 1770000000;
  const verifier = new SePayWebhookVerifier('hmac', secret, { now: () => fixedNow });
  const signedBody = JSON.stringify(SAMPLE_SEPAY_PAYLOAD);
  const ts = String(fixedNow - 30);
  const headers = {
    'X-SePay-Signature': SePayWebhookVerifier.sign(secret, ts, signedBody),
    'X-SePay-Timestamp': ts
  };
  const unsignedObject = { ...SAMPLE_SEPAY_PAYLOAD, id: 1, transferAmount: 999999999 };

  const result = verifier.process(unsignedObject, headers, signedBody);
  assert.equal(result.success, true);
  assert.equal(result.transaction.id, 92704);
  assert.equal(result.transaction.transferAmount, 250000);
});

test('fail-closed: sync process survives an async verifier that rejects', async () => {
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    const verifier = new SePayWebhookVerifier('oauth2', null, {
      verifyOAuth2Token: async () => { throw new Error('boom'); }
    });
    const result = verifier.process(SAMPLE_SEPAY_PAYLOAD, BEARER);
    assert.equal(result.success, false);
    assert.match(result.error, /Promise/);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});

test('PolarWebhookVerifier: verifies Standard Webhooks and legacy Polar HMAC schemes', () => {
  assert.throws(() => new PolarWebhookVerifier(''), /Webhook secret is required/);

  const rawKey = 'polar_test_signing_key';
  const secret = `whsec_${Buffer.from(rawKey).toString('base64')}`;
  const verifier = new PolarWebhookVerifier(secret);
  assert.equal(PolarWebhookVerifier.signingKeys(secret).length, 2);

  const payload = JSON.stringify({
    type: 'order.paid',
    timestamp: '2026-03-15T10:30:00Z',
    api_version: '2026-04',
    data: { id: 'ord_123', amount: 2900 }
  });

  const ts = String(Math.floor(Date.now() / 1000));
  const webhookId = 'msg_test_001';
  const independentSig = crypto
    .createHmac('sha256', Buffer.from(rawKey))
    .update(`${webhookId}.${ts}.${payload}`)
    .digest('base64');

  const standardResult = verifier.process(payload, {
    'Webhook-Id': webhookId,
    'Webhook-Timestamp': ts,
    'Webhook-Signature': `v1,${independentSig}`
  });
  assert.equal(standardResult.success, true);
  assert.equal(standardResult.event.type, 'order.paid');
  assert.equal(standardResult.event.apiVersion, '2026-04');
  assert.equal(standardResult.event.data.id, 'ord_123');

  const legacyHeaders = PolarWebhookVerifier.sign(payload, secret, { scheme: 'legacy' });
  const legacyResult = verifier.process(Buffer.from(payload, 'utf8'), legacyHeaders);
  assert.equal(legacyResult.success, true);
});

test('PolarWebhookVerifier: rejects tampered payload, bad signatures, missing headers, and stale timestamps', () => {
  const secret = `whsec_${Buffer.from('polar_test_signing_key').toString('base64')}`;
  const verifier = new PolarWebhookVerifier(secret);
  const payload = JSON.stringify({
    type: 'subscription.active',
    data: { id: 'sub_123', amount: 1500 }
  });

  const validHeaders = PolarWebhookVerifier.sign(payload, secret);

  const tampered = verifier.process(payload.replace('1500', '1501'), validHeaders);
  assert.equal(tampered.success, false);
  assert.equal(tampered.error, 'Invalid webhook signature');

  const wrongSig = verifier.process(payload, {
    ...validHeaders,
    'webhook-signature': 'v1,aW52YWxpZF9zaWduYXR1cmU='
  });
  assert.equal(wrongSig.success, false);
  assert.equal(wrongSig.error, 'Invalid webhook signature');

  const missingHeaders = verifier.process(payload, { 'webhook-id': 'msg_1' });
  assert.equal(missingHeaders.success, false);
  assert.equal(missingHeaders.error, 'Missing required webhook headers');

  const expiredTs = Math.floor(Date.now() / 1000) - 301;
  const expiredHeaders = PolarWebhookVerifier.sign(payload, secret, { timestamp: expiredTs });
  const expired = verifier.process(payload, expiredHeaders);
  assert.equal(expired.success, false);
  assert.equal(expired.error, 'Webhook timestamp too old or in future');

  const badTimestamp = verifier.process(payload, {
    ...validHeaders,
    'webhook-timestamp': 'not-a-number'
  });
  assert.equal(badTimestamp.success, false);
  assert.equal(badTimestamp.error, 'Invalid webhook-timestamp header');

  const missingEventTypeHeaders = PolarWebhookVerifier.sign(JSON.stringify({ data: {} }), secret);
  const invalidEvent = verifier.process(JSON.stringify({ data: {} }), missingEventTypeHeaders);
  assert.equal(invalidEvent.success, false);
  assert.equal(invalidEvent.error, 'Invalid event structure');
});

test('PolarWebhookVerifier: categorizes events and distinguishes paid vs subscription events', () => {
  assert.equal(PolarWebhookVerifier.getEventCategory('order.paid'), 'order');
  assert.equal(PolarWebhookVerifier.getEventCategory('subscription.active'), 'subscription');
  assert.equal(PolarWebhookVerifier.getEventCategory('checkout.updated'), 'checkout');
  assert.equal(PolarWebhookVerifier.getEventCategory('custom.unknown'), 'unknown');
  assert.equal(PolarWebhookVerifier.isPaymentEvent('order.paid'), true);
  assert.equal(PolarWebhookVerifier.isPaymentEvent('order.created'), false);
  assert.equal(PolarWebhookVerifier.isSubscriptionEvent('subscription.canceled'), true);
  assert.equal(PolarWebhookVerifier.isSubscriptionEvent('order.paid'), false);
});

test('CheckoutHelper: generates SePay sandbox/production checkout fields, valid HMAC signature, and escaped HTML form', () => {
  const config = {
    merchantId: 'SP-TEST-001',
    secretKey: 'sepay_pg_secret',
    orderInvoiceNumber: 'INV-2026-01',
    orderAmount: 199000,
    successUrl: 'https://example.com/pay/success',
    errorUrl: 'https://example.com/pay/error',
    cancelUrl: 'https://example.com/pay/cancel',
    env: 'sandbox'
  };

  const sandbox = CheckoutHelper.generateSePayCheckout(config);
  assert.equal(sandbox.formUrl, 'https://pay-sandbox.sepay.vn/v1/checkout/init');
  assert.equal(sandbox.fields.merchant, 'SP-TEST-001');
  assert.equal(sandbox.fields.currency, 'VND');
  assert.equal(sandbox.fields.order_amount, '199000');

  const expectedSigned =
    'merchant=SP-TEST-001,currency=VND,order_amount=199000,operation=PURCHASE,' +
    'order_description=Order INV-2026-01,order_invoice_number=INV-2026-01,' +
    'success_url=https://example.com/pay/success,error_url=https://example.com/pay/error,' +
    'cancel_url=https://example.com/pay/cancel';
  const expectedSig = crypto
    .createHmac('sha256', 'sepay_pg_secret')
    .update(expectedSigned)
    .digest('base64');
  assert.equal(sandbox.fields.signature, expectedSig);

  const production = CheckoutHelper.generateSePayCheckout({ ...config, env: 'production' });
  assert.equal(production.formUrl, 'https://pay.sepay.vn/v1/checkout/init');

  const escaped = CheckoutHelper.generateSePayCheckout({
    ...config,
    orderDescription: 'Order "><script>alert(1)</script>'
  });
  assert.match(escaped.htmlForm, /value="Order &quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;"/);

  assert.throws(
    () => CheckoutHelper.generateSePayCheckout({ merchantId: 'SP-TEST-001' }),
    /Missing required field/
  );
});

test('CheckoutHelper: generates Polar sandbox/production checkout configs and validates required URLs', () => {
  const sandbox = CheckoutHelper.generatePolarCheckout({
    productId: 'prod_123',
    successUrl: 'https://example.com/success?checkout_id={CHECKOUT_ID}',
    externalCustomerId: 'user_42',
    customerEmail: 'buyer@example.com',
    metadata: { orderId: 'ord_42' },
    server: 'sandbox'
  });

  assert.equal(sandbox.apiEndpoint, 'https://sandbox-api.polar.sh/v1/checkouts/');
  assert.deepEqual(sandbox.config.products, ['prod_123']);
  assert.equal(sandbox.config.external_customer_id, 'user_42');
  assert.equal(sandbox.config.customer_email, 'buyer@example.com');
  assert.match(sandbox.curlCommand, /https:\/\/sandbox-api\.polar\.sh\/v1\/checkouts\//);
  assert.match(sandbox.curlCommand, /Bearer \$POLAR_ACCESS_TOKEN/);

  const defaultSandbox = CheckoutHelper.generatePolarCheckout({
    productId: 'prod_default',
    successUrl: 'https://example.com/success'
  });
  assert.equal(defaultSandbox.apiEndpoint, 'https://sandbox-api.polar.sh/v1/checkouts/');

  const prod = CheckoutHelper.generatePolarCheckout({
    products: ['prod_a', 'prod_b'],
    successUrl: 'https://example.com/success',
    server: 'production',
    accessToken: 'polar_oat_test'
  });
  assert.equal(prod.apiEndpoint, 'https://api.polar.sh/v1/checkouts/');
  assert.deepEqual(prod.config.products, ['prod_a', 'prod_b']);
  assert.match(prod.curlCommand, /Bearer polar_oat_test/);

  assert.throws(
    () => CheckoutHelper.generatePolarCheckout({ successUrl: 'https://example.com/success' }),
    /Missing required field: productId or products/
  );
  assert.throws(
    () => CheckoutHelper.generatePolarCheckout({ productId: 'prod_123' }),
    /Missing required field: successUrl/
  );
  assert.throws(
    () => CheckoutHelper.generatePolarCheckout({ productId: 'prod_123', successUrl: '/success' }),
    /successUrl must be an absolute URL/
  );
});

test('Payment CLI scripts handle --help with exit code 0', () => {
  for (const name of ['sepay-webhook-verify.js', 'polar-webhook-verify.js', 'checkout-helper.js']) {
    const res = spawnSync(process.execPath, [join(scriptsDir, name), '--help'], { encoding: 'utf8' });
    assert.equal(res.status, 0, `${name} --help failed: ${res.stderr}`);
    assert.match(res.stdout, /Usage:/);
  }
});
