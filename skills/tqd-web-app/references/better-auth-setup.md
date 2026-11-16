# Better Auth Setup for Next.js App Router

Use Better Auth as the default authentication layer for TypeScript Next.js apps: it stores sessions in database tables via Drizzle/Prisma/Postgres/SQLite, sets signed HTTP-only cookies, and includes email/password, Google OAuth, and password reset without an external auth SaaS bill.

Check the installed `better-auth` version's TypeScript types when wiring options, as callback names can vary across minor releases.

## 1. Installation and Environment Variables

```bash
npm install better-auth
```

Keep secrets in `.env.local` (gitignored) and mirror them in your hosting environment dashboard:

```env
BETTER_AUTH_SECRET=replace-with-32-plus-random-bytes
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-secret
```

Generate `BETTER_AUTH_SECRET` locally with `openssl rand -base64 32`.

## 2. Server Instance (`src/lib/auth.ts`)

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/db';
import { sendTransactionalEmail } from '@/lib/email';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg', // 'pg' | 'sqlite' | 'mysql'
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    async sendResetPassword({ user, url }) {
      await sendTransactionalEmail({
        to: user.email,
        subject: 'Đặt lại mật khẩu tài khoản',
        html: `<p>Nhấn vào liên kết sau để đặt lại mật khẩu (hết hạn sau ít phút):</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [nextCookies()], // must be last so Server Actions can set cookies
});
```

Generate and apply the auth schema (`user`, `session`, `account`, `verification`) before starting the app:

```bash
npx @better-auth/cli generate
```

Apply the generated migration with Drizzle or Prisma (`drizzle-kit migrate` or `prisma migrate deploy`).

## 3. Mount Route Handler and Client Helper

Create the catch-all Auth API handler:

```ts
// src/app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

Create the React client helper:

```ts
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

## 4. Session Cookies and Protected Routes

Better Auth stores session tokens in signed `httpOnly` cookies (`SameSite=Lax`, `Secure` over HTTPS). Do not copy session tokens into `localStorage` or client-readable cookies.

Use two layers of protection in Next.js:
1. **Middleware / proxy redirect** for smoother UX (checks cookie or session on `/dashboard/:path*`, `/account/:path*`).
2. **Server-side verification** inside every protected Server Component, Server Action, and Route Handler because middleware alone can be bypassed if misconfigured or matched broadly:

```ts
// Inside a Server Component, Server Action, or Route Handler
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export async function requireUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect('/login');
  }
  return session;
}
```

For Route Handlers (`app/api/**`), return `Response.json({ error: 'Unauthorized' }, { status: 401 })` instead of redirecting, and filter database queries by `session.user.id`.

## 5. Google OAuth Flow

1. In Google Cloud Console, configure the OAuth consent screen and create a Web Application client.
2. Add both authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
3. Trigger login from a client button:

```ts
await authClient.signIn.social({
  provider: 'google',
  callbackURL: '/dashboard',
  errorCallbackURL: '/login?error=oauth',
});
```

## 6. Password Reset Flow

1. **Request reset** on `/forgot-password`: call `authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })` (or `forgetPassword` on older minor versions). Display a generic message (`"Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu"`) regardless of whether the email exists.
2. **Deliver token** via `sendResetPassword` using a real email provider (Resend, Postmark, or transactional SMTP). Better Auth signs single-use expiring tokens automatically.
3. **Submit new password** on `/reset-password`: read `token` from search params and call `authClient.resetPassword({ newPassword, token })`. Prompt users to sign in cleanly or use `revokeOtherSessions: true` when changing passwords in account settings.
4. **Verify before ship:** test sign-up, wrong-password rejection, protected route redirect when logged out, sign-out cookie clearing, and password reset token single-use expiry.
