import { catalogErrorKind, catalogErrorMessage } from "./catalogError";

test.each([
  [401, "access"], [403, "access"], [404, "missing"], [412, "conflict"], [428, "conflict"],
  [422, "validation"], [500, "temporary"],
] as const)("classifies HTTP %i for an actionable message", (status, expected) => {
  const kind = catalogErrorKind({ response: { status } });
  expect(kind).toBe(expected);
  expect(catalogErrorMessage(kind, "change")).toBeTruthy();
});

test("classifies malformed response separately from connection failure", () => {
  expect(catalogErrorKind(new Error("Respuesta de entradas inválida."))).toBe("invalid");
  expect(catalogErrorKind(new Error("offline"))).toBe("network");
  expect(catalogErrorMessage("invalid", "load")).toContain("datos incompletos");
  expect(catalogErrorMessage("network", "delete")).toContain("confirma");
});
