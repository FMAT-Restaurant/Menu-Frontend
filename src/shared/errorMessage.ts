import { contractErrorResponse } from "../api/catalogResponse";

function httpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("response" in error)) return undefined;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== "object" || !("status" in response)) return undefined;
  return typeof (response as { status?: unknown }).status === "number"
    ? (response as { status: number }).status
    : undefined;
}

function transportCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : undefined;
}

function statusFallbackMessage(status: number | undefined): string | null {
  if (status === undefined) return null;
  if (status === 401 || status === 403) {
    return "No tienes acceso a esta operación. Verifica tu sesión y permisos.";
  }
  if (status === 404) {
    return "El recurso solicitado ya no existe.";
  }
  if (status === 409 || status === 412 || status === 428) {
    return "Los datos cambiaron desde que se cargaron. Actualiza antes de volver a intentarlo.";
  }
  if (status === 422 || status === 400) {
    return "El servidor rechazó los datos enviados. Revisa la información e inténtalo de nuevo.";
  }
  if (status === 429 || status >= 500) {
    return "El servicio está temporalmente indisponible. Inténtalo de nuevo en unos momentos.";
  }
  return null;
}

function translateRawEnglishMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) return null;

  const statusMatch = /^Request failed with status code (\d+)$/i.exec(trimmed);
  if (statusMatch) {
    return statusFallbackMessage(Number(statusMatch[1])) ?? "No se pudo completar la operación.";
  }

  if (/^(Network Error|Failed to fetch|Load failed|NetworkError.*)$/i.test(trimmed)) {
    return "No se pudo conectar con el servicio. Comprueba tu conexión e inténtalo de nuevo.";
  }

  if (/^timeout of \d+ms exceeded$/i.test(trimmed) || /timed?\s*out/i.test(trimmed)) {
    return "La operación agotó el tiempo de espera. Inténtalo de nuevo en unos momentos.";
  }

  if (/^(Internal Server Error|Service Unavailable|Bad Gateway|Gateway Timeout|Too Many Requests)$/i.test(trimmed)) {
    return "El servicio está temporalmente indisponible. Inténtalo de nuevo en unos momentos.";
  }
  if (/^(Unauthorized|Forbidden)$/i.test(trimmed)) {
    return "No tienes acceso a esta operación. Verifica tu sesión y permisos.";
  }
  if (/^Not Found$/i.test(trimmed)) {
    return "El recurso solicitado ya no existe.";
  }
  if (/^Conflict$/i.test(trimmed)) {
    return "Los datos cambiaron desde que se cargaron. Actualiza antes de volver a intentarlo.";
  }
  if (/^(Bad Request|Unprocessable Entity)$/i.test(trimmed)) {
    return "El servidor rechazó los datos enviados. Revisa la información e inténtalo de nuevo.";
  }
  if (/^(canceled|Request aborted|The user aborted a request\.?)$/i.test(trimmed)) {
    return "La operación fue cancelada.";
  }

  return null;
}

/**
 * Normaliza cualquier error (Axios, Fetch, contrato backend o Error genérico)
 * a un mensaje legible en español para presentar al usuario.
 */
export function toSpanishErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la operación. Inténtalo de nuevo.",
): string {
  if (typeof error === "string") {
    return translateRawEnglishMessage(error) ?? (error.trim() || fallback);
  }

  if (error && typeof error === "object") {
    const data =
      "response" in error && (error as { response?: { data?: unknown } }).response?.data
        ? (error as { response?: { data?: unknown } }).response!.data
        : error;
    const contract = contractErrorResponse(data);
    if (contract) {
      const violations = contract.details?.violations ?? [];
      const violationMessages = violations.map((item) => item.message).join(" ").trim();
      const baseMsg = contract.message ? (translateRawEnglishMessage(contract.message) ?? contract.message) : "";
      if (violationMessages && baseMsg) return `${baseMsg} ${violationMessages}`;
      if (baseMsg) return baseMsg;
    }

    const code = transportCode(error);
    if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
      return "La operación agotó el tiempo de espera. Inténtalo de nuevo en unos momentos.";
    }
    if (code === "ERR_NETWORK") {
      return "No se pudo conectar con el servicio. Comprueba tu conexión e inténtalo de nuevo.";
    }

    const fromStatus = statusFallbackMessage(httpStatus(error));
    if (fromStatus) return fromStatus;

    if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
      const raw = (error as { message: string }).message;
      return translateRawEnglishMessage(raw) ?? (raw.trim() || fallback);
    }
  }

  return fallback;
}
