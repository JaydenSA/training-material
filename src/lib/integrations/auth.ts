import 'server-only';
import { auth } from '@clerk/nextjs/server';
/** All future tenant repositories must use this organization from the verified
 * session, never a client-submitted restaurant/organization identifier. */
export async function requireRestaurantAccess() {
  const session = await auth();
  if (!session.userId || !session.orgId) throw new Error('A signed-in restaurant organization is required');
  if (!session.has({ role: 'org:admin' }) && !session.has({ role: 'org:manager' })) throw new Error('Restaurant management access required');
  return { userId: session.userId, organizationId: session.orgId };
}
