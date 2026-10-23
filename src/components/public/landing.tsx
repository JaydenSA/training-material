"use client";
import Link from "@/components/app-link";
import { useWorkspace } from "@/components/workspace-context";
import { Pricing } from "@/components/public/pricing";
import { HowItWorks } from "@/components/public/how-it-works";
import { Avatar } from "@/components/ui";

export function Landing() {
  const { state } = useWorkspace();
  return (
    <>
      <main className="hero">
        <div className="hero-copy">
          <span className="pill">
            MADE FOR RESTAURANTS. INSPIRED BY PEOPLE.
          </span>
          <h1>
            Great service.
            <br />A little <em>extra thanks.</em>
          </h1>
          <p>
            Turn a simple tap into a meaningful thank you. Cashless tips for
            your team, all in your restaurant’s Yoco account.
          </p>
          <div className="actions">
            <Link href="/demo/dashboard" className="button">
              Explore the restaurant demo
            </Link>
            <Link href="/demo/t/GT-001" className="button secondary">
              Try leaving a tip
            </Link>
          </div>
          <div className="hero-proof">
            <span>✓ No customer signup</span>
            <span>✓ QR & NFC ready</span>
            <span>✓ Your Yoco account</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="orbit one" />
          <div className="orbit two" />
          <span className="floating-note note-top">
            ✦ A small gesture. A big difference.
          </span>
          <div className="phone">
            <div className="phone-notch" />
            <div className="mini-brand">♥ tipit.</div>
            <Avatar employee={state.employees[0]} large />
            <small>{state.restaurant.name}</small>
            <h3>Say thanks to Sarah</h3>
            <p>Made your visit a little brighter?</p>
            <div className="amount-preview">
              <span>R20</span>
              <span className="selected">R50</span>
              <span>R100</span>
            </div>
            <Link href="/demo/t/GT-001" className="button">
              Leave a little thanks ♥
            </Link>
            <div className="mini-rating">
              ★★★★★ <span>Sample guest appreciation</span>
            </div>
          </div>
          <div className="floating-note note-bottom">
            <span className="success-icon">✓</span>
            <div>
              <strong>A little appreciation received</strong>
              <small>For the people who make your day.</small>
            </div>
          </div>
        </div>
      </main>
      <div className="trust-strip">
        <span>Less friction. More appreciation.</span>
        <strong>Scan or tap</strong>
        <span>✦</span>
        <strong>Choose a tip</strong>
        <span>✦</span>
        <strong>Make someone’s day</strong>
      </div>
      <section className="section">
        <div className="center">
          <div className="eyebrow">THOUGHTFUL BY DESIGN</div>
          <h2>
            Simple for guests.
            <br />
            Meaningful for your team.
          </h2>
          <p>
            Everything your restaurant needs to make appreciation effortless.
          </p>
        </div>
        <div className="feature-grid">
          {[
            [
              "▦",
              "One tap. One thank you.",
              "A QR code or NFC card takes guests straight to the right employee. No app. No account.",
            ],
            [
              "↗",
              "Your restaurant. Your account.",
              "Payments are received through your Yoco account, with every tip attributed to a team member.",
            ],
            [
              "☆",
              "Let great service shine.",
              "Give every employee a personal profile and collect ratings linked to confirmed tips.",
            ],
          ].map(([icon, title, text]) => (
            <article className="feature" key={title}>
              <span className="feature-icon">{icon}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <HowItWorks embedded />
      <Pricing embedded />
      <section className="cta">
        <div>
          <div className="eyebrow">A HAPPIER WAY TO SAY THANKS</div>
          <h2>
            Your team brings the care.
            <br />
            We make appreciation easy.
          </h2>
        </div>
        <Link href="/onboarding" className="button">
          Set up a demo restaurant
        </Link>
      </section>
    </>
  );
}
