"use client";
import { useEffect, useState } from "react";
import Link from "@/components/app-link";
import { useWorkspace } from "@/components/workspace-context";
export function SetupChecklist() {
  const { state, mode } = useWorkspace();
  const [connection, setConnection] = useState<{
    slug: string;
    enabled: boolean;
  } | null>(null);
  useEffect(() => {
    if (mode !== "database") return;
    const controller = new AbortController();
    fetch("/api/yoco/status", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const value = await response.json();
        if (!controller.signal.aborted)
          setConnection({
            slug: state.restaurant.slug,
            enabled: value.enabled,
          });
      })
      .catch(() => {
        /* Payments settings displays the detailed connection error. */
      });
    return () => controller.abort();
  }, [state.restaurant.slug, mode]);
  const activeEmployees = state.employees.filter(
    (employee) => !employee.deletedAt,
  );
  const hasActiveTag = state.tags.some(
    (tag) =>
      tag.status === "active" &&
      activeEmployees.some((employee) => employee.id === tag.employeeId),
  );
  const steps = [
    {
      label: "Restaurant details",
      done:
        !!state.restaurant.name &&
        !!state.restaurant.email &&
        !!state.restaurant.city,
      href: "/dashboard/settings",
      detail: "Check the name and contact details guests will see.",
    },
    {
      label: "Add your first employee",
      done: activeEmployees.length > 0,
      href: "/dashboard/employees",
      detail: "Create a profile for the person receiving tips.",
    },
    {
      label: "Create an active QR or NFC tag",
      done: hasActiveTag,
      href: "/dashboard/tags",
      detail: "Link a tag to an active employee.",
    },
    {
      label: "Connect Yoco",
      done: connection?.slug === state.restaurant.slug && connection.enabled,
      href: "/dashboard/settings#payments",
      detail:
        mode === "demo"
          ? "Payment connection is a preview in this demo."
          : "Configure restaurant-specific credentials and verify webhooks before live payments.",
    },
  ];
  const completed = steps.filter((step) => step.done).length;
  return (
    <section
      className="panel pad setup-checklist"
      aria-label="Restaurant setup checklist"
    >
      <div className="section-heading">
        <div>
          <h2>Get your restaurant ready</h2>
          <p>
            {completed} of {steps.length} setup steps complete
          </p>
        </div>
        <Link href="/dashboard/print">Print QR materials</Link>
      </div>
      <progress
        value={completed}
        max={steps.length}
        aria-label="Setup progress"
      />
      <ol>
        {steps.map((step) => (
          <li key={step.label}>
            <span aria-hidden="true">{step.done ? "✓" : "○"}</span>
            <div>
              <Link href={step.href}>{step.label}</Link>
              <p>{step.detail}</p>
            </div>
            <small>{step.done ? "Complete" : "Next step"}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}
