"use client";
import Link from "@/components/app-link";
import { useState, type FormEvent } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { Employee, money, ratingFor } from "@/lib/demo";
import { Avatar, Badge, Empty, Heading } from "@/components/ui";

export function Employees({ id }: { id?: string }) {
  const { state, update } = useWorkspace();
  const [form, setForm] = useState(false);
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [message, setMessage] = useState("");
  const employee = state.employees.find((e) => e.id === id);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    const role = String(data.get("role")).trim();
    if (!name || !role) return;
    update((s) => ({
      ...s,
      employees: [
        ...s.employees,
        {
          id: crypto.randomUUID(),
          name,
          role,
          bio: String(data.get("bio") || ""),
          color: "#e3eee4",
          deletedAt: null,
        },
      ],
    }));
    setForm(false);
    setMessage("Team member added. Create their tag in QR & NFC tags.");
  }
  function archive(e: Employee) {
    if (
      !confirm(
        `Archive ${e.name}? Their public page and all tags will be suspended. Historical records stay available.`,
      )
    )
      return;
    update((s) => ({
      ...s,
      employees: s.employees.map((x) =>
        x.id === e.id ? { ...x, deletedAt: new Date().toISOString() } : x,
      ),
      tags: s.tags.map((t) =>
        t.employeeId === e.id && t.status !== "deleted"
          ? { ...t, status: "suspended" }
          : t,
      ),
    }));
  }
  if (id && !employee) return <Empty>Employee not found.</Empty>;
  if (employee)
    return (
      <>
        <Link className="back-link" href="/dashboard/employees">
          ← All team members
        </Link>
        <Heading
          title={employee.name}
          action={
            <Badge muted={!!employee.deletedAt}>
              {employee.deletedAt ? "Archived" : "Active employee"}
            </Badge>
          }
        >
          {employee.role}
        </Heading>
        <div className="two-column">
          <section className="panel pad">
            <Avatar employee={employee} large />
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const name = String(data.get("name")).trim();
                const role = String(data.get("role")).trim();
                if (!name || !role) return;
                update((s) => ({
                  ...s,
                  employees: s.employees.map((e) =>
                    e.id === id
                      ? {
                          ...e,
                          name,
                          role,
                          bio: String(data.get("bio")),
                        }
                      : e,
                  ),
                }));
                setMessage("Profile saved.");
              }}
            >
              <label>
                Full name
                <input
                  name="name"
                  defaultValue={employee.name}
                  required
                  maxLength={80}
                />
              </label>
              <label>
                Role
                <input
                  name="role"
                  defaultValue={employee.role}
                  required
                  maxLength={60}
                />
              </label>
              <label>
                Public introduction
                <textarea
                  name="bio"
                  defaultValue={employee.bio}
                  maxLength={240}
                />
              </label>
              <button className="button">Save profile</button>
            </form>
            {message && (
              <p role="status" className="success-text">
                {message}
              </p>
            )}
          </section>
          <section className="panel pad">
            <h3>Employee appreciation</h3>
            <p>
              Gross confirmed tips:{" "}
              <strong>
                {money(
                  state.tips
                    .filter((t) => t.employeeId === id && t.status === "paid")
                    .reduce((s, t) => s + t.amount, 0),
                )}
              </strong>
            </p>
            <p>
              ★ {ratingFor(state, id!).average.toFixed(1)} ·{" "}
              {ratingFor(state, id!).count} ratings
            </p>
            {!employee.deletedAt && (
              <Link
                className="button secondary"
                href={`/r/${state.restaurant.slug}/${employee.id}`}
              >
                Preview tipping page ↗
              </Link>
            )}
            <hr />
            <p>
              Archiving disables tipping and suspends all assigned tags.
              Restoring a profile does not reactivate its tags.
            </p>
            {employee.deletedAt ? (
              <button
                className="button secondary"
                onClick={() =>
                  update((s) => ({
                    ...s,
                    employees: s.employees.map((e) =>
                      e.id === id ? { ...e, deletedAt: null } : e,
                    ),
                  }))
                }
              >
                Restore employee
              </button>
            ) : (
              <button
                className="danger-button"
                onClick={() => archive(employee)}
              >
                Archive employee
              </button>
            )}
          </section>
        </div>
      </>
    );
  const rows = state.employees.filter(
    (e) =>
      (archived || !e.deletedAt) &&
      e.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        title="Your people. Their appreciation."
        action={
          <button className="button" onClick={() => setForm(!form)}>
            + Add team member
          </button>
        }
      >
        Manage the people who make every visit special.
      </Heading>
      {message && (
        <p className="success-text" role="status">
          {message}
        </p>
      )}
      {form && (
        <section className="panel pad">
          <h3>Add a team member</h3>
          <form onSubmit={save} className="employee-form">
            <label>
              Full name
              <input
                name="name"
                required
                maxLength={80}
                placeholder="e.g. Lerato Ndlovu"
              />
            </label>
            <label>
              Role
              <input
                name="role"
                required
                maxLength={60}
                placeholder="e.g. Waiter"
              />
            </label>
            <label>
              Introduction
              <textarea
                name="bio"
                maxLength={240}
                placeholder="A little about this team member"
              />
            </label>
            <div className="actions">
              <button className="button">Add employee</button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      <div className="filters">
        <input
          aria-label="Search team"
          placeholder="Search your team…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="checkbox">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />{" "}
          Show archived
        </label>
      </div>
      <div className="employee-grid">
        {rows.map((e) => (
          <article className="panel employee-card" key={e.id}>
            <div className="employee-card-top">
              <Avatar employee={e} large />
              <Badge muted={!!e.deletedAt}>
                {e.deletedAt ? "Archived" : "Active"}
              </Badge>
            </div>
            <h3>{e.name}</h3>
            <p>{e.role}</p>
            <div className="employee-card-stats">
              <div>
                <small>CONFIRMED TIPS</small>
                <strong>
                  {money(
                    state.tips
                      .filter(
                        (t) => t.employeeId === e.id && t.status === "paid",
                      )
                      .reduce((s, t) => s + t.amount, 0),
                  )}
                </strong>
              </div>
              <div>
                <small>GUEST RATING</small>
                <strong>★ {ratingFor(state, e.id).average.toFixed(1)}</strong>
              </div>
            </div>
            <Link
              href={`/dashboard/employees/${e.id}`}
              className="button secondary full"
            >
              Manage profile ↗
            </Link>
          </article>
        ))}
      </div>
      {!rows.length && <Empty>No team members match your search.</Empty>}
    </>
  );
}
