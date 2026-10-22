import { NextResponse } from "next/server";
import { HttpError } from "./http-error";
export const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message, code: error.code }, error.status);
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  if (code === "23505")
    return json(
      {
        error: "This record already exists. Refresh and try again.",
        code: "duplicate_record",
      },
      409,
    );
  if (["23503", "23514"].includes(code))
    return json(
      {
        error: "The change violates a restaurant data rule.",
        code: "invalid_record",
      },
      400,
    );
  if (code === "40001" || code === "40P01")
    return json(
      {
        error: "The workspace changed concurrently. Refresh and try again.",
        code: "version_conflict",
      },
      409,
    );
  return json(
    {
      error:
        "The database is unavailable or migrations are missing. No demo data has been substituted.",
      code: "database_unavailable",
    },
    503,
  );
}
