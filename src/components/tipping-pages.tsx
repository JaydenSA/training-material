"use client";
import Link from "./app-link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useDemo } from "./demo-provider";
import { money, ratingFor } from "@/lib/demo";
import { readSimulation, saveSimulation } from "@/lib/payment-simulation";
import { Avatar, Badge, DemoNotice, Header, Heading, Logo } from "./ui";
export function PublicTip({ segments }: { segments: string[] }) {
  const { state, update, mode } = useDemo();
  const [amount, setAmount] = useState("50");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const path = usePathname();
  const isTag = segments[0] === "t";
  const tag = isTag ? state.tags.find((t) => t.id === segments[1]) : undefined;
  const id = isTag ? tag?.employeeId : segments[2];
  const employee = state.employees.find((e) => e.id === id);
  const disabled =
    (!isTag && segments[1] !== state.restaurant.slug) ||
    (isTag && (!tag || tag.status !== "active")) ||
    (!!id && (!employee || employee.deletedAt));
  async function checkout(event: FormEvent) {
    event.preventDefault();
    if (!employee || disabled || busy) return;
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents < 500 || cents > 1000000) {
      setError("Choose an amount between R5 and R10,000.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cents,
          employeeId: employee.id,
          tagId: tag?.id,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not start checkout.");
      if (result.mode !== "demo") {
        if (result.redirectUrl) window.location.assign(result.redirectUrl);
        else throw new Error("Payment provider did not return a checkout URL.");
        return;
      }
      const demoTip = {
        id: result.id, employeeId: employee.id, amount: cents,
        status: "pending" as const, createdAt: new Date().toISOString(),
      };
      if (mode === "database") {
        const previous = readSimulation(state.restaurant.slug);
        saveSimulation({ ...state, tips: [demoTip, ...(previous?.tips || [])], orders: [] });
        router.push(`/simulation/payment/${result.id}`);
        return;
      }
      update((s) => ({
        ...s,
        tips: [
          {
            id: result.id,
            employeeId: employee.id,
            amount: cents,
            status: "pending",
            createdAt: new Date().toISOString(),
          },
          ...s.tips,
        ],
      }));
      router.push(`${path.startsWith("/demo/") ? "/demo" : ""}/payment/${result.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  return (
    <div className="tip-shell">
      <div className="tip-header">
        <Logo />
        <DemoNotice />
      </div>
      {disabled || !employee ? (
        <div className="tip-card center">
          <span className="feature-icon">↗</span>
          <h1>This tipping link is no longer active.</h1>
          <p>Please ask your restaurant for the correct QR code or NFC card.</p>
          <Link href="/" className="button secondary">
            Back to Tipit
          </Link>
        </div>
      ) : (
        <>
          <div className="tip-card">
            <div className="restaurant-label">{state.restaurant.name}</div>
            <Avatar employee={employee} large />
            <h1>Say thanks to {employee.name.split(" ")[0]}.</h1>
            <p className="employee-role">{employee.role}</p>
            <p>{employee.bio}</p>
            <div className="mini-rating">
              ★{" "}
              {ratingFor(state, employee.id).count
                ? ratingFor(state, employee.id).average.toFixed(1)
                : "New to Tipit"}{" "}
              <span>· {ratingFor(state, employee.id).count} guest ratings</span>
            </div>
            <hr />
            <form onSubmit={checkout}>
              <h3>A little appreciation</h3>
              <p>Choose your tip amount</p>
              <div className="tip-amounts">
                {["20", "50", "100"].map((a) => (
                  <button
                    type="button"
                    className={amount === a ? "selected" : ""}
                    onClick={() => setAmount(a)}
                    key={a}
                  >
                    R{a}
                  </button>
                ))}
              </div>
              <label>
                Or choose your own amount (ZAR)
                <input
                  type="number"
                  min="5"
                  max="10000"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              {error && (
                <p role="alert" className="danger-text">
                  {error}
                </p>
              )}
              <button
                className="button full"
                disabled={busy}
              >
                {busy
                  ? "Opening demo checkout…"
                  : `Continue with ${money(Math.round(Number(amount || 0) * 100))} ♥`}
              </button>
            </form>
            <small className="payment-disclosure">
              Demo checkout only. No money will be charged or sent to {state.restaurant.name}.
            </small>
          </div>
          <p className="tip-footnote">
            Demo payments · No money will be charged
            <br />
            No signup. Just a little thanks.
          </p>
        </>
      )}
    </div>
  );
}
export function Payment({ id }: { id: string }) {
  const { state, update, mode } = useDemo();
  const simulation = usePathname().startsWith("/simulation/");
  const tip = state.tips.find((t) => t.id === id);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [saved, setSaved] = useState(false);
  const employee = state.employees.find((e) => e.id === tip?.employeeId);
  if (!tip)
    return (
      <>
        <Header />
        <div className="public-content">
          <Heading title="Payment not found">
            {mode === "database"
              ? "Payment collection and secure receipts will become available when the payment provider is connected."
              : "Demo payments are available in the browser where they were created."}
          </Heading>
          <Link className="button" href="/dashboard/tips">
            View transactions
          </Link>
        </div>
      </>
    );
  const setStatus = (status: "paid" | "failed" | "cancelled") =>
    update((s) => ({
      ...s,
      tips: s.tips.map((t) =>
        t.id === id && t.status === "pending" ? { ...t, status } : t,
      ),
    }));
  return (
    <div className="tip-shell">
      <div className="tip-header">
        <Logo />
        <DemoNotice />
      </div>
      <section className="tip-card center">
        <span className="payment-symbol">
          {tip.status === "paid" ? "✓" : tip.status === "pending" ? "↗" : "—"}
        </span>
        <Badge muted>Simulated payment</Badge>
        <h1>
          {tip.status === "paid"
            ? "A little thanks, received."
            : tip.status === "pending"
              ? "Try the checkout experience."
              : `Payment ${tip.status}`}
        </h1>
        <p>
          {money(tip.amount)} allocated to <strong>{employee?.name}</strong>
        </p>
        <p>Restaurant: {state.restaurant.name}</p>
        {tip.status === "pending" ? (
          <>
            <div className="info-box">
              This is a demo checkout. Choose an outcome to show the complete
              flow. No payment provider is contacted.
            </div>
            <div className="stack">
              <button className="button full" onClick={() => setStatus("paid")}>
                Simulate successful payment
              </button>
              <button
                className="button secondary full"
                onClick={() => setStatus("failed")}
              >
                Simulate failed payment
              </button>
              <button
                className="text-button"
                onClick={() => setStatus("cancelled")}
              >
                Cancel checkout
              </button>
            </div>
          </>
        ) : tip.status === "paid" ? (
          <>
            {tip.rating || saved ? (
              <div className="info-box">
                ★ {tip.rating || rating} / 5 · Thank you for your appreciation.
                {tip.review && <p className="review-text">{tip.review}</p>}
              </div>
            ) : (
              <div className="rating-form">
                <h3>How was your service?</h3>
                <p>An optional rating for {employee?.name.split(" ")[0]}.</p>
                <div className="rating-buttons">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      aria-label={`${n} stars`}
                      aria-pressed={rating === n}
                      key={n}
                      className={n <= rating ? "chosen" : ""}
                      onClick={() => setRating(n)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <label className="review-field">
                  Add a written review (optional)
                  <textarea
                    value={review}
                    onChange={(event) => setReview(event.target.value)}
                    maxLength={1000}
                    rows={4}
                    placeholder="What made your visit special?"
                    aria-describedby="review-help"
                  />
                </label>
                <small id="review-help">{review.length}/1,000 characters · Please leave out personal details.</small>
                <button
                  className="button full"
                  disabled={!rating}
                  onClick={() => {
                    update((s) => ({
                      ...s,
                      tips: s.tips.map((t) =>
                        t.id === id && t.status === "paid" && !t.rating
                          ? { ...t, rating, review: review.trim() || undefined }
                          : t,
                      ),
                    }));
                    setSaved(true);
                  }}
                >
                  Send appreciation
                </button>
              </div>
            )}
          </>
        ) : (
          <p>
            {tip.status === "refunded"
              ? "This demo payment has been refunded."
              : "No successful payment was recorded. Return to the employee’s page to try again."}
          </p>
        )}
        <div className="payment-links">
          <Link href={`/r/${state.restaurant.slug}/${tip.employeeId}`}>
            Back to employee
          </Link>
          {simulation ? <Link href="/dashboard/ratings">View simulated review in dashboard</Link> : <Link href="/dashboard/tips">View restaurant records ↗</Link>}
        </div>
        <small className="payment-disclosure">
          Reference: {tip.id}
          <br />
          {simulation ? "Simulation only. Tips and ratings are not saved to restaurant records." : "Restaurant management handles staff distribution."}
        </small>
      </section>
    </div>
  );
}
