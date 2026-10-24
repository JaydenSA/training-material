"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/app-link";
import { AuthControls } from "@/components/auth-controls";

export function SiteHeader({ brand }: { brand: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className="public-header">
      {brand}
      <nav className="public-desktop-nav" aria-label="Website navigation">
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/#pricing">Pricing</Link>
      </nav>
      <div className="public-desktop-auth">
        <AuthControls />
      </div>
      <button
        ref={toggle}
        className="site-menu-toggle"
        aria-label="Toggle site navigation"
        aria-expanded={open}
        aria-controls="site-mobile-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
      </button>
      {open && (
        <div
          id="site-mobile-navigation"
          className="site-mobile-navigation"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <nav aria-label="Mobile website navigation">
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#pricing">Pricing</Link>
            <Link href="/help">Help centre</Link>
            <Link href="/demo/onboarding">Try onboarding demo</Link>
          </nav>
          <AuthControls />
        </div>
      )}
    </header>
  );
}
