import type { DemoState } from "./demo";
const receiptKey = "tipit-payment-simulation";
const restaurantKey = (slug: string) => `tipit-simulated-reviews:${slug}`;

export function readSimulation(slug: string): DemoState | null {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const raw = storage.getItem(storage === localStorage ? restaurantKey(slug) : receiptKey);
      const value = raw ? JSON.parse(raw) : null;
      if (value?.restaurant?.slug === slug && Array.isArray(value.tips)) return value;
    } catch { /* Browser storage may be unavailable. */ }
  }
  return null;
}

export function saveSimulation(state: DemoState) {
  sessionStorage.setItem(receiptKey, JSON.stringify(state));
  try {
    localStorage.setItem(restaurantKey(state.restaurant.slug), JSON.stringify(state));
    window.dispatchEvent(new Event("tipit-simulation-updated"));
  } catch { /* The receipt remains available in this tab. */ }
}
