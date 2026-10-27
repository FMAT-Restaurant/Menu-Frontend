import { analyzeIdempotentAttemptError } from "../api/idempotencyResponse";
import {
  createControllableIndexedDbHarness,
  createIndexedDbPendingOperationStorage,
} from "../shared/pendingOperationStorage";
import {
  assertValidIdempotencyKey,
  buildFormDataFromSealedFile,
  buildOperationStorageKey,
  canManualRetryAttempt,
  createOperationAttemptController,
  createSealedAttempt,
  generateIdempotencyKey,
  getOrCreateTabId,
  getRemainingAttemptWindowMs,
  IDEMPOTENT_WINDOW_MS,
  isAttemptWindowExpired,
  isUuidV4,
  OperationRetryBlockedError,
  PRE_SEND_STORAGE_ERROR_MESSAGE,
  PreSendStorageError,
  sealJsonPayload,
  sealMultipartFilePayload,
  type OperationFlowScope,
} from "./operationAttempt";

const testScope: OperationFlowScope = {
  tabId: "83f34a6a-5611-41dd-b437-a9cb96d932c2",
  formKind: "entry-form",
  resourceKey: "entry-new",
};

describe("operationAttempt core primitives and controller", () => {
  test("generates and validates UUID v4 Idempotency-Key and storage keys", () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();
    expect(isUuidV4(key1)).toBe(true);
    expect(isUuidV4(key2)).toBe(true);
    expect(key1).not.toBe(key2);
    expect(assertValidIdempotencyKey(key1)).toBe(key1);
    expect(() => assertValidIdempotencyKey("no-es-uuid")).toThrow(
      "La clave de idempotencia no es un UUID v4 válido.",
    );

    expect(buildOperationStorageKey(testScope)).toBe(
      "83f34a6a-5611-41dd-b437-a9cb96d932c2::entry-form::entry-new",
    );
    expect(() =>
      buildOperationStorageKey({ tabId: "", formKind: "entry-form", resourceKey: "new" }),
    ).toThrow();

    const memorySession = new Map<string, string>();
    const storageMock = {
      getItem: (k: string) => memorySession.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memorySession.set(k, v);
      },
    };
    const tabId1 = getOrCreateTabId(storageMock);
    const tabId2 = getOrCreateTabId(storageMock);
    expect(isUuidV4(tabId1)).toBe(true);
    expect(tabId1).toBe(tabId2);
  });

  test("seals JSON deterministically and seals multipart File/Blob generating fresh FormData per send", () => {
    const sealedA = sealJsonPayload({ b: 2, a: 1, nested: { z: "ok", y: [3, 2, 1] } }, '"v1"');
    const sealedB = sealJsonPayload({ nested: { y: [3, 2, 1], z: "ok" }, a: 1, b: 2 }, '"v1"');
    expect(sealedA.serializedBody).toBe(sealedB.serializedBody);
    expect(sealedA.ifMatch).toBe('"v1"');
    expect(Object.isFrozen(sealedA.payloadSnapshot)).toBe(true);

    const blob = new Blob(["contenido-imagen"], { type: "image/webp" });
    const sealedFile = sealMultipartFilePayload(blob, "plato.webp");
    expect(sealedFile.kind).toBe("multipart-file");
    expect(sealedFile.fileName).toBe("plato.webp");
    expect(sealedFile.mimeType).toBe("image/webp");
    expect(sealedFile.byteSize).toBe(16);

    const formData1 = buildFormDataFromSealedFile(sealedFile);
    const formData2 = buildFormDataFromSealedFile(sealedFile);
    expect(formData1).not.toBe(formData2);
    const part1 = formData1.get("file");
    const part2 = formData2.get("file");
    expect(part1).toBeInstanceOf(Blob);
    expect(part2).toBeInstanceOf(Blob);
    if (part1 instanceof Blob && part2 instanceof Blob) {
      expect(part1.size).toBe(16);
      expect(part2.size).toBe(16);
      expect(part1.type).toBe("image/webp");
    }
  });

  test("blocks HTTP execution when IndexedDB persistence fails or aborts before first send", async () => {
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
    let httpCalls = 0;

    harness.setFailureConfig({ abortNextPutAfterRequestSuccess: true });

    const controller = createOperationAttemptController({
      scope: testScope,
      storage,
      initialDraft: { name: "Postres" },
      buildFinalStageInput: ({ draft, submittedDraftVersion, now }) => ({
        operationKind: "category.create",
        method: "POST",
        endpointPath: "/api/v1/menu/categories",
        payload: sealJsonPayload(draft),
        submittedDraftVersion,
        now,
      }),
      executeFinalStage: async () => {
        httpCalls += 1;
        return { id: "cat-1" };
      },
      classifyError: (err) => analyzeIdempotentAttemptError(err, "category.create"),
    });

    const submission = controller.submit();
    await expect(submission).rejects.toThrow(PreSendStorageError);
    await expect(submission).rejects.toThrow(PRE_SEND_STORAGE_ERROR_MESSAGE);
    expect(httpCalls).toBe(0);
  });

  test("deduplicates concurrent in-flight calls (1 HTTP request), performs 0 automatic retries, and preserves editableDraft separately from sealedAttempt", async () => {
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
    const now = 10_000;
    const sentRequests: Array<{ key: string; body: string }> = [];
    let shouldFailWithTimeout = true;

    const controller = createOperationAttemptController<{ name: string }, { id: string }>({
      scope: testScope,
      storage,
      initialDraft: { name: "Nombre Original" },
      now: () => now,
      buildFinalStageInput: ({ draft, submittedDraftVersion, now: ts }) => ({
        operationKind: "category.create",
        method: "POST",
        endpointPath: "/api/v1/menu/categories",
        payload: sealJsonPayload(draft),
        submittedDraftVersion,
        now: ts,
      }),
      executeFinalStage: async ({ attempt }) => {
        if (attempt.payload.kind === "json") {
          sentRequests.push({
            key: attempt.idempotencyKey,
            body: attempt.payload.serializedBody,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (shouldFailWithTimeout) {
          throw { isTimeout: true, message: "Timeout de red" };
        }
        return { id: "cat-created" };
      },
      classifyError: (err) => analyzeIdempotentAttemptError(err, "category.create"),
    });

    // Double-click while in flight must share the exact same promise and make 1 HTTP call
    const [res1, res2] = await Promise.all([controller.submit(), controller.submit()]);
    expect(res1.status).toBe("failed");
    expect(res2.status).toBe("failed");
    expect(sentRequests).toHaveLength(1);

    const originalKey = sentRequests[0].key;
    const originalBody = sentRequests[0].body;

    // User modifies the draft while the operation is pending retry
    await controller.updateEditableDraft({ name: "Nombre Editado Después" });
    expect(controller.hasDraftChangesSinceSubmission()).toBe(true);
    expect(controller.getRecord()?.editableDraft).toEqual({ name: "Nombre Editado Después" });

    // Simulate reload: detach current controller and restore in a fresh controller
    controller.detachForReload();
    const restoredController = createOperationAttemptController<{ name: string }, { id: string }>({
      scope: testScope,
      storage: createIndexedDbPendingOperationStorage({ idbFactory: harness.factory }),
      initialDraft: { name: "" },
      now: () => now,
      buildFinalStageInput: ({ draft, submittedDraftVersion, now: ts }) => ({
        operationKind: "category.create",
        method: "POST",
        endpointPath: "/api/v1/menu/categories",
        payload: sealJsonPayload(draft),
        submittedDraftVersion,
        now: ts,
      }),
      executeFinalStage: async ({ attempt }) => {
        if (attempt.payload.kind === "json") {
          sentRequests.push({
            key: attempt.idempotencyKey,
            body: attempt.payload.serializedBody,
          });
        }
        return { id: "cat-created" };
      },
      classifyError: (err) => analyzeIdempotentAttemptError(err, "category.create"),
    });

    const restoredRecord = await restoredController.restoreFromStorage();
    expect(restoredRecord?.editableDraft).toEqual({ name: "Nombre Editado Después" });
    expect(restoredController.hasDraftChangesSinceSubmission()).toBe(true);

    shouldFailWithTimeout = false;
    const retryResult = await restoredController.retryPending();
    expect(retryResult.status).toBe("succeeded");
    expect(sentRequests).toHaveLength(2);
    // Retry MUST send the original sealed payload and same Idempotency-Key, not the mutated draft
    expect(sentRequests[1]).toEqual({
      key: originalKey,
      body: originalBody,
    });
    expect(await storage.getRecord(testScope)).toBeNull();
  });

  test("executes two-stage image.upload -> entry.create chain and retries only stage 2 when stage 2 fails", async () => {
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
    let now = 50_000;
    const uploadKeys: string[] = [];
    const entryRequests: Array<{ key: string; body: string }> = [];
    let failEntryCreateOnce = true;

    const controller = createOperationAttemptController<
      { brandName: string },
      { id: string; imageRef?: string }
    >({
      scope: testScope,
      storage,
      initialDraft: { brandName: "Ramen Especial" },
      now: () => now,
      stage1ImageUpload: {
        file: new Blob(["img-bytes"], { type: "image/png" }),
        fileName: "ramen.png",
        executeUpload: async (attempt) => {
          uploadKeys.push(attempt.idempotencyKey);
          return { id: "img-uploaded-99" };
        },
      },
      buildFinalStageInput: ({ draft, confirmedImageId, submittedDraftVersion, now: ts }) => ({
        operationKind: "entry.create",
        method: "POST",
        endpointPath: "/api/v1/menu/entries",
        payload: sealJsonPayload({
          brandName: draft.brandName,
          imageId: confirmedImageId,
        }),
        submittedDraftVersion,
        now: ts,
      }),
      executeFinalStage: async ({ attempt, confirmedImageId }) => {
        if (attempt.payload.kind === "json") {
          entryRequests.push({
            key: attempt.idempotencyKey,
            body: attempt.payload.serializedBody,
          });
        }
        if (failEntryCreateOnce) {
          failEntryCreateOnce = false;
          throw {
            status: 409,
            headers: { "Retry-After": "4" },
            rawBody: {
              error: {
                message: "En progreso",
                details: { code: "IDEMPOTENCY_IN_PROGRESS" },
              },
            },
          };
        }
        return { id: "entry-99", imageRef: confirmedImageId ?? undefined };
      },
      classifyError: (err, attempt) => analyzeIdempotentAttemptError(err, attempt.operationKind),
    });

    const firstAttemptResult = await controller.submit();
    expect(firstAttemptResult.status).toBe("failed");
    expect(firstAttemptResult.record.confirmedImageId).toBe("img-uploaded-99");
    expect(firstAttemptResult.record.currentStageIndex).toBe(1);
    expect(uploadKeys).toHaveLength(1);
    expect(entryRequests).toHaveLength(1);

    // Retry before Retry-After (4s = 4000ms) must be blocked without making any HTTP call
    now = 52_000;
    const blockedRetry = controller.retryPending();
    await expect(blockedRetry).rejects.toBeInstanceOf(
      OperationRetryBlockedError,
    );
    await expect(blockedRetry).rejects.toMatchObject({
      name: "OperationRetryBlockedError",
      code: "RETRY_AFTER_ACTIVE",
      remainingRetryAfterMs: 2000,
    });
    expect(uploadKeys).toHaveLength(1);
    expect(entryRequests).toHaveLength(1);

    // Advance clock past Retry-After window and retry: only stage 2 runs with the same key and imageId
    now = 54_500;
    const secondAttemptResult = await controller.retryPending();
    expect(secondAttemptResult.status).toBe("succeeded");
    expect(secondAttemptResult.result).toEqual({
      id: "entry-99",
      imageRef: "img-uploaded-99",
    });
    expect(uploadKeys).toHaveLength(1);
    expect(entryRequests).toHaveLength(2);
    expect(entryRequests[1]).toEqual(entryRequests[0]);
  });

  test("preserves confirmedImageId in memory if IndexedDB fails after stage 1 and preserves success if cleanup fails after stage 2", async () => {
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
    let uploadCount = 0;

    const controller = createOperationAttemptController<{ brandName: string }, { id: string }>({
      scope: testScope,
      storage,
      initialDraft: { brandName: "Gyoza" },
      stage1ImageUpload: {
        file: new Blob(["bytes"], { type: "image/png" }),
        fileName: "gyoza.png",
        executeUpload: async () => {
          uploadCount += 1;
          // Inject storage failure right after stage 1 completes
          harness.setFailureConfig({
            abortNextPutAfterRequestSuccess: true,
            abortNextDeleteAfterRequestSuccess: true,
          });
          return { id: "img-gyoza" };
        },
      },
      buildFinalStageInput: ({ draft, confirmedImageId, submittedDraftVersion, now }) => ({
        operationKind: "entry.create",
        method: "POST",
        endpointPath: "/api/v1/menu/entries",
        payload: sealJsonPayload({ brandName: draft.brandName, imageId: confirmedImageId }),
        submittedDraftVersion,
        now,
      }),
      executeFinalStage: async ({ confirmedImageId }) => {
        return { id: `created-with-${confirmedImageId}` };
      },
      classifyError: (err, attempt) => analyzeIdempotentAttemptError(err, attempt.operationKind),
    });

    const result = await controller.submit();
    expect(result.status).toBe("succeeded");
    expect(result.result).toEqual({ id: "created-with-img-gyoza" });
    expect(uploadCount).toBe(1);
    expect(result.record.postStage1StorageFailed).toBe(true);
    expect(result.record.postSuccessStorageCleanupFailed).toBe(true);
  });

  test("enforces 24h idempotency expiration window and requires explicit confirmation before creating a new attempt", async () => {
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
    let now = 1_000_000;

    const controller = createOperationAttemptController<{ name: string }, { id: string }>({
      scope: testScope,
      storage,
      initialDraft: { name: "Bebidas" },
      now: () => now,
      buildFinalStageInput: ({ draft, submittedDraftVersion, now: ts }) => ({
        operationKind: "category.create",
        method: "POST",
        endpointPath: "/api/v1/menu/categories",
        payload: sealJsonPayload(draft),
        submittedDraftVersion,
        now: ts,
      }),
      executeFinalStage: async () => {
        throw { isNetworkError: true, message: "Sin conexión" };
      },
      classifyError: (err) => analyzeIdempotentAttemptError(err, "category.create"),
    });

    await controller.submit();
    const firstKey = controller.getCurrentAttempt()?.idempotencyKey;
    expect(firstKey).toBeDefined();

    // Advance 24 hours + 1 ms
    now += IDEMPOTENT_WINDOW_MS + 1;
    expect(isAttemptWindowExpired(controller.getCurrentAttempt()!, now)).toBe(true);
    expect(getRemainingAttemptWindowMs(controller.getCurrentAttempt()!, now)).toBe(0);

    await expect(controller.retryPending()).rejects.toMatchObject({
      name: "OperationRetryBlockedError",
      code: "ATTEMPT_WINDOW_EXPIRED",
    });

    await expect(controller.startNewAttemptFromEditableDraft()).rejects.toMatchObject({
      code: "ATTEMPT_WINDOW_EXPIRED",
    });

    const newRecord = await controller.startNewAttemptFromEditableDraft({
      confirmExpiredWindow: true,
    });
    expect(newRecord.stages[0].idempotencyKey).not.toBe(firstKey);
    expect(newRecord.stages[0].status).toBe("sealed");

    await controller.abandonFlow();
    expect(controller.getRecord()).toBeNull();
    expect(await storage.getRecord(testScope)).toBeNull();
  });

  test("checks canManualRetryAttempt for all terminal and active statuses", () => {
    const base = createSealedAttempt({
      operationKind: "offer.patch",
      method: "PATCH",
      endpointPath: "/api/v1/menu/offers/offer-1",
      payload: sealJsonPayload({ basePrice: 100 }, '"v1"'),
      now: 1000,
    });

    expect(canManualRetryAttempt({ ...base, status: "in_flight" }, 1000)).toEqual({
      allowed: false,
      reason: "in_flight",
      remainingRetryAfterMs: 0,
    });
    expect(canManualRetryAttempt({ ...base, status: "succeeded" }, 1000)).toEqual({
      allowed: false,
      reason: "already_succeeded",
      remainingRetryAfterMs: 0,
    });
    expect(canManualRetryAttempt({ ...base, status: "requires_new_key" }, 1000)).toEqual({
      allowed: false,
      reason: "requires_new_key",
      remainingRetryAfterMs: 0,
    });
    expect(canManualRetryAttempt({ ...base, status: "precondition_conflict" }, 1000)).toEqual({
      allowed: false,
      reason: "precondition_conflict",
      remainingRetryAfterMs: 0,
    });
  });

  test("preserves confirmedImageId when starting a new attempt from edited draft after 422 or 412 in stage 2", async () => {
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
    let uploads = 0;
    const stage2Attempts: Array<{ key: string; ifMatch?: string; body: string }> = [];
    let nextFailureStatus: number | null = 422;

    const controller = createOperationAttemptController<
      { basePrice: number },
      { id: string }
    >({
      scope: testScope,
      storage,
      initialDraft: { basePrice: 100 },
      ifMatch: '"rev-1"',
      stage1ImageUpload: {
        file: new Blob(["img"], { type: "image/png" }),
        executeUpload: async () => {
          uploads += 1;
          return { id: "img-reused-77" };
        },
      },
      buildFinalStageInput: ({ draft, confirmedImageId, ifMatch, submittedDraftVersion, now }) => ({
        operationKind: "offer.patch",
        method: "PATCH",
        endpointPath: "/api/v1/menu/offers/offer-1",
        payload: sealJsonPayload(
          { basePrice: draft.basePrice, imageId: confirmedImageId },
          ifMatch ?? undefined,
        ),
        submittedDraftVersion,
        now,
      }),
      executeFinalStage: async ({ attempt }) => {
        if (attempt.payload.kind === "json") {
          stage2Attempts.push({
            key: attempt.idempotencyKey,
            ifMatch: attempt.payload.ifMatch,
            body: attempt.payload.serializedBody,
          });
        }
        if (nextFailureStatus !== null) {
          const statusToThrow = nextFailureStatus;
          nextFailureStatus = null;
          throw {
            status: statusToThrow,
            rawBody: { error: { message: `Fallo ${statusToThrow}` } },
          };
        }
        return { id: "offer-1" };
      },
      classifyError: (err, attempt) => analyzeIdempotentAttemptError(err, attempt.operationKind),
    });

    // 1. Fails with 422 in stage 2 after stage 1 uploaded image
    const first = await controller.submit();
    expect(first.status).toBe("failed");
    expect(first.record.confirmedImageId).toBe("img-reused-77");
    expect(uploads).toBe(1);

    // Retry with same key is blocked after 422 pre-commit rejection
    await expect(controller.retryPending()).rejects.toMatchObject({
      code: "REQUIRES_NEW_KEY",
    });

    // Fix draft and start new attempt: must reuse confirmedImageId and generate a new Idempotency-Key
    await controller.updateEditableDraft(
      { basePrice: 140 },
      { compositionIdentityMap: { s1: "slot-1" }, nestedContext: { step: 2 } },
    );
    await controller.startNewAttemptFromEditableDraft({ ifMatch: '"rev-2"' });

    nextFailureStatus = 412;
    const second = await controller.submit();
    expect(second.status).toBe("failed");
    expect(uploads).toBe(1);
    await expect(controller.retryPending()).rejects.toMatchObject({
      code: "PRECONDITION_CONFLICT",
    });

    // Reconcile ETag after 412 and succeed without re-uploading stage 1
    await controller.startNewAttemptFromEditableDraft({ ifMatch: '"rev-3"' });
    const third = await controller.submit();
    expect(third.status).toBe("succeeded");
    expect(uploads).toBe(1);
    expect(stage2Attempts).toHaveLength(3);
    expect(stage2Attempts[0].key).not.toBe(stage2Attempts[1].key);
    expect(stage2Attempts[1].key).not.toBe(stage2Attempts[2].key);
    expect(stage2Attempts[2].ifMatch).toBe('"rev-3"');
  });
});
