# Tipit

Restaurant-only cashless tipping, employee ratings, and a management dashboard. Next.js 15, React 19, TypeScript, Tailwind CSS, Clerk, Neon PostgreSQL storage, an offline demo, and prepared Yoco integrations.

## Run

```sh
pnpm install
pnpm dev
```

Development defaults to http://localhost:3000. A production preview uses `pnpm build` followed by `pnpm start --port 3001`. Stop a running server before rebuilding its output directory.

No credentials are needed for the demo. With Clerk and DATABASE_URL configured, restaurant data persists in Neon and is isolated by restaurant workspace. Payments and subscriptions remain disabled; hardware selections are unpaid drafts. Without database configuration, the browser demo remains available.

## Pages

- `/` — restaurant landing page
- `/pricing`, `/how-it-works`, `/help`, `/privacy`, `/terms`
- `/sign-in`, `/sign-up`, `/account`, `/onboarding`
- `/dashboard` — restaurant overview
- `/dashboard/employees` and `/dashboard/employees/[id]` — staff management
- `/dashboard/tips` — transactions, filters, CSV export
- `/dashboard/ratings` — employee ratings
- `/dashboard/tags` — QR/NFC links, QR downloads, activation and suspension
- `/dashboard/hardware` — demo catalogue and order history
- `/dashboard/settings` — restaurant details and demo reset
- `/t/[code]` — permanent QR/NFC destination
- `/r/[restaurantSlug]/[employeeCode]` — individual employee tipping page
- `/payment/[reference]` — simulated payment result and optional rating

The public Meet the team directory has been removed. `/r/[restaurantSlug]` returns 404. Individual employee pages remain available for tipping. Unimplemented `/leaderboard`, `/admin`, and unknown routes also return 404.

## Five-minute demo

1. Open the dashboard and review sample tips and ratings.
2. Visit `/t/GT-001`, choose an amount, simulate success, and submit a rating.
3. Check the new tip in the dashboard and export the transaction CSV.
4. Add an employee, create a tag, and download its QR code.
5. Archive Sarah and reopen `/t/GT-001`: the tag is inactive. Restore the employee and explicitly reactivate the tag if needed.
6. Preview hardware orders, then reset in Settings → Demo controls.

Changes persist in localStorage under `tipit-demo-v1`, per browser and origin. They do not sync across devices. Use the seeded GT-001/002/003 links for cross-device demos; custom employee links need shared backend storage. GT-004 starts suspended. NFC hardware stores the same URL as its QR code and requires separate programming tooling. A phone needs a LAN-accessible or deployed URL, not localhost.

## Business rules

Restaurants receive payments into their own Yoco accounts and absorb processing fees. Tips belong to individual employees. Restaurant management handles employee distribution outside Tipit; there are no employee wallets, balances, payroll, or payout features.

Owners/managers authenticate; employees do not need accounts at launch. Ratings are optional after confirmed tips, once per tip. Operational records use soft deletion. Archiving an employee suspends their tags and preserves historical transactions. Tags are never silently reassigned.

Revenue is monthly restaurant subscriptions plus separate hardware sales. Current prices are illustrative. Legal pages are drafts for review.

## Configuration

Use `.env.example` as a configuration reference. Never commit keys or paste them into chat. Restart development after configuration changes; rebuild production previews when public configuration or Clerk keys change.

### Clerk

The selected existing development application is `app_3L2x6Mk68lVublP0QLpMqiJAhwp` (TipIt). Do not run `clerk init` or create a replacement application. The local application link and development key pull have been verified with Clerk doctor. No users were created by the agent; production is not configured.

For another local checkout, authenticate in your host terminal, then:

```sh
pnpm dlx clerk@latest auth login
pnpm dlx clerk@latest link --app app_3L2x6Mk68lVublP0QLpMqiJAhwp
pnpm dlx clerk@latest env pull
pnpm dlx clerk@latest doctor
```

Authentication modes:

- `NEXT_PUBLIC_AUTH_MODE=auto` (default): activate Clerk when both keys exist, otherwise present the demo.
- `clerk`: require keys and fail closed if configuration is incomplete.
- `demo`: explicitly use offline demo access, even with keys configured.

Clerk protects dashboard, account, and onboarding routes. Guest tipping stays public. The profile menu shows the actual signed-in user. The connected database stores restaurant data; real payment processing remains a separate integration.

### PostgreSQL and restaurant workspaces

Neon is connected and the initial nine-table migration has been applied without seeding sample data. Clerk Organizations is enabled. Sign in, select/create a restaurant workspace, and complete restaurant setup. Employees, tags, restaurant details and hardware draft orders persist in the database. Public tipping pages read active employee profiles without exposing private transactions.

See [Database setup and access rules](docs/database.md) for the schema, commands, roles, migration lifecycle, storage modes and testing. `pnpm db:check` verifies connectivity, `pnpm db:migrate` applies reviewed migrations, and `pnpm test:db` runs isolated PostgreSQL repository tests.

Use `TIPIT_STORAGE=demo` and `NEXT_PUBLIC_AUTH_MODE=demo` together for the offline sample workspace. Database connection failures never silently switch to sample data. Actual payments, ratings and subscription status remain provider-controlled and cannot be edited by browser workspace commands.

For client demos while Clerk and Neon remain connected, open `/demo/dashboard`. This public sandbox needs no sign-in, stores sample data only in the browser, and keeps navigation and QR links under `/demo`. `/dashboard` and workspace APIs retain their existing authentication checks.

### Yoco boundaries

`POST /api/checkout` validates amounts and creates simulated references only, independently of database storage. Keep `TIPIT_MODE=demo` until live payment processing is implemented; `TIPIT_MODE=live` returns 503. Connected public profiles open `/simulation/payment/<reference>` with a browser-session snapshot. Simulated outcomes and ratings are never written to Neon. `/api/webhooks/yoco` returns 503 instead of acknowledging unpersisted financial events. No payments are sent to Yoco by this demo.

Before live payments: validate Yoco's multi-restaurant connection arrangement; resolve restaurant/employee/tag server-side; store a pending tip and idempotency record; call the adapter with that restaurant's authorized secret; verify webhook signatures and amount/currency/provider references; update the tip and deduplicate the event transactionally; protect receipts with unguessable tokens; replace simulated outcomes and ratings with server endpoints. Browser redirects must never confirm a real payment.

Provider references:
- https://developer.yoco.com/guides/online-payments/accepting-a-payment
- https://developer.yoco.com/api-reference/checkout-api/checkout/create-checkout
- https://developer.yoco.com/guides/online-payments/webhooks/verifying-the-events

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm build
```

Playwright uses installed Microsoft Edge and starts/reuses a production preview on port 3001. The default seven-test suite expects a build with demo authentication. For the configured Clerk build, run the read-only forms/redirect/directory-removal checks in PowerShell:

```powershell
$env:CLERK_TEST_LIVE = '1'
pnpm test:e2e
```

To run the demo suite, build with `NEXT_PUBLIC_AUTH_MODE=demo`, unset `CLERK_TEST_LIVE`, and run `pnpm test:e2e`. No tests create users in the existing Clerk application.

## Cleanup

Removed unused AI/chat SDKs, alternate authentication/theming packages, unused form/toast/clipboard/video utilities, unused typography packages, 52 unreferenced starter images, stale asset permissions/configuration, directory controls, and obsolete starter references. Retained React DOM as a required runtime peer. Shared UI is in `src/components/ui.tsx` to avoid circular page imports. Source is formatted for maintenance. The source license is preserved.


