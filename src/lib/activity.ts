import type { DemoState } from "./demo";
export type ActivityEvent = {
  id: string;
  actorId: string;
  actorName?: string;
  action: string;
  targetId: string;
  targetName?: string;
  createdAt: string;
};
export const activityLabels: Record<string, string> = {
  "restaurant.save": "Updated restaurant details",
  "employee.create": "Added employee",
  "employee.update": "Updated employee",
  "employee.archive": "Archived employee",
  "employee.restore": "Restored employee",
  "tag.create": "Created tag",
  "tag.status": "Changed tag status",
  "tag.delete": "Deleted tag",
  "order.create": "Created hardware draft",
};
export function demoActivity(
  before: DemoState,
  after: DemoState,
): ActivityEvent[] {
  const changes: { action: string; targetId: string; targetName?: string }[] =
    [];
  if (JSON.stringify(before.restaurant) !== JSON.stringify(after.restaurant))
    changes.push({
      action: "restaurant.save",
      targetId: after.restaurant.slug,
      targetName: after.restaurant.name,
    });
  for (const employee of after.employees) {
    const prior = before.employees.find((item) => item.id === employee.id);
    const action = !prior
      ? "employee.create"
      : prior.deletedAt !== employee.deletedAt
        ? employee.deletedAt
          ? "employee.archive"
          : "employee.restore"
        : JSON.stringify(prior) !== JSON.stringify(employee)
          ? "employee.update"
          : null;
    if (action)
      changes.push({
        action,
        targetId: employee.id,
        targetName: employee.name,
      });
  }
  for (const tag of after.tags) {
    const prior = before.tags.find((item) => item.id === tag.id);
    if (!prior || prior.status !== tag.status)
      changes.push({
        action: !prior
          ? "tag.create"
          : tag.status === "deleted"
            ? "tag.delete"
            : "tag.status",
        targetId: tag.id,
        targetName: tag.id,
      });
  }
  for (const order of after.orders)
    if (!before.orders.some((item) => item.id === order.id))
      changes.push({
        action: "order.create",
        targetId: order.id,
        targetName: order.product,
      });
  return changes.map((change) => ({
    ...change,
    id: crypto.randomUUID(),
    actorId: "demo-owner",
    actorName: "Demo owner",
    createdAt: new Date().toISOString(),
  }));
}
