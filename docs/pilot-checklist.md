# Restaurant pilot checklist

## Implemented product improvements

- Overview setup checklist derives completion from restaurant details, active employees, active tags, and Yoco configuration. Completing a Yoco configuration step does not certify a live payment test.
- Employee profiles include date-filtered tips, rating breakdowns, written reviews, and assigned tags. Yoco test payments are excluded from financial totals and verified rating aggregates.
- Print QR materials produces employee cards and table-stand layouts. Use the browser print dialog to save an A4 PDF; print at 100% scale and test the actual printed QR with a phone.
- Settings → Team provides Clerk organization management to owners. Managers cannot manage membership. Choose Manager when granting dashboard access; basic Member does not have dashboard access. Invitation email delivery and owner/manager flows require interactive testing with authorized people; automated tests do not send invitations.
- Reports shows gross tips, refunds, net before fees, a previous-period comparison, and employee summary CSV exports. Net before fees is not payroll or an employee payout instruction. Refunds are attributed to the original tip's creation date; this is an operational tip-cohort report, not a cash-basis accounting ledger.
- Activity displays database audit events for restaurant, employee, tag, and hardware-draft changes. Actor names are resolved through Clerk when available; verified user IDs remain visible if lookup fails. Membership changes stay managed by Clerk and are not duplicated in this audit feed.
- Keyboard skip navigation, visible focus, labelled controls, Escape-to-close mobile navigation, reduced-motion handling, responsive filters, and print styles are implemented. Human accessibility and printed-scan checks are still required before launch; automated checks do not certify full accessibility compliance.

## Before inviting pilot restaurants

### Yoco: requires the owner's account

Create the Yoco account, confirm online-only access, add each restaurant's test credentials, and expose a public HTTPS webhook URL. Follow [Yoco setup](yoco.md). Confirm a successful test payment, failed payment, duplicate webhook, receipt access, review submission, and refund in the real sandbox before selecting live mode. Provider responses are mocked in automated tests; a real Yoco account has not been created or verified by the app.

### Team access: interactive checks

With the restaurant owner's approval, invite a real manager through Settings → Team. Verify invitation acceptance, organization selection, data access, denial of membership-management controls, and removal of access. Check a second restaurant cannot read the first restaurant's data. Keep at least one authorized owner; do not remove the last owner while testing.

### Legal and product details: requires business decisions

Confirm the business/legal name, support contact, final pricing, merchant arrangement, refund policy, review retention/moderation policy, privacy contact, and employee/tip-distribution responsibilities. Have the existing draft privacy and terms pages reviewed for the launch jurisdiction. Do not publish them as approved policies until the owner has supplied and approved the final text.

## Monitoring and recovery

`GET /api/health` returns 200 when configured storage/auth settings are consistent and the database responds, or a redacted 503 when unavailable. It does not check Yoco, Clerk service availability, backups, or webhook-delivery health. Point the chosen production uptime monitor at this endpoint and alert the operator for repeated failures. No monitoring vendor or alert destination has been configured automatically.

The page error boundary offers retry/dashboard recovery and logs a redacted error digest. In production, collect server logs and error digests in the hosting provider's logging system or the chosen error-monitoring service. Never send receipt tokens, merchant secrets, raw webhook bodies, or full connection strings to telemetry.

For Yoco, inspect provider delivery failures and pending tips regularly. A checkout redirect is not proof of payment; follow the reconciliation guidance in [Yoco setup](yoco.md).

### Database restore drill

1. In the Neon account, confirm the actual recovery window and available restore/branch features for the configured plan. Backup availability has not been verified by this implementation.
2. Document the operator and the last known recovery point in a private operations record.
3. Restore the chosen point into a separate development/recovery branch; do not overwrite production during a drill.
4. Connect an isolated local environment to the recovery database with a separate `.env.local`. Keep `TIPIT_MODE=demo` and avoid live webhook/merchant credentials.
5. Run `pnpm db:check`, inspect restaurant/employee/tag records and expected transaction counts, and verify schema compatibility with application migrations.
6. Reconcile provider payments received after the recovery point before a production cutover. Replaying notifications must use the idempotent webhook flow and matching merchant/mode, not browser payment flags.
7. Record the result and recovery time; clean up only recovery resources intentionally created for the drill.

Production deployment, monitor registration, external accounts, legal sign-off, and a real restore drill remain owner/operator tasks until account access and business details are available. No external service or database recovery action has been performed by adding this checklist.
