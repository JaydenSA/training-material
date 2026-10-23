import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { getAuthConfiguration } from "@/lib/auth-config";
import { HttpError } from "@/lib/http-error";
import { hasTestingAccess } from "./access";

export async function canAccessTesting() {
  if (!getAuthConfiguration().enabled) return false;
  return hasTestingAccess(await currentUser());
}

export async function requireTestingAccess() {
  if (!(await canAccessTesting()))
    throw new HttpError(
      403,
      "testing_forbidden",
      "Superuser access is required.",
    );
}
