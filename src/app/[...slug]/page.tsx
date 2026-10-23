import { TipitApp } from "@/components/tipit-app";
import { notFound } from "next/navigation";
import { canAccessTesting } from "@/lib/testing/auth";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug: original } = await params;
  const sandbox = original[0] === "demo";
  const simulation = original[0] === "simulation";
  const slug = sandbox
    ? original.length === 1
      ? ["dashboard"]
      : original.slice(1)
    : simulation
      ? original.slice(1)
      : original;
  if (simulation && !(slug[0] === "payment" && slug.length === 2)) notFound();
  const [root] = slug;
  if (root === "dashboard" && slug[1] === "testing") {
    if (sandbox || slug.length !== 2 || !(await canAccessTesting())) notFound();
    return <TipitApp segments={slug} />;
  }
  const publicPages = [
    "choose-organization",
    "pricing",
    "how-it-works",
    "help",
    "privacy",
    "terms",
    "sign-in",
    "sign-up",
    "onboarding",
    "account",
  ];
  const sections = [
    "employees",
    "tips",
    "ratings",
    "tags",
    "hardware",
    "settings",
    "reports",
    "print",
    "activity",
    "updates",
  ];
  const supported =
    (publicPages.includes(root) && slug.length === 1) ||
    (root === "dashboard" &&
      (slug.length === 1 ||
        (slug.length === 2 && sections.includes(slug[1])) ||
        (slug.length === 3 && slug[1] === "employees"))) ||
    (["r", "tip"].includes(root) && slug.length === 3) ||
    (["t", "payment"].includes(root) && slug.length === 2);
  if (!supported) notFound();
  return <TipitApp segments={slug} />;
}
