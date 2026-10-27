export function isStrongEntryVersion(value: unknown): value is string {
  return typeof value === "string" && /^"[\x21\x23-\x7E\x80-\xFF]*"$/.test(value);
}

export const isStrongEtag = isStrongEntryVersion;

export function assertStrongEtag(value: unknown, message: string): string {
  if (!isStrongEntryVersion(value)) {
    throw new Error(message);
  }
  return value;
}
