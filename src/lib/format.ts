// Display helpers shared by server and client components.

export function formatTaka(amount: number) {
  return `৳${Math.round(amount).toLocaleString("en-BD")}`;
}

/** 1,284 / 12.9K / 4.2M */
export function formatCompact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatDate(value: string | Date, withTime = false) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Asia/Dhaka",
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function plural(count: number, word: string, pluralWord = `${word}s`) {
  return `${count.toLocaleString("en-BD")} ${count === 1 ? word : pluralWord}`;
}
