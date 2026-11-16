# SePay VietQR, Polar, and Stripe Payment Verification

Keep every payment integration in **sandbox or test mode first** until you verify checkout creation, signed webhook validation, and duplicate-delivery idempotency. Ask the user for explicit approval before switching to live keys. Client redirect URLs (`success_url`) only render confirmation UI and do not prove payment.

## 1. Vietnam Bank Transfers with SePay and VietQR

SePay monitors Vietnamese bank accounts (including Virtual Accounts) and sends signed webhooks when money lands.

### Generating a VietQR Payment Code

Use `https://vietqr.app/img` with a unique order code in `des` so SePay matches incoming transfers automatically:

```ts
export function buildVietQrUrl({
  account,
  bank,
  amountVnd,
  orderCode,
}: {
  account: string;
  bank: string;
  amountVnd: number;
  orderCode: string;
}) {
  const params = new URLSearchParams({
    acc: account,
    bank,
    amount: String(Math.round(amountVnd)),
    des: orderCode,
    template: 'compact',
  });
  return `https://vietqr.app/img?${params.toString()}`;
}
```

Display the bank name, account number, exact VND integer amount, and transfer memo (`orderCode`) as selectable text next to the QR image so customers can copy them manually if needed.

Bank notes to check during setup:
- **VietinBank (personal/household):** include `SEVQR` inside `des` (for example `SEVQR DH1042`), otherwise SePay does not receive the bank event.
- **OCB, MSB, KienLongBank, or BIDV (personal/household):** configure a Virtual Account (VA) in SePay for reliable automatic matching.

For hosted SePay checkout forms (gateway redirect), generate signed fields with `scripts/checkout-helper.js` (`CheckoutHelper.generateSePayCheckout`, which defaults to `https://pay-sandbox.sepay.vn/v1/checkout/init` until `env: 'production'` is approved).

### Verifying SePay Webhooks (`POST /api/webhooks/sepay`)

SePay supports `hmac` (recommended), `api_key`, `oauth2` (requires passing `options.verifyOAuth2Token` to validate tokens against your token store), and `none` (local testing only). Use `SePayWebhookVerifier` from `./scripts/sepay-webhook-verify.js`:

1. Capture the raw request string (`const rawBody = await request.text()`) before parsing JSON so HMAC verification sees exact bytes.
2. Verify headers using `hmac` (`X-SePay-Signature: sha256=...` and `X-SePay-Timestamp` within 300 seconds) or `api_key` (`Authorization: Apikey <key>`). Reject invalid signatures with HTTP `401`.
3. Deduplicate on `transaction.id` inside a database transaction (`UNIQUE` constraint on `sepay_transactions.sepay_id`) because SePay retries failed calls on a Fibonacci schedule (1, 1, 2, 3, 5, 8, 13 min) and allows manual replays.
4. Confirm `result.isIncoming` (`transferType === 'in'`), match the order code (`transaction.code` or parsed `transaction.content`), and verify `transaction.transferAmount >= order.amountVnd` before marking the order `paid`.
5. Respond with **HTTP `200` (or `201`) and body exactly `{"success": true}`** within 30 seconds:

```js
const SePayWebhookVerifier = require('./scripts/sepay-webhook-verify.js');

const verifier = new SePayWebhookVerifier('hmac', process.env.SEPAY_WEBHOOK_SECRET);
const result = verifier.process(rawBody, request.headers);
if (!result.success) {
  return Response.json({ success: false, error: result.error }, { status: 401 });
}
// Insert transaction id into UNIQUE table; if new and amount >= expected, mark order paid
return Response.json({ success: true }, { status: 200 });
```

## 2. Global SaaS and Digital Products with Polar

Polar acts as Merchant of Record (handles global VAT/sales tax) and supports one-time checkouts and subscriptions.

- **Create checkout sessions** server-side with `CheckoutHelper.generatePolarCheckout` (`scripts/checkout-helper.js`). Keep `server: 'sandbox'` (`https://sandbox-api.polar.sh/v1/checkouts/`) during development, supply an absolute `successUrl`, and attach `externalCustomerId` / `metadata.orderId` so webhooks map back to your user record.
- **Verify webhooks** with `PolarWebhookVerifier` from `scripts/polar-webhook-verify.js`. Polar sends Standard Webhooks headers (`webhook-id`, `webhook-timestamp`, `webhook-signature`) signed over `${webhook-id}.${webhook-timestamp}.${rawBody}` and may use either a modern `whsec_` base64 key or a legacy UTF-8 HMAC secret—`PolarWebhookVerifier` handles both with 300-second replay protection.
- **Fulfill on `order.paid`** (`PolarWebhookVerifier.isPaymentEvent(event.type)`), not `order.created` alone (which can still be pending on renewals). Sync subscription access on `subscription.*` events (`PolarWebhookVerifier.isSubscriptionEvent(event.type)`), deduplicating by `webhook-id`.

## 3. Global Cards and Subscriptions with Stripe

- **Checkout creation:** create a Stripe Checkout Session in a Route Handler or Server Action using `STRIPE_SECRET_KEY` (`sk_test_...` during sandbox testing), server-resolved `line_items`, and `metadata: { orderId }`.
- **Webhook verification (`POST /api/webhooks/stripe`):** read `const rawBody = await request.text()`, pass it with `request.headers.get('stripe-signature')` and `process.env.STRIPE_WEBHOOK_SECRET` into `stripe.webhooks.constructEvent(...)`. Do not pass `0` for tolerance.
- **Fulfillment and idempotency:** record `event.id` in a `UNIQUE` `webhook_events` table, fulfill orders on `checkout.session.completed` and `checkout.session.async_payment_succeeded` only when `session.payment_status !== 'unpaid'`, and handle `checkout.session.async_payment_failed`, `invoice.paid`, and `customer.subscription.*`.

## 4. Verification Before Switching to Live Keys

1. Run `node --test scripts/tests/*.mjs` to verify SePay HMAC/API-key validation, Polar Standard/legacy signature checks, timestamp expiry rejection, and checkout config generation.
2. Replay at least one sandbox webhook (via `polar listen`, `stripe listen --forward-to ...`, or a simulated `SePayWebhookVerifier` payload) and verify a second identical delivery leaves order state unchanged.
3. Ask the user explicitly before replacing sandbox credentials with production keys (`SEPAY_ENV=production`, Polar production token, Stripe `sk_live_...` / `whsec_...`).
