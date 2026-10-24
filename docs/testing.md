# Functional testing

## Superuser console

Open `/dashboard/testing` after signing into Clerk with **jaydenoerson95@gmail.com** as your verified primary email. The Testing sidebar item appears only for this account. Restaurant owner or manager roles do not grant platform testing access. The server checks the page and both result/execution API methods independently. The public demo cannot bypass this restriction. There is no password or email-only login shortcut, and no account is automatically created.

The console runs the existing Playwright database and browser suites and displays individual test names, status, duration and totals. Skipped tests prevent an all-passed result. Results are shared between authorized tabs in the current server process and reset on restart. Raw logs, stack traces and credentials are never returned by the API.

For local development, set these non-secret values in `.env.local`:

```dotenv
TIPIT_TEST_RUNNER_ENABLED=true
TIPIT_TEST_BASE_URL=http://localhost:3001
```

Restart the application after changing configuration. Build first, then start on the configured port. Do not rebuild `.next` while that server is running. Install dependencies and Playwright's Edge browser before running checks. The UI runner requires a persistent local Node server, source/test files and dev dependencies; it is disabled on Vercel. Leave the flag unset on hosted deployments. Only loopback HTTP test targets and fixed suite commands are supported. Concurrent runs are rejected and there is a 30-second cooldown after completion. Each suite has a five-minute time limit.

## CLI

```bash
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:db
pnpm test:functional
# Against the configured Clerk + Neon build, with the local server running:
CLERK_TEST_LIVE=1 pnpm test:e2e
# For a build explicitly using demo auth/storage:
pnpm test:e2e
```

On PowerShell set the mode with `$env:CLERK_TEST_LIVE='1'` before `pnpm test:e2e`. The console chooses the mode automatically from server authentication configuration. It never builds or restarts the app. CLI failures retain normal Playwright diagnostics; console output deliberately shows only test names and status. Avoid running CLI and console suites simultaneously because some existing screenshot filenames are shared.

## What the suites exercise

| Area                | Coverage                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Database            | Migrations in PGlite, tenant isolation, composite foreign keys, atomic rollback, optimistic versions, mutation replay, audit history            |
| Employees           | Create, edit, archive, restore, historical records, related tag suspension, insights and filtering                                              |
| Tags                | Create QR, download link, suspended/archived availability, active-only print sheets, employee selection                                         |
| Tipping and ratings | Amount validation, success/failure simulation, review persistence, duplicate prevention, text reviews, combined filters                         |
| Yoco                | Mock adapter, merchant credentials, mode/amount validation, signature tampering/staleness, event replay, refund transitions, protected receipts |
| Reporting           | Date and employee filters, comparison periods, gross/refund/net calculations, exclusion of provider tests, safe CSV                             |
| Dashboard           | Section loading shells, demo isolation, settings/reset, activity, setup, hardware drafts, mobile menu, public pages                             |
| Access              | Signed-out private route/API restrictions, verified superuser policy, inaccessible demo testing route, strict command schemas                   |

Tests use fresh browser storage, demo routes, mocked provider responses and an isolated in-memory PostgreSQL implementation. They do not seed Neon, change real restaurant records, charge cards, create Clerk users or send team invitations.

## Separate integration and manual checks

### Grouped and mobile navigation

Dashboard groups retain the existing URLs and link count; tests open People before navigating to its nested employee/rating pages. The mobile checks exercise the public menu, closing after a link, Escape focus recovery, and the dashboard drawer. The active dashboard group opens automatically. Desktop/mobile screenshots should also confirm a compact top bar, reachable account controls inside the drawer, hidden-menu links excluded from keyboard focus, and no viewport overflow.

### Management feature checks

`management.spec.ts` exercises local moderation and unchanged ratings, persisted restoration, bulk creation and ZIP contents, inactive-tag download rejection, comparison filters/exports and explicit demo alerts. It checks signed-out moderation/operational API denial and calculation exclusion of provider tests. Database checks cover owner/manager rules, original preservation, replay safety, cross-restaurant moderation constraints/history, scoped live/test counts and atomic rollback of invalid bulk batches. The Testing console includes these suites automatically.

Apply the moderation migration to each review/deployment database before connected testing. Browser tests use demo fixtures; they do not moderate real reviews or create real tags. Real sign-up verification and Yoco sandbox processing remain interactive checks. No merchant keys were available for a real Yoco run in this batch.

### Guided first-tip journey

The connected browser suite follows blank demo restaurant setup into Guided setup, creates an employee and tag, checks QR availability and its demo URL, confirms the manual page-check step, and starts the practice payment. It asserts `demo: true` on checkout, simulates success, returns to the guide, verifies 4/4 completion after reload, and checks that the restaurant workspace still contains no financial records. Suspending the tag invalidates later setup completion. Demo routes must make no workspace API calls. Physical scanning, real authenticated saves and provider readiness remain separate checks.

### Authentication and first-time onboarding

The connected browser suite checks that canonical sign-in/sign-up pages render Clerk and additional demo options, demo sign-in links leave the demo area, and legacy demo auth URLs redirect correctly. It walks through `/demo/onboarding`, verifies the new local restaurant has no seeded entities, checks reload persistence and confirms there are no workspace API requests. Repository tests separately verify a first restaurant save produces an empty persisted workspace in isolated PGlite.

For a real end-to-end check, use an authorized new development account: register and verify email, create/select an organization, complete restaurant details and add the first employee and tag. Automated checks do not create real Clerk accounts or send verification emails; that interactive flow still needs a human check.

The automated suite does not certify real Yoco account onboarding, live payments or bank settlement; real authenticated Clerk sessions and delivered invitations; physical NFC/printed QR scans; subscription billing; or full accessibility conformance. Follow [the pilot checklist](pilot-checklist.md) for those checks. Browser authentication rendering tests are separate from proof that the allowlisted account successfully signs in; verify that account manually without sharing credentials.
