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
import { ProductUpdates } from "@/components/dashboard/updates";
import { GuidedSetup } from "@/components/dashboard/guided-setup";
import { OperationalAlerts } from "@/components/dashboard/alerts";
import { EmployeeComparisons } from "@/components/dashboard/comparisons";
import { usePathname } from "next/navigation";
import {
  DashboardNavigation,
  dashboardNavigation,
} from "@/components/dashboard/navigation";
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
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const screen = window.matchMedia("(max-width: 760px)");
    const resize = () => {
      if (!screen.matches) setMenu(false);
    };
    screen.addEventListener("change", resize);
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        requestAnimationFrame(() => menuButton.current?.focus());
      }
      if (event.key === "Tab") {
        const items = Array.from(
          sidebar.current?.querySelectorAll<HTMLElement>(
            "a[href],button:not(:disabled),summary,[tabindex='0']",
          ) || [],
        ).filter((item) => item.getClientRects().length);
        const first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("keydown", close);
      screen.removeEventListener("change", resize);
      document.body.style.overflow = previousOverflow;
    };
  }, [menu]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#dashboard-content">
        Skip to dashboard content
      </a>
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Dismiss navigation backdrop"
          onClick={() => {
            setMenu(false);
            requestAnimationFrame(() => menuButton.current?.focus());
          }}
        />
      )}
      <aside
        ref={sidebar}
        id="workspace-sidebar"
        className={`sidebar ${menu ? "open" : ""}`}
        role={menu ? "dialog" : undefined}
        aria-modal={menu ? true : undefined}
        aria-label="Restaurant navigation"
      >
        <div className="sidebar-brand">
          <Logo />
          <button
            ref={closeButton}
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={() => {
              setMenu(false);
              requestAnimationFrame(() => menuButton.current?.focus());
            }}
          >
            ×
          </button>
        </div>
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
        <DashboardNavigation
          section={section}
          testingAllowed={testingAllowed && !pathname.startsWith("/demo/")}
          onNavigate={() => setMenu(false)}
        />
        <div className="sidebar-bottom">
          <div className="sidebar-mobile-account">
            <AuthControls compact />
          </div>
          <div className="help-card">
            <strong>A little help?</strong>
            <p>We’re here for your restaurant.</p>
            <Link href="/help">Visit help centre ↗</Link>
          </div>
          <AccountIdentity />
        </div>
      </aside>
      <div className="dashboard-main" inert={menu ? true : undefined}>
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
            <span className="breadcrumb-parent">
              Workspace <span>/</span>{" "}
            </span>
            {dashboardNavigation.find(
              (n) => n[1] === `/dashboard${section ? "/" + section : ""}`,
            )?.[0] || "Employee profile"}
          </div>
          <DemoNotice />
          <div className="dashboard-desktop-account">
            <AuthControls compact />
          </div>
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
          ) : section === "updates" ? (
            <ProductUpdates />
          ) : section === "setup" ? (
            <GuidedSetup />
          ) : section === "comparisons" ? (
            <EmployeeComparisons />
          ) : section === "alerts" ? (
            <OperationalAlerts />
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
