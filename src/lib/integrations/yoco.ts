import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
/** Server-only adapter. The caller must resolve this merchant secret from the
 * restaurant's authorized connection; never accept a merchant key from a guest. */
export async function createYocoCheckout(input: { secretKey: string; tipId: string; restaurantId: string; employeeId: string; amount: number; baseUrl: string }) {
  if (!Number.isInteger(input.amount) || input.amount < 500 || input.amount > 1000000) throw new Error('Invalid amount');
  const base = new URL(input.baseUrl);
  if (base.protocol !== 'https:' && base.hostname !== 'localhost') throw new Error('HTTPS is required');
  const outcome = new URL(`/payment/${encodeURIComponent(input.tipId)}`, base).toString();
  const response = await fetch('https://payments.yoco.com/api/checkouts', {
    method: 'POST', headers: { Authorization: `Bearer ${input.secretKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': input.tipId },
    body: JSON.stringify({ amount: input.amount, currency: 'ZAR', successUrl: outcome, cancelUrl: outcome, failureUrl: outcome, metadata: { tipId: input.tipId, restaurantId: input.restaurantId, employeeId: input.employeeId } }),
    signal: AbortSignal.timeout(15000), cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Yoco checkout failed (${response.status})`);
  const result = await response.json();
  const redirect = new URL(result.redirectUrl);
  if (redirect.protocol !== 'https:' || !(redirect.hostname === 'yoco.com' || redirect.hostname.endsWith('.yoco.com'))) throw new Error('Invalid checkout redirect');
  if (typeof result.id !== 'string') throw new Error('Missing checkout reference');
  return { checkoutId: result.id as string, redirectUrl: redirect.toString() };
}
/** Verify the original, unparsed body. Event-ID deduplication must also happen
 * inside the transaction that applies the payment update. */
export function verifyYocoWebhook(body: string, headers: Headers, secret: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const id = headers.get('webhook-id'); const timestamp = headers.get('webhook-timestamp'); const signatures = headers.get('webhook-signature');
  if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp) || Math.abs(nowSeconds - Number(timestamp)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  if (!key.length) return false;
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest();
  return signatures.split(' ').some(signature => { const [version, encoded] = signature.split(','); if (version !== 'v1' || !encoded) return false; const actual = Buffer.from(encoded, 'base64'); return actual.length === expected.length && timingSafeEqual(actual, expected); });
}
