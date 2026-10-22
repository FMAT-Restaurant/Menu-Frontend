import { CatalogResponseError, categoryResponse } from "./catalogResponse";
import {
  analyzeIdempotentAttemptError,
  analyzeNonIdempotentWriteError,
  MalformedWriteResponseError,
  parseRetryAfterHeader,
  validateWriteSuccessResponse,
} from "./idempotencyResponse";

describe("idempotencyResponse", () => {
  describe("parseRetryAfterHeader", () => {
    test("accepts positive integer seconds", () => {
      expect(parseRetryAfterHeader("1")).toEqual({ valid: true, seconds: 1 });
      expect(parseRetryAfterHeader(" 15 ")).toEqual({ valid: true, seconds: 15 });
    });

    test.each([
      [undefined, "missing"],
      [null, "missing"],
      ["   ", "missing"],
      ["0", "non_positive"],
      ["-3", "non_positive"],
      ["abc", "non_numeric"],
      ["1.5", "non_numeric"],
      ["Wed, 21 Oct 2026 07:28:00 GMT", "non_numeric"],
    ] as const)("rejects %p with reason %s", (raw, expectedReason) => {
      expect(parseRetryAfterHeader(raw)).toEqual({
        valid: false,
        seconds: null,
        reason: expectedReason,
      });
    });
  });

  describe("analyzeIdempotentAttemptError", () => {
    test("handles 409 IDEMPOTENCY_IN_PROGRESS with valid positive Retry-After", () => {
      const analysis = analyzeIdempotentAttemptError(
        {
          status: 409,
          headers: { "Retry-After": "3" },
          rawBody: {
            error: {
              message: "La solicitud con esta clave de idempotencia sigue en proceso.",
              details: { code: "IDEMPOTENCY_IN_PROGRESS" },
            },
          },
        },
        "entry.create",
      );

      expect(analysis).toMatchObject({
        kind: "in_progress_conflict",
        status: 409,
        errorCode: "IDEMPOTENCY_IN_PROGRESS",
        retryAfterSeconds: 3,
        retryAfterInvalid: false,
        retryWithSameKey: true,
        allowNewAttemptWithNewKey: false,
        preserveEditableDraft: true,
      });
    });

    test.each([undefined, "0", "-2", "invalid"])(
      "handles 409 IDEMPOTENCY_IN_PROGRESS with missing or invalid Retry-After (%p) as controlled error without automatic retry loop",
      (retryAfterHeader) => {
        const analysis = analyzeIdempotentAttemptError(
          {
            status: 409,
            headers: retryAfterHeader !== undefined ? { "Retry-After": retryAfterHeader } : {},
            rawBody: {
              error: {
                message: "La solicitud sigue en proceso.",
                details: { code: "IDEMPOTENCY_IN_PROGRESS" },
              },
            },
          },
          "offer.create",
        );

        expect(analysis).toMatchObject({
          kind: "in_progress_conflict",
          status: 409,
          errorCode: "IDEMPOTENCY_IN_PROGRESS_INVALID_RETRY_AFTER",
          retryAfterSeconds: null,
          retryAfterInvalid: true,
          retryWithSameKey: true,
          allowNewAttemptWithNewKey: false,
          preserveEditableDraft: true,
        });
      },
    );

    test("handles 409 IDEMPOTENCY_KEY_REUSED and 400 INVALID_IDEMPOTENCY_KEY requiring a new key", () => {
      const reused = analyzeIdempotentAttemptError({
        status: 409,
        rawBody: {
          error: {
            message: "La clave ya está vinculada a una solicitud diferente.",
            details: { code: "IDEMPOTENCY_KEY_REUSED" },
          },
        },
      });
      expect(reused).toMatchObject({
        kind: "key_reused_conflict",
        status: 409,
        errorCode: "IDEMPOTENCY_KEY_REUSED",
        retryWithSameKey: false,
        allowNewAttemptWithNewKey: true,
        committed: false,
      });

      const invalidKey = analyzeIdempotentAttemptError({
        status: 400,
        rawBody: {
          error: {
            message: "Envía Idempotency-Key con un UUID válido.",
            details: { code: "INVALID_IDEMPOTENCY_KEY" },
          },
        },
      });
      expect(invalidKey).toMatchObject({
        kind: "invalid_key",
        status: 400,
        errorCode: "INVALID_IDEMPOTENCY_KEY",
        retryWithSameKey: false,
        allowNewAttemptWithNewKey: true,
        committed: false,
      });
    });

    test("handles 412 and 428 precondition conflicts requiring resource reload", () => {
      const conflict412 = analyzeIdempotentAttemptError(
        {
          status: 412,
          rawBody: {
            error: { message: "El recurso cambió desde que fue leído." },
          },
        },
        "offer.patch",
      );
      expect(conflict412).toMatchObject({
        kind: "precondition_conflict",
        status: 412,
        errorCode: "PRECONDITION_FAILED",
        requiresResourceReload: true,
        retryWithSameKey: false,
        allowNewAttemptWithNewKey: true,
        preserveEditableDraft: true,
      });

      const conflict428 = analyzeIdempotentAttemptError(
        {
          status: 428,
          rawBody: {
            error: { message: "Se requiere If-Match." },
          },
        },
        "offer.patch",
      );
      expect(conflict428).toMatchObject({
        kind: "precondition_conflict",
        status: 428,
        errorCode: "PRECONDITION_REQUIRED",
        requiresResourceReload: true,
      });
    });

    test("handles 422 validation errors and contractual 502 Inventory unavailability as confirmed pre-commit rejections", () => {
      const validation422 = analyzeIdempotentAttemptError(
        {
          status: 422,
          rawBody: {
            error: {
              message: "Revisa los datos enviados.",
              details: {
                violations: [{ path: "/name", message: "El nombre es obligatorio." }],
              },
            },
          },
        },
        "category.create",
      );
      expect(validation422).toMatchObject({
        kind: "pre_commit_rejection",
        status: 422,
        committed: false,
        retryWithSameKey: false,
        allowNewAttemptWithNewKey: true,
        violations: [{ path: "/name", message: "El nombre es obligatorio." }],
      });
      expect(validation422.message).toContain("El nombre es obligatorio.");

      const inventory502 = analyzeIdempotentAttemptError(
        {
          status: 502,
          rawBody: {
            error: {
              message: "No se pudo consultar Inventario; no se aplicaron cambios.",
            },
          },
        },
        "offer.create",
      );
      expect(inventory502).toMatchObject({
        kind: "pre_commit_rejection",
        status: 502,
        errorCode: "INVENTORY_VALIDATION_UNAVAILABLE",
        committed: false,
        retryWithSameKey: false,
        allowNewAttemptWithNewKey: true,
      });
    });

    test("handles timeout, network errors and generic 5xx as uncertain outcomes that must retry with the same key", () => {
      const timeoutResult = analyzeIdempotentAttemptError(
        {
          isTimeout: true,
          message: "Tiempo de espera agotado para POST /api/v1/menu/entries",
        },
        "entry.create",
      );
      expect(timeoutResult).toMatchObject({
        kind: "uncertain_outcome",
        errorCode: "REQUEST_TIMEOUT",
        retryWithSameKey: true,
        allowNewAttemptWithNewKey: false,
        possibleWriteApplied: true,
      });

      const networkResult = analyzeIdempotentAttemptError(
        new Error("Failed to fetch"),
        "category.create",
      );
      expect(networkResult).toMatchObject({
        kind: "uncertain_outcome",
        errorCode: "NETWORK_ERROR",
        retryWithSameKey: true,
      });

      const server503 = analyzeIdempotentAttemptError(
        {
          status: 503,
          rawBody: { error: { message: "Servicio temporalmente no disponible" } },
        },
        "recipe.create",
      );
      expect(server503).toMatchObject({
        kind: "uncertain_outcome",
        status: 503,
        errorCode: "HTTP_503",
        retryWithSameKey: true,
        allowNewAttemptWithNewKey: false,
      });

      const nonContractual502 = analyzeIdempotentAttemptError(
        {
          status: 502,
          rawBody: "<html>Bad Gateway</html>",
        },
        "image.upload",
      );
      expect(nonContractual502).toMatchObject({
        kind: "uncertain_outcome",
        status: 502,
        errorCode: "HTTP_502",
        retryWithSameKey: true,
      });
    });

    test("treats malformed 2xx write responses as uncertain write outcome with possibleWriteApplied warning", () => {
      expect(() => validateWriteSuccessResponse({ data: {} }, categoryResponse, 201)).toThrow(
        MalformedWriteResponseError,
      );

      let capturedError: unknown;
      try {
        validateWriteSuccessResponse({ data: {} }, categoryResponse, 201);
      } catch (err) {
        capturedError = err;
      }

      const analysis = analyzeIdempotentAttemptError(capturedError, "category.create");
      expect(analysis).toMatchObject({
        kind: "uncertain_write_response",
        status: 201,
        errorCode: "INVALID_WRITE_2XX_RESPONSE",
        possibleWriteApplied: true,
        retryWithSameKey: true,
        allowNewAttemptWithNewKey: false,
      });
    });
  });

  describe("analyzeNonIdempotentWriteError", () => {
    test("classifies 412, 409 resource in use, 422, malformed 2xx, and 500 on non-idempotent writes", () => {
      const conflict412 = analyzeNonIdempotentWriteError({
        status: 412,
        rawBody: { error: { message: "ETag obsoleto." } },
      });
      expect(conflict412).toMatchObject({
        kind: "precondition_conflict",
        requiresResourceReload: true,
        preserveEditableDraft: true,
      });

      const inUse409 = analyzeNonIdempotentWriteError({
        status: 409,
        rawBody: {
          error: {
            message: "No se puede eliminar la receta mientras una oferta la utilice.",
            details: { offerIds: ["offer-1", "offer-2"] },
          },
        },
      });
      expect(inUse409).toMatchObject({
        kind: "resource_in_use",
        offerIds: ["offer-1", "offer-2"],
      });

      const malformed200 = analyzeNonIdempotentWriteError(
        new CatalogResponseError("Respuesta de categoría inválida.", "categories"),
      );
      expect(malformed200).toMatchObject({
        kind: "uncertain_write_response",
        possibleWriteApplied: true,
        requiresResourceReload: true,
      });

      const rejected422 = analyzeNonIdempotentWriteError({
        status: 422,
        rawBody: { error: { message: "Nombre inválido." } },
      });
      expect(rejected422.kind).toBe("pre_commit_rejection");

      const uncertain500 = analyzeNonIdempotentWriteError({
        status: 500,
        message: "Internal Server Error",
      });
      expect(uncertain500).toMatchObject({
        kind: "uncertain_outcome",
        possibleWriteApplied: true,
        requiresResourceReload: true,
      });
    });
  });
});
