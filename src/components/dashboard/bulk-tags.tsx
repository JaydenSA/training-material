"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/workspace-context";
import type { Tag } from "@/lib/demo";

export function BulkTags() {
  const { state, update } = useWorkspace();
  const path = usePathname();
  const [employees, setEmployees] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [format, setFormat] = useState<Tag["type"]>("QR stand");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = state.employees.filter((item) => !item.deletedAt);
  const chosenEmployees = active.filter((item) => employees.includes(item.id));
  const tags = state.tags.filter((tag) => tag.status !== "deleted");
  const chosenTags = tags.filter((tag) => selected.includes(tag.id));
  const total = chosenEmployees.length * quantity;
  const validCount =
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= 5 &&
    total > 0 &&
    total <= 20;
  const toggle = (values: string[], value: string) =>
    values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
  async function create() {
    if (busy || !validCount) return;
    setBusy(true);
    setMessage("");
    const batch: Tag[] = chosenEmployees.flatMap((employee) =>
      Array.from({ length: quantity }, () => ({
        id: `GT-${crypto.randomUUID().toUpperCase()}`,
        employeeId: employee.id,
        type: format,
        status: "active",
      })),
    );
    try {
      const saved = await update((before) => ({
        ...before,
        tags: [...before.tags, ...batch],
      }));
      if (saved) {
        setSelected(batch.map((tag) => tag.id));
        setEmployees([]);
        setMessage(
          `${batch.length} tags created. Select Download selected QR codes to save them together.`,
        );
      } else
        setMessage(
          "The batch could not be saved. No successful save has been confirmed.",
        );
    } catch {
      setMessage("The batch could not be saved. Refresh and try again.");
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(status: "active" | "suspended") {
    if (busy || !chosenTags.length || chosenTags.length > 20) return;
    if (
      status === "active" &&
      chosenTags.some(
        (tag) => !active.some((employee) => employee.id === tag.employeeId),
      )
    ) {
      setMessage("Archived employees’ tags cannot be activated.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const saved = await update((before) => ({
        ...before,
        tags: before.tags.map((tag) =>
          selected.includes(tag.id) && tag.status !== "deleted"
            ? { ...tag, status }
            : tag,
        ),
      }));
      setMessage(
        saved
          ? `Selected tags ${status === "active" ? "activated" : "suspended"}.`
          : "Tag changes could not be saved. Refresh and try again.",
      );
    } catch {
      setMessage("Tag changes could not be saved. Refresh and try again.");
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (busy || !chosenTags.length || chosenTags.length > 20) return;
    const downloadable = chosenTags.filter(
      (tag) =>
        tag.status === "active" &&
        active.some((employee) => employee.id === tag.employeeId),
    );
    if (downloadable.length !== chosenTags.length) {
      setMessage(
        "Select active tags for active employees before downloading QR codes.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const [qr, zip] = await Promise.all([import("qrcode"), import("fflate")]);
      const files = await Promise.all(
        downloadable.map(async (tag) => {
          const svg = await qr.toString(
            `${location.origin}${path.startsWith("/demo/") ? "/demo" : ""}/t/${encodeURIComponent(tag.id)}`,
            { type: "svg", width: 480, margin: 4, errorCorrectionLevel: "M" },
          );
          return [
            `${tag.id.replace(/[^a-z0-9-]/gi, "_")}.svg`,
            zip.strToU8(svg),
          ] as const;
        }),
      );
      const data = zip.zipSync(Object.fromEntries(files));
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(data)], { type: "application/zip" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "tipit-qr-codes.zip";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`${files.length} QR codes prepared in one ZIP archive.`);
    } catch {
      setMessage("QR download could not be prepared. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel pad bulk-tag-tools" aria-label="Bulk tag tools">
      <h2>Bulk tag tools</h2>
      <p>
        Create up to 20 tags in one batch, or manage and download selected codes
        together.
      </p>
      <details>
        <summary>Create tags for multiple employees</summary>
        <fieldset className="choice-grid">
          <legend>Employees for new tags</legend>
          {active.map((employee) => (
            <label className="checkbox" key={employee.id}>
              <input
                type="checkbox"
                checked={employees.includes(employee.id)}
                onChange={() => setEmployees(toggle(employees, employee.id))}
              />
              {employee.name}
            </label>
          ))}
        </fieldset>
        {!active.length && <p>Add an active employee before creating tags.</p>}
        <div className="report-filters">
          <label>
            Tags per employee
            <input
              type="number"
              min={1}
              max={5}
              value={Number.isNaN(quantity) ? "" : quantity}
              onChange={(event) => setQuantity(event.target.valueAsNumber)}
            />
          </label>
          <label>
            Bulk tag format
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as Tag["type"])}
            >
              <option>QR stand</option>
              <option>NFC card</option>
            </select>
          </label>
        </div>
        <p>
          Batch preview: {Number.isFinite(total) ? total : 0} tags for{" "}
          {chosenEmployees.length} employees. Existing tags are retained.
        </p>
        <button
          className="button"
          disabled={busy || !validCount}
          onClick={create}
        >
          Create tag batch
        </button>
      </details>
      <fieldset className="choice-grid">
        <legend>Select existing tags (maximum 20 per action)</legend>
        {tags.map((tag) => (
          <label className="checkbox" key={tag.id}>
            <input
              type="checkbox"
              aria-label={`Bulk tag ${tag.id}`}
              checked={selected.includes(tag.id)}
              onChange={() => setSelected(toggle(selected, tag.id))}
            />
            {tag.id} ·{" "}
            {
              state.employees.find((employee) => employee.id === tag.employeeId)
                ?.name
            }{" "}
            · {tag.status}
          </label>
        ))}
      </fieldset>
      <div className="actions">
        <button
          className="button secondary"
          disabled={busy || !chosenTags.length || chosenTags.length > 20}
          onClick={download}
        >
          Download selected QR codes
        </button>
        <button
          className="button secondary"
          disabled={busy || !chosenTags.length || chosenTags.length > 20}
          onClick={() => changeStatus("suspended")}
        >
          Suspend selected tags
        </button>
        <button
          className="button secondary"
          disabled={busy || !chosenTags.length || chosenTags.length > 20}
          onClick={() => changeStatus("active")}
        >
          Activate selected tags
        </button>
        <button className="text-button" onClick={() => setSelected([])}>
          Clear tag selection
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
