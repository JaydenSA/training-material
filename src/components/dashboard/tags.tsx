"use client";
import Link from "@/components/app-link";
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { Badge, Heading } from "@/components/ui";

export function Tags() {
  const { state, update } = useWorkspace();
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = `GT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    update((s) => ({
      ...s,
      tags: [
        ...s.tags,
        {
          id,
          employeeId: String(data.get("employee")),
          type: data.get("type") as "NFC card" | "QR stand",
          status: "active",
        },
      ],
    }));
    setMessage(`Tag ${id} created.`);
  }
  return (
    <>
      <Heading title="Small tags. Meaningful connections.">
        Create permanent links for QR codes and NFC cards. Suspended or deleted
        tags cannot accept tips.
      </Heading>
      <section className="panel pad">
        <h3>Create a tipping link</h3>
        <form onSubmit={create} className="inline-form">
          <label>
            Team member
            <select name="employee" required>
              {state.employees
                .filter((e) => !e.deletedAt)
                .map((e) => (
                  <option value={e.id} key={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Format
            <select name="type">
              <option>NFC card</option>
              <option>QR stand</option>
            </select>
          </label>
          <button
            className="button"
            disabled={!state.employees.some((e) => !e.deletedAt)}
          >
            Create link
          </button>
        </form>
        {message && (
          <p role="status" className="success-text">
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>TAG</th>
                <th>EMPLOYEE</th>
                <th>FORMAT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {state.tags
                .filter((t) => t.status !== "deleted")
                .map((t) => {
                  const employee = state.employees.find(
                    (e) => e.id === t.employeeId,
                  );
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/t/${t.id}`}>{t.id} ↗</Link>
                      </td>
                      <td>{employee?.name}</td>
                      <td>{t.type}</td>
                      <td>
                        <Badge muted={t.status !== "active"}>{t.status}</Badge>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            onClick={() => {
                              navigator.clipboard
                                .writeText(
                                  `${location.origin}${location.pathname.startsWith("/demo/") ? "/demo" : ""}/t/${t.id}`,
                                )
                                .then(() => setMessage("Link copied."))
                                .catch(() =>
                                  setMessage(
                                    `Copy this link: ${location.origin}${location.pathname.startsWith("/demo/") ? "/demo" : ""}/t/${t.id}`,
                                  ),
                                );
                            }}
                          >
                            Copy link
                          </button>
                          <button
                            onClick={() =>
                              setSelected(selected === t.id ? null : t.id)
                            }
                          >
                            QR
                          </button>
                          <button
                            disabled={!!employee?.deletedAt}
                            onClick={() =>
                              update((s) => ({
                                ...s,
                                tags: s.tags.map((x) =>
                                  x.id === t.id
                                    ? {
                                        ...x,
                                        status:
                                          x.status === "active"
                                            ? "suspended"
                                            : "active",
                                      }
                                    : x,
                                ),
                              }))
                            }
                          >
                            {t.status === "active" ? "Suspend" : "Activate"}
                          </button>
                          <button
                            className="danger-text"
                            onClick={() => {
                              if (
                                confirm(
                                  "Delete this tag? Its link will stop working. The historical record is retained.",
                                )
                              ) {
                                update((s) => ({
                                  ...s,
                                  tags: s.tags.map((x) =>
                                    x.id === t.id
                                      ? { ...x, status: "deleted" }
                                      : x,
                                  ),
                                }));
                                if (selected === t.id) setSelected(null);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
      {selected && (
        <section className="panel pad qr-panel">
          <h3>Scan to say thanks</h3>
          <QRCode key={selected} code={selected} />
          <p>
            {
              state.employees.find(
                (e) =>
                  e.id ===
                  state.tags.find((t) => t.id === selected)?.employeeId,
              )?.name
            }
          </p>
          <Link href={`/t/${selected}`}>Open tipping link ↗</Link>
          <p className="muted-text">
            Program this same URL onto your NFC card. For phone demos, use a
            deployed or LAN-accessible site URL rather than localhost.
          </p>
        </section>
      )}
    </>
  );
}
function QRCode({ code }: { code: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    import("qrcode")
      .then((qr) =>
        qr.toString(
          `${location.origin}${location.pathname.startsWith("/demo/") ? "/demo" : ""}/t/${code}`,
          {
            type: "svg",
            width: 240,
            margin: 2,
          },
        ),
      )
      .then((value) => {
        if (active) setSvg(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [code]);
  return (
    <div>
      {svg ? (
        <>
          <Image
            unoptimized
            width={240}
            height={240}
            src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
            alt={`QR code for tag ${code}`}
          />
          <a
            className="button secondary small"
            download={`tipit-${code}.svg`}
            href={`data:image/svg+xml,${encodeURIComponent(svg)}`}
          >
            Download QR
          </a>
        </>
      ) : (
        <p>{error ? "Unable to generate QR." : "Generating QR…"}</p>
      )}
    </div>
  );
}
