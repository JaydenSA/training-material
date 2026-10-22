"use client";
import Link from "./app-link";
import type { ReactNode } from "react";
import type { Employee } from "@/lib/demo";
import { AuthControls } from "./auth-controls";
import { useDemo } from "./demo-provider";
export function Logo() {
  return (
    <Link href="/" className="logo">
      <span>♥</span>tipit<span className="logo-dot">.</span>
    </Link>
  );
}
export function Avatar({
  employee,
  large = false,
}: {
  employee: Employee;
  large?: boolean;
}) {
  return (
    <div
      className={`avatar ${large ? "large" : ""}`}
      style={{ background: employee.color }}
    >
      {employee.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")}
    </div>
  );
}
export function Badge({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return <span className={`badge ${muted ? "muted" : ""}`}>{children}</span>;
}
export function Heading({
  eyebrow,
  title,
  children,
  action,
  level = 1,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  level?: 1 | 2;
}) {
  const Title = level === 2 ? "h2" : "h1";
  return (
    <div className="heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <Title>{title}</Title>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function DemoNotice() {
  const { mode } = useDemo();
  return (
    <div className="demo-notice">
      <span className="dot" />{" "}
      {mode === "database" ? "Restaurant workspace" : "Demo workspace"}{" "}
      <span className="notice-detail">
        {mode === "database" ? "· PostgreSQL connected" : "· No real payments"}
      </span>
    </div>
  );
}
export function Header() {
  return (
    <header className="public-header">
      <Logo />
      <nav>
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/#pricing">Pricing</Link>
      </nav>
      <AuthControls />
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <Logo />
      <p>A little thanks goes a long way.</p>
      <div>
        <Link href="/help">Help</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </div>
      <small>
        Tips are received by the restaurant. Restaurant management handles staff
        distribution.
      </small>
    </footer>
  );
}
