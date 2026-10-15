import { isStrongEntryVersion } from "./entryVersion";

test.each(['"rev-1"', '""', '"version/2"'])("accepts a strong HTTP entity tag %s", (tag) => {
  expect(isStrongEntryVersion(tag)).toBe(true);
});
test.each([undefined, null, 1, "", '*', 'W/"rev-1"', 'rev-1', '"rev 1"', '"rev\n1"', '"rev"1"'])("rejects a missing, weak or malformed tag %s", (tag) => {
  expect(isStrongEntryVersion(tag)).toBe(false);
});
