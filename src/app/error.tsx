"use client";
import { useEffect } from "react";
import Link from "@/components/app-link";
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Tipit page failed", {
      digest: error.digest || "client-error",
    });
  }, [error]);
  return (
    <main className="public-content">
      <h1>This page couldn’t load.</h1>
      <p>
        Your saved restaurant records have not been reset. Try again or return
        to your dashboard.
      </p>
      <div className="actions">
        <button className="button" onClick={reset}>
          Try again
        </button>
        <Link className="button secondary" href="/dashboard">
          Restaurant dashboard
        </Link>
      </div>
    </main>
  );
}
