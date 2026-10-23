"use client";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { Badge, Heading } from "@/components/ui";
import { AccountIdentity } from "@/components/auth-controls";
import { YocoConnection } from "@/components/yoco-connection";

export function Settings() {
  const { state, update, reset, mode } = useWorkspace();
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
          mode === "database" ? (
            <YocoConnection />
          ) : (
            <>
              <Badge muted>Demo payments</Badge>
              <h3>Restaurant Yoco account</h3>
              <p>
                Demo payments never contact Yoco or move money. Sign in to your
                restaurant workspace to configure a Yoco connection.
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
