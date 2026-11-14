# lumo-web

The Lumo website: **Creator Studio**, web coin top-ups, the finance cash-out console, and public share pages for videos and profiles.

Next.js 16 (App Router, Cache Components, Turbopack), React 19, Tailwind v4, TanStack Query.

## Pages

| Route | What it is |
|---|---|
| `/` | Landing page |
| `/login` | Sign in: scan QR with the app, phone or email code, password, Google |
| `/birthday` | Age gate for new accounts |
| `/studio` | Dashboard: views, followers gained, diamonds by day, stream key, recent lives |
| `/studio/live` | Go live from OBS (RTMP server + key), live stats, end stream |
| `/studio/videos` | Upload (multipart), visibility, delete |
| `/studio/earnings` | Diamonds, 30-day chart, bank account (Paystack resolve), cash out, history |
| `/studio/audience` | Followers and growth |
| `/studio/moderation` | Comments on your videos, delete, block |
| `/studio/settings` | Profile, avatar upload, sign out everywhere |
| `/wallet` | Buy coins on the web with Paystack |
| `/admin/payouts` | Finance role only: approve (sends the Paystack transfer) or reject cash-outs |
| `/v/{id}` | Public video page with OpenGraph metadata (`/watch/{id}` redirects here) |
| `/@handle` | Public profile (rewritten to `/u/{handle}`) |

## How auth works (BFF)

The browser never sees a token. `/api/auth/*` signs in against the gateway and stores the access and refresh tokens in **httpOnly, Secure, SameSite=Lax cookies scoped to `/api`**. `/api/v1/*` forwards to the gateway with the bearer token, refreshes once on 401, and blocks `auth/`, `internal/`, webhooks and `rt/`. Path segments that could change meaning once re-joined (`..`, an encoded `/`, backslashes) are refused with 400.

Every mutating request must send `x-lumo-csrf: 1` (the client helper does this). Cross-site forms can't set custom headers, so this blocks CSRF.

## Run it

```bash
cp .env.example .env.local   # point GATEWAY_URL at the gateway
npm install
npm run dev                  # http://localhost:3000
```

Checks: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Deploy notes

- Video and image uploads go straight from the browser to S3 with presigned URLs. The bucket's CORS must allow `PUT` and the `Content-Type` header from the site origin, and **expose the `ETag` header** (multipart completion needs it).
- Every gateway call carries the visitor's `X-Forwarded-For`, so the gateway's per-IP limits apply per visitor. Add the load balancer and the web pods to the gateway's trusted CIDRs. Server-rendered share pages are cached for minutes, but under heavy share traffic their reads still come from the web pods' own IPs, so give those IPs a higher anonymous limit.
- `GATEWAY_URL` should be the in-cluster gateway address. The BFF is the only thing that talks to the gateway.
- Paystack web checkout returns to `/wallet?reference=…`. Coins are credited by the webhook, never by this redirect.
