"use client";
import Link from "@/components/app-link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { money, ratingFor } from "@/lib/demo";
import { readSimulation, saveSimulation } from "@/lib/payment-simulation";
import { Avatar, DemoNotice, Logo } from "@/components/ui";

export function PublicTip({ segments }: { segments: string[] }) {
  const { state, update, mode, paymentMode = "demo" } = useWorkspace();
  const attempt = useRef<{
    amount: number;
    employeeId: string;
    requestId: string;
    receiptToken: string;
  } | null>(null);
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
    if (
      !attempt.current ||
      attempt.current.amount !== cents ||
      attempt.current.employeeId !== employee.id
    )
      attempt.current = {
        amount: cents,
        employeeId: employee.id,
        requestId: crypto.randomUUID(),
        receiptToken: crypto.randomUUID(),
      };
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cents,
          employeeId: employee.id,
          tagId: tag?.id,
          restaurantSlug: state.restaurant.slug,
          requestId: attempt.current.requestId,
          receiptToken: attempt.current.receiptToken,
          demo: mode === "demo",
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
        id: result.id,
        employeeId: employee.id,
        amount: cents,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };
      if (mode === "database") {
        const previous = readSimulation(state.restaurant.slug);
        saveSimulation({
          ...state,
          tips: [demoTip, ...(previous?.tips || [])],
          orders: [],
        });
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
      router.push(
        `${path.startsWith("/demo/") ? "/demo" : ""}/payment/${result.id}`,
      );
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
              <button className="button full" disabled={busy}>
                {busy
                  ? "Opening checkout…"
                  : `Continue with ${money(Math.round(Number(amount || 0) * 100))} ♥`}
              </button>
            </form>
            <small className="payment-disclosure">
              {paymentMode === "live"
                ? `Payment goes to ${state.restaurant.name}'s Yoco account. The restaurant handles staff distribution and processing fees.`
                : paymentMode === "test"
                  ? "Yoco test checkout. Use test card details; no money will move."
                  : `Demo checkout only. No money will be charged or sent to ${state.restaurant.name}.`}
            </small>
          </div>
          <p className="tip-footnote">
            {paymentMode === "live"
              ? "Secure checkout by Yoco"
              : paymentMode === "test"
                ? "Yoco test payments · No real charges"
                : "Demo payments · No money will be charged"}
            <br />
            No signup. Just a little thanks.
          </p>
        </>
      )}
    </div>
  );
}
