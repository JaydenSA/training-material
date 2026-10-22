"use client";
import { createContext } from "react";
import type { DemoState } from "@/lib/demo";
export const WorkspaceContext = createContext<{
  state: DemoState;
  update: (fn: (s: DemoState) => DemoState) => boolean | Promise<boolean>;
  reset: () => void;
  ready: boolean;
  loadError?: string;
  retry?: () => void;
  mode: "demo" | "database";
} | null>(null);
