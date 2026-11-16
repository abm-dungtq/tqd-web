# Serverless Databases and API Boundaries

Default to managed serverless databases and Next.js Route Handlers or Server Actions so small teams avoid server patching, OS upgrades, and idle VPS costs.

## Choosing a Database Host

| Option | Best Fit | Free/Starter Guardrails | Connection Pattern |
|---|---|---|---|
| **Neon Postgres** | Relational Next.js apps, Drizzle/Prisma, branching | Auto-suspends idle compute; watch monthly compute hours | Serverless HTTP/WebSocket driver or `-pooler` URL |
| **Supabase Postgres** | Postgres + storage buckets + Row Level Security | Free projects pause after inactivity; row/storage quotas | Transaction pooler port `6543` for app queries; `5432` for migrations |
| **Cloudflare D1** | SQLite edge apps deployed on Cloudflare Workers/Pages | Single-writer SQLite throughput; great for low-write apps | `env.DB` binding via Wrangler / Drizzle D1 |
| **Dedicated VPS/Backend** | Long-running workers, WebSockets, heavy queues | Requires OS updates, backups, TLS, process monitoring | Reach for this only when serverless limits block the feature |

## Safe Schema and Migration Habits

1. **Define schema in code** with Drizzle ORM or Prisma instead of editing production tables manually, so local, staging, and production match.
2. **Use explicit migrations** (`drizzle-kit generate` + `migrate`, or `prisma migrate deploy`, or `wrangler d1 migrations apply`) tracked in git.
3. **Enforce invariants in SQL**:
   - `UNIQUE` constraints on `users.email`, `orders.order_code`, and `webhook_events.provider_event_id` prevent duplicate accounts and double fulfillment under concurrent webhooks.
   - `FOREIGN KEY` constraints (`user_id`, `order_id`) preserve referential integrity.
   - `NOT NULL` and integer money columns (VND as `INTEGER`/`BIGINT`, USD as integer cents) prevent rounding drift.
4. **Ship backward-compatible migrations**: add new nullable columns first, deploy code that writes both, backfill rows, and tighten constraints later. Avoid destructive drops or reset commands on live databases without a confirmed backup.

## Backups and Restore Readiness

- Verify what backup retention the selected provider tier actually includes before launch (free tiers often omit Point-in-Time Recovery).
- Schedule automated exports (`pg_dump` or `wrangler d1 export`) before running schema migrations or bulk data updates.
- Document and test at least one restore command against a fresh local or staging database so recovery works under pressure.

## Input Validation and Server-Owned Authority

Validate every external boundary—Route Handlers (`app/api/**/route.ts`), Server Actions, and webhook endpoints—before touching the database:

```ts
import { z } from 'zod';

const CreateOrderSchema = z.object({
  productSlug: z.string().min(1).max(80),
  quantity: z.number().int().min(1).max(20),
});

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = CreateOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Look up unit price from DB or server catalog; ignore any client-supplied price or userId
  const product = await findProductBySlug(parsed.data.productSlug);
  if (!product) {
    return Response.json({ error: 'Product not found' }, { status: 404 });
  }

  const totalAmount = product.unitPrice * parsed.data.quantity;
  const order = await createOrderForUser(session.user.id, product.id, parsed.data.quantity, totalAmount);
  return Response.json({ orderId: order.id, totalAmount }, { status: 201 });
}
```

Key boundaries to uphold across all endpoints:
- **Never trust client totals or roles:** look up prices, discounts, and permissions on the server.
- **Scope every query by owner:** check `WHERE id = $1 AND user_id = $2` (or admin role) on reads, updates, and deletes so authenticated users cannot access another customer's records.
- **Parameterize every query:** pass bound parameters through ORM builders or prepared statements rather than interpolating user strings into SQL.

## Rate Limiting and Abuse Protection

Protect endpoints that send emails, hit payment gateways, or check credentials:
- Rate-limit `/api/auth/*` (sign-in, sign-up, password reset) and `/api/checkout/*` using Upstash Redis (`@upstash/ratelimit`) or Cloudflare Rate Limiting rules.
- Return `429 Too Many Requests` with `Retry-After` when thresholds trip so automated credential stuffing or checkout spam stops early.
- Keep webhook endpoints exempt from browser CSRF/session cookies, while enforcing cryptographic signature verification on the raw request body.

## Secret Hygiene (Never Expose Secrets to the Browser)

- Prefix client-safe values only with `NEXT_PUBLIC_` (public app URL, public analytics ID, Stripe publishable `pk_test_...` key).
- Keep `DATABASE_URL`, `BETTER_AUTH_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `SEPAY_WEBHOOK_SECRET`, `POLAR_ACCESS_TOKEN`, and `STRIPE_SECRET_KEY` strictly server-side in `.env.local` (gitignored) and the hosting provider's secret settings.
- Inspect client bundle imports so server-only modules (`db`, `auth`, secret env readers) use `import 'server-only'` and never leak into `'use client'` files.
- Return generic failure messages to users (`"Invalid credentials"`, `"Unable to process request"`) while logging minimal error context server-side without printing tokens or connection strings.
