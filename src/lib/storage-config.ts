/** No key values leave server code. A configured database never falls back to
 * browser demo data after a connection or authorization failure. */
export function getStorageConfiguration() {
  const mode = process.env.TIPIT_STORAGE || "auto";
  const configured = Boolean(process.env.DATABASE_URL);
  return {
    enabled: mode !== "demo" && configured,
    invalid: mode === "database" && !configured,
  };
}
