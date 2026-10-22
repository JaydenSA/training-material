"use client";
import Link from "./app-link";
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useDemo } from "./demo-provider";
import { Employee, money, ratingFor } from "@/lib/demo";
import { Avatar, Badge, Empty, Heading } from "./ui";
import { AccountIdentity } from "./auth-controls";
import { RatingsTable } from "./ratings-table";
export function Employees({ id }: { id?: string }) {
  const { state, update } = useDemo();
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
export function Ratings() { return <RatingsTable />; }
export function Tags() {
  const { state, update } = useDemo();
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = `GT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    update((s) => ({
      ...s,
      tags: [
        ...s.tags,
        {
          id,
          employeeId: String(data.get("employee")),
          type: data.get("type") as "NFC card" | "QR stand",
          status: "active",
        },
      ],
    }));
    setMessage(`Tag ${id} created.`);
  }
  return (
    <>
      <Heading title="Small tags. Meaningful connections.">
        Create permanent links for QR codes and NFC cards. Suspended or deleted
        tags cannot accept tips.
      </Heading>
      <section className="panel pad">
        <h3>Create a tipping link</h3>
        <form onSubmit={create} className="inline-form">
          <label>
            Team member
            <select name="employee" required>
              {state.employees
                .filter((e) => !e.deletedAt)
                .map((e) => (
                  <option value={e.id} key={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Format
            <select name="type">
              <option>NFC card</option>
              <option>QR stand</option>
            </select>
          </label>
          <button
            className="button"
            disabled={!state.employees.some((e) => !e.deletedAt)}
          >
            Create link
          </button>
        </form>
        {message && (
          <p role="status" className="success-text">
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>TAG</th>
                <th>EMPLOYEE</th>
                <th>FORMAT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {state.tags
                .filter((t) => t.status !== "deleted")
                .map((t) => {
                  const employee = state.employees.find(
                    (e) => e.id === t.employeeId,
                  );
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/t/${t.id}`}>{t.id} ↗</Link>
                      </td>
                      <td>{employee?.name}</td>
                      <td>{t.type}</td>
                      <td>
                        <Badge muted={t.status !== "active"}>{t.status}</Badge>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            onClick={() => {
                              navigator.clipboard
                                .writeText(`${location.origin}${location.pathname.startsWith("/demo/") ? "/demo" : ""}/t/${t.id}`)
                                .then(() => setMessage("Link copied."))
                                .catch(() =>
                                  setMessage(
                                    `Copy this link: ${location.origin}${location.pathname.startsWith("/demo/") ? "/demo" : ""}/t/${t.id}`,
                                  ),
                                );
                            }}
                          >
                            Copy link
                          </button>
                          <button
                            onClick={() =>
                              setSelected(selected === t.id ? null : t.id)
                            }
                          >
                            QR
                          </button>
                          <button
                            disabled={!!employee?.deletedAt}
                            onClick={() =>
                              update((s) => ({
                                ...s,
                                tags: s.tags.map((x) =>
                                  x.id === t.id
                                    ? {
                                        ...x,
                                        status:
                                          x.status === "active"
                                            ? "suspended"
                                            : "active",
                                      }
                                    : x,
                                ),
                              }))
                            }
                          >
                            {t.status === "active" ? "Suspend" : "Activate"}
                          </button>
                          <button
                            className="danger-text"
                            onClick={() => {
                              if (
                                confirm(
                                  "Delete this tag? Its link will stop working. The historical record is retained.",
                                )
                              ) {
                                update((s) => ({
                                  ...s,
                                  tags: s.tags.map((x) =>
                                    x.id === t.id
                                      ? { ...x, status: "deleted" }
                                      : x,
                                  ),
                                }));
                                if (selected === t.id) setSelected(null);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
      {selected && (
        <section className="panel pad qr-panel">
          <h3>Scan to say thanks</h3>
          <QRCode key={selected} code={selected} />
          <p>
            {
              state.employees.find(
                (e) =>
                  e.id ===
                  state.tags.find((t) => t.id === selected)?.employeeId,
              )?.name
            }
          </p>
          <Link href={`/t/${selected}`}>Open tipping link ↗</Link>
          <p className="muted-text">
            Program this same URL onto your NFC card. For phone demos, use a
            deployed or LAN-accessible site URL rather than localhost.
          </p>
        </section>
      )}
    </>
  );
}
function QRCode({ code }: { code: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    import("qrcode")
      .then((qr) =>
        qr.toString(`${location.origin}${location.pathname.startsWith("/demo/") ? "/demo" : ""}/t/${code}`, {
          type: "svg",
          width: 240,
          margin: 2,
        }),
      )
      .then((value) => {
        if (active) setSvg(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [code]);
  return (
    <div>
      {svg ? (
        <>
          <Image
            unoptimized
            width={240}
            height={240}
            src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
            alt={`QR code for tag ${code}`}
          />
          <a
            className="button secondary small"
            download={`tipit-${code}.svg`}
            href={`data:image/svg+xml,${encodeURIComponent(svg)}`}
          >
            Download QR
          </a>
        </>
      ) : (
        <p>{error ? "Unable to generate QR." : "Generating QR…"}</p>
      )}
    </div>
  );
}
export function Hardware() {
  const { state, update, mode } = useDemo();
  const [message, setMessage] = useState("");
  const products = [
    {
      name: "Personal NFC card",
      icon: "▱",
      price: 7900,
      detail: "A tap of thanks, wherever service happens.",
    },
    {
      name: "Table QR stand",
      icon: "▦",
      price: 12900,
      detail: "A little invitation to appreciate great service.",
    },
    {
      name: "Team starter pack",
      icon: "✳",
      price: 49900,
      detail: "5 NFC cards and 1 QR stand for your team.",
    },
  ];
  return (
    <>
      <Heading title="A small touch. A lasting thank you.">
        Equip your team with QR and NFC hardware. Illustrative demo prices; no
        orders are sent or charged.
      </Heading>
      <div className="employee-grid">
        {products.map((p) => (
          <article className="panel hardware-card" key={p.name}>
            <div className="hardware-illustration">
              <div>
                {p.icon}
                <small>♥ tipit.</small>
              </div>
            </div>
            <h3>{p.name}</h3>
            <p>{p.detail}</p>
            <strong className="price">{money(p.price)}</strong>
            <button
              className="button full"
              onClick={() => {
                update((s) => ({
                  ...s,
                  orders: [
                    {
                      id: crypto.randomUUID(),
                      product: p.name,
                      quantity: 1,
                      amount: p.price,
                      createdAt: new Date().toISOString(),
                    },
                    ...s.orders,
                  ],
                }));
                setMessage(
                  `${p.name} added to ${mode === "database" ? "draft" : "demo"} orders. No payment or fulfilment requested.`,
                );
              }}
            >
              {mode === "database" ? "Create draft order" : "Create demo order"}
            </button>
          </article>
        ))}
      </div>
      {message && (
        <p role="status" className="success-text">
          {message}
        </p>
      )}
      <section className="panel pad">
        <h3>
          {mode === "database" ? "Draft order history" : "Demo order history"}
        </h3>
        {state.orders.length ? (
          state.orders.map((o) => (
            <div key={o.id} className="order-row">
              <strong>{o.product}</strong>
              <span>
                Qty {o.quantity} · {money(o.amount)}
              </span>
              <Badge muted>
                {mode === "database" ? "Draft · unpaid" : "Demo only"}
              </Badge>
            </div>
          ))
        ) : (
          <Empty>Your hardware orders will appear here.</Empty>
        )}
      </section>
    </>
  );
}
export function Settings() {
  const { state, update, reset, mode } = useDemo();
  const [tab, setTab] = useState("Restaurant");
  const [message, setMessage] = useState("");
  return (
    <>
      <Heading title="Make yourself at home.">
        Your restaurant, payment connection, and subscription.
      </Heading>
      <div className="tabs">
        {[
          "Restaurant",
          "Payments",
          "Subscription",
          "Team",
          mode === "database" ? "Data connection" : "Demo controls",
        ].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => {
              setTab(t);
              setMessage("");
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="panel pad settings-panel">
        {tab === "Restaurant" ? (
          <>
            <h3>Restaurant details</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const name = String(data.get("name")).trim();
                if (!name) return;
                update((s) => ({
                  ...s,
                  restaurant: {
                    ...s.restaurant,
                    name,
                    email: String(data.get("email")),
                    city: String(data.get("city")),
                  },
                }));
                setMessage(
                  mode === "database"
                    ? "Restaurant changes submitted."
                    : "Restaurant details saved in this demo.",
                );
              }}
            >
              <label>
                Restaurant name
                <input
                  name="name"
                  defaultValue={state.restaurant.name}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Contact email
                <input
                  name="email"
                  type="email"
                  defaultValue={state.restaurant.email}
                  required
                />
              </label>
              <label>
                City
                <input
                  name="city"
                  defaultValue={state.restaurant.city}
                  required
                />
              </label>
              <button className="button">Save changes</button>
            </form>
          </>
        ) : tab === "Payments" ? (
          <>
            <Badge muted>
              {mode === "database" ? "Payments not enabled" : "Demo connection"}
            </Badge>
            <h3>Your restaurant’s Yoco account</h3>
            <p>
              Demo payments never contact Yoco or move money. In production,
              payments must use your restaurant’s authorized merchant
              connection.
            </p>
            <p>
              Processing fees are absorbed by the restaurant. Employee
              distribution is handled outside Tipit.
            </p>
            <div className="info-box">
              Live merchant onboarding and webhook verification must be
              completed before accepting real payments. Credentials belong in
              server configuration, never in this browser.
            </div>
          </>
        ) : tab === "Subscription" ? (
          <>
            <Badge>
              {state.plan}
              {mode === "demo" ? " · Demo plan" : ""}
            </Badge>
            <h3>Simple monthly billing</h3>
            <p>
              Illustrative plan: R299 / restaurant / month. Hardware is
              purchased separately. Final pricing is to be confirmed.
            </p>
            <button
              className="button secondary"
              onClick={() =>
                setMessage(
                  "Billing preview only. No subscription was created, changed, or charged.",
                )
              }
            >
              Preview billing management
            </button>
          </>
        ) : tab === "Team" ? (
          <>
            <h3>Dashboard access</h3>
            <AccountIdentity />
            <p>
              Employee profiles do not require accounts. Owner and manager
              invitations are managed through the restaurant workspace menu.
            </p>
          </>
        ) : mode === "database" ? (
          <>
            <h3>PostgreSQL storage</h3>
            <p>
              Restaurant data is saved to the connected database. Failed saves
              show an error; the app never substitutes sample data. Financial
              records cannot be reset from this screen.
            </p>
          </>
        ) : (
          <>
            <h3>Start fresh</h3>
            <p>
              Changes are stored in this browser only. Reset restores sample
              employees, payments, tags, and ratings.
            </p>
            <button
              className="danger-button"
              onClick={() => {
                if (confirm("Reset all demo changes in this browser?")) {
                  reset();
                  setMessage("Demo restored.");
                }
              }}
            >
              Reset demo data
            </button>
          </>
        )}
        {message && (
          <p className="success-text" role="status">
            {message}
          </p>
        )}
      </section>
    </>
  );
}
