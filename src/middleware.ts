import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { getAuthConfiguration } from "@/lib/auth-config";
const protectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/onboarding(.*)",
]);
const authenticated = clerkMiddleware(
  async (auth, request) => {
    if (protectedRoute(request)) await auth.protect();
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);
export default function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const { enabled, invalid } = getAuthConfiguration();
  if (invalid)
    return new NextResponse(
      "Clerk authentication is selected but credentials are missing. Configure both keys or use demo authentication.",
      { status: 503 },
    );
  if (!enabled) return NextResponse.next();
  return authenticated(request, event);
}
export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/dashboard/:path*",
    "/account/:path*",
    "/onboarding/:path*",
    "/api/:path*",
  ],
};
