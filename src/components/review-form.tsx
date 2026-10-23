"use client";
import { useId, type ReactNode } from "react";
import { REVIEW_MAX_LENGTH } from "@/lib/reviews";

export function RatingStars({
  value,
  showValue = false,
}: {
  value: number;
  showValue?: boolean;
}) {
  return (
    <>
      <span className="review-stars" aria-label={`${value} out of 5 stars`}>
        {"★".repeat(value)}
        {"☆".repeat(5 - value)}
      </span>
      {showValue && <small> {value}/5</small>}
    </>
  );
}

export function ReviewForm({
  rating,
  review,
  onRatingChange,
  onReviewChange,
  onSubmit,
  busy = false,
  children,
}: {
  rating: number;
  review: string;
  onRatingChange: (value: number) => void;
  onReviewChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  busy?: boolean;
  children?: ReactNode;
}) {
  const helpId = useId();
  return (
    <div className="rating-form">
      <h3>How was your service?</h3>
      {children}
      <div className="rating-buttons">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            type="button"
            key={value}
            disabled={busy}
            aria-label={`${value} stars`}
            aria-pressed={rating === value}
            className={value <= rating ? "chosen" : ""}
            onClick={() => onRatingChange(value)}
          >
            ★
          </button>
        ))}
      </div>
      <label className="review-field">
        Add a written review (optional)
        <textarea
          rows={4}
          maxLength={REVIEW_MAX_LENGTH}
          value={review}
          disabled={busy}
          onChange={(event) => onReviewChange(event.target.value)}
          placeholder="What made your visit special?"
          aria-describedby={helpId}
        />
      </label>
      <small id={helpId}>
        {review.length}/{REVIEW_MAX_LENGTH.toLocaleString("en-ZA")} characters ·
        Please leave out personal details.
      </small>
      <button
        type="button"
        className="button full"
        disabled={!rating || busy}
        onClick={() => void onSubmit()}
      >
        {busy ? "Saving…" : "Send appreciation"}
      </button>
    </div>
  );
}

export function ReviewConfirmation({
  rating,
  review,
}: {
  rating: number;
  review?: string | null;
}) {
  return (
    <div className="info-box">
      ★ {rating} / 5 · Thank you for your appreciation.
      {review && <p className="review-text">{review}</p>}
    </div>
  );
}
