import { catalogErrorKind, catalogErrorMessage } from "./catalogError";

test.each([
  [401, "access", "load", "No tienes permiso"],
  [403, "access", "change", "No tienes permiso"],
  [404, "missing", "delete", "La entrada ya no está disponible"],
  [412, "conflict", "change", "La entrada cambió desde que la abriste"],
  [428, "conflict", "change", "La entrada cambió desde que la abriste"],
  [400, "validation", "change", "El servidor rechazó el cambio por las reglas"],
  [422, "validation", "change", "El servidor rechazó el cambio por las reglas"],
  [429, "rate_limit", "load", "Demasiadas solicitudes. Espera un momento"],
  [429, "rate_limit", "change", "Demasiadas solicitudes. Espera un momento"],
  [429, "rate_limit", "delete", "Demasiadas solicitudes. Espera un momento"],
  [500, "temporary", "load", "No se pudieron cargar las entradas. Comprueba tu conexión"],
  [503, "temporary", "change", "No se pudo confirmar el cambio. Actualiza la lista"],
  [504, "temporary", "delete", "No se pudo confirmar la eliminación. Actualiza la lista"],
] as const)("classifies HTTP %i as %s and returns semantic message for %s", (status, expectedKind, action, expectedSubstring) => {
  const kind = catalogErrorKind({ response: { status } });
  expect(kind).toBe(expectedKind);
  const message = catalogErrorMessage(kind, action);
  expect(message).toContain(expectedSubstring);
  if (expectedKind === "access" || expectedKind === "rate_limit") {
    expect(message).not.toContain("conexión");
  }
});

test("classifies malformed response separately from connection failure", () => {
  expect(catalogErrorKind(new Error("Respuesta de entradas inválida."))).toBe("invalid");
  expect(catalogErrorKind(new Error("offline"))).toBe("network");
  expect(catalogErrorMessage("invalid", "load")).toContain("datos incompletos");
  expect(catalogErrorMessage("network", "load")).toContain("Comprueba tu conexión");
  expect(catalogErrorMessage("network", "delete")).toContain("confirma");
});
