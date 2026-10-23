"use client";
import Link from "@/components/app-link";
import { useWorkspace } from "@/components/workspace-context";
import { PublicTip } from "@/components/tipping/tip-page";
import { Payment } from "@/components/tipping/payment-page";
import { Pricing } from "@/components/public/pricing";
import { HowItWorks } from "@/components/public/how-it-works";
import { Access } from "@/components/public/access";
import { Info } from "@/components/public/info";
import { Heading, Header, Footer } from "@/components/ui";
import { Landing } from "@/components/public/landing";
import { Dashboard } from "@/components/dashboard/shell";
export function TipitApp({ segments }: { segments: string[] }) {
  const root = segments[0] || "";
  const { ready } = useWorkspace();
  if (root === "dashboard")
    return <Dashboard section={segments[1] || ""} id={segments[2]} />;
  if (!ready)
    return <div className="loading">Loading your Tipit experience…</div>;
  if (["r", "t", "tip"].includes(root))
    return <PublicTip segments={segments} />;
  if (root === "payment") return <Payment id={segments[1]} />;
  return (
    <>
      <Header />
      {root === "" ? (
        <Landing />
      ) : root === "pricing" ? (
        <Pricing />
      ) : root === "how-it-works" ? (
        <HowItWorks />
      ) : ["help", "privacy", "terms"].includes(root) ? (
        <Info page={root} />
      ) : [
          "sign-in",
          "sign-up",
          "onboarding",
          "account",
          "choose-organization",
        ].includes(root) ? (
        <Access page={root} />
      ) : (
        <div className="public-content">
          <Heading title={"Page unavailable"}>
            {"Return to the restaurant workspace to continue."}
          </Heading>
          <Link href="/dashboard" className="button">
            Restaurant demo ↗
          </Link>
        </div>
      )}
      <Footer />
    </>
  );
}
