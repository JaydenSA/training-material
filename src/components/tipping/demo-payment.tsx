"use client";
import { ReviewForm, ReviewConfirmation } from "@/components/review-form";
import Link from "@/components/app-link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { money } from "@/lib/demo";
import { Badge, DemoNotice, Header, Heading, Logo } from "@/components/ui";

export function DemoPayment({ id }: { id: string }) {
  const { state, update, mode } = useWorkspace();
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
              <ReviewConfirmation
                rating={tip.rating || rating}
                review={tip.review}
              />
            ) : (
              <ReviewForm
                rating={rating}
                review={review}
                onRatingChange={setRating}
                onReviewChange={setReview}
                onSubmit={() => {
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
                <p>An optional rating for {employee?.name.split(" ")[0]}.</p>
              </ReviewForm>
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
          {simulation ? (
            <Link href="/dashboard/ratings">
              View simulated review in dashboard
            </Link>
          ) : (
            <Link href="/dashboard/tips">View restaurant records ↗</Link>
          )}
        </div>
        <small className="payment-disclosure">
          Reference: {tip.id}
          <br />
          {simulation
            ? "Simulation only. Tips and ratings are not saved to restaurant records."
            : "Restaurant management handles staff distribution."}
        </small>
      </section>
    </div>
  );
}
