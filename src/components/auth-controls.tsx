"use client";
import Link from "./app-link";
import { UserButton, useUser, OrganizationSwitcher } from "@clerk/nextjs";
import { useAuthenticationEnabled } from "./auth-provider";
export function AuthControls({ compact = false }: { compact?: boolean }) {
  const enabled = useAuthenticationEnabled();
  if (!enabled)
    return (
      <div className="auth-controls">
        <Link href="/sign-in" className="auth-signin">
          Sign in
        </Link>
        {!compact && (
          <Link href="/demo/dashboard" className="button small">
            Explore demo
          </Link>
        )}
      </div>
    );
  return <ClerkControls compact={compact} />;
}
function ClerkControls({ compact }: { compact: boolean }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded)
    return (
      <span className="auth-loading" role="status">
        Loading account…
      </span>
    );
  if (isSignedIn)
    return (
      <div className="auth-controls">
        {!compact && (
          <Link href="/dashboard" className="button secondary small">
            My restaurant
          </Link>
        )}
        <OrganizationSwitcher
          hidePersonal
          afterCreateOrganizationUrl="/onboarding"
          afterSelectOrganizationUrl="/dashboard"
        />
        <UserButton />
      </div>
    );
  return (
    <div className="auth-controls">
      <Link href="/sign-in" className="auth-signin">
        Sign in
      </Link>
      <Link href="/sign-up" className="button small">
        Get started
      </Link>
    </div>
  );
}
export function AccountIdentity() {
  const enabled = useAuthenticationEnabled();
  return enabled ? (
    <ClerkIdentity />
  ) : (
    <Link href="/account" className="account-row">
      <span className="account-avatar">AM</span>
      <span>
        Alex Morgan<small>Restaurant owner · Demo</small>
      </span>
    </Link>
  );
}
function ClerkIdentity() {
  const { user, isLoaded } = useUser();
  const name =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Your account";
  return (
    <Link href="/account" className="account-row">
      <span className="account-avatar" aria-hidden="true">
        {user?.firstName?.[0] || "•"}
      </span>
      <span className="account-name">
        {isLoaded ? name : "Loading account…"}
        <small>Restaurant account</small>
      </span>
    </Link>
  );
}
