"use client";
import { useContext, useEffect, useState, type ReactNode } from "react";
import { DemoState, initialState } from "@/lib/demo";
import { WorkspaceContext as Context } from "./workspace-context";
import { DatabaseProvider } from "./database-provider";
import { usePathname } from "next/navigation";
import { AuthenticationProvider } from "./auth-provider";
import { saveSimulation } from "@/lib/payment-simulation";
const KEY = "tipit-demo-v1";
export function DemoProvider({
  children,
  databaseEnabled = false,
}: {
  children: ReactNode;
  databaseEnabled?: boolean;
}) {
  const path = usePathname();
  const demo = path === "/demo" || path.startsWith("/demo/");
  const simulation = path.startsWith("/simulation/payment/");
  if (demo || simulation) return (
    <AuthenticationProvider enabled={false}>
      <BrowserDemoProvider key={simulation ? "simulation" : "demo"} simulation={simulation}>{children}</BrowserDemoProvider>
    </AuthenticationProvider>
  );
  return databaseEnabled ? (
    <DatabaseProvider>{children}</DatabaseProvider>
  ) : (
    <BrowserDemoProvider>{children}</BrowserDemoProvider>
  );
}
function BrowserDemoProvider({ children, simulation = false }: { children: ReactNode; simulation?: boolean }) {
  const [state, setState] = useState<DemoState>(() => simulation ? {
    restaurant: { name: "", slug: "", email: "", city: "" }, employees: [], tags: [], tips: [], orders: [], plan: "", onboarded: false,
  } : initialState());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = simulation ? sessionStorage.getItem("tipit-payment-simulation") : localStorage.getItem(KEY);
      if (saved) {
        const value = JSON.parse(saved);
        if (
          value.restaurant &&
          Array.isArray(value.employees) &&
          Array.isArray(value.tips) &&
          Array.isArray(value.tags) &&
          Array.isArray(value.orders)
        )
          setState(value);
      }
    } catch {
      /* A fresh demo also works when storage is unavailable. */
    }
    setReady(true);
  }, [simulation]);
  useEffect(() => {
    if (ready) {
      try {
        if (simulation) saveSimulation(state);
        else localStorage.setItem(KEY, JSON.stringify(state));
      } catch {
        /* Continue in memory. */
      }
    }
  }, [state, ready, simulation]);
  return (
    <Context.Provider
      value={{
        state,
        update: (fn) => {
          setState(fn);
          return true;
        },
        reset: () => setState(initialState()),
        ready,
        mode: "demo",
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Missing demo provider");
  return ctx;
}
