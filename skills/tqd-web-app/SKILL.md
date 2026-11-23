---
name: tqd-web-app
description: "Build and wire opt-in Tier 3 web app capabilities—user authentication, managed serverless databases, API routes, and payment verification—with a plain-Vietnamese zero-knowledge safety gate. Use when a website genuinely requires member login accounts, persistent customer database records, or automated online payment verification (SePay VietQR, Polar, or Stripe). Not for marketing, brochure, or static sites (route to tqd-web), UI visual polish (route to tqd-web-design), or static forms and hosting launch (route to tqd-web-launch)."
when_to_use: "Invoke when a project opts into Tier 3 web app features (login accounts, customer database persistence, server APIs, or automated payment webhooks) after static alternatives are ruled out; route full brochure sites to tqd-web, styling/UX polish to tqd-web-design, and static form or deployment launch to tqd-web-launch."
argument-hint: "[auth|db|payment|api] [project-path]"
compatibility: "macOS, Linux, Windows (Node.js >= 20)"
license: "MIT"
metadata:
  author: tqd
  version: "2.3.0"
---

# TQD Web App (Tier 3 Opt-In)

> **Guardrails:** Follow [rules/AGENTS.md](../../rules/AGENTS.md), this plugin's always-on rules, in every reply. Read it once per session if it is not already in context.
> **Paths:** This skill's folder is `${CLAUDE_SKILL_DIR}` (Claude Code fills this in; on other hosts use the absolute path of the folder that contains this file). Every `scripts/...` and `../<skill>/scripts/...` path below is relative to that folder, not to the website project: run `node "<skill folder>/scripts/<name>" <args>`.

Provide the opt-in Tier 3 web application branch only when a site genuinely needs user accounts, persistent database records, server APIs, or automated payment verification. Keep technical complexity invisible to non-technical owners while upholding server-side security and cost guardrails.

## When to Use and Hand-offs

- **Use this skill** for `[auth|db|payment|api]` implementation inside a Next.js App Router (or serverless TypeScript) project once the user approves Tier 3 responsibilities.
- **Not for static or brochure builds:** hand off site discovery, copy, and Tier 1/Tier 2 static builds to `tqd-web`.
- **Not for visual styling or UX fixes:** hand off layout, typography, colors, and component polish to `tqd-web-design`.
- **Not for static forms or hosting deployment:** hand off static lead capture, DNS, and production rollout to `tqd-web-launch`.

## Mandatory Zero-Knowledge Safety Gate

Execute this two-part gate before creating database schemas, auth routes, API handlers, or payment endpoints so non-technical owners do not take on unwanted maintenance or surprise monthly bills.

### 1. Challenge Necessity First

Before scaffolding any backend, test whether a zero-maintenance static alternative covers 90% of the business goal at \$0/month:

| User Need | Try Static First (Tier 1/2) | Opt Into Web App (Tier 3) Only When |
|---|---|---|
| Order leads & booking | Zalo order link, click-to-call, Google Form | Customers need order history dashboards or seat/slot locking |
| Product catalog & pricing | Static Markdown/JSON data edited in repo | Staff or vendors need live web admin login to edit inventory |
| Bank transfer payments | Static VietQR image + manual Zalo receipt check | High volume requires instant webhook auto-confirmation |
| Members-only content | Unlisted/shared link or static brochure | Paid courses, SaaS seats, or private per-user records exist |

If static options solve the core need, recommend staying on Tier 1/Tier 2 (`tqd-web` / `tqd-web-launch`) and skip backend scaffolding.

### 2. Explain Ongoing Responsibilities and Confirm Consent (Plain Vietnamese)

If the user genuinely needs accounts, saved customer records, or automated payment confirmation, explain the ongoing responsibilities in everyday Vietnamese without jargon and ask for explicit consent before writing backend, database, or payment code (unless already confirmed in the project brief):

