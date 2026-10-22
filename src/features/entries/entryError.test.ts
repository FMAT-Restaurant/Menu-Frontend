import { AxiosError, AxiosHeaders } from "axios";
import { clearFieldFailure, entryFailure, localFieldFailure } from "./entryError";

function httpError(status: number, data: unknown) {
  return new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", undefined, {}, {
    status, statusText: "Rejected", headers: {}, config: { headers: new AxiosHeaders() }, data,
  });
}

test("prioritizes a real AxiosError's server envelope and maps JSON pointer violations", () => {
  const failure = entryFailure(httpError(422, { error: { message: "Revisa la entrada.", details: { violations: [
    { path: "/brandName", message: "Nombre ya utilizado." },
    { path: "/description", message: "Descripción incompleta." },
    { path: "/categoryIds/0", message: "Categoría de otro menú." },
    { path: "/imageId", message: "La imagen ya no existe." },
    { field: "status", message: "Transición no permitida." },
    { path: "/other", message: "Detalle general." }, null, { message: " " },
  ] } } }));
  expect(failure).toMatchObject({ kind: "validation", message: "Revisa la entrada.", fields: {
    brandName: "Nombre ya utilizado.", description: "Descripción incompleta.", categoryIds: "Categoría de otro menú.", image: "La imagen ya no existe.", status: "Transición no permitida.",
  }, uncertain: false });
  expect(failure.violations).toHaveLength(6);
  expect(failure.message).not.toContain("Request failed");
});

test.each([[400, "validation"], [415, "validation"], [422, "validation"], [409, "conflict"], [412, "conflict"], [428, "conflict"], [404, "notFound"], [401, "access"], [403, "access"], [429, "temporary"], [503, "temporary"]])("classifies HTTP %i without exposing Axios's technical message", (status, kind) => {
  const failure = entryFailure(httpError(Number(status), {}));
  expect(failure.kind).toBe(kind);
  expect(failure.message).not.toContain("Request failed");
});

test.each(["ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK"])("marks %s as an uncertain transport result", (code) => {
  const failure = entryFailure(new AxiosError("technical transport message", code));
  expect(failure.uncertain).toBe(true);
  expect(failure.message).not.toContain("technical");
});

test("supports legacy details and file fields while discarding malformed details", () => {
  const result = entryFailure(httpError(422, { message: "Datos inválidos.", details: [{ field: "file", message: "Archivo ilegible." }, { message: "Otro detalle." }, "bad"] }));
  expect(result.fields.image).toBe("Archivo ilegible.");
  expect(result.violations[1]).toEqual({ message: "Otro detalle." });
  expect(entryFailure(httpError(422, { error: { message: " ", details: { violations: "bad" } } })).violations).toEqual([]);
});

test("uses safe fallbacks and local validation messages", () => {
  expect(entryFailure(null).kind).toBe("general");
  expect(entryFailure(new Error("Archivo ilegible.")).message).toBe("Archivo ilegible.");
  expect(entryFailure({ response: { status: 404, data: "not json" } }).kind).toBe("notFound");
  expect(entryFailure({ response: { status: 422, data: { details: null } } }).fields).toEqual({});
  expect(localFieldFailure("brandName", "Requerido").fields.brandName).toBe("Requerido");
});

test("clears only the corrected field, preserving unrelated validation details", () => {
  const failure = entryFailure(httpError(422, { error: { message: "Revisa los campos", details: { violations: [
    { path: "/brandName", message: "Nombre" }, { path: "/description", message: "Descripción" },
  ] } } }));
  expect(clearFieldFailure(failure, "brandName")).toMatchObject({ fields: { description: "Descripción" }, violations: [{ field: "description", message: "Descripción" }] });
  expect(clearFieldFailure(failure, "brandName")?.fields.brandName).toBeUndefined();
  expect(clearFieldFailure(null, "description")).toBeNull();
});
