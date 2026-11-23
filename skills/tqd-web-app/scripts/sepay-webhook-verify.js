#!/usr/bin/env node

/**
 * SePay Webhook Verification Script
 *
 * Verifies SePay bank-transaction webhooks and normalizes the payload.
 * Auth modes (configured per webhook at my.sepay.vn):
 *   - hmac    : X-SePay-Signature: sha256=hex(HMAC_SHA256(secret, "{timestamp}.{rawBody}"))
 *               X-SePay-Timestamp: unix seconds (rejected when older/newer than 5 minutes)
 *   - api_key : Authorization: Apikey {API_KEY}
 *   - oauth2  : Authorization: Bearer {token issued by YOUR token endpoint}
 *   - none    : no authentication (local dry-run only; needs
 *               options.allowUnauthenticated: true, refused when NODE_ENV=production)
 *
 * A delivery only counts as successful when your endpoint answers
 * HTTP 200/201 with body exactly {"success": true} within 30 seconds.
 *
 * Usage:
 *   node sepay-webhook-verify.js <webhook-payload-json>
 *
 * Environment Variables:
 *   SEPAY_WEBHOOK_AUTH_TYPE - hmac | api_key | oauth2 | none
 *                             (CLI default: none, local dry-run only; refused when NODE_ENV=production)
 *   SEPAY_WEBHOOK_SECRET    - HMAC-SHA256 secret key (hmac)
 *   SEPAY_WEBHOOK_API_KEY   - API key (api_key)
 */

const crypto = require('crypto');

const SIGNATURE_TOLERANCE_SECONDS = 300;
const AUTH_TYPES = ['hmac', 'api_key', 'oauth2', 'none'];

