"use client";
import Link from "./app-link";
import { usePathname, useRouter } from "next/navigation";
import {
  SignIn,
  SignUp,
  UserProfile,
  TaskChooseOrganization,
} from "@clerk/nextjs";
import { useDemo } from "./demo-provider";
import { Badge, Heading } from "./ui";
import { useAuthenticationEnabled } from "./auth-provider";
export function Pricing({ embedded = false }: { embedded?: boolean }) {
  return (
    <div
      id={embedded ? "pricing" : undefined}
      className={
        embedded ? "section landing-section pricing-section" : "public-content"
      }
    >
      <Heading
        eyebrow={embedded ? "PRICING" : "SIMPLE, RESTAURANT-FIRST PRICING"}
        level={embedded ? 2 : 1}
        title="A little investment in your people."
      >
        Illustrative demo pricing. Final prices and billing terms are to be
        confirmed.
      </Heading>
      <div className="two-column">
        <section className="panel pad">
          <Badge>Restaurant plan</Badge>
          <div className="pricing-value">
            R299 <small>/ month</small>
          </div>
          <p>
            One restaurant workspace, employee profiles, tip attribution,
            ratings, reports, and QR/NFC management.
          </p>
          <ul className="check-list">
            <li>Owner and manager dashboard</li>
            <li>Your restaurant’s Yoco account</li>
            <li>Individual employee tipping pages</li>
            <li>CSV transaction exports</li>
          </ul>
          <Link href="/onboarding" className="button">
            Try the demo
          </Link>
        </section>
        <section className="panel pad">
          <h3>Hardware, your way.</h3>
          <p>
            NFC cards and QR stands are purchased separately. Start small and
            add more as your team grows.
          </p>
          <p>Demo examples: NFC card R79 · QR stand R129.</p>
          <Link href="/dashboard/hardware" className="button secondary">
            Browse demo hardware
          </Link>
          <hr />
          <p>
            Payment processing fees are paid by the restaurant. Tipit does not
            distribute money to employees.
          </p>
        </section>
      </div>
    </div>
  );
}
export function HowItWorks({ embedded = false }: { embedded?: boolean }) {
  return (
    <div
      id={embedded ? "how-it-works" : undefined}
      className={embedded ? "section landing-section" : "public-content"}
    >
      <Heading
        eyebrow={
          embedded ? "HOW IT WORKS" : "FROM GOOD SERVICE TO A LITTLE THANKS"
        }
        level={embedded ? 2 : 1}
        title="Three simple steps."
      >
        A straightforward experience for restaurants, staff, and guests.
      </Heading>
      <div className="feature-grid">
        {[
          [
            "01",
            "Set up your restaurant",
            "Create employee profiles and connect your own Yoco merchant account.",
          ],
          [
            "02",
            "Give every employee a link",
            "Assign a QR code or NFC card that opens their personal tipping page.",
          ],
          [
            "03",
            "Let appreciation happen",
            "Guests choose an amount, pay, and optionally rate their service. See each employee’s confirmed tips.",
          ],
        ].map(([n, title, copy]) => (
          <div className="panel pad" key={n}>
            <span className="step-number">{n}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </div>
        ))}
      </div>
      <section className="panel pad">
        <h3>What happens to the money?</h3>
        <p>
          Yoco processes the payment for the restaurant. Tipit records employee
          attribution. Restaurant management is responsible for distribution to
          employees and payment processing fees.
        </p>
        <Link href="/t/GT-001" className="button">
          Try a demo tip
        </Link>
      </section>
    </div>
  );
}
export function Access({ page }: { page: string }) {
  const { state, update, mode } = useDemo();
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
export function Info({ page }: { page: string }) {
  return (
    <div className="public-content narrow">
      <Heading
        title={
          page === "help"
            ? "A little help, when you need it."
            : page === "privacy"
              ? "Privacy overview"
              : "Terms overview"
        }
      />
      {page === "help" ? (
        <>
          <h3>Who receives the tip?</h3>
          <p>
            The restaurant receives payment through its Yoco account. Ask
            restaurant management about staff distribution.
          </p>
          <h3>My tag is inactive</h3>
          <p>
            A restaurant manager can check the assignment and status in QR & NFC
            tags. Archived employee profiles cannot accept tips.
          </p>
          <h3>Can I get a refund?</h3>
          <p>
            Contact the restaurant with your payment reference. Refunds require
            the restaurant’s authorized payment process.
          </p>
          <h3>Can I demo without integrations?</h3>
          <p>
            Yes. All sample data is stored in this browser. Use Settings → Demo
            controls to reset it.
          </p>
        </>
      ) : (
        <>
          <Badge muted>Draft for client review</Badge>
          <p>
            This describes proposed product behaviour and is not a final
            published policy. Final legal documents must be approved before
            production launch.
          </p>
          <h3>
            {page === "privacy"
              ? "Data used by the product"
              : "How the service works"}
          </h3>
          <p>
            {page === "privacy"
              ? "Restaurant account details, employee names and optional profile information, tip references, amounts, and ratings are used to deliver the service. Card details are handled by the payment provider, not stored by Tipit."
              : "Tipit provides restaurant tipping pages and employee attribution. Restaurants receive payments through their own payment accounts, absorb processing fees, and manage employee distributions."}
          </p>
          <h3>
            {page === "privacy"
              ? "Visibility and retention"
              : "Subscriptions and hardware"}
          </h3>
          <p>
            {page === "privacy"
              ? "Public employee profiles should be published with appropriate notice and permission. Archiving disables tipping while preserving necessary transaction records. Production retention, access, deletion, and anonymisation processes must be defined."
              : "Subscriptions and hardware purchases are separate from guest tips. Prices in this demo are illustrative. Live billing, delivery, cancellation, and refund terms must be agreed before launch."}
          </p>
          <h3>Demo data</h3>
          <p>
            This demo uses sample identities and local browser storage. Do not
            enter sensitive personal information or live payment credentials.
          </p>
        </>
      )}
    </div>
  );
}
