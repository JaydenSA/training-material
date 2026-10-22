/** Read configuration in server code and pass only this boolean to the browser.
 * Auto mode keeps the demo usable without keys; explicit Clerk mode fails closed
 * in middleware when its configuration is incomplete. */
export function getAuthConfiguration() {
  const mode = process.env.NEXT_PUBLIC_AUTH_MODE || "auto";
  const configured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY,
  );
  return {
    enabled: mode !== "demo" && configured,
    invalid: mode === "clerk" && !configured,
  };
}
