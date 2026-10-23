"use client";
import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "@/components/app-link";
import { useWorkspace } from "@/components/workspace-context";
import { Badge, Heading } from "@/components/ui";
import { EmployeeFields } from "@/components/employee-fields";
import { QRCode } from "@/components/dashboard/tags";
import { readSimulation, saveSimulation } from "@/lib/payment-simulation";

type Progress = {
  employeeId?: string;
  tagId?: string;
  scannedTagId?: string;
  paymentId?: string;
};
const steps = [
  "Add an employee",
  "Create a tag",
  "Check the QR link",
  "Try a practice tip",
];

export function GuidedSetup() {
  const { state, mode } = useWorkspace();
  return <SetupJourney key={`${mode}:${state.restaurant.slug}`} />;
}

function SetupJourney() {
  const { state, update, mode } = useWorkspace();
  const router = useRouter();
  const path = usePathname();
  const storageKey = `tipit-guided-setup:${mode}:${state.restaurant.slug}`;
  const [progress, setProgress] = useState<Progress>({});
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [practicePaid, setPracticePaid] = useState(false);
  const employees = state.employees.filter((employee) => !employee.deletedAt);
  const employee =
    employees.find((item) => item.id === progress.employeeId) || employees[0];
  const tags = state.tags.filter(
    (tag) => tag.status === "active" && tag.employeeId === employee?.id,
  );
  const tag = tags.find((item) => item.id === progress.tagId) || tags[0];
  const scanned = !!tag && progress.scannedTagId === tag.id;
  const complete = [!!employee, !!tag, scanned, scanned && practicePaid];
  const count = complete.filter(Boolean).length;
  const currentStep =
    step ??
    Math.max(
      0,
      complete.findIndex((done) => !done),
    );

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "{}");
      if (value && typeof value === "object") {
        const safe: Progress = {};
        for (const key of [
          "employeeId",
          "tagId",
          "scannedTagId",
          "paymentId",
        ] as const)
          if (typeof value[key] === "string") safe[key] = value[key];
        setProgress(safe);
      }
    } catch {
      /* The guide remains usable when browser storage is unavailable. */
    }
    setLoaded(true);
  }, [storageKey]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      /* Keep this session usable. */
    }
  }, [loaded, storageKey, progress]);
  useEffect(() => {
    const refresh = () =>
      setPracticePaid(
        Boolean(
          tag &&
          progress.tagId === tag.id &&
          readSimulation(state.restaurant.slug)?.tips.some(
            (tip) =>
              tip.id === progress.paymentId &&
              tip.employeeId === employee?.id &&
              tip.status === "paid",
          ),
        ),
      );
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("tipit-simulation-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("tipit-simulation-updated", refresh);
    };
  }, [
    employee?.id,
    tag,
    progress.paymentId,
    progress.tagId,
    state.restaurant.slug,
  ]);

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    if (!String(data.get("name")).trim() || !String(data.get("role")).trim()) {
      setError("Enter the employee’s name and role.");
      return;
    }
    const id = crypto.randomUUID();
    setBusy(true);
    setError("");
    try {
      const saved = await update((before) => ({
        ...before,
        employees: [
          ...before.employees,
          {
            id,
            name: String(data.get("name")).trim(),
            role: String(data.get("role")).trim(),
            bio: String(data.get("bio") || ""),
            color: "#e3eee4",
            deletedAt: null,
          },
        ],
      }));
      if (!saved) {
        setError(
          "The employee could not be saved. Resolve the workspace error and try again.",
        );
        return;
      }
      setProgress({ employeeId: id });
      setStep(1);
    } catch {
      setError("The employee could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employee || busy) return;
    const format = new FormData(event.currentTarget).get("format") as
      "NFC card" | "QR stand";
    const id = `GT-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;
    setBusy(true);
    setError("");
    try {
      const saved = await update((before) => ({
        ...before,
        tags: [
          ...before.tags,
          { id, employeeId: employee.id, type: format, status: "active" },
        ],
      }));
      if (!saved) {
        setError(
          "The tag could not be saved. Resolve the workspace error and try again.",
        );
        return;
      }
      setProgress({ employeeId: employee.id, tagId: id });
      setStep(2);
    } catch {
      setError("The tag could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function practice() {
    if (!employee || !tag || !scanned || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 1000,
          employeeId: employee.id,
          tagId: tag.id,
          restaurantSlug: state.restaurant.slug,
          requestId: crypto.randomUUID(),
          receiptToken: crypto.randomUUID(),
          demo: true,
        }),
      });
      const result = await response.json();
      if (
        !response.ok ||
        result.mode !== "demo" ||
        typeof result.id !== "string" ||
        !result.id.startsWith("demo-")
      )
        throw new Error("Simulation unavailable.");
      const previous = readSimulation(state.restaurant.slug);
      saveSimulation({
        ...state,
        orders: [],
        tips: [
          {
            id: result.id,
            employeeId: employee.id,
            amount: 1000,
            status: "pending",
            createdAt: new Date().toISOString(),
          },
          ...(previous?.tips || []),
        ],
      });
      const next = {
        ...progress,
        employeeId: employee.id,
        tagId: tag.id,
        paymentId: result.id,
      };
      setProgress(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* State is retained while mounted. */
      }
      router.push(
        `/simulation/payment/${result.id}?setup=${path.startsWith("/demo/") ? "demo" : "restaurant"}`,
      );
    } catch {
      setError(
        "The practice checkout could not start. No payment was taken. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      <Heading eyebrow="GUIDED SETUP" title="Your first tip, step by step.">
        Prepare an employee profile and tag, then rehearse the guest experience
        without moving money.
      </Heading>
      <section
        className="panel pad journey-progress"
        aria-label="Guided setup progress"
      >
        <div className="section-heading">
          <h2>{count === 4 ? "Practice complete" : "Let’s get you ready"}</h2>
          <Badge>{count} of 4 complete</Badge>
        </div>
        <progress aria-label="Guided setup completion" value={count} max={4} />
        <ol>
          {steps.map((label, index) => (
            <li key={label}>
              <button
                disabled={busy || (index > 0 && !complete[index - 1])}
                aria-current={currentStep === index ? "step" : undefined}
                onClick={() => {
                  setStep(index);
                  setError("");
                }}
              >
                <span aria-hidden="true">
                  {complete[index] ? "✓" : index + 1}
                </span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </section>
      {error && (
        <p className="storage-error" role="alert">
          {error}
        </p>
      )}
      {count === 4 ? (
        <section className="panel pad journey-content" role="status">
          <Badge>Practice complete</Badge>
          <h2>Your tipping journey is ready to demonstrate.</h2>
          <p>
            You created a profile, checked its tag and completed a simulated
            tip. This does not confirm a live payment connection or settlement.
          </p>
          <div className="actions">
            <Link className="button" href="/dashboard">
              Open dashboard
            </Link>
            <Link
              className="button secondary"
              href="/dashboard/settings#payments"
            >
              Review payment settings
            </Link>
          </div>
        </section>
      ) : (
        <section
          className="panel pad journey-content"
          aria-label={steps[currentStep]}
        >
          <div className="eyebrow">STEP {currentStep + 1} OF 4</div>
          <h2>{steps[currentStep]}</h2>
          {currentStep === 0 ? (
            <>
              <p>
                Create the profile guests will see when they tip. Employee
                accounts are not required.
              </p>
              {employees.length > 0 && (
                <div className="info-box">
                  <label>
                    Use an existing employee
                    <select
                      value={employee?.id || ""}
                      onChange={(event) =>
                        setProgress({ employeeId: event.target.value })
                      }
                    >
                      {employees.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="button secondary"
                    onClick={() => setStep(1)}
                  >
                    Continue with selected employee
                  </button>
                </div>
              )}
              <form onSubmit={saveEmployee}>
                <EmployeeFields />
                <button className="button" disabled={busy}>
                  {busy ? "Saving…" : "Add employee and continue"}
                </button>
              </form>
            </>
          ) : currentStep === 1 ? (
            <>
              <p>
                Create a permanent tipping link for{" "}
                <strong>{employee?.name}</strong>.
              </p>
              {tag && (
                <div className="info-box">
                  <p>
                    Active tag available: <strong>{tag.id}</strong>
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setProgress({ employeeId: employee!.id, tagId: tag.id });
                      setStep(2);
                    }}
                  >
                    Use existing tag
                  </button>
                </div>
              )}
              <form onSubmit={saveTag}>
                <label>
                  Tag format
                  <select name="format">
                    <option>QR stand</option>
                    <option>NFC card</option>
                  </select>
                </label>
                <button className="button" disabled={busy || !employee}>
                  {busy ? "Saving…" : "Create tag and continue"}
                </button>
              </form>
            </>
          ) : currentStep === 2 && tag ? (
            <>
              <p>
                Scan the code or open the link, then check that it shows{" "}
                <strong>{employee?.name}</strong> at {state.restaurant.name}.
                Only check the page here; use the safe practice checkout in the
                next step.
              </p>
              <div className="journey-qr">
                <QRCode code={tag.id} />
                <div>
                  <Badge>Active tag</Badge>
                  <p>{tag.id}</p>
                  <Link
                    className="button secondary"
                    href={`/t/${tag.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open tipping page
                  </Link>
                  <p>
                    {mode === "demo"
                      ? "Demo profiles live in this browser. Open the link here to preview; a separate phone will not share its sample data."
                      : "Use your published HTTPS site for a phone scan. A localhost address is only accessible on your own computer."}
                  </p>
                </div>
              </div>
              <button
                className="button"
                onClick={() => {
                  setProgress({
                    ...progress,
                    employeeId: employee!.id,
                    tagId: tag.id,
                    scannedTagId: tag.id,
                  });
                  setStep(3);
                }}
              >
                I checked the employee page
              </button>
              <p className="journey-disclosure">
                This is your confirmation, not an automatic phone-scan check.
              </p>
            </>
          ) : currentStep === 3 ? (
            <>
              <p>
                Try a R10 tip for <strong>{employee?.name}</strong>. Choose a
                simulated outcome and optionally leave a review, then return to
                this guide.
              </p>
              <div className="info-box">
                Practice mode is always simulated—even if real payments are
                enabled. No card is charged and no financial record is written
                to your restaurant database.
              </div>
              <button
                className="button"
                disabled={busy || !scanned}
                onClick={practice}
              >
                {busy ? "Opening practice checkout…" : "Simulate a R10 tip"}
              </button>
            </>
          ) : (
            <p>
              This employee or tag is no longer active. Choose an active
              employee to continue.
            </p>
          )}
        </section>
      )}
      <p className="journey-disclosure">
        Employee and tag changes are saved to{" "}
        {mode === "database"
          ? "your restaurant workspace"
          : "this browser’s demo"}
        . Guide progress is stored in this browser only. Payment setup and
        physical NFC checks remain separate.
      </p>
    </>
  );
}
