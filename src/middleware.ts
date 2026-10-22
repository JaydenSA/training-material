import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
const protectedRoute = createRouteMatcher(['/dashboard(.*)', '/account(.*)', '/onboarding(.*)']);
const authenticated = clerkMiddleware(async (auth, request) => { if (protectedRoute(request)) await auth.protect(); });
export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (process.env.NEXT_PUBLIC_AUTH_MODE !== 'clerk') return NextResponse.next();
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return new NextResponse('Clerk authentication is selected but credentials are missing. Configure both keys or use demo authentication.', { status: 503 });
  return authenticated(request, event);
}
export const config = { matcher: ['/((?!_next|.*\\..*).*)'] };