function getHeader(headers, name) {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  if (typeof headers.get === 'function') {
    const value = headers.get(target) ?? headers.get(name);
    return value === null ? undefined : value;
  }
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) {
      const value = headers[key];
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

class SePayWebhookVerifier {
  /**
   * @param {'api_key'|'hmac'|'oauth2'|'none'} authType required; there is no default
   * @param {string|null} secret API key (api_key) or HMAC secret key (hmac)
   * @param {{ toleranceSeconds?: number, now?: () => number, verifyOAuth2Token?: Function, allowUnauthenticated?: boolean }} options
   *   `verifyOAuth2Token` must return exactly `true` to accept a token; async verifiers require processAsync().
   */
  constructor(authType, secret = null, options = {}) {
    if (!AUTH_TYPES.includes(authType)) {
      throw new Error('authType is required: hmac | api_key | oauth2 | none');
    }
    if (authType === 'none' && options.allowUnauthenticated !== true) {
      throw new Error('authType "none" requires options.allowUnauthenticated: true (local testing only)');
    }
    if (authType === 'none' && process.env.NODE_ENV === 'production') {
      throw new Error('authType "none" is disabled when NODE_ENV=production');
    }
    this.authType = authType;
    this.secret = secret;
    this.apiKey = secret; // kept for callers of the previous API-key-only verifier
    this.toleranceSeconds = options.toleranceSeconds ?? SIGNATURE_TOLERANCE_SECONDS;
    this.now = options.now || (() => Math.floor(Date.now() / 1000));
    this.verifyOAuth2Token = typeof options.verifyOAuth2Token === 'function' ? options.verifyOAuth2Token : null;
  }

  /**
   * Compute the X-SePay-Signature value for a raw body.
   */
  static sign(secret, timestamp, rawBody) {
    const digest = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    return `sha256=${digest}`;
  }

  /**
   * Verify webhook authenticity.
   * @param {object} headers request headers (any casing)
   * @param {string} rawBody exact request body bytes as received (required for hmac)
   */
  verifyAuthentication(headers = {}, rawBody = null) {
    if (this.authType === 'none') {
      console.warn('Warning: no webhook authentication configured (testing only)');
      return true;
    }

    if (this.authType === 'hmac') {
      if (!this.secret) throw new Error('Missing HMAC secret key');
      if (typeof rawBody !== 'string') throw new Error('Raw body required for HMAC verification');

      const signature = getHeader(headers, 'x-sepay-signature');
      const timestampHeader = getHeader(headers, 'x-sepay-timestamp');
      if (!signature || !timestampHeader) {
        throw new Error('Missing X-SePay-Signature or X-SePay-Timestamp header');
      }

      const timestamp = Number(timestampHeader);
      if (!Number.isFinite(timestamp) || Math.abs(this.now() - timestamp) > this.toleranceSeconds) {
        throw new Error('Signature timestamp outside tolerance');
      }

      const expected = SePayWebhookVerifier.sign(this.secret, timestampHeader, rawBody);
      if (!safeEqual(signature, expected)) {
        throw new Error('Invalid signature');
      }
      return true;
    }

    if (this.authType === 'api_key') {
      if (!this.secret) throw new Error('Missing API key');
      const authHeader = getHeader(headers, 'authorization');
      if (!authHeader) {
        throw new Error('Missing Authorization header');
      }
      if (!safeEqual(authHeader, `Apikey ${this.secret}`)) {
        throw new Error('Invalid API key');
      }
      return true;
    }

    if (this.authType === 'oauth2') {
      const token = this.readOAuth2Token(headers);
      const verdict = this.verifyOAuth2Token(token, headers, rawBody);
      if (verdict != null && typeof verdict.then === 'function') {
        // Swallow a later rejection so it cannot crash the process as unhandled.
        Promise.resolve(verdict).catch(() => {});
        throw new Error('verifyOAuth2Token returned a Promise; call processAsync() for async token verifiers');
      }
      if (verdict !== true) {
        throw new Error('Invalid or expired OAuth2 Bearer token');
      }
      return true;
    }

    throw new Error(`Unknown auth type: ${this.authType}`);
  }

  /**
   * Header and callback checks shared by the sync and async oauth2 paths.
   * @returns {string} the non-empty Bearer token
   */
  readOAuth2Token(headers) {
    const authHeader = getHeader(headers, 'authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid OAuth2 Bearer token');
    }
    if (!this.verifyOAuth2Token) {
      throw new Error('OAuth2 token verifier callback required');
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new Error('Invalid or expired OAuth2 Bearer token');
    }
    return token;
  }

  /**
   * Same as verifyAuthentication, but awaits an async oauth2 token verifier.
   */
  async verifyAuthenticationAsync(headers = {}, rawBody = null) {
    if (this.authType !== 'oauth2') {
      return this.verifyAuthentication(headers, rawBody);
    }
    const token = this.readOAuth2Token(headers);
    const verdict = await this.verifyOAuth2Token(token, headers, rawBody);
    if (verdict !== true) {
      throw new Error('Invalid or expired OAuth2 Bearer token');
    }
    return true;
  }

  /**
   * Check for duplicate transactions (id is stable across retries and replays)
   */
  isDuplicate(transactionId, processedIds = new Set()) {
    return processedIds.has(transactionId);
  }

  /**
   * Validate webhook payload structure
   */
  validatePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be a JSON object');
    }

    const required = [
      'id',
      'gateway',
      'transactionDate',
      'accountNumber',
      'transferType',
      'transferAmount',
      'referenceCode'
    ];

    for (const field of required) {
      if (!(field in payload)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!['in', 'out'].includes(payload.transferType)) {
      throw new Error(`Invalid transferType: ${payload.transferType}`);
    }

    if (!Number.isInteger(payload.transferAmount) || payload.transferAmount <= 0) {
      throw new Error('Invalid transferAmount');
    }

    return true;
  }

  /**
   * Process a webhook.
   * @param {object|string} payload parsed JSON object, or the raw body string
   * @param {object} headers request headers
   * @param {string} [rawBody] raw body string (required for hmac when payload is an object).
   *   Whenever a body string is available the result is built from that string,
   *   never from the object passed alongside it.
   */
  process(payload, headers = {}, rawBody = undefined) {
    try {
      const body = typeof payload === 'string' ? payload : rawBody;
      const data = typeof body === 'string' ? JSON.parse(body) : payload;
      this.verifyAuthentication(headers, body ?? null);
      return this.buildResult(data);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Async variant of process() for oauth2 verifiers that return a Promise.
   */
  async processAsync(payload, headers = {}, rawBody = undefined) {
    try {
      const body = typeof payload === 'string' ? payload : rawBody;
      const data = typeof body === 'string' ? JSON.parse(body) : payload;
      await this.verifyAuthenticationAsync(headers, body ?? null);
      return this.buildResult(data);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate an authenticated payload and normalize the transaction.
   */
  buildResult(data) {
    this.validatePayload(data);

    const transaction = {
      id: data.id,
      gateway: data.gateway,
      transactionDate: data.transactionDate, // "YYYY-MM-DD HH:mm:ss", Vietnam time (UTC+7)
      accountNumber: data.accountNumber,
      subAccount: data.subAccount || null,
      code: data.code ?? null,
      content: data.content || '',
      description: data.description || '',
      transferType: data.transferType,
      transferAmount: data.transferAmount,
      accumulated: data.accumulated || 0,
      referenceCode: data.referenceCode || ''
    };

    return {
      success: true,
      transaction,
      isIncoming: transaction.transferType === 'in',
      isOutgoing: transaction.transferType === 'out',
      response: { status: 200, body: { success: true } }
    };
  }
}

function printSepayHelp() {
  console.log('Usage: node sepay-webhook-verify.js <webhook-payload-json>');
  console.log('\nEnvironment Variables:');
  console.log('  SEPAY_WEBHOOK_AUTH_TYPE - hmac, api_key, oauth2, none');
  console.log('                            (default: none, local dry-run only; refused when NODE_ENV=production)');
  console.log('  SEPAY_WEBHOOK_SECRET    - HMAC-SHA256 secret key (hmac)');
  console.log('  SEPAY_WEBHOOK_API_KEY   - API key (api_key)');
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    printSepayHelp();
    process.exit(0);
  }

  if (args.length === 0) {
    printSepayHelp();
    process.exit(2);
  }

  try {
    const rawBody = args[0];
    const authType = process.env.SEPAY_WEBHOOK_AUTH_TYPE || 'none';
    const secret = authType === 'hmac'
      ? process.env.SEPAY_WEBHOOK_SECRET || null
      : process.env.SEPAY_WEBHOOK_API_KEY || null;

    if (authType === 'none') {
      console.error('WARNING: no webhook authentication (local dry-run only). Set SEPAY_WEBHOOK_AUTH_TYPE=hmac|api_key for real traffic.');
    }
    const verifier = new SePayWebhookVerifier(authType, secret, { allowUnauthenticated: authType === 'none' });

    // Simulated SePay headers for local CLI testing
    const headers = {};
    if (authType === 'api_key' && secret) {
      headers.Authorization = `Apikey ${secret}`;
    }
    if (authType === 'hmac' && secret) {
      const timestamp = String(Math.floor(Date.now() / 1000));
      headers['X-SePay-Timestamp'] = timestamp;
      headers['X-SePay-Signature'] = SePayWebhookVerifier.sign(secret, timestamp, rawBody);
    }

    const result = verifier.process(rawBody, headers);

    if (result.success) {
      console.log('Webhook verified successfully\n');
      console.log('Transaction Details:');
      console.log(`  ID: ${result.transaction.id}`);
      console.log(`  Gateway: ${result.transaction.gateway}`);
      console.log(`  Type: ${result.transaction.transferType}`);
      console.log(`  Amount: ${result.transaction.transferAmount.toLocaleString('vi-VN')} VND`);
      console.log(`  Code: ${result.transaction.code ?? 'N/A'}`);
      console.log(`  Reference: ${result.transaction.referenceCode || 'N/A'}`);
      console.log(`  Content: ${result.transaction.content || 'N/A'}`);
      console.log(`\n  Incoming: ${result.isIncoming ? 'Yes' : 'No'}`);
      console.log(`  Outgoing: ${result.isOutgoing ? 'Yes' : 'No'}`);
      console.log('\nRespond to SePay with HTTP 200 and body {"success": true}');
    } else {
      console.error('Verification failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = SePayWebhookVerifier;
