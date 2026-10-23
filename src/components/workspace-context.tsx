"use client";
import { createContext, useContext } from "react";
import type { DemoState } from "@/lib/demo";
export const WorkspaceContext = createContext<{
  state: DemoState;
  update: (fn: (s: DemoState) => DemoState) => boolean | Promise<boolean>;
  reset: () => void;
  ready: boolean;
  loadError?: string;
  retry?: () => void;
  mode: "demo" | "database";
  paymentMode?: "demo" | "test" | "live";
} | null>(null);
export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("Missing workspace provider");
  return workspace;
}
