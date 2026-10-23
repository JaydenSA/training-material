# Restaurant database

## Current setup

Neon PostgreSQL is connected to the local project through `DATABASE_URL`. The initial migration created nine application tables. No sample restaurants, employees, payments, users, or orders were inserted into Neon. Clerk Organizations is enabled for the selected TipIt development application.

Sign in, choose/create a restaurant organization, and complete the restaurant setup form. Its creator has Clerk's `org:admin` role. Add employees and tags through the dashboard; these are shared across browsers/devices. Guest tipping URLs read the corresponding database employee profile.

The Clerk custom role `org:manager` is configured in the default role set. It permits application restaurant-record access without Clerk membership-administration or billing permissions. Default `org:member` memberships cannot access restaurant data. An Admin must explicitly assign the Manager role when inviting or updating managers; no assignments or invitations were made automatically. Organization settings and membership are controlled by Clerk; Tipit stores the Clerk organization ID on the restaurant.

## Storage modes

- `TIPIT_STORAGE=auto`: use PostgreSQL if DATABASE_URL exists, otherwise use browser-local demo storage.
- `TIPIT_STORAGE=database`: require DATABASE_URL. Missing configuration blocks the workspace.
- `TIPIT_STORAGE=demo`: explicitly use the original browser-local sample workspace even if a database is configured.

Connected storage also requires Clerk. An unavailable database, missing migrations, authorization failure, or failed save never silently falls back to demo data. Marketing visuals may still show a sample employee; no sample records are persisted.

For an entirely offline demo, set both `TIPIT_STORAGE=demo` and `NEXT_PUBLIC_AUTH_MODE=demo` for build/start. Restaurant database records cannot be reset from the UI. The demo reset applies only to localStorage.

## Data model

- `restaurants`: one per Clerk organization; immutable URL slug, version counter and soft deletion.
- `employees`: staff profiles, publication flag and archive timestamp. Employees have no required login.
- `tags`: globally unique opaque code, fixed employee assignment, suspension/deletion timestamps.
- `tips`: integer ZAR cents, validated status/rating, unique payment references and private receipt-token hash.
- `webhook_events`: future durable payment event deduplication.
- `subscriptions`: one provider-controlled subscription state per restaurant.
- `hardware_orders`: current catalogue selections persist as unpaid drafts; prices are resolved on the server.
- `audit_events`: actor, action and target for successful changes.
- `mutation_requests`: restaurant-scoped request IDs and payload hashes for safe retries.

Composite foreign keys prevent an employee from being assigned to a different restaurant's tags or tips. SQL checks reject invalid money, ratings, statuses, formats and order quantities. Archiving an employee and suspending their tags is atomic. Restoring an employee does not reactivate tags. Historical tips remain associated with the original employee.

## API and authorization

`GET /api/workspace` and `POST /api/workspace` require an authenticated active organization and an owner/admin or manager role. Restaurant identity comes only from Clerk's verified session. The X-Tipit-Organization header is a consistency assertion, never authorization: a mismatch with the active organization is rejected.

Writes accept a strict list of validated commands, not an arbitrary database record or browser snapshot. Every query is scoped to the authorized restaurant. Commands run in one transaction under a per-organization advisory lock, verify the restaurant version, write audit records and record the idempotency reference. Stale versions return 409 instead of overwriting another session. A repeated request ID with a different payload is rejected.

`GET /api/public/profile` accepts a tag code or restaurant slug plus employee ID. It returns only an active published profile, restaurant display details and aggregate rating. It never returns employee tip history, private restaurant email, merchant credentials, receipt hashes or organization membership. The staff directory remains removed.

Payment/rating/subscription mutations cannot be submitted through the workspace API. With `TIPIT_MODE=demo`, connected public profiles support a clearly labelled simulated checkout. The checkout endpoint only generates a demo reference; outcomes and ratings stay in browser session storage under `/simulation/payment/<reference>` and are never saved to Neon. Configured Yoco test/live checkouts use server-persisted pending tips, signed webhook confirmation, and private receipts; see [Yoco setup](yoco.md). Missing live merchant credentials fail closed.

The public `/demo/dashboard` link uses sample data in local browser storage and does not require a Clerk account. Its navigation and QR links stay under `/demo`, and its provider never calls workspace APIs. Normal `/dashboard` routes and all persistent APIs retain their authentication and restaurant authorization requirements.

Ratings support an optional written review of up to 1,000 characters. Restaurant workspace reads include review text; public employee profiles expose only aggregate star ratings. The additive review migration preserves existing tips and requires a star rating whenever review text is stored. Simulation reviews stay in browser storage. Yoco-confirmed receipts accept one server-persisted review; test reviews are labelled and excluded from public star averages.

Connected dashboard Ratings lists individual submissions in a table, with employee, star, written-review, source and date filters plus text search. Simulated rows are labelled separately and matched to the active restaurant slug and employee IDs. Simulation history is shared across tabs through local browser storage and does not affect verified averages or financial statistics. The current receipt also stays in session storage; older session-only reviews can still be displayed in their original tab. These browser-only reviews are not shared across devices or saved to Neon.

## Schema lifecycle

```sh
pnpm db:check
pnpm db:generate
pnpm db:migrate
pnpm test:db
```

`db:check` prints only connectivity and public table names. `db:migrate` uses the versioned SQL in drizzle/ and never imports demo data. These scripts load configuration through Next.js's environment loader without printing connection strings. Keep credentials in ignored local environment files or a deployment secret store. Use reviewed migrations rather than `db:push` against shared or production databases.

The application uses a small server-side connection pool and provider TLS configuration. Never expose DATABASE_URL to the browser. Backups, retention/anonymisation policy, production roles, alerting and deployment-specific access controls must be agreed before production use.

## Verification

The ten database/provider tests run migrations and actual repository SQL in an isolated in-memory PostgreSQL engine (PGlite), never against Neon. They cover cross-restaurant isolation and foreign keys, archival/history, public profile privacy, idempotent retries, stale-version rejection, transaction rollback, invalid payments/ratings, server-priced hardware drafts, merchant-bound checkout retries, signed Yoco notifications, refund deduplication, private receipts, and test-mode separation.

Browser checks verify public profiles do not reveal sample data in database mode, signed-out users cannot access workspace APIs, and real payments cannot be simulated into the database. Automated tests do not create users in the existing Clerk application. First-user onboarding and manager-role assignment should be checked interactively with the owner's account.
