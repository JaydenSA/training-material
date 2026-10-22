"use client";
import { useEffect, useState } from "react";
import type { Employee, Tip } from "@/lib/demo";
import { readSimulation } from "@/lib/payment-simulation";

export function useSimulatedReviews(slug: string, employees: Employee[], enabled = true) {
  const [reviews, setReviews] = useState<Tip[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setReviews((readSimulation(slug)?.tips || [])
      .filter(tip => tip.status === "paid" && tip.rating && employees.some(employee => employee.id === tip.employeeId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("tipit-simulation-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("tipit-simulation-updated", refresh);
    };
  }, [slug, employees, enabled]);
  return enabled ? reviews : [];
}
