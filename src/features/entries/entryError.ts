export type EntryField = "brandName" | "description" | "categoryIds" | "image" | "status";
export type FailureKind = "validation" | "conflict" | "notFound" | "access" | "temporary" | "timeout" | "network" | "general";
export interface EntryViolation { field?: EntryField; message: string }
export interface EntryFailure {
  kind: FailureKind;
  message: string;
  violations: EntryViolation[];
  fields: Partial<Record<EntryField, string>>;
  uncertain: boolean;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const fieldNames = new Set<EntryField>(["brandName", "description", "categoryIds", "image", "status"]);
function violation(value: unknown): EntryViolation[] {
  if (!record(value) || typeof value.message !== "string" || !value.message.trim()) return [];
  const path = typeof value.path === "string" ? value.path : value.field;
  let field = typeof path === "string" ? path.replace(/^\//, "").split(/[./[]/)[0] : "";
  if (field === "imageId" || field === "file") field = "image";
  const message = value.message.trim();
  if (fieldNames.has(field as EntryField)) return [{ field: field as EntryField, message }];
  return [{ message }];
}

function violationsFrom(details: unknown): EntryViolation[] {
  if (Array.isArray(details)) return details.flatMap(violation);
  if (record(details) && Array.isArray(details.violations)) return details.violations.flatMap(violation);
  return [];
}

function kindFor(status: unknown, code: unknown): FailureKind {
  if (status === 409 || status === 412 || status === 428) return "conflict";
  if (status === 400 || status === 415 || status === 422) return "validation";
  if (status === 404) return "notFound";
  if (status === 401 || status === 403) return "access";
  if (status === 429 || (typeof status === "number" && status >= 500)) return "temporary";
  if (code === "ECONNABORTED" || code === "ETIMEDOUT") return "timeout";
  if (code === "ERR_NETWORK") return "network";
  return "general";
}

const fallbackMessages: Record<FailureKind, string> = {
  validation: "Revisa los datos indicados antes de guardar.",
  conflict: "La entrada cambió desde que la abriste. Revisa los datos actuales antes de continuar.",
  notFound: "El recurso solicitado ya no existe. Tu borrador se conserva.",
  access: "No tienes acceso a esta operación. Verifica tu sesión y permisos.",
  temporary: "El servicio está temporalmente indisponible. Tu borrador se conserva.",
  timeout: "Se agotó el tiempo de espera. No se pudo confirmar el resultado.",
  network: "No se pudo conectar con el servicio. Comprueba tu conexión.",
  general: "No se pudo completar la operación. Tu borrador se conserva.",
};

function serverPayload(error: unknown) {
  const response = record(error) && record(error.response) ? error.response : {};
  const data = record(response.data) ? response.data : {};
  return { status: response.status, payload: record(data.error) ? data.error : data };
}

function messageFor(error: unknown, payload: Record<string, unknown>, kind: FailureKind) {
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message.trim();
  if (record(error) && error instanceof Error && !record(error.response) && !error.isAxiosError && error.message) return error.message;
  return fallbackMessages[kind];
}

export function entryFailure(error: unknown): EntryFailure {
  const { status, payload } = serverPayload(error);
  const kind = kindFor(status, record(error) ? error.code : undefined);
  const violations = violationsFrom(payload.details);
  const fields: EntryFailure["fields"] = {};
  for (const item of violations) {
    if (item.field) fields[item.field] = item.message;
  }
  return { kind, message: messageFor(error, payload, kind), violations, fields, uncertain: kind === "network" || kind === "timeout" || kind === "temporary" };
}

export function clearFieldFailure(failure: EntryFailure | null, field: EntryField): EntryFailure | null {
  if (!failure) return null;
  const fields = { ...failure.fields };
  delete fields[field];
  const violations = failure.violations.filter((item) => item.field !== field);
  if (failure.kind === "validation" && Object.keys(fields).length === 0 && violations.length === 0) return null;
  return { ...failure, fields, violations };
}

export function localFieldFailure(field: EntryField, message: string): EntryFailure {
  return { kind: "validation", message, violations: [], fields: { [field]: message }, uncertain: false };
}
