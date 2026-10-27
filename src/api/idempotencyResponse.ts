import {
  CatalogResponseError,
  contractErrorResponse,
  type CatalogResponseFamily,
  type ContractValidationViolation,
} from "./catalogResponse";
import type {
  AttemptFailureOutcome,
  IdempotentOperationKind,
} from "../application/operationAttempt";

export type RetryAfterParseResult =
  | {
      readonly valid: true;
      readonly seconds: number;
    }
  | {
      readonly valid: false;
      readonly seconds: null;
      readonly reason: "missing" | "non_numeric" | "non_positive";
    };

const INTEGER_PATTERN = /^-?\d+$/;

export function parseRetryAfterHeader(rawHeader: unknown): RetryAfterParseResult {
  if (rawHeader === undefined || rawHeader === null) {
    return { valid: false, seconds: null, reason: "missing" };
  }
  if (typeof rawHeader !== "string") {
    return { valid: false, seconds: null, reason: "non_numeric" };
  }
  const trimmed = rawHeader.trim();
  if (trimmed.length === 0) {
    return { valid: false, seconds: null, reason: "missing" };
  }
  if (!INTEGER_PATTERN.test(trimmed)) {
    return { valid: false, seconds: null, reason: "non_numeric" };
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { valid: false, seconds: null, reason: "non_positive" };
  }
  return { valid: true, seconds: parsed };
}

export class MalformedWriteResponseError extends Error {
  readonly code = "INVALID_WRITE_2XX_RESPONSE" as const;
  readonly family: CatalogResponseFamily;
  readonly status: number;
  readonly possibleWriteApplied = true as const;
  readonly causeError: CatalogResponseError;

  constructor(causeError: CatalogResponseError, status = 200) {
    super(
      `${causeError.message} El cambio pudo haberse aplicado en el servidor; verifica o reintenta con la misma operación.`,
    );
    this.name = "MalformedWriteResponseError";
    this.family = causeError.family;
    this.status = status;
    this.causeError = causeError;
  }
}

export function validateWriteSuccessResponse<T>(
  rawBody: unknown,
  validator: (value: unknown) => T,
  status = 200,
): T {
  try {
    return validator(rawBody);
  } catch (error) {
    if (error instanceof CatalogResponseError) {
      throw new MalformedWriteResponseError(error, status);
    }
    throw error;
  }
}

export interface HttpFailureContext {
  readonly status?: number;
  readonly rawBody?: unknown;
  readonly headers?: Readonly<Record<string, string | undefined>>;
  readonly isTimeout?: boolean;
  readonly isNetworkError?: boolean;
  readonly isMalformedWrite2xx?: boolean;
  readonly message?: string;
  readonly operationKind?: IdempotentOperationKind;
}

export interface IdempotentErrorAnalysis extends AttemptFailureOutcome {
  readonly status: number | null;
  readonly retryWithSameKey: boolean;
  readonly allowNewAttemptWithNewKey: boolean;
  readonly requiresResourceReload: boolean;
  readonly preserveEditableDraft: true;
  readonly committed: boolean | "uncertain";
  readonly violations: readonly ContractValidationViolation[];
  readonly offerIds: readonly string[];
}

function getHeaderCaseInsensitive(
  headers: Readonly<Record<string, string | undefined>> | undefined,
  headerName: string,
): string | undefined {
  if (!headers) return undefined;
  const target = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return undefined;
}

