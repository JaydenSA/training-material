"use client";
import { ReviewForm, ReviewConfirmation } from "@/components/review-form";
import { useEffect, useState } from "react";
import Link from "@/components/app-link";
import { money } from "@/lib/demo";
import { Badge, Logo } from "@/components/ui";
type Receipt = {
  id: string;
  amount: number;
  status: string;
  rating: number | null;
  review: string | null;
  mode: "test" | "live";
  employeeName: string;
  restaurantName: string;
};
export function YocoReceipt({ id }: { id: string }) {
  const [value, setValue] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function load() {
      try {
        const response = await fetch(
          `/api/payments/${encodeURIComponent(id)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Unable to load payment.");
        if (controller.signal.aborted) return;
        setValue(result);
        setError("");
        if (result.status === "pending" && attempts++ < 30)
          timer = setTimeout(load, 2000);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Unable to check payment.",
          );
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, retry]);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, review: review.trim() }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to save your review.");
      setValue(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save your review.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="tip-shell">
      <div className="tip-header">
        <Logo />
      </div>
      <section className="tip-card center">
        {value && (
          <Badge muted={value.mode === "test"}>
            {value.mode === "test"
              ? "Yoco test payment · No real charge"
              : "Yoco payment"}
          </Badge>
        )}
        <h1>
          {!value
            ? "Checking your payment…"
            : value.status === "paid"
              ? "A little thanks, received."
              : value.status === "pending"
                ? "Waiting for payment confirmation."
                : `Payment ${value.status}`}
        </h1>
        {value && (
          <p>
            {money(value.amount)} for <strong>{value.employeeName}</strong> at{" "}
            {value.restaurantName}
          </p>
        )}
        {value?.status === "pending" && (
          <p>
            We’re waiting for Yoco’s confirmation. If checkout was cancelled or
            closed, no successful payment has been recorded. You can check again
            below.
          </p>
        )}
        {error && (
          <p className="danger-text" role="alert">
            {error}
          </p>
        )}
        {(!value || value.status === "pending" || error) && (
          <button
            className="button secondary"
            onClick={() => setRetry((n) => n + 1)}
          >
            Check again
          </button>
        )}
        {value?.status === "paid" &&
          (value.rating ? (
            <ReviewConfirmation rating={value.rating!} review={value.review} />
          ) : (
            <ReviewForm
              rating={rating}
              review={review}
              onRatingChange={setRating}
              onReviewChange={setReview}
              onSubmit={submit}
              busy={busy}
            />
          ))}
        <div className="payment-links">
          <Link href="/">Back to Tipit</Link>
          <Link href="/dashboard/tips">Restaurant dashboard</Link>
        </div>
        {value && (
          <small className="payment-disclosure">
            Reference: {value.id}
            <br />
            Restaurant management handles staff distribution.
          </small>
        )}
      </section>
    </div>
  );
}
