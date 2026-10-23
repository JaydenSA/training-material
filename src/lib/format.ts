export const RESTAURANT_TIME_ZONE = "Africa/Johannesburg";
export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Date(value).toLocaleDateString("en-ZA", {
    ...options,
    timeZone: RESTAURANT_TIME_ZONE,
  });
}
export function dateFilterKey(value: string | Date) {
  return new Date(value).toLocaleDateString("en-CA", {
    timeZone: RESTAURANT_TIME_ZONE,
  });
}