```text
Để làm tính năng đăng nhập / lưu dữ liệu khách hàng / tự động xác nhận thanh toán, website sẽ chuyển sang dạng ứng dụng (Web App) với 3 trách nhiệm đi kèm:
1. Giới hạn gói miễn phí và chi phí duy trì: Cơ sở dữ liệu (database) và máy chủ serverless có gói miễn phí ban đầu, nhưng nếu lượng khách hoặc dung lượng tăng vượt mức miễn phí thì cần nâng cấp gói trả phí hàng tháng.
2. Bảo mật khóa bí mật: Các mã kết nối (database, đăng nhập, thanh toán) phải được giữ riêng tư trên hệ thống, tuyệt đối không chia sẻ công khai hoặc đưa lên mã nguồn công khai.
3. Thử nghiệm thanh toán giả lập trước: Mọi cổng thanh toán (SePay VietQR, Polar, Stripe) sẽ được cài ở chế độ chạy thử (sandbox/test) trước; chỉ chuyển sang tài khoản nhận tiền thật khi bạn kiểm tra xong và đồng ý bật.

Bạn có đồng ý tiến hành theo hướng này không?
```

## Default Managed Serverless Stack

Default to managed serverless services so the owner avoids VPS patching, manual connection pool tuning, or idle server billing:

| Layer | Default Choice | Why This Default |
|---|---|---|
| **App & APIs** | Next.js App Router (Route Handlers / Server Actions) | Documented for Vercel; Cloudflare deployment via adapter is not verified in this repo |
| **Database** | Neon Postgres, Supabase Postgres, or Cloudflare D1 | Managed scaling, pooler support, zero OS maintenance |
| **ORM & Migrations** | Drizzle ORM or Prisma | Typed queries and repeatable SQL migrations |
| **Authentication** | Better Auth (`emailAndPassword` + Google OAuth) | Built-in HTTP-only cookies, reset tokens, DB-backed sessions |
| **Vietnam Payments** | SePay + VietQR (`vietqr.app`) | Automatic bank transfer matching and VND webhook alerts |
| **Global Payments** | Polar (Merchant of Record) or Stripe | Global cards, subscriptions, and automated tax/VAT options |

## Verification Status (2.3.0)

This skill is documentation plus bundled payment scripts. It is **not** a tested app template; keep these limits visible before promising a stack:

| Area | Status |
|---|---|
| Next.js App Router + Neon/Supabase (auth, API, migrations) | Documented; no end-to-end project test in this repo |
| Cloudflare Workers + D1 (UI + API, empty/error states, permission checks) | **Not implemented or verified.** D1 is one database option, not the default; there is no local Workers/D1 fixture in this repo |
| Dashboard, auth and settings UI | Design guidance only, from `tqd-web-design` `data/surfaces.json`; no runnable screens here |
| SePay and Polar webhook verifiers (`scripts/sepay-webhook-verify.js`, `scripts/polar-webhook-verify.js`) and `scripts/checkout-helper.js` | Unit-tested offline; no live sandbox call is part of this repo's CI |
| Stripe checkout/webhook | Reference guidance only (`references/sepay-vietqr-and-stripe.md`); no bundled or tested verifier script |

Do not claim a Cloudflare Workers + D1 path works until a real slice has been run locally or in a target project: UI plus API plus D1 binding, with empty/loading/error states and a server-side permission check. Until then, say it is unverified.

## Implementation Workflow and Authority Boundaries

Follow these stages in order because early consent, server-owned pricing, and verified sandbox webhooks prevent data loss, billing surprises, and unverified fulfillment:

1. **Confirm scope and stack:** pick one database host, auth methods, and payment provider matching `[auth|db|payment|api]` and record choices in `docs/website/brief.md` if present.
2. **Provision schema and secret layout:** define versioned migrations, `UNIQUE` constraints on email/order/webhook IDs, `.env.local` (gitignored), and `import 'server-only'` guards. Keep `DATABASE_URL`, `BETTER_AUTH_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SEPAY_WEBHOOK_SECRET`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, and `STRIPE_SECRET_KEY` strictly server-side; reserve `NEXT_PUBLIC_*` for non-secret public values.
3. **Wire auth and API validation:** configure Better Auth (`lib/auth.ts`, `app/api/auth/[...all]/route.ts`), validate every Route Handler or Server Action payload with Zod, add rate limiting on auth/checkout endpoints, and verify `auth.api.getSession` plus resource ownership (`user_id`) on the server.
4. **Wire checkout and webhooks in sandbox mode:** run all payment providers in sandbox/test mode first (`pay-sandbox.sepay.vn`, `sandbox-api.polar.sh`, Stripe `sk_test_...`). Verify webhook signatures against the raw request body before updating order status, deduplicate events via `UNIQUE` database keys, and never treat client redirects (`success_url`) as payment proof.
5. **Gate live keys and paid upgrades:** stop and ask explicit user approval before switching from sandbox/test keys to live payment keys, upgrading to paid database/hosting tiers, or running destructive schema changes on live data.

