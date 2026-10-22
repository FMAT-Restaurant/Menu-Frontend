import { assertStrongEtag, isStrongEntryVersion, isStrongEtag } from "./entryVersion";

describe("entryVersion strong ETag validation", () => {
  test.each([
    '"rev-1"',
    '""',
    '"version/2"',
    '"0ddba9d0-0f45-4abc-9e4a-3e3471a5ce01:v4"',
  ])("accepts strong opaque HTTP entity tag %s and preserves its exact value", (tag) => {
    expect(isStrongEntryVersion(tag)).toBe(true);
    expect(isStrongEtag(tag)).toBe(true);
    expect(assertStrongEtag(tag, "Versión inválida")).toBe(tag);
  });

  test.each([
    undefined,
    null,
    1,
    "",
    "*",
    'W/"rev-1"',
    'w/"rev-1"',
    "rev-1",
    '"rev 1"',
    '"rev\n1"',
    '"rev\t1"',
    '"rev"1"',
    '"unclosed',
    'unopened"',
  ])("rejects missing, weak, wildcard, unquoted or malformed tag %s", (tag) => {
    expect(isStrongEntryVersion(tag)).toBe(false);
    expect(isStrongEtag(tag)).toBe(false);
    expect(() => assertStrongEtag(tag, "No se recibió una versión fuerte.")).toThrow(
      "No se recibió una versión fuerte.",
    );
  });
});
