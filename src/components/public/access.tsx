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
  if (page === "sign-in" || page === "sign-up")
    return (
      <div className="auth-entry">
        <section
          className="auth-entry-form"
          aria-label="Account authentication"
        >
          {authEnabled ? (
            page === "sign-in" ? (
              <SignIn
                routing="hash"
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/dashboard"
              />
            ) : (
              <SignUp
                routing="hash"
                signInUrl="/sign-in"
                fallbackRedirectUrl="/onboarding"
              />
            )
          ) : (
            <div className="panel pad">
              <h1>Account access is unavailable.</h1>
              <p>
                Sign-in and registration are not configured on this environment.
                You can still explore a demo below.
              </p>
            </div>
          )}
        </section>
        <section
          className="panel pad auth-demo-options"
          aria-label="Demo options"
        >
          <Badge muted>NO ACCOUNT NEEDED</Badge>
          <h2>Just looking around?</h2>
          <p>
            Explore a sample restaurant, or try setting up a new one. Demo
            changes stay in your browser.
          </p>
          <div className="auth-demo-actions">
            <Link className="button secondary" href="/demo/dashboard">
              Explore demo
            </Link>
            <Link className="text-button" href="/demo/onboarding">
              Try onboarding demo
            </Link>
          </div>
        </section>
      </div>
    );
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
            ? "Set up your restaurant demo."
            : page === "account"
              ? "Your demo account."
              : "Welcome to a little more appreciation."}
        </h1>
        <p>
          {page === "onboarding" && demoPath
            ? "Experience a new restaurant’s first steps. Submitting this form replaces the sample workspace in this browser with an empty restaurant. No account is created and no database records are changed."
            : page === "account"
              ? "Alex Morgan · Restaurant owner. This is a sample identity, not an authenticated account."
              : authEnabled
                ? "Your account is signed in. Set up a sample restaurant workspace to explore the product."
                : "Explore the full restaurant experience without creating an account. No credentials are collected in this demo."}
        </p>
        {page === "onboarding" ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const name = String(data.get("name")).trim();
              if (!name) return;
              const saved = await update((s) => ({
                ...s,
                ...(demoPath
                  ? {
                      employees: [],
                      tags: [],
                      tips: [],
                      orders: [],
                      activity: [],
                      plan: "Restaurant",
                    }
                  : {}),
                onboarded: true,
                restaurant: {
                  ...s.restaurant,
                  name,
                  city: String(data.get("city")),
                  email: String(data.get("email")),
                  ...(demoPath
                    ? {
                        slug:
                          name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, "") || "demo-restaurant",
                      }
                    : {}),
                },
              }));
              if (!saved) return;
              router.push(demoPath ? "/demo/dashboard" : "/dashboard");
            }}
          >
            <label>
              Restaurant name
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={demoPath ? "" : state.restaurant.name}
              />
            </label>
            <label>
              Contact email
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                defaultValue={demoPath ? "" : state.restaurant.email}
              />
            </label>
            <label>
              City
              <input
                name="city"
                required
                maxLength={100}
                defaultValue={demoPath ? "" : state.restaurant.city}
              />
            </label>
            <button className="button full">Create demo restaurant</button>
          </form>
        ) : (
          <Link href="/demo/dashboard" className="button full">
            Enter demo workspace
          </Link>
        )}
        <div className="info-box">
          This preview uses browser-local data. To create a connected
          restaurant, <Link href="/sign-up">create an account</Link> or{" "}
          <Link href="/sign-in">sign in</Link>. Employees do not need accounts.
        </div>
      </section>
    </div>
  );
}