## Guardrails by Capability

Apply these checks matching the requested `[auth|db|payment|api]` slice so common serverless failures do not ship:

- **Database (`db`):** use the provider's connection pooler URL in serverless runtime code, enforce `UNIQUE` constraints on email/order/webhook keys, and document one verified backup restore path before launch.
- **Authentication (`auth`):** verify `auth.api.getSession` inside every protected Server Component, Server Action, and Route Handler rather than relying solely on middleware; return generic confirmation messages on password reset requests so account emails cannot be enumerated.
- **APIs (`api`):** parse every request body with Zod, calculate prices and permissions strictly from server database records, and enforce rate limiting on sign-in, password reset, and checkout endpoints.
- **Payments (`payment`):** use SePay (`{"success": true}` HTTP 200 within 30s) for Vietnam bank transfers/VietQR, Polar (`order.paid` + `webhook-id` deduplication) for global Merchant-of-Record SaaS, or Stripe (`constructEvent` over raw text) for custom card checkouts—always verified in sandbox mode first.

## References and Bundled Scripts

Load only the reference matching the active subtask so context stays focused:

- [references/serverless-db-and-api.md](references/serverless-db-and-api.md) — Choosing Supabase, Neon, or Cloudflare D1 vs full servers; safe migrations, backups, Zod validation, rate limiting, and secret hygiene.
- [references/better-auth-setup.md](references/better-auth-setup.md) — Better Auth setup for Next.js App Router (email/password, Google OAuth, HTTP-only session cookies, protected routes, password reset).
- [references/sepay-vietqr-and-stripe.md](references/sepay-vietqr-and-stripe.md) — SePay VietQR auto-verification (`{"success": true}` HTTP 200 contract, HMAC/API key modes), Polar webhooks, and Stripe checkout/webhook patterns.

Bundled Node.js (`>= 20`) scripts run cross-platform on macOS, Linux, and Windows using Node standard library `crypto` only:

- [scripts/sepay-webhook-verify.js](scripts/sepay-webhook-verify.js) — `SePayWebhookVerifier`; the auth mode is required (`hmac`, `api_key`, or `oauth2`). `none` is a local dry-run only: it needs `allowUnauthenticated: true` and is refused when `NODE_ENV=production`. Async `oauth2` token verifiers must use `processAsync`.
- [scripts/polar-webhook-verify.js](scripts/polar-webhook-verify.js) — `PolarWebhookVerifier` supporting both modern `whsec_` Standard Webhooks and legacy Polar HMAC signatures.
- [scripts/checkout-helper.js](scripts/checkout-helper.js) — `CheckoutHelper` generating signed SePay checkout forms and Polar checkout API payloads.
- [scripts/tests/payment-scripts.test.mjs](scripts/tests/payment-scripts.test.mjs) — `node:test` verification suite for all bundled payment scripts.

```bash
# Run offline unit tests for bundled payment helpers
node --test scripts/tests/*.mjs

# Dry-run SePay HMAC or Polar signature verification locally
SEPAY_WEBHOOK_AUTH_TYPE=hmac SEPAY_WEBHOOK_SECRET=test_secret node scripts/sepay-webhook-verify.js '{"id":1,"gateway":"VCB","transactionDate":"2026-03-15 10:00:00","accountNumber":"0123","transferType":"in","transferAmount":100000,"referenceCode":"REF1"}'
node scripts/checkout-helper.js polar '{"productId":"prod_123","successUrl":"https://example.com/success","server":"sandbox","accessToken":"polar_test"}'
```

## Done When

Report verified outcomes only; skipped stages or missing credentials remain listed as open items:

- The user confirmed Tier 3 ongoing responsibilities in plain Vietnamese (or opted in via an approved brief) before backend, database, or payment code was written.
- Database migrations, backup/restore documentation, server-side input validation, and rate limits are in place without secrets committed to git or bundled into client code.
- Authentication flows (sign-up, sign-in, server session checks, Google OAuth if requested, password reset, sign-out) are tested against real routes.
- Sandbox checkout and signed webhook verification (including duplicate-delivery idempotency) pass; `node --test scripts/tests/*.mjs` passes when using bundled payment scripts; live keys remain disabled until explicit user approval.
- Any Cloudflare Workers + D1 claim is backed by a run slice (UI, API, D1 binding, empty/error states, denied-permission check); otherwise report it as unverified.
