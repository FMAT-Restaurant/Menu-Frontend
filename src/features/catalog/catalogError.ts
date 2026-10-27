import axios from "axios";

export type CatalogErrorKind =
  | "network"
  | "access"
  | "missing"
  | "conflict"
  | "validation"
  | "temporary"
  | "invalid"
  | "rate_limit";

export function catalogErrorKind(error: unknown): CatalogErrorKind {
  if (error instanceof Error && error.message.startsWith("Respuesta de ")) return "invalid";
  const status = axios.isAxiosError(error) ? error.response?.status : responseStatus(error);
  if (status === 401 || status === 403) return "access";
  if (status === 404) return "missing";
  if (status === 412 || status === 428) return "conflict";
  if (status === 400 || status === 422) return "validation";
  if (status === 429) return "rate_limit";
  if (typeof status === "number" && status >= 500) return "temporary";
  return "network";
}

function responseStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("response" in error)) return undefined;
  const response = error.response;
  if (!response || typeof response !== "object" || !("status" in response)) return undefined;
  return typeof response.status === "number" ? response.status : undefined;
}

export function catalogErrorMessage(kind: CatalogErrorKind, action: "load" | "change" | "delete") {
  if (kind === "invalid") return "El servidor devolvió datos incompletos. Actualiza la lista o inténtalo más tarde.";
  if (kind === "access") return "No tienes permiso para esta operación. Solicita acceso o vuelve a iniciar sesión.";
  if (kind === "missing") return "La entrada ya no está disponible. Actualiza la lista.";
  if (kind === "conflict") return "La entrada cambió desde que la abriste. Actualiza la lista antes de volver a intentarlo.";
  if (kind === "validation") return "El servidor rechazó el cambio por las reglas de la entrada. Revisa su estado y vuelve a intentarlo.";
  if (kind === "rate_limit") return "Demasiadas solicitudes. Espera un momento antes de volver a intentarlo.";
  if (action === "load") return "No se pudieron cargar las entradas. Comprueba tu conexión y vuelve a intentarlo.";
  if (action === "delete") return "No se pudo confirmar la eliminación. Actualiza la lista antes de repetirla.";
  return "No se pudo confirmar el cambio. Actualiza la lista antes de repetirlo.";
}
