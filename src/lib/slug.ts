/** "Ladies bags" → "ladies-bags". Used for category URLs and stored slugs, so both always agree. */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
