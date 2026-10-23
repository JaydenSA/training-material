"use client";
import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { Badge, Heading } from "@/components/ui";
import { TeamAccess } from "@/components/dashboard/team-access";
import { YocoConnection } from "@/components/yoco-connection";

const sectionNotes: Record<
  string,
  { title: string; text: string; detail: string }
> = {
  Restaurant: {
    title: "Your restaurant’s identity",
    text: "Keep your name and contact details up to date so your workspace is easy to recognise.",
    detail:
      "Employee profiles and tipping links are managed in Employees and QR & NFC tags.",
  },
  Payments: {
    title: "Tips go to your restaurant",
    text: "Each restaurant uses its own Yoco account. Your management team handles staff distribution and processing fees.",
    detail:
      "Demo checkout is available while your payment connection is being set up.",
  },
  Subscription: {
    title: "One plan per restaurant",
    text: "Your monthly subscription covers the restaurant workspace. NFC cards and QR stands are purchased separately.",
    detail:
      "Billing is currently a preview. No subscription payments are collected here.",
  },
  Team: {
    title: "The right access for your team",
    text: "Owners manage workspace membership. Managers look after restaurant data and day-to-day operations.",
    detail:
      "Employees can receive tips and reviews without creating an account.",
  },
  "Data connection": {
    title: "Your records stay connected",
    text: "Restaurant records belong to your workspace and are kept separate from other restaurants.",
    detail:
      "Employees are archived to preserve their historical tips and reviews.",
  },
  "Demo controls": {
    title: "A space to explore",
    text: "Try the dashboard with sample data. Changes stay in this browser, separate from connected restaurant records.",
    detail:
      "Reset the demo whenever you want to start your presentation again.",
  },
};

export function Settings() {
  const { state, update, reset, mode } = useWorkspace();
  const [tab, setTab] = useState("Restaurant");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const note = sectionNotes[tab];
  useEffect(() => {
    const syncTab = () => {
      if (location.hash === "#payments") setTab("Payments");
      else if (location.hash === "#team") setTab("Team");
      // Reserve hash routing for Clerk's embedded organization screens.
      if (["#payments", "#team"].includes(location.hash))
        history.replaceState(null, "", location.pathname + location.search);
    };
    syncTab();
    window.addEventListener("hashchange", syncTab);
    return () => window.removeEventListener("hashchange", syncTab);
  }, []);
  return (
    <>
      <Heading eyebrow="WORKSPACE SETTINGS" title="Make yourself at home.">
        Your restaurant, payment connection, and subscription.
      </Heading>
      <section
        className="panel settings-identity"
        aria-label="Current restaurant"
      >
        <div className="settings-monogram" aria-hidden="true">
          {state.restaurant.name.charAt(0) || "♥"}
        </div>
        <div className="settings-identity-copy">
          <h2>{state.restaurant.name || "Your restaurant"}</h2>
          <p>{state.restaurant.city || "Restaurant workspace"}</p>
        </div>
        <Badge muted={mode === "demo"}>
          {mode === "database" ? "Connected workspace" : "Demo workspace"}
        </Badge>
      </section>
      <div
        className="tabs settings-tabs"
        aria-label="Restaurant settings sections"
      >
        {[
          "Restaurant",
          "Payments",
          "Subscription",
          "Team",
          mode === "database" ? "Data connection" : "Demo controls",
        ].map((t) => (
          <button
            aria-pressed={tab === t}
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => {
              history.replaceState(
                null,
                "",
                location.pathname + location.search,
              );
              setTab(t);
              setMessage("");
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        className={`settings-layout ${tab === "Team" ? "settings-layout-team" : ""}`}
      >
        <section
          className="panel pad settings-panel"
          aria-label={`${tab} settings`}
        >
          {tab === "Restaurant" ? (
            <>
              <div className="settings-section-heading">
                <h2>Restaurant details</h2>
                <p>The essentials for your restaurant workspace.</p>
              </div>
              <form
                className="settings-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  const name = String(data.get("name")).trim();
                  if (!name) return;
                  setSaving(true);
                  setMessage("");
                  try {
                    const saved = await update((s) => ({
                      ...s,
                      restaurant: {
                        ...s.restaurant,
                        name,
                        email: String(data.get("email")),
                        city: String(data.get("city")),
                      },
                    }));
                    if (!saved) return;
                    setMessage(
                      mode === "database"
                        ? "Restaurant changes saved."
                        : "Restaurant details saved in this demo.",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <label className="settings-field-wide">
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
                    maxLength={254}
                  />
                </label>
                <label>
                  City
                  <input
                    name="city"
                    defaultValue={state.restaurant.city}
                    required
                    maxLength={100}
                  />
                </label>
                <div className="settings-form-footer">
                  <p>
                    {mode === "database"
                      ? "Changes apply to this restaurant workspace."
                      : "Changes are saved in this browser only."}
                  </p>
                  <button className="button" disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </>
          ) : tab === "Payments" ? (
            mode === "database" ? (
              <YocoConnection />
            ) : (
              <>
                <Badge muted>Demo payments</Badge>
                <h3>Restaurant Yoco account</h3>
                <p>
                  Demo payments never contact Yoco or move money. Sign in to
                  your restaurant workspace to configure a Yoco connection.
                </p>
              </>
            )
          ) : tab === "Subscription" ? (
            <>
              <Badge>
                {state.plan}
                {mode === "demo" ? " · Demo plan" : ""}
              </Badge>
              <h3>Simple monthly billing</h3>
              <div className="settings-plan-price">
                R299 <span>/ month</span>
              </div>
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
            <TeamAccess />
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
        <aside
          className="panel pad settings-note"
          aria-label="About these settings"
        >
          <div className="eyebrow">GOOD TO KNOW</div>
          <h2>{note.title}</h2>
          <p>{note.text}</p>
          <div className="settings-note-detail">{note.detail}</div>
        </aside>
      </div>
    </>
  );
}
