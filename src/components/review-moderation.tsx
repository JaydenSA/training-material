"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import { useWorkspace } from "./workspace-context";
import { moderationStatus, type ModerationEvent } from "@/lib/moderation";
import { formatDate } from "@/lib/format";
import { Badge } from "./ui";

export function ReviewText({
  text,
  event,
}: {
  text?: string;
  event?: ModerationEvent;
}) {
  return event?.action === "hide" ? (
    <span className="muted">Review text hidden · rating unchanged</span>
  ) : (
    <>{text || <span className="muted">No written review</span>}</>
  );
}
export function ReviewModeration({
  tipId,
  onClose,
}: {
  tipId: string;
  onClose: () => void;
}) {
  const { mode } = useWorkspace();
  return mode === "demo" ? (
    <ModerationPanel tipId={tipId} onClose={onClose} isOwner />
  ) : (
    <ConnectedPanel tipId={tipId} onClose={onClose} />
  );
}
function ConnectedPanel(props: { tipId: string; onClose: () => void }) {
  const { has, orgId, isLoaded } = useAuth();
  return isLoaded ? (
    <ModerationPanel
      {...props}
      orgId={orgId || undefined}
      isOwner={has?.({ role: "org:admin" }) || false}
    />
  ) : (
    <p role="status">Loading moderation permissions…</p>
  );
}
function ModerationPanel({
  tipId,
  onClose,
  isOwner,
  orgId,
}: {
  tipId: string;
  onClose: () => void;
  isOwner: boolean;
  orgId?: string;
}) {
  const { state, mode, update, retry } = useWorkspace();
  const [action, setAction] = useState<ModerationEvent["action"]>("flag");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ block: "start" });
  }, []);
  const tip = state.tips.find((item) => item.id === tipId);
  const current = state.moderations?.find((item) => item.tipId === tipId);
  useEffect(() => {
    if (mode !== "database" || !orgId) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(
      `/api/reviews/moderation?tipId=${encodeURIComponent(tipId)}&offset=${offset}`,
      {
        cache: "no-store",
        headers: { "X-Tipit-Organization": orgId },
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.organizationId !== orgId)
          throw new Error(data.error || "History unavailable.");
        if (!controller.signal.aborted) {
          setEvents((before) =>
            offset ? [...before, ...data.events] : data.events,
          );
          setMore(data.hasMore);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [mode, orgId, tipId, offset]);
  const history =
    mode === "demo"
      ? (state.moderations || []).filter((item) => item.tipId === tipId)
      : events;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !tip?.review) return;
    if (reason.trim().length < 5) {
      setError("Provide a moderation reason of at least five characters.");
      return;
    }
    setBusy(true);
    setError("");
    const entry: ModerationEvent = {
      id: crypto.randomUUID(),
      tipId,
      action,
      reason: reason.trim(),
      actorId: "demo-owner",
      createdAt: new Date().toISOString(),
    };
    try {
      if (mode === "demo") {
        if (current?.action === "hide" && action === "flag")
          throw new Error("An owner must restore this hidden review first.");
        await update((before) => ({
          ...before,
          moderations: [entry, ...(before.moderations || [])],
        }));
        setReason("");
      } else {
        if (!orgId) throw new Error("Select your restaurant workspace.");
        const response = await fetch("/api/reviews/moderation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tipit-Organization": orgId,
          },
          body: JSON.stringify({
            requestId: entry.id,
            tipId,
            action,
            reason: entry.reason,
          }),
        });
        const data = await response.json();
        if (!response.ok || data.organizationId !== orgId)
          throw new Error(data.error || "Moderation could not be saved.");
        retry?.();
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Moderation could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      ref={panel}
      tabIndex={-1}
      className="panel pad moderation-panel"
      aria-label="Review moderation"
    >
      <div className="section-heading">
        <h2>Review moderation</h2>
        <button className="button secondary small" onClick={onClose}>
          Close moderation
        </button>
      </div>
      <Badge>{moderationStatus(current)}</Badge>
      <p>
        Original review retained for audit. Star ratings and payment amounts are
        never changed by moderation.
      </p>
      <details>
        <summary>View original review</summary>
        <p className="review-text">{tip?.review}</p>
      </details>
      <form onSubmit={submit}>
        <label>
          Moderation action
          <select
            value={action}
            onChange={(event) =>
              setAction(event.target.value as ModerationEvent["action"])
            }
          >
            <option value="flag">Flag for review</option>
            {isOwner && (
              <>
                <option value="hide">Hide text</option>
                <option value="restore">Restore / clear flag</option>
              </>
            )}
          </select>
        </label>
        <label>
          Moderation reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            minLength={5}
            maxLength={500}
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save moderation"}
        </button>
      </form>
      {!isOwner && (
        <p>Managers can flag reviews. Only owners can hide or restore text.</p>
      )}
      {error && <p role="alert">{error}</p>}
      <h3>Moderation history</h3>
      {loading && <p role="status">Loading history…</p>}
      {!loading && !history.length && <p>No moderation actions recorded.</p>}
      <ol className="moderation-history">
        {history.map((item) => (
          <li key={item.id}>
            <strong>{moderationStatus(item)}</strong> ·{" "}
            {formatDate(item.createdAt, {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            <p>{item.reason}</p>
            <small>Actor: {item.actorId}</small>
          </li>
        ))}
      </ol>
      {more && mode === "database" && (
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => setOffset((value) => value + 50)}
        >
          Load older moderation
        </button>
      )}
    </section>
  );
}
