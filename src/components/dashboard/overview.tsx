"use client";
import Link from "@/components/app-link";
import { useWorkspace } from "@/components/workspace-context";
import { money, ratingFor } from "@/lib/demo";
import { Avatar, Badge, Heading } from "@/components/ui";
import { Transactions } from "@/components/dashboard/transactions";
export function Overview() {
  const { state, mode } = useWorkspace();
  const paid = state.tips.filter(
    (t) => t.status === "paid" && t.processingMode !== "test",
  );
  const rated = paid.filter((t) => t.rating);
  const chart = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      label: date.toLocaleDateString("en-ZA", {
        weekday: "short",
        timeZone: "Africa/Johannesburg",
      }),
      amount: paid
        .filter(
          (t) =>
            new Date(t.createdAt).toLocaleDateString("en-ZA", {
              timeZone: "Africa/Johannesburg",
            }) ===
            date.toLocaleDateString("en-ZA", {
              timeZone: "Africa/Johannesburg",
            }),
        )
        .reduce((s, t) => s + t.amount, 0),
    };
  });
  const max = Math.max(...chart.map((d) => d.amount), 1);
  return (
    <>
      <Heading
        eyebrow="YOUR RESTAURANT AT A GLANCE"
        title="A little thanks, adding up."
        action={
          <Link className="button small" href="/dashboard/employees">
            + Add team member
          </Link>
        }
      >
        Here’s how your team is making a difference.
      </Heading>
      <div className="welcome-banner">
        <div>
          <Badge>THE GREEN SIDE OF GREAT SERVICE</Badge>
          <h3>Good people. Great service. Well-deserved tips.</h3>
          <p>
            Every tip is attributed to your team and received by your
            restaurant.
          </p>
        </div>
        <div className="banner-flower">✳</div>
      </div>
      <div className="stats">
        <Stat
          label="Confirmed tips"
          value={money(paid.reduce((s, t) => s + t.amount, 0))}
          note="Gross tips · before restaurant fees"
          icon="↗"
        />
        <Stat
          label="Successful payments"
          value={String(paid.length)}
          note={
            mode === "database"
              ? "Provider-confirmed transactions"
              : "Sample confirmed transactions"
          }
          icon="▤"
        />
        <Stat
          label="Team appreciation"
          value={
            rated.length
              ? `${(rated.reduce((s, t) => s + (t.rating || 0), 0) / rated.length).toFixed(1)} / 5`
              : "—"
          }
          note={`${rated.length} ratings from confirmed tips`}
          icon="☆"
        />
        <Stat
          label="Active team members"
          value={String(state.employees.filter((e) => !e.deletedAt).length)}
          note={`${state.tags.filter((t) => t.status === "active").length} active QR & NFC tags`}
          icon="♧"
        />
      </div>
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Appreciation over time</h3>
              <p>Confirmed gross tips · last 7 days</p>
            </div>
            <Badge muted>This week</Badge>
          </div>
          <div className="chart-summary">
            {money(chart.reduce((s, d) => s + d.amount, 0))}
            <small>in the last seven calendar days</small>
          </div>
          <div
            className="chart"
            aria-label="Gross tips by day, last seven days"
          >
            {chart.map((d, i) => (
              <div className="chart-column" key={i}>
                <small>{money(d.amount)}</small>
                <div className="bar-track">
                  <div
                    className="bar"
                    style={{
                      height: `${Math.max(2, (d.amount / max) * 100)}%`,
                    }}
                  />
                </div>
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>People making a difference</h3>
              <p>Your team’s appreciation</p>
            </div>
            <Link href="/dashboard/employees">View all ↗</Link>
          </div>
          <div className="team-list">
            {state.employees
              .filter((e) => !e.deletedAt)
              .map((e) => (
                <Link
                  href={`/dashboard/employees/${e.id}`}
                  className="team-row"
                  key={e.id}
                >
                  <Avatar employee={e} />
                  <div>
                    <strong>{e.name}</strong>
                    <small>{e.role}</small>
                  </div>
                  <div className="team-value">
                    <strong>
                      {money(
                        paid
                          .filter((t) => t.employeeId === e.id)
                          .reduce((s, t) => s + t.amount, 0),
                      )}
                    </strong>
                    <small>★ {ratingFor(state, e.id).average.toFixed(1)}</small>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </div>
      <Transactions compact />
    </>
  );
}
function Stat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: string;
}) {
  return (
    <article className="stat">
      <div>
        {label}
        <span>{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
