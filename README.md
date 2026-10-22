# Tipit — restaurant tipping demo

A restaurant-only tipping SaaS prototype built by adapting the supplied Next.js starter. Original source is preserved in `starter-reference/` and excluded from the active app and type checks. Branding uses the supplied Tipit screenshots; no additional design attachment was present.

## Start the client demo

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. No environment file, API keys, database, or login is required. npm can also install and run the package scripts; pnpm-lock.yaml is the maintained lockfile.

- `/` — marketing site
- `/dashboard` — restaurant overview
- `/dashboard/employees` — add, edit, archive, and restore staff
- `/dashboard/tips` — search, status/date filters, and CSV export
- `/dashboard/ratings` — individual ratings
- `/dashboard/tags` — create links, generate/download actual QR SVGs, suspend/delete tags
- `/dashboard/hardware` — catalogue and local demo order history
- `/dashboard/settings` — restaurant details, payment/billing previews, reset
- `/r/the-green-table` — public staff directory
- `/t/GT-001` — active Sarah tipping link
- `/t/GT-004` — suspended link example
- `/sign-in`, `/sign-up`, `/onboarding`, `/account` — access and setup screens
- `/pricing`, `/how-it-works`, `/help`, `/privacy`, `/terms`

## Suggested five-minute demo

1. Open the restaurant dashboard and review totals and employee cards.
2. Open `/t/GT-001`, choose R50, and continue to simulated checkout.
3. Simulate success and submit an optional employee rating.
4. Open the transaction dashboard to see the new tip; reload to show persistence.
5. Add an employee, create their tag, and download its QR code.
6. Archive Sarah and reopen `/t/GT-001` to demonstrate the inactive link.
7. Show hardware orders, then reset via Settings → Demo controls.

All changes are stored under `tipit-demo-v1` in localStorage in the current browser and origin. They are not shared across devices, private sessions, or different localhost/LAN/deployed URLs. The default employees and tags are recreated independently in another browser. A phone scanning a newly created custom employee link will not see that employee without shared server storage. Use the seeded GT-001/002/003 links for cross-device demonstrations. NFC tags store the same URL as the QR code; NFC programming itself requires your hardware tooling. For scanning from a phone use an accessible HTTPS deployment or your computer's LAN address, not localhost. No deployment has been performed.

## Agreed business rules

- Restaurants only. Each restaurant receives payments through its own Yoco merchant account.
- Each tip is attributed to one employee; processing fees are the restaurant's responsibility.
- Tipit does not handle employee distributions, payroll, employee balances, or payouts.
- Monthly subscriptions and separate hardware sales. Displayed prices are illustrative.
- Employees have profiles without login accounts. Owners/managers have dashboard access.
- Optional ratings after confirmed tips; one rating per tip. Public profiles, no launch leaderboard.
- Employee soft deletion disables tipping and suspends tags. Restoring a profile does not reactivate tags.
- Tags retain historical assignments and are never silently reassigned to another employee.
- Financial records are retained; operational soft deletion is distinct from legally required anonymisation/retention.

## API and authentication configuration

Copy `.env.example` to `.env.local`. Do not commit secrets. Restart Next.js after environment changes.

### Clerk (implemented optional authentication)

Set `NEXT_PUBLIC_AUTH_MODE=clerk`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY` to enable the Clerk provider and real SignIn, SignUp, and UserProfile components. Middleware protects dashboard, onboarding, and account routes. If Clerk mode is explicitly selected but either key is missing, requests fail closed rather than silently bypassing authentication. Leave mode as `demo` for client presentations without keys.

Clerk authentication alone does NOT switch the restaurant workspace to live storage. It remains explicitly labelled sample data. Before serving actual restaurant data, enable Organizations, configure owner/admin and manager roles, map each restaurant to its Clerk organization, and use `requireRestaurantAccess()` in every tenant repository. Employees must remain separate database records. The helper resolves the organization from the verified session, not from client input.

### PostgreSQL / Drizzle (prepared, not connected to the demo UI)

`src/lib/db/schema.ts` defines restaurants, employees, tags, tips, webhook events, subscriptions, hardware orders, and audit events. `getDatabase()` opens a pooled PostgreSQL connection lazily. Set a pooled `DATABASE_URL` with provider-required TLS settings, then run:

```sh
pnpm db:generate
pnpm db:migrate
```

No migrations are applied automatically. The browser demo deliberately does not write to a connected database. Implement tenant-scoped repositories and database constraints (amount/rating bounds, status transitions, same-restaurant employee/tag associations) before using this schema for live records. Add transactional event deduplication, access tests, and retention processes. Store references to merchant credentials in a server secret store, not plaintext merchant keys in public records.

### Yoco (server adapter prepared; real payments intentionally disabled)

`src/lib/integrations/yoco.ts` contains a server-only hosted checkout adapter with cents, ZAR, attribution metadata, idempotency keys, timeout handling, and validated redirect URL. It also verifies signed webhook bodies with timestamp tolerance and constant-time comparisons. The adapter requires a merchant key resolved specifically for the restaurant.

`POST /api/checkout` currently validates requests and returns only simulated checkout references. It NEVER calls Yoco. `TIPIT_MODE=live` returns 503 rather than treating browser data as financial truth. `/api/webhooks/yoco` returns 503 until durable webhook processing is implemented; it never falsely acknowledges payment events. `/api/integrations` describes the actual demo capabilities without exposing credentials.

Adding keys is not sufficient to accept money. Complete these steps before enabling live payments:

1. Confirm the supported multi-merchant onboarding/domain arrangement with Yoco.
2. Resolve and verify the active restaurant/employee/tag from the database on the server.
3. Persist a pending tip and durable retry/idempotency record before calling the checkout adapter.
4. Register a merchant-specific webhook and securely resolve its signing secret.
5. Verify the raw body, validate provider references, restaurant, amount, currency, and payment state; update the tip and deduplicate the event in one database transaction.
6. Expose receipt status using an unguessable receipt token, not a public transaction identifier alone.
7. Replace browser simulated outcomes and ratings with server-verified receipt/status/rating endpoints.
8. Implement refund reconciliation and operational alerts, then test against Yoco sandbox.

Browser redirects must never mark a real payment successful. A single platform Yoco key must never receive payments intended for different restaurant accounts.

Official references used:
- https://developer.yoco.com/guides/online-payments/accepting-a-payment
- https://developer.yoco.com/api-reference/checkout-api/checkout/create-checkout
- https://developer.yoco.com/guides/online-payments/webhooks/verifying-the-events

### Subscription billing and hardware

The subscription provider is still undecided. Billing buttons are explicitly previews; hardware creates local demo orders only. Live recurring billing, checkout, addresses, shipping, inventory, and fulfilment require the selected providers and commercial terms. No API secrets are collected in browser settings.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm build
# After building, with Microsoft Edge installed (tests start/reuse port 3001):
pnpm test:e2e
```

Playwright covers successful tipping/rating and persistence, employee archive/tag suspension, staff/tag creation and actual QR generation, hardware demo ordering and reset, failed payment/rating restrictions, invalid checkout amounts, and mobile overflow/navigation. Default browser is installed Microsoft Edge; change `channel` in playwright.config.ts if needed.

## Production boundaries

This is a client-review demo with integration foundations, not a production payment platform. Final legal copy, subscription pricing, employee publication permissions, fraud controls, shared tenant persistence, merchant onboarding, support operations, and live payment verification require completion before launch. `/admin` deliberately exposes no privileged operations. `/leaderboard` is a deferred-feature page. No real customer or card data should be entered in the demo.

#   t r a i n i n g - m a t e r i a l  
 