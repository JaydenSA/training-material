"use client";
import Link from "@/components/app-link";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { DashboardSkeleton } from "@/components/dashboard/skeleton";
import { AuthControls, AccountIdentity } from "@/components/auth-controls";
import { Logo, Empty, DemoNotice } from "@/components/ui";
import { Overview } from "@/components/dashboard/overview";
import { Transactions } from "@/components/dashboard/transactions";
import { Employees } from "@/components/dashboard/employees";
import { Tags } from "@/components/dashboard/tags";
import { Hardware } from "@/components/dashboard/hardware";
import { Settings } from "@/components/dashboard/settings";
import { RatingsTable as Ratings } from "@/components/dashboard/ratings";
const nav = [
  ["Overview", "/dashboard", "◫"],
  ["Employees", "/dashboard/employees", "♧"],
  ["Tips & transactions", "/dashboard/tips", "↗"],
  ["Ratings", "/dashboard/ratings", "☆"],
  ["QR & NFC tags", "/dashboard/tags", "▦"],
  ["Hardware shop", "/dashboard/hardware", "▱"],
  ["Settings", "/dashboard/settings", "⚙"],
];
export function Dashboard({ section, id }: { section: string; id?: string }) {
  const { state, ready, loadError, retry } = useWorkspace();
  const [menu, setMenu] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Logo />
        <div className="workspace">
          <span className="restaurant-icon">
            {state.restaurant.name.charAt(0) || "♥"}
          </span>
          <div>
            <strong>{state.restaurant.name || "Restaurant workspace"}</strong>
            <small>Restaurant workspace</small>
          </div>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav>
          {nav.map(([label, href, icon]) => (
            <Link
              onClick={() => setMenu(false)}
              className={
                ("/dashboard/" + section).replace(/\/$/, "") === href
                  ? "active"
                  : ""
              }
              key={href}
              href={href}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <strong>A little help?</strong>
            <p>We’re here for your restaurant.</p>
            <Link href="/help">Visit help centre ↗</Link>
          </div>
          <AccountIdentity />
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-top">
          <button
            className="mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            ☰
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            {nav.find(
              (n) => n[1] === `/dashboard${section ? "/" + section : ""}`,
            )?.[0] || "Employee profile"}
          </div>
          <DemoNotice />
          <AuthControls compact />
        </header>
        <main className="dashboard-content" aria-busy={!ready}>
          {!ready ? (
            <DashboardSkeleton section={section} detail={!!id} />
          ) : loadError ? (
            <section className="panel pad" role="alert">
              <h1>Restaurant data is unavailable.</h1>
              <p>{loadError}</p>
              <button className="button" onClick={retry}>
                Try again
              </button>
            </section>
          ) : section === "" ? (
            <Overview />
          ) : section === "employees" ? (
            <Employees id={id} />
          ) : section === "tips" ? (
            <Transactions />
          ) : section === "ratings" ? (
            <Ratings />
          ) : section === "tags" ? (
            <Tags />
          ) : section === "hardware" ? (
            <Hardware />
          ) : section === "settings" ? (
            <Settings />
          ) : (
            <Empty>
              Page unavailable.{" "}
              <Link href="/dashboard">Return to overview</Link>
            </Empty>
          )}
        </main>
        <div className="dashboard-footer">
          Made for the people behind every great meal. <span>♥ tipit.</span>
        </div>
      </div>
    </div>
  );
}
