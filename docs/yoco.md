# Yoco Checkout integration

The app supports merchant-specific Yoco Checkout API credentials, pending tips in Neon, signed webhooks, private payment receipts, and one star/text review per confirmed payment. The public `/demo` workspace always simulates payments and never creates provider checkouts.

## Create your account and start in test mode

The Guided setup practice checkout is a separate simulation: it always sends `demo: true`, never creates a Yoco checkout, and stores no financial record in Neon. Completing it does not verify credentials, webhooks, settlement or NFC hardware. Use the actual provider test flow below before selecting live mode.

Restaurant account access uses Clerk on `/sign-in` and `/sign-up`, with demo buttons available alongside authentication. Complete organization and restaurant onboarding before configuring a merchant. The optional `/demo/onboarding` walkthrough creates only an empty browser-local restaurant; it cannot configure a real Yoco merchant or validate live onboarding. Payment mode remains independent of authentication: signing in or creating a restaurant does not enable real charges.

1. Create a Yoco account. In the Yoco App, open Sales → e-Commerce integrations → Checkout API → How to connect. Copy a **test secret key** locally. Never paste it into chat or a public client-side environment variable. [Official setup instructions](https://support.yoco.help/en/articles/739322-yoco-checkout-api).
2. Sign in to Tipit, complete restaurant onboarding, and open **Settings → Payments**. Copy the restaurant workspace ID. This is the Clerk organization ID, not an employee ID.
3. Set `NEXT_PUBLIC_APP_URL` in `.env.local` to your publicly reachable HTTPS deployment or tunnel origin. Yoco cannot deliver webhooks to localhost. Use that same origin when testing checkout so the receipt cookie belongs to the return URL's host.
4. Add the following **locally** to `.env.local`, preserving the existing Clerk and Neon entries. Replace placeholders with this restaurant's organization ID and test key:

```dotenv
TIPIT_MODE=demo
YOCO_MERCHANTS_JSON='{"org_REPLACE":{"secretKey":"sk_test_REPLACE","webhookSecret":""}}'
```

5. From the project directory, run:

```powershell
node scripts/register-yoco-webhook.mjs org_REPLACE
```

This command uses only test keys. It reads the restaurant ID from Neon, checks for an existing matching webhook, registers a test webhook if needed, and writes Yoco's one-time signing secret directly into the ignored `.env.local` file. It does not print credentials. Keep a secure backup of that file. If the webhook already exists but the signing secret was lost, the command stops; restore the original secret or deliberately replace the subscription in Yoco.

6. Change `TIPIT_MODE=yoco_test`, rebuild and restart the app, and refresh Settings → Payments. It should say **Yoco test connected**.
7. Open an active employee's real tipping link. Choose an amount, continue to Yoco, and use the test card details provided in your Yoco account. Check success and failure. Return to Tipit, wait for webhook confirmation, and submit a review. Confirm the transaction and review appear in the restaurant dashboard as **Yoco test**, excluded from live totals and public star averages.

The account, test credentials, and reachable webhook URL are still required for an actual Yoco sandbox smoke test. Automated checks use isolated PostgreSQL and mocked provider responses; they do not create Yoco accounts, register remote webhooks, or charge cards.

## Modes and restaurant isolation

- `demo`: browser simulations; no Yoco calls or financial rows created.
- `yoco_test`: connected restaurants use `sk_test_` credentials. Restaurants with no credentials retain simulated checkout. Malformed or wrong-mode credentials fail visibly.
- `live`: requires `sk_live_` credentials and a webhook signing secret for the resolved restaurant. Missing credentials fail closed. No fallback to another restaurant's merchant account.

The server mapping accepts exact Clerk organization IDs only. Keys and webhook signing secrets are never returned to the browser, stored in public profile data, or accepted from tipping guests. Settings exposes only the connection status, organization ID, and webhook endpoint URL. Configure a distinct authorized merchant connection for every restaurant; there is no shared platform account fallback.

Yoco's OAuth/Yoco API and Checkout API are documented separately. This implementation uses Checkout API merchant keys; it does not claim to provide self-service OAuth merchant onboarding. Confirm the intended multi-merchant arrangement with Yoco before onboarding restaurants at scale. [Yoco partnerships](https://developer.yoco.com/partnerships), [OAuth applications](https://developer.yoco.com/docs/getting-started/build-with-yoco/yoco-api/oauth-applications).

## Payment confirmation and receipts

Checkout validates the active restaurant, visible employee, and active tag on the server, stores a pending tip, then calls Yoco with the local tip UUID as the idempotency key. The browser retains one attempt ID for same-amount retries; a repeated request cannot change restaurant, employee, amount, payment mode, or receipt capability. Provider errors remain pending for reconciliation and are never silently simulated.

The server sets a per-tip HttpOnly receipt cookie. Only its hash is stored in Neon. `/api/payments/<tip-id>` requires that cookie before returning receipt details or accepting a review. Returning to a success URL never marks a tip paid. The receipt polls for server confirmation for roughly a minute, then allows a manual status check. Cancelled/closed checkouts stay pending unless Yoco confirms a terminal result; redirects alone cannot confirm cancellation or success.

Webhook delivery uses `/api/webhooks/yoco?restaurant=<database-restaurant-uuid>`. The handler verifies the original body against that restaurant's signing secret and a three-minute timestamp window. It matches checkout ID, restaurant, currency, amount, processing mode, and successful payment references. Event IDs and provider resource IDs prevent repeated deliveries from applying twice. Refund events record refunded amounts; full refunds change payment status, and partial refunds are labelled in transactions and included in CSV exports. Failed or unmatched financial events return errors for provider retries instead of being acknowledged as completed. Refund creation remains in the Yoco merchant dashboard, not in Tipit.

Keep pending-checkout reconciliation and failed-webhook monitoring in your launch checklist. A notification arriving before checkout persistence completes is retried with a 503. If delivery retries are exhausted, review and reconcile through Yoco before marking any financial state manually.

## Before real payments

Complete Yoco merchant/domain verification, confirm the multi-restaurant integration model with Yoco, use a stable production HTTPS domain, provision each restaurant's live key and corresponding live webhook signing secret, test event delivery and receipts, and then explicitly select `TIPIT_MODE=live`. The registration helper deliberately handles test credentials only; register live webhooks through Yoco's documented API and save each returned signing secret in the server secret configuration.

Treat `.env.local` as development configuration. In production, set the same values through the hosting provider's encrypted secret configuration, restrict access, and retain a rotation/recovery procedure. Keep credentials for outstanding payment events until their reconciliation is complete.

Sources: [Checkout creation](https://developer.yoco.com/api-reference/checkout-api/checkout/create-checkout), [Webhook registration](https://developer.yoco.com/api-reference/checkout-api/webhooks/register-webhook), [Signature verification](https://developer.yoco.com/guides/online-payments/webhooks/verifying-the-events), [Payment notifications](https://developer.yoco.com/api-reference/checkout-api/webhook-events/payment-notification).
