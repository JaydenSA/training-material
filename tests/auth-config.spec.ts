import { test, expect } from "@playwright/test";
import { getAuthConfiguration } from "../src/lib/auth-config";
test("authentication uses configured keys, preserves explicit demo, and fails closed when explicitly required", () => {
  const names = [
    "NEXT_PUBLIC_AUTH_MODE",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
  ] as const;
  const previous = names.map((name) => process.env[name]);
  try {
    names.forEach((name) => delete process.env[name]);
    expect(getAuthConfiguration()).toEqual({ enabled: false, invalid: false });
    process.env.NEXT_PUBLIC_AUTH_MODE = "clerk";
    expect(getAuthConfiguration()).toEqual({ enabled: false, invalid: true });
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "placeholder-publishable";
    expect(getAuthConfiguration()).toEqual({ enabled: false, invalid: true });
    process.env.CLERK_SECRET_KEY = "placeholder-secret";
    expect(getAuthConfiguration()).toEqual({ enabled: true, invalid: false });
    process.env.NEXT_PUBLIC_AUTH_MODE = "auto";
    expect(getAuthConfiguration()).toEqual({ enabled: true, invalid: false });
    process.env.NEXT_PUBLIC_AUTH_MODE = "demo";
    expect(getAuthConfiguration()).toEqual({ enabled: false, invalid: false });
  } finally {
    names.forEach((name, index) => {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    });
  }
});
