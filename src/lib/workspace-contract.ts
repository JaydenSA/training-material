import { z } from "zod";
import type { DemoState } from "./demo";
const name = z.string().trim().min(1).max(100);
const id = z.string().uuid();
const employeeFields = {
  name,
  role: z.string().trim().min(1).max(60),
  bio: z.string().max(240),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
};
export const commandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("restaurant.save"),
      name,
      email: z.string().email().max(254),
      city: z.string().trim().max(100),
    })
    .strict(),
  z
    .object({ type: z.literal("employee.create"), id, ...employeeFields })
    .strict(),
  z
    .object({ type: z.literal("employee.update"), id, ...employeeFields })
    .strict(),
  z.object({ type: z.literal("employee.archive"), id }).strict(),
  z.object({ type: z.literal("employee.restore"), id }).strict(),
  z
    .object({
      type: z.literal("tag.create"),
      code: z.string().regex(/^[a-zA-Z0-9-]{3,64}$/),
      employeeId: id,
      format: z.enum(["NFC card", "QR stand"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("tag.status"),
      code: z.string().regex(/^[a-zA-Z0-9-]{3,64}$/),
      status: z.enum(["active", "suspended", "deleted"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("order.create"),
      id,
      product: z.enum([
        "Personal NFC card",
        "Table QR stand",
        "Team starter pack",
      ]),
      quantity: z.number().int().min(1).max(100),
    })
    .strict(),
]);
export const mutationSchema = z
  .object({
    requestId: id,
    version: z.number().int().nonnegative(),
    commands: z.array(commandSchema).min(1).max(20),
  })
  .strict();
export type WorkspaceCommand = z.infer<typeof commandSchema>;
export const catalog = {
  "Personal NFC card": 7900,
  "Table QR stand": 12900,
  "Team starter pack": 49900,
} as const;
export function deriveCommands(
  before: DemoState,
  after: DemoState,
): WorkspaceCommand[] {
  if (
    JSON.stringify(before.tips) !== JSON.stringify(after.tips) ||
    before.plan !== after.plan
  )
    throw new Error(
      "Payments, ratings, and subscription state are controlled by the server.",
    );
  const commands: WorkspaceCommand[] = [];
  if (
    JSON.stringify(before.restaurant) !== JSON.stringify(after.restaurant) ||
    (!before.onboarded && after.onboarded)
  ) {
    const { name, email, city } = after.restaurant;
    commands.push({ type: "restaurant.save", name, email, city });
  }
  for (const e of after.employees) {
    const old = before.employees.find((x) => x.id === e.id);
    const fields = {
      id: e.id,
      name: e.name,
      role: e.role,
      bio: e.bio,
      color: e.color,
    };
    if (!old) commands.push({ type: "employee.create", ...fields });
    else if (old.deletedAt !== e.deletedAt)
      commands.push({
        type: e.deletedAt ? "employee.archive" : "employee.restore",
        id: e.id,
      });
    else if (JSON.stringify(old) !== JSON.stringify(e))
      commands.push({ type: "employee.update", ...fields });
  }
  for (const t of after.tags) {
    const old = before.tags.find((x) => x.id === t.id);
    if (!old)
      commands.push({
        type: "tag.create",
        code: t.id,
        employeeId: t.employeeId,
        format: t.type,
      });
    // Employee archival suspends all tags atomically on the server.
    else if (
      old.status !== t.status &&
      !after.employees.some(
        (e) =>
          e.id === t.employeeId &&
          e.deletedAt &&
          !before.employees.find((x) => x.id === e.id)?.deletedAt,
      )
    )
      commands.push({ type: "tag.status", code: t.id, status: t.status });
    else if (old.employeeId !== t.employeeId)
      throw new Error("Existing tags cannot be reassigned.");
  }
  for (const o of after.orders)
    if (!before.orders.some((x) => x.id === o.id))
      commands.push({
        type: "order.create",
        id: o.id,
        product: o.product as keyof typeof catalog,
        quantity: o.quantity,
      });
  return commands.map((c) => commandSchema.parse(c));
}
