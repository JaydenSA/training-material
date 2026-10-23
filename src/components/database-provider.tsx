"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { OrganizationList, useAuth, useUser } from "@clerk/nextjs";
import { initialState, type DemoState } from "@/lib/demo";
import { deriveCommands } from "@/lib/workspace-contract";
import { WorkspaceContext } from "@/components/workspace-context";
const emptyState = (): DemoState => ({
  restaurant: { name: "", slug: "", email: "", city: "" },
  employees: [],
  tags: [],
  tips: [],
  orders: [],
  plan: "Not subscribed",
  onboarded: false,
});
type Result = { state: DemoState | null; version: number };
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { isLoaded, isSignedIn, orgId, userId } = useAuth();
  const { user } = useUser();
  const privatePage = path.startsWith("/dashboard") || path === "/onboarding";
  const guestPage =
    /^\/(t|payment)\/[^/]+$/.test(path) ||
    /^\/(r|tip)\/[^/]+\/[^/]+$/.test(path);
  const [state, setState] = useState<DemoState>(emptyState);
  const current = useRef(state);
  const version = useRef(0);
  const [ready, setReady] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"demo" | "test" | "live">(
    "demo",
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const currentOrg = useRef(orgId);
  currentOrg.current = orgId;
  const generation = useRef(0);
  const [reload, setReload] = useState(0);
  const scope = privatePage ? `${userId || ""}:${orgId || ""}` : path;
  const dataScope = useRef("");
  const [loadedPath, setLoadedPath] = useState("");
  const visibleState = dataScope.current === scope ? state : emptyState();
  const contentReady =
    ready &&
    loadedPath === path &&
    dataScope.current === scope &&
    (!privatePage || (isLoaded && isSignedIn && !!orgId));
  const install = useCallback((value: Result) => {
    const next = value.state || emptyState();
    current.current = next;
    version.current = value.version;
    setState(next);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setReady(false);
    setPaymentMode("demo");
    setError("");
    setLoadFailed(false);
    if (dataScope.current !== scope) {
      current.current = emptyState();
      setState(emptyState());
      dataScope.current = scope;
    }
    async function load() {
      if (!privatePage && !guestPage) {
        if (active) {
          const marketing = initialState();
          current.current = marketing;
          setState(marketing);
          setReady(true);
          setLoadedPath(path);
        }
        return;
      }
      if (privatePage && (!isLoaded || !isSignedIn || !orgId)) {
        if (active) {
          setReady(true);
          setLoadedPath(path);
        }
        return;
      }
      try {
        await queue.current;
        let url = "/api/workspace";
        if (guestPage) {
          const segments = path.split("/").filter(Boolean);
          if (segments[0] === "payment") {
            if (active) {
              setReady(true);
              setLoadedPath(path);
            }
            return;
          }
          url =
            segments[0] === "t"
              ? `/api/public/profile?code=${encodeURIComponent(segments[1])}`
              : `/api/public/profile?slug=${encodeURIComponent(segments[1])}&employeeId=${encodeURIComponent(segments[2])}`;
        }
        const response = await fetch(url, {
          cache: "no-store",
          headers: privatePage ? { "X-Tipit-Organization": orgId! } : {},
          signal: controller.signal,
        });
        const value = await response.json();
        if (active && guestPage && response.ok)
          setPaymentMode(value.paymentMode || "demo");
        if (guestPage && response.status === 404) {
          if (active) install({ state: null, version: 0 });
          return;
        }
        if (!response.ok)
          throw new Error(value.error || "Unable to load restaurant data.");
        if (active)
          install({ state: value.state, version: value.version || 0 });
      } catch (cause) {
        if (active) {
          setLoadFailed(true);
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load restaurant data.",
          );
        }
      } finally {
        if (active) {
          setReady(true);
          setLoadedPath(path);
        }
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    path,
    privatePage,
    guestPage,
    isLoaded,
    isSignedIn,
    orgId,
    scope,
    reload,
    install,
  ]);
  function update(fn: (s: DemoState) => DemoState): Promise<boolean> {
    if (!privatePage || !orgId) {
      setError("Restaurant management access is required.");
      return Promise.resolve(false);
    }
    const before = current.current;
    const expectedOrg = orgId;
    let next: DemoState;
    let commands;
    try {
      next = fn(current.current);
      commands = deriveCommands(current.current, next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid change.");
      return Promise.resolve(false);
    }
    if (!commands.length) return Promise.resolve(true);
    current.current = next;
    setState(next);
    setError("");
    setPending((n) => n + 1);
    const requestId = crypto.randomUUID();
    const expectedGeneration = generation.current;
    const action = queue.current
      .then(async () => {
        if (
          currentOrg.current !== expectedOrg ||
          generation.current !== expectedGeneration
        )
          throw new Error(
            "The restaurant workspace changed. Refresh before trying again.",
          );
        const response = await fetch("/api/workspace", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tipit-Organization": expectedOrg,
          },
          body: JSON.stringify({
            requestId,
            version: version.current,
            commands,
          }),
        });
        const value = await response.json();
        if (!response.ok)
          throw new Error(value.error || "The change could not be saved.");
        if (currentOrg.current === expectedOrg) {
          install(value);
        }
        return true;
      })
      .catch(async (cause) => {
        generation.current++;
        if (currentOrg.current === expectedOrg) {
          current.current = before;
          setState(before);
          setError(
            `Save could not be confirmed: ${cause instanceof Error ? cause.message : "Database request failed."} Refresh before trying again.`,
          );
          try {
            const response = await fetch("/api/workspace", {
              cache: "no-store",
              headers: { "X-Tipit-Organization": expectedOrg },
            });
            if (response.ok) install(await response.json());
          } catch {
            /* Keep the visible failure; never substitute demo data. */
          }
        }
        return false;
      })
      .finally(() => setPending((n) => n - 1));
    queue.current = action;
    return action;
  }
  if (privatePage && isLoaded && !isSignedIn)
    return (
      <div className="public-content">
        <h1>Sign in to your restaurant.</h1>
        <Link className="button" href="/sign-in">
          Sign in
        </Link>
      </div>
    );
  if (privatePage && isLoaded && isSignedIn && !orgId)
    return (
      <div className="access-wrap">
        <h1>Choose your restaurant workspace.</h1>
        <p>Create a workspace for your restaurant or select one you manage.</p>
        <OrganizationList
          hidePersonal
          afterCreateOrganizationUrl="/onboarding"
          afterSelectOrganizationUrl="/dashboard"
        />
      </div>
    );
  if (
    (privatePage || guestPage) &&
    contentReady &&
    loadFailed &&
    !path.startsWith("/dashboard")
  )
    return (
      <div className="public-content">
        <h1>Restaurant data is unavailable.</h1>
        <p role="alert">{error}</p>
        <button className="button" onClick={() => setReload((x) => x + 1)}>
          Try again
        </button>
      </div>
    );
  return (
    <WorkspaceContext.Provider
      value={{
        state: visibleState,
        update,
        ready: contentReady,
        loadError: loadFailed ? error : undefined,
        retry: () => setReload((x) => x + 1),
        mode: "database",
        paymentMode,
        reset: () =>
          setError(
            "Demo reset is unavailable for persistent restaurant records.",
          ),
      }}
    >
      {pending > 0 && (
        <div className="storage-status" role="status">
          Saving restaurant changes…
        </div>
      )}
      {error && !loadFailed && (
        <div className="storage-error" role="alert">
          {error}
          <button onClick={() => setReload((x) => x + 1)}>Refresh</button>
        </div>
      )}
      {privatePage && contentReady && !loadFailed && !visibleState.onboarded ? (
        <RestaurantSetup
          email={user?.primaryEmailAddress?.emailAddress || ""}
          save={async (restaurant) =>
            update((s) => ({
              ...s,
              restaurant: { ...s.restaurant, ...restaurant },
              onboarded: true,
            }))
          }
        />
      ) : (
        <div inert={pending > 0 ? true : undefined}>{children}</div>
      )}
    </WorkspaceContext.Provider>
  );
}
function RestaurantSetup({
  email,
  save,
}: {
  email: string;
  save: (data: {
    name: string;
    email: string;
    city: string;
  }) => Promise<boolean>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    const ok = await save({
      name: String(data.get("name")),
      email: String(data.get("email")),
      city: String(data.get("city")),
    });
    setBusy(false);
    if (ok) router.push("/dashboard");
  }
  return (
    <div className="access-wrap">
      <section className="panel pad">
        <h1>Set up your restaurant.</h1>
        <p>
          This creates an empty restaurant in your connected database. Sample
          employees and payments are not imported.
        </p>
        <form onSubmit={submit}>
          <label>
            Restaurant name
            <input name="name" required maxLength={100} />
          </label>
          <label>
            Contact email
            <input name="email" type="email" required defaultValue={email} />
          </label>
          <label>
            City
            <input name="city" required maxLength={100} />
          </label>
          <button className="button full" disabled={busy}>
            {busy ? "Creating restaurant…" : "Create restaurant"}
          </button>
        </form>
      </section>
    </div>
  );
}
