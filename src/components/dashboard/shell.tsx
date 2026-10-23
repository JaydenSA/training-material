"use client";
import Link from "@/components/app-link";
import { useEffect, useRef, useState } from "react";
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
import { Reports } from "@/components/dashboard/reports";
import { PrintMaterials } from "@/components/dashboard/print-materials";
import { Activity } from "@/components/dashboard/activity";
import { Testing } from "@/components/dashboard/testing";
import { usePathname } from "next/navigation";
const nav = [
  ["Overview", "/dashboard", "◫"],
  ["Employees", "/dashboard/employees", "♧"],
  ["Tips & transactions", "/dashboard/tips", "↗"],
  ["Ratings", "/dashboard/ratings", "☆"],
  ["Reports", "/dashboard/reports", "▤"],
  ["QR & NFC tags", "/dashboard/tags", "▦"],
  ["Print QR materials", "/dashboard/print", "▦"],
  ["Hardware shop", "/dashboard/hardware", "▱"],
  ["Activity", "/dashboard/activity", "◷"],
  ["Settings", "/dashboard/settings", "⚙"],
];
export function Dashboard({ section, id }: { section: string; id?: string }) {
  const { state, ready, loadError, retry } = useWorkspace();
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const [testingAllowed, setTestingAllowed] = useState(false);
  useEffect(() => {
    if (pathname.startsWith("/demo/")) return;
    const controller = new AbortController();
    fetch("/api/testing/access", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : { allowed: false }))
      .then((data) => setTestingAllowed(data.allowed === true))
      .catch(() => setTestingAllowed(false));
    return () => controller.abort();
  }, [pathname]);
  const navigation =
    testingAllowed && !pathname.startsWith("/demo/")
      ? [...nav, ["Testing", "/dashboard/testing", "✓"]]
      : nav;
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#dashboard-content">
        Skip to dashboard content
      </a>
      <aside id="workspace-sidebar" className={`sidebar ${menu ? "open" : ""}`}>
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
          {navigation.map(([label, href, icon]) => (
            <Link
              aria-current={
                ("/dashboard/" + section).replace(/\/$/, "") === href
                  ? "page"
                  : undefined
              }
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
            ref={menuButton}
            aria-expanded={menu}
            aria-controls="workspace-sidebar"
            className="mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            ☰
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            {navigation.find(
              (n) => n[1] === `/dashboard${section ? "/" + section : ""}`,
            )?.[0] || "Employee profile"}
          </div>
          <DemoNotice />
          <AuthControls compact />
        </header>
        <main
          id="dashboard-content"
          className="dashboard-content"
          tabIndex={-1}
          aria-busy={!ready}
        >
          {section === "testing" ? (
            <Testing />
          ) : !ready ? (
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
          ) : section === "reports" ? (
            <Reports />
          ) : section === "print" ? (
            <PrintMaterials />
          ) : section === "activity" ? (
            <Activity />
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
