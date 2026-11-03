// Request-time clock helpers for server components (kept out of render bodies).

export const DAY_MS = 24 * 60 * 60 * 1000;

export function now() {
  return Date.now();
}

export function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS);
}
