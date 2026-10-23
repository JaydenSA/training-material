"use client";
import Link from "@/components/app-link";
import { Heading } from "@/components/ui";

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
