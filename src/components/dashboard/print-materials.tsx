"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/workspace-context";
import { Heading, Empty } from "@/components/ui";
import { FilterSelect } from "@/components/filter-select";
export function PrintMaterials() {
  const { state } = useWorkspace();
  const pathname = usePathname();
  const [employeeId, setEmployeeId] = useState("");
  const [layout, setLayout] = useState("cards");
  const [codes, setCodes] = useState<
    Record<string, { src: string; url: string }>
  >({});
  const [error, setError] = useState("");
  const tags = state.tags.filter(
    (tag) =>
      tag.status === "active" &&
      state.employees.some(
        (employee) => employee.id === tag.employeeId && !employee.deletedAt,
      ) &&
      (!employeeId || tag.employeeId === employeeId),
  );
  const tagKey = tags.map((tag) => tag.id).join(",");
  useEffect(() => {
    let active = true;
    setCodes({});
    setError("");
    async function generate() {
      try {
        const qr = await import("qrcode");
        const entries = await Promise.all(
          tagKey
            .split(",")
            .filter(Boolean)
            .map(async (code) => {
              const url = `${location.origin}${pathname.startsWith("/demo/") ? "/demo" : ""}/t/${code}`;
              const svg = await qr.toString(url, {
                type: "svg",
                errorCorrectionLevel: "M",
                width: 240,
                margin: 4,
              });
              return [
                code,
                { src: `data:image/svg+xml,${encodeURIComponent(svg)}`, url },
              ] as const;
            }),
        );
        if (active) setCodes(Object.fromEntries(entries));
      } catch {
        if (active)
          setError(
            "QR codes could not be generated. Refresh this page and try again.",
          );
      }
    }
    void generate();
    return () => {
      active = false;
    };
  }, [tagKey, pathname]);
  const ready = tags.length > 0 && tags.every((tag) => !!codes[tag.id]);
  return (
    <>
      <div className="print-controls">
        <Heading title="Print QR materials">
          Branded employee cards and table stands. Only active tags for active
          employees are included.
        </Heading>
        <section className="panel pad">
          <div className="report-filters">
            <FilterSelect
              label="Print employee"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              options={[
                { value: "", label: "All active employees" },
                ...state.employees
                  .filter((employee) => !employee.deletedAt)
                  .map((employee) => ({
                    value: employee.id,
                    label: employee.name,
                  })),
              ]}
            />
            <FilterSelect
              label="Print layout"
              value={layout}
              onChange={(event) => setLayout(event.target.value)}
              options={[
                { value: "cards", label: "Employee cards" },
                { value: "stands", label: "Table stands" },
              ]}
            />
            <button
              className="button"
              disabled={!ready}
              onClick={async () => {
                const images = Array.from(
                  document.querySelectorAll<HTMLImageElement>(
                    ".print-sheet img",
                  ),
                );
                await Promise.all(
                  images.map((image) => image.decode().catch(() => undefined)),
                );
                window.print();
              }}
            >
              Print / Save as PDF
            </button>
          </div>
          <p>
            Use your browser’s print dialog to save an A4 PDF. Print at 100%
            scale, test a scan before distributing, and use a public or
            LAN-accessible URL for phones.
          </p>
        </section>
        {error && <p role="alert">{error}</p>}
        {!ready && tags.length > 0 && !error && (
          <p role="status">Preparing printable QR codes…</p>
        )}
        {!tags.length && (
          <Empty>No active tags match. Create or activate a tag first.</Empty>
        )}
      </div>
      <div
        className={`print-sheet ${layout}`}
        aria-label="Printable QR materials"
      >
        {tags.map((tag) => {
          const employee = state.employees.find(
            (employee) => employee.id === tag.employeeId,
          )!;
          return (
            <article className="print-qr-card" key={tag.id}>
              <div className="print-brand">♥ tipit.</div>
              <p>{state.restaurant.name}</p>
              <h2>Say thanks to {employee.name}</h2>
              <p>{employee.role}</p>
              {codes[tag.id] && (
                <Image
                  unoptimized
                  src={codes[tag.id].src}
                  width={180}
                  height={180}
                  alt={`Tipping QR for ${employee.name}, tag ${tag.id}`}
                />
              )}
              <strong>Scan to leave a little thanks</strong>
              <small>{tag.id}</small>
              <small className="print-url">{codes[tag.id]?.url}</small>
              {pathname.startsWith("/demo/") && (
                <small>Demo link · No real payments</small>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
