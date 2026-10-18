export function isStrongEntryVersion(value: unknown): value is string {
  return typeof value === "string" && /^"[\x21\x23-\x7E\x80-\xFF]*"$/.test(value);
}