function isInventoryValidatedOperation(kind?: IdempotentOperationKind): boolean {
  return (
    kind === "recipe.create" ||
    kind === "offer.create" ||
    kind === "offer.patch"
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getPlainObjectOrNull(value: unknown): Record<string, unknown> | null {
  return isPlainObject(value) ? value : null;
}

function getResponseStatus(
  error: Record<string, unknown>,
  response: Record<string, unknown> | null,
): number | undefined {
  if (typeof error.status === "number") return error.status;
  if (response && typeof response.status === "number") return response.status;
  return undefined;
}

function getRawResponseBody(
  error: Record<string, unknown>,
  response: Record<string, unknown> | null,
): unknown {
  if ("rawBody" in error) return error.rawBody;
  if (response && "data" in response) return response.data;
  return undefined;
}

function getRawHeadersSource(
  error: Record<string, unknown>,
  response: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (isPlainObject(error.headers)) return error.headers;
  if (response && isPlainObject(response.headers)) return response.headers;
  return null;
}

function normalizeHeaders(
  rawHeaders: Record<string, unknown> | null,
): Record<string, string | undefined> | undefined {
  if (!rawHeaders) return undefined;

  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (typeof value === "string" || value === undefined) {
      headers[key] = value;
    }
  }
  return headers;
}

const IDEMPOTENT_OPERATION_KINDS = new Set<IdempotentOperationKind>([
  "category.create",
  "recipe.create",
  "image.upload",
  "entry.create",
  "offer.create",
  "offer.patch",
]);

function isIdempotentOperationKind(
  value: unknown,
): value is IdempotentOperationKind {
  return IDEMPOTENT_OPERATION_KINDS.has(value as IdempotentOperationKind);
}

function resolveOperationKind(
  operationKind: IdempotentOperationKind | undefined,
  errorOperationKind: unknown,
): IdempotentOperationKind | undefined {
  return (
    operationKind ??
    (isIdempotentOperationKind(errorOperationKind) ? errorOperationKind : undefined)
  );
}

function isTimeoutFailure(error: Record<string, unknown>): boolean {
  const errorCode = typeof error.code === "string" ? error.code : "";
  return (
    Boolean(error.isTimeout) ||
    errorCode === "ECONNABORTED" ||
    errorCode === "ETIMEDOUT"
  );
}

function isNetworkFailure(
  error: Record<string, unknown>,
  status: number | undefined,
  isTimeout: boolean,
): boolean {
  return (
    Boolean(error.isNetworkError) ||
    (!isTimeout && status === undefined && !error.isMalformedWrite2xx)
  );
}

function extractRecordFailureContext(
  error: Record<string, unknown>,
  operationKind?: IdempotentOperationKind,
): HttpFailureContext {
  const response = getPlainObjectOrNull(error.response);
  const status = getResponseStatus(error, response);
  const rawBody = getRawResponseBody(error, response);
  const headers = normalizeHeaders(getRawHeadersSource(error, response));
  const isTimeout = isTimeoutFailure(error);
  const isNetworkError = isNetworkFailure(error, status, isTimeout);
  const message = typeof error.message === "string" ? error.message : undefined;

  return {
    status,
    rawBody,
    headers,
    isTimeout,
    isNetworkError,
    isMalformedWrite2xx: Boolean(error.isMalformedWrite2xx),
    message,
    operationKind: resolveOperationKind(operationKind, error.operationKind),
  };
}

function extractKnownFailureContext(
  error: unknown,
  operationKind?: IdempotentOperationKind,
): HttpFailureContext | null {
  if (error instanceof MalformedWriteResponseError) {
    return {
      status: error.status,
      isMalformedWrite2xx: true,
      message: error.message,
      operationKind,
    };
  }
  if (error instanceof CatalogResponseError) {
    return {
      status: 200,
      isMalformedWrite2xx: true,
      message: error.message,
      operationKind,
    };
  }
  return null;
}

function getUnknownFailureMessage(error: unknown): string {
  if (typeof error === "string" && error.trim().length > 0) return error;
  if (error instanceof Error) return error.message;
  return "Error de comunicación.";
}

export function extractHttpFailureContext(
  error: unknown,
  operationKind?: IdempotentOperationKind,
): HttpFailureContext {
  const knownContext = extractKnownFailureContext(error, operationKind);
  if (knownContext) return knownContext;
  if (isPlainObject(error)) return extractRecordFailureContext(error, operationKind);

  return {
    isNetworkError: true,
    message: getUnknownFailureMessage(error),
    operationKind,
  };
}

function getUncertainOutcomeErrorCode(
  ctx: HttpFailureContext,
  status: number | null,
): string {
  if (ctx.isTimeout) return "REQUEST_TIMEOUT";
  if (ctx.isNetworkError || status === null) return "NETWORK_ERROR";
  return `HTTP_${status}`;
}

type ParsedContractError = NonNullable<ReturnType<typeof contractErrorResponse>>;

function analyzeMalformedWriteResponse(
  ctx: HttpFailureContext,
  status: number | null,
): IdempotentErrorAnalysis | null {
  if (!ctx.isMalformedWrite2xx && !(status !== null && status >= 200 && status < 300)) return null;
  return {
    kind: "uncertain_write_response",
    status: status ?? 200,
    errorCode: "INVALID_WRITE_2XX_RESPONSE",
    message: ctx.message ?? "La respuesta del servidor es inválida, pero el cambio pudo haberse aplicado. Reintenta con la misma operación o verifica el estado.",
    retryAfterSeconds: null,
    retryAfterInvalid: false,
    possibleWriteApplied: true,
    retryWithSameKey: true,
    allowNewAttemptWithNewKey: false,
    requiresResourceReload: false,
    preserveEditableDraft: true,
    committed: "uncertain",
    violations: [],
    offerIds: [],
  };
}

function analyzeInProgressConflict(
  ctx: HttpFailureContext,
  status: number | null,
  contractError: ParsedContractError | null,
  contractCode: string | undefined,
  violations: readonly ContractValidationViolation[],
  offerIds: readonly string[],
): IdempotentErrorAnalysis | null {
  if (status !== 409 || contractCode !== "IDEMPOTENCY_IN_PROGRESS") return null;
  const parsedRetryAfter = parseRetryAfterHeader(getHeaderCaseInsensitive(ctx.headers, "retry-after"));
  if (parsedRetryAfter.valid) {
    return {
      kind: "in_progress_conflict",
      status: 409,
      errorCode: "IDEMPOTENCY_IN_PROGRESS",
      message: contractError?.message ?? `La solicitud sigue en proceso. Espera ${parsedRetryAfter.seconds} s antes de reintentar.`,
      retryAfterSeconds: parsedRetryAfter.seconds,
      retryAfterInvalid: false,
      possibleWriteApplied: true,
      retryWithSameKey: true,
      allowNewAttemptWithNewKey: false,
      requiresResourceReload: false,
      preserveEditableDraft: true,
      committed: "uncertain",
      violations,
      offerIds,
    };
  }
  return {
    kind: "in_progress_conflict",
    status: 409,
    errorCode: "IDEMPOTENCY_IN_PROGRESS_INVALID_RETRY_AFTER",
    message: "La solicitud sigue en proceso, pero el encabezado Retry-After falta o no es válido. La operación queda pausada; conserva el borrador y revisa su estado antes de continuar.",
    retryAfterSeconds: null,
    retryAfterInvalid: true,
    possibleWriteApplied: true,
    retryWithSameKey: true,
    allowNewAttemptWithNewKey: false,
    requiresResourceReload: false,
    preserveEditableDraft: true,
    committed: "uncertain",
    violations,
    offerIds,
  };
}

function analyzeContractConflict(
  status: number | null,
  contractError: ParsedContractError | null,
  contractCode: string | undefined,
  violations: readonly ContractValidationViolation[],
  offerIds: readonly string[],
): IdempotentErrorAnalysis | null {
  if (status === 409 && contractCode === "IDEMPOTENCY_KEY_REUSED") {
    return {
      kind: "key_reused_conflict", status: 409, errorCode: "IDEMPOTENCY_KEY_REUSED",
      message: contractError?.message ?? "La clave de idempotencia ya fue utilizada con datos diferentes. Inicia un nuevo intento para generar una clave nueva.",
      retryAfterSeconds: null, retryAfterInvalid: false, possibleWriteApplied: false,
      retryWithSameKey: false, allowNewAttemptWithNewKey: true, requiresResourceReload: false,
      preserveEditableDraft: true, committed: false, violations, offerIds,
    };
  }
  if (status === 400 && contractCode === "INVALID_IDEMPOTENCY_KEY") {
    return {
      kind: "invalid_key", status: 400, errorCode: "INVALID_IDEMPOTENCY_KEY",
      message: contractError?.message ?? "La clave de idempotencia enviada no es válida. Se generará un nuevo UUID v4 al reintentar.",
      retryAfterSeconds: null, retryAfterInvalid: false, possibleWriteApplied: false,
      retryWithSameKey: false, allowNewAttemptWithNewKey: true, requiresResourceReload: false,
      preserveEditableDraft: true, committed: false, violations, offerIds,
    };
  }
  if (status !== 412 && status !== 428) return null;
  return {
    kind: "precondition_conflict", status,
    errorCode: status === 428 ? "PRECONDITION_REQUIRED" : "PRECONDITION_FAILED",
    message: contractError?.message ?? "El recurso cambió en el servidor. Recarga la versión actual para conciliar tu borrador antes de guardar.",
    retryAfterSeconds: null, retryAfterInvalid: false, possibleWriteApplied: false,
    retryWithSameKey: false, allowNewAttemptWithNewKey: true, requiresResourceReload: true,
    preserveEditableDraft: true, committed: false, violations, offerIds,
  };
}

function analyzeValidationFailure(
  ctx: HttpFailureContext,
  status: number | null,
  contractError: ParsedContractError | null,
  contractCode: string | undefined,
  violations: readonly ContractValidationViolation[],
  offerIds: readonly string[],
): IdempotentErrorAnalysis | null {
  if (status !== 422) return null;
  const violationMessages = violations.map((item) => item.message).join(" ");
  const combinedMessage = violationMessages.length > 0 && contractError?.message
    ? `${contractError.message} ${violationMessages}`
    : contractError?.message ?? ctx.message ?? "Revisa los datos enviados en la solicitud.";
  return {
    kind: "pre_commit_rejection", status: 422,
    errorCode: contractCode ?? "VALIDATION_ERROR", message: combinedMessage,
    retryAfterSeconds: null, retryAfterInvalid: false, possibleWriteApplied: false,
    retryWithSameKey: false, allowNewAttemptWithNewKey: true, requiresResourceReload: false,
    preserveEditableDraft: true, committed: false, violations, offerIds,
  };
}

function analyzeInventoryFailure(
  ctx: HttpFailureContext,
  status: number | null,
  contractError: ParsedContractError | null,
  contractCode: string | undefined,
  violations: readonly ContractValidationViolation[],
  offerIds: readonly string[],
): IdempotentErrorAnalysis | null {
  const matchesInventoryFailure = status === 502 && contractError !== null && (
    isInventoryValidatedOperation(ctx.operationKind) ||
    contractCode === "INVENTORY_UNAVAILABLE" ||
    /inventario|no se aplicaron cambios/i.test(contractError.message)
  );
  if (!matchesInventoryFailure || !contractError) return null;
  return {
    kind: "pre_commit_rejection", status: 502,
    errorCode: contractCode ?? "INVENTORY_VALIDATION_UNAVAILABLE", message: contractError.message,
    retryAfterSeconds: null, retryAfterInvalid: false, possibleWriteApplied: false,
    retryWithSameKey: false, allowNewAttemptWithNewKey: true, requiresResourceReload: false,
    preserveEditableDraft: true, committed: false, violations, offerIds,
  };
}

function analyzeUncertainOutcome(
  ctx: HttpFailureContext,
  status: number | null,
  contractError: ParsedContractError | null,
  violations: readonly ContractValidationViolation[],
  offerIds: readonly string[],
): IdempotentErrorAnalysis | null {
  if (!ctx.isTimeout && !ctx.isNetworkError && status !== null && status !== 408 && status !== 429 && status < 500) return null;
  return {
    kind: "uncertain_outcome", status,
    errorCode: getUncertainOutcomeErrorCode(ctx, status),
    message: contractError?.message ?? ctx.message ?? "No se pudo confirmar el resultado de la operación. Reintenta con la misma operación pendiente.",
    retryAfterSeconds: null, retryAfterInvalid: false, possibleWriteApplied: true,
    retryWithSameKey: true, allowNewAttemptWithNewKey: false, requiresResourceReload: false,
    preserveEditableDraft: true, committed: "uncertain", violations, offerIds,
  };
}

function createPreCommitRejection(
  ctx: HttpFailureContext,
  status: number | null,
  contractError: ParsedContractError | null,
  contractCode: string | undefined,
  violations: readonly ContractValidationViolation[],
  offerIds: readonly string[],
): IdempotentErrorAnalysis {
  return {
    kind: "pre_commit_rejection", status,
    errorCode: contractCode ?? `HTTP_${status}`,
    message: contractError?.message ?? ctx.message ?? "No se pudo completar la operación.",
    retryAfterSeconds: null, retryAfterInvalid: false, possibleWriteApplied: false,
    retryWithSameKey: false, allowNewAttemptWithNewKey: true, requiresResourceReload: false,
    preserveEditableDraft: true, committed: false, violations, offerIds,
  };
}

export function analyzeIdempotentAttemptError(
  errorOrContext: unknown,
  operationKind?: IdempotentOperationKind,
): IdempotentErrorAnalysis {
  const ctx = extractHttpFailureContext(errorOrContext, operationKind);
  const status = ctx.status ?? null;
  const contractError = contractErrorResponse(ctx.rawBody);
  const contractCode = contractError?.details?.code;
  const violations = contractError?.details?.violations ?? [];
  const offerIds = contractError?.details?.offerIds ?? [];
  const analyses = [
    analyzeMalformedWriteResponse(ctx, status),
    analyzeInProgressConflict(ctx, status, contractError, contractCode, violations, offerIds),
    analyzeContractConflict(status, contractError, contractCode, violations, offerIds),
    analyzeValidationFailure(ctx, status, contractError, contractCode, violations, offerIds),
    analyzeInventoryFailure(ctx, status, contractError, contractCode, violations, offerIds),
    analyzeUncertainOutcome(ctx, status, contractError, violations, offerIds),
  ];
  return analyses.find((analysis) => analysis !== null) ??
    createPreCommitRejection(ctx, status, contractError, contractCode, violations, offerIds);
}

export interface NonIdempotentWriteErrorAnalysis {
  readonly kind:
    | "precondition_conflict"
    | "resource_in_use"
    | "pre_commit_rejection"
    | "uncertain_write_response"
    | "uncertain_outcome";
  readonly status: number | null;
  readonly errorCode: string;
  readonly message: string;
  readonly requiresResourceReload: boolean;
  readonly preserveEditableDraft: true;
  readonly possibleWriteApplied: boolean;
  readonly violations: readonly ContractValidationViolation[];
  readonly offerIds: readonly string[];
}

export function analyzeNonIdempotentWriteError(
  errorOrContext: unknown,
): NonIdempotentWriteErrorAnalysis {
  const ctx = extractHttpFailureContext(errorOrContext);
  const status = ctx.status ?? null;
  const contractError = contractErrorResponse(ctx.rawBody);
  const contractCode = contractError?.details?.code;
  const violations = contractError?.details?.violations ?? [];
  const offerIds = contractError?.details?.offerIds ?? [];

  if (
    ctx.isMalformedWrite2xx ||
    (status !== null && status >= 200 && status < 300)
  ) {
    return {
      kind: "uncertain_write_response",
      status: status ?? 200,
      errorCode: "INVALID_WRITE_2XX_RESPONSE",
      message:
        ctx.message ??
        "La respuesta del servidor es inválida, pero el cambio pudo haberse aplicado. Recarga el recurso antes de continuar.",
      requiresResourceReload: true,
      preserveEditableDraft: true,
      possibleWriteApplied: true,
      violations: [],
      offerIds: [],
    };
  }

  if (status === 412 || status === 428) {
    return {
      kind: "precondition_conflict",
      status,
      errorCode: status === 428 ? "PRECONDITION_REQUIRED" : "PRECONDITION_FAILED",
      message:
        contractError?.message ??
        "El recurso cambió en el servidor. Recarga la versión actual antes de volver a aplicar tus cambios.",
      requiresResourceReload: true,
      preserveEditableDraft: true,
      possibleWriteApplied: false,
      violations,
      offerIds,
    };
  }

  if (
    (status === 409 || status === 422) &&
    (offerIds.length > 0 ||
      contractCode === "RECIPE_IN_USE" ||
      contractCode === "RESOURCE_IN_USE" ||
      contractCode === "RECIPE_REFERENCED_BY_OFFER")
  ) {
    return {
      kind: "resource_in_use",
      status: status ?? 409,
      errorCode: contractCode ?? "RESOURCE_IN_USE",
      message:
        contractError?.message ??
        "No se puede eliminar la receta porque está referenciada por una oferta vigente.",
      requiresResourceReload: false,
      preserveEditableDraft: true,
      possibleWriteApplied: false,
      violations,
      offerIds,
    };
  }

  if (status === 403) {
    return {
      kind: "pre_commit_rejection",
      status: 403,
      errorCode: contractCode ?? "FORBIDDEN",
      message:
        contractError?.message ??
        ctx.message ??
        "No tienes permisos para modificar este recurso.",
      requiresResourceReload: false,
      preserveEditableDraft: true,
      possibleWriteApplied: false,
      violations,
      offerIds,
    };
  }

  if (status === 404) {
    return {
      kind: "pre_commit_rejection",
      status: 404,
      errorCode: contractCode ?? "NOT_FOUND",
      message:
        contractError?.message ??
        ctx.message ??
        "El recurso no fue encontrado.",
      requiresResourceReload: true,
      preserveEditableDraft: true,
      possibleWriteApplied: false,
      violations,
      offerIds,
    };
  }

  if (status === 422 || (status === 502 && contractError !== null)) {
    return {
      kind: "pre_commit_rejection",
      status,
      errorCode: contractError?.details?.code ?? `HTTP_${status}`,
      message:
        contractError?.message ?? ctx.message ?? "Revisa los datos enviados en la solicitud.",
      requiresResourceReload: false,
      preserveEditableDraft: true,
      possibleWriteApplied: false,
      violations,
      offerIds,
    };
  }

  return {
    kind: "uncertain_outcome",
    status,
    errorCode: ctx.isTimeout ? "REQUEST_TIMEOUT" : `HTTP_${status ?? "NETWORK"}`,
    message:
      contractError?.message ??
      ctx.message ??
      "No se pudo confirmar si el cambio se aplicó. Recarga el recurso antes de reintentar.",
    requiresResourceReload: true,
    preserveEditableDraft: true,
    possibleWriteApplied: true,
    violations,
    offerIds,
  };
}
