"use client";
import Link from "@/components/app-link";
import { Badge, Heading } from "@/components/ui";

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
