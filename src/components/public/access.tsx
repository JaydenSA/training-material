"use client";
import Link from "@/components/app-link";
import { usePathname, useRouter } from "next/navigation";
import {
  SignIn,
  SignUp,
  UserProfile,
  TaskChooseOrganization,
} from "@clerk/nextjs";
import { useWorkspace } from "@/components/workspace-context";
import { Badge, Heading } from "@/components/ui";
import { useAuthenticationEnabled } from "@/components/auth-provider";

export function Access({ page }: { page: string }) {
  const { state, update, mode } = useWorkspace();
  const router = useRouter();
  const demoPath = usePathname().startsWith("/demo");
  const authEnabled = useAuthenticationEnabled();
  if (authEnabled) {
    if (mode === "database" && page === "onboarding")
      return (
        <div className="public-content">
          <Heading title="Your restaurant is ready.">
            {state.restaurant.name} is saved in your restaurant workspace.
          </Heading>
          <Link className="button" href="/dashboard">
            Open dashboard
          </Link>
        </div>
      );
    if (page === "choose-organization")
      return (
        <div className="access-wrap">
          <TaskChooseOrganization redirectUrlComplete="/onboarding" />
        </div>
      );
    if (page === "sign-in")
      return (
        <div className="access-wrap">
          <SignIn
            routing="hash"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/dashboard"
          />
        </div>
      );
    if (page === "sign-up")
      return (
        <div className="access-wrap">
          <SignUp
            routing="hash"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/onboarding"
          />
        </div>
      );
    if (page === "account")
      return (
        <div className="public-content">
          <UserProfile routing="hash" />
        </div>
      );
  }
  return (
    <div className="access-wrap">
      <section className="panel pad">
        <Badge muted>
          {authEnabled ? "Restaurant setup · Sample data" : "Demo access"}
        </Badge>
        <h1>
          {page === "onboarding"
            ? "Meet your restaurant’s new little helper."
            : page === "account"
              ? "Your demo account."
              : "Welcome to a little more appreciation."}
        </h1>
        <p>
          {page === "account"
            ? "Alex Morgan · Restaurant owner. This is a sample identity, not an authenticated account."
            : authEnabled
              ? "Your account is signed in. Set up a sample restaurant workspace to explore the product."
              : "Explore the full restaurant experience without creating an account. No credentials are collected in this demo."}
        </p>
        {page === "onboarding" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const name = String(data.get("name")).trim();
              if (!name) return;
              update((s) => ({
                ...s,
                onboarded: true,
                restaurant: {
                  ...s.restaurant,
                  name,
                  city: String(data.get("city")),
                },
              }));
              router.push(demoPath ? "/demo/dashboard" : "/dashboard");
            }}
          >
            <label>
              Restaurant name
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={state.restaurant.name}
              />
            </label>
            <label>
              City
              <input
                name="city"
                required
                defaultValue={state.restaurant.city}
              />
            </label>
            <button className="button full">Open demo workspace ↗</button>
          </form>
        ) : (
          <Link href="/dashboard" className="button full">
            Enter demo workspace ↗
          </Link>
        )}
        <div className="info-box">
          Restaurant workspace data is currently a browser-local demo. Clerk
          authenticates owners and managers; employees do not need accounts.
        </div>
      </section>
    </div>
  );
}
