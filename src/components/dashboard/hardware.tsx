"use client";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { money } from "@/lib/demo";
import { Badge, Empty, Heading } from "@/components/ui";

export function Hardware() {
  const { state, update, mode } = useWorkspace();
  const [message, setMessage] = useState("");
  const products = [
    {
      name: "Personal NFC card",
      icon: "▱",
      price: 7900,
      detail: "A tap of thanks, wherever service happens.",
    },
    {
      name: "Table QR stand",
      icon: "▦",
      price: 12900,
      detail: "A little invitation to appreciate great service.",
    },
    {
      name: "Team starter pack",
      icon: "✳",
      price: 49900,
      detail: "5 NFC cards and 1 QR stand for your team.",
    },
  ];
  return (
    <>
      <Heading title="A small touch. A lasting thank you.">
        Equip your team with QR and NFC hardware. Illustrative demo prices; no
        orders are sent or charged.
      </Heading>
      <div className="employee-grid">
        {products.map((p) => (
          <article className="panel hardware-card" key={p.name}>
            <div className="hardware-illustration">
              <div>
                {p.icon}
                <small>♥ tipit.</small>
              </div>
            </div>
            <h3>{p.name}</h3>
            <p>{p.detail}</p>
            <strong className="price">{money(p.price)}</strong>
            <button
              className="button full"
              onClick={() => {
                update((s) => ({
                  ...s,
                  orders: [
                    {
                      id: crypto.randomUUID(),
                      product: p.name,
                      quantity: 1,
                      amount: p.price,
                      createdAt: new Date().toISOString(),
                    },
                    ...s.orders,
                  ],
                }));
                setMessage(
                  `${p.name} added to ${mode === "database" ? "draft" : "demo"} orders. No payment or fulfilment requested.`,
                );
              }}
            >
              {mode === "database" ? "Create draft order" : "Create demo order"}
            </button>
          </article>
        ))}
      </div>
      {message && (
        <p role="status" className="success-text">
          {message}
        </p>
      )}
      <section className="panel pad">
        <h3>
          {mode === "database" ? "Draft order history" : "Demo order history"}
        </h3>
        {state.orders.length ? (
          state.orders.map((o) => (
            <div key={o.id} className="order-row">
              <strong>{o.product}</strong>
              <span>
                Qty {o.quantity} · {money(o.amount)}
              </span>
              <Badge muted>
                {mode === "database" ? "Draft · unpaid" : "Demo only"}
              </Badge>
            </div>
          ))
        ) : (
          <Empty>Your hardware orders will appear here.</Empty>
        )}
      </section>
    </>
  );
}
