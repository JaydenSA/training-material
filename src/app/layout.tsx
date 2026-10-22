import type { Metadata } from "next";
import { DemoProvider } from "@/components/demo-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthenticationProvider } from "@/components/auth-provider";
import { getAuthConfiguration } from "@/lib/auth-config";
import { getStorageConfiguration } from "@/lib/storage-config";
export const dynamic = "force-dynamic";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Tipit — A little thanks goes a long way",
    template: "%s | Tipit",
  },
  description:
    "Simple cashless tipping and employee appreciation for restaurants.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { enabled } = getAuthConfiguration();
  const storage = getStorageConfiguration();
  const content = storage.invalid ? (
    <div className="public-content">
      <h1>Database configuration required.</h1>
      <p>Database mode is selected, but DATABASE_URL is missing.</p>
    </div>
  ) : storage.enabled && !enabled ? (
    <div className="public-content">
      <h1>Restaurant authentication is required.</h1>
      <p>Configure Clerk before enabling persistent restaurant data.</p>
    </div>
  ) : (
    <DemoProvider databaseEnabled={storage.enabled}>{children}</DemoProvider>
  );
  return (
    <html lang="en">
      <body>
        <AuthenticationProvider enabled={enabled}>
          {enabled ? (
            <ClerkProvider
              signInUrl="/sign-in"
              signUpUrl="/sign-up"
              signInFallbackRedirectUrl="/dashboard"
              signUpFallbackRedirectUrl="/onboarding"
              afterSignOutUrl="/"
              taskUrls={{ "choose-organization": "/choose-organization" }}
              appearance={{
                variables: {
                  colorPrimary: "#257858",
                  borderRadius: "0.5rem",
                  fontFamily: "Arial, Helvetica, sans-serif",
                },
              }}
            >
              {content}
            </ClerkProvider>
          ) : (
            content
          )}
        </AuthenticationProvider>
      </body>
    </html>
  );
}
