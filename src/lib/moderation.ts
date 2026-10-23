import { z } from "zod";
export const moderationSchema = z
  .object({
    requestId: z.string().uuid(),
    tipId: z.string().uuid(),
    action: z.enum(["flag", "hide", "restore"]),
    reason: z.string().trim().min(5).max(500),
  })
  .strict();
export type ModerationEvent = {
  id: string;
  tipId: string;
  action: "flag" | "hide" | "restore";
  reason: string;
  actorId: string;
  createdAt: string;
};
export const moderationStatus = (event?: ModerationEvent) =>
  event?.action === "hide"
    ? "Hidden"
    : event?.action === "flag"
      ? "Flagged"
      : "Visible";
