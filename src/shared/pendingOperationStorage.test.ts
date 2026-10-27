import {
  buildOperationStorageKey,
  createSealedAttempt,
  sealJsonPayload,
  sealMultipartFilePayload,
  type OperationFlowScope,
  type PendingOperationChainRecord,
} from "../application/operationAttempt";
import {
  createControllableIndexedDbHarness,
  createIndexedDbPendingOperationStorage,
  isPendingOperationChainRecord,
  PendingOperationStorageError,
} from "./pendingOperationStorage";

const baseScope: OperationFlowScope = {
  tabId: "83f34a6a-5611-41dd-b437-a9cb96d932c2",
  formKind: "entry-form",
  resourceKey: "new",
};

function createSampleRecord(
  scope: OperationFlowScope = baseScope,
): PendingOperationChainRecord<{ brandName: string }> {
  const storageKey = buildOperationStorageKey(scope);
  const stage1 = createSealedAttempt({
    operationKind: "image.upload",
    method: "POST",
    endpointPath: "/api/v1/media/images",
    payload: sealMultipartFilePayload(
      new Blob(["png-bytes"], { type: "image/png" }),
      "foto.png",
    ),
    idempotencyKey: "11111111-2222-4333-8444-555555555555",
    now: 1000,
  });
  const stage2 = createSealedAttempt({
    operationKind: "entry.create",
    method: "POST",
    endpointPath: "/api/v1/menu/entries",
    payload: sealJsonPayload({ brandName: "Taco", status: "ACTIVE", categoryIds: ["c1"] }),
    idempotencyKey: "22222222-3333-4444-9555-666666666666",
    now: 1005,
  });
  return {
    storageKey,
    scope,
    createdAt: 1000,
    updatedAt: 1005,
    currentStageIndex: 1,
    stages: [stage1, stage2],
    confirmedImageId: "img-confirmed-1",
    ifMatch: '"rev-1"',
    editableDraft: { brandName: "Taco editado" },
    submittedDraftVersion: 1,
    currentDraftVersion: 2,
    compositionIdentityMap: { "slot-temp-1": "slot-uuid-1" },
    nestedContext: { inlineCategoryPending: false },
  };
}

describe("pendingOperationStorage (IndexedDB adapter)", () => {
  test("a receipt deletes only its unchanged confirmed final attempt and preserves a replacement chain", async () => {
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
    const sample = createSampleRecord();
    const confirmed = { ...sample, currentDraftVersion: sample.submittedDraftVersion, confirmedResult: { id: "entry-1" },
      stages: sample.stages.map(stage => ({ ...stage, status: "succeeded" as const })) };
    const finalId = confirmed.stages[1].attemptId;
    await storage.saveRecord(confirmed);
    expect(await storage.deleteRecordIfAttemptMatches!(sample.storageKey, "old-receipt")).toBe(false);
    expect(await storage.getRecord(sample.storageKey)).not.toBeNull();
    await storage.saveRecord({ ...confirmed, currentDraftVersion: confirmed.submittedDraftVersion + 1 });
    expect(await storage.deleteRecordIfAttemptMatches!(sample.storageKey, finalId)).toBe(false);
    await storage.saveRecord({ ...confirmed, stages: [...confirmed.stages.slice(0, 1), { ...confirmed.stages[1], status: "uncertain" }] });
    expect(await storage.deleteRecordIfAttemptMatches!(sample.storageKey, finalId)).toBe(false);
    await storage.saveRecord(confirmed);
    harness.setFailureConfig({ abortNextDeleteAfterRequestSuccess: true });
    await expect(storage.deleteRecordIfAttemptMatches!(sample.storageKey, finalId)).rejects.toMatchObject({ code: "IDB_TRANSACTION_FAILED" });
    expect(await storage.getRecord(sample.storageKey)).not.toBeNull();
    expect(await storage.deleteRecordIfAttemptMatches!(sample.storageKey, finalId)).toBe(true);
    expect(await storage.getRecord(sample.storageKey)).toBeNull();
    await storage.saveRecord({ ...confirmed, stages: [...confirmed.stages.slice(0, 1), { ...confirmed.stages[1], attemptId: "33333333-4444-4555-8666-777777777777" }] });
    expect(await storage.deleteRecordIfAttemptMatches!(sample.storageKey, finalId)).toBe(false);
    expect((await storage.getRecord(sample.storageKey))?.stages[1].attemptId).toBe("33333333-4444-4555-8666-777777777777");
  });

  test("persists and recovers JSON, Blob, confirmedImageId, ifMatch, editableDraft, compositionIdentityMap and nestedContext only on transaction.oncomplete", async () => {
    const harness = createControllableIndexedDbHarness();
    const storage1 = createIndexedDbPendingOperationStorage({
      idbFactory: harness.factory,
    });
    const record = createSampleRecord();

    await storage1.saveRecord(record);

    // Simulate reload by instantiating a fresh storage adapter against the same IndexedDB factory
    const storageAfterReload = createIndexedDbPendingOperationStorage({
      idbFactory: harness.factory,
    });
    const restored = await storageAfterReload.getRecord<{ brandName: string }>(baseScope);

    expect(restored).not.toBeNull();
    expect(restored?.storageKey).toBe(record.storageKey);
    expect(restored?.confirmedImageId).toBe("img-confirmed-1");
    expect(restored?.ifMatch).toBe('"rev-1"');
    expect(restored?.editableDraft).toEqual({ brandName: "Taco editado" });
    expect(restored?.compositionIdentityMap).toEqual({ "slot-temp-1": "slot-uuid-1" });
    expect(restored?.nestedContext).toEqual({ inlineCategoryPending: false });
    expect(restored?.stages).toHaveLength(2);

    const uploadPayload = restored?.stages[0].payload;
    expect(uploadPayload?.kind).toBe("multipart-file");
    if (uploadPayload?.kind === "multipart-file") {
      expect(uploadPayload.fileBlob).toBeInstanceOf(Blob);
      expect(uploadPayload.fileName).toBe("foto.png");
      expect(uploadPayload.mimeType).toBe("image/png");
      expect(uploadPayload.byteSize).toBe(9);
    }
  });

  test("rejects when put.onsuccess is followed by transaction.onabort and does not commit the record", async () => {
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({
      idbFactory: harness.factory,
    });
    const record = createSampleRecord();

    harness.setFailureConfig({ abortNextPutAfterRequestSuccess: true });

    await expect(storage.saveRecord(record)).rejects.toMatchObject({
      name: "PendingOperationStorageError",
      code: "IDB_TRANSACTION_ABORTED",
    });

    const afterAbort = await storage.getRecord(baseScope);
    expect(afterAbort).toBeNull();
  });

  test("rejects on putRequest.onerror, transaction.onerror (quota exceeded), open failure and unavailable IndexedDB", async () => {
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({
      idbFactory: harness.factory,
    });
    const record = createSampleRecord();

    harness.setFailureConfig({ failNextPutRequest: true });
    await expect(storage.saveRecord(record)).rejects.toMatchObject({
      code: "IDB_REQUEST_FAILED",
    });

    harness.setFailureConfig({ failNextTransactionError: true });
    await expect(storage.saveRecord(record)).rejects.toMatchObject({
      code: "IDB_TRANSACTION_FAILED",
    });

    harness.setFailureConfig({ failNextOpen: true });
    await expect(storage.saveRecord(record)).rejects.toMatchObject({
      code: "IDB_OPEN_FAILED",
    });

    const unavailableStorage = createIndexedDbPendingOperationStorage({
      idbFactory: null,
    });
    await expect(unavailableStorage.saveRecord(record)).rejects.toMatchObject({
      code: "IDB_UNAVAILABLE",
    });
  });

  test("lists records filtered by tabId and deletes records only after transaction.oncomplete", async () => {
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({
      idbFactory: harness.factory,
    });

    const recTabA1 = createSampleRecord({
      tabId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      formKind: "entry-form",
      resourceKey: "entry-1",
    });
    const recTabA2 = createSampleRecord({
      tabId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      formKind: "offer-form",
      resourceKey: "offer-1",
    });
    const recTabB = createSampleRecord({
      tabId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      formKind: "category-form",
      resourceKey: "new",
    });

    await storage.saveRecord(recTabA1);
    await storage.saveRecord(recTabA2);
    await storage.saveRecord(recTabB);

    const tabARecords = await storage.listByTab("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(tabARecords).toHaveLength(2);
    expect(await storage.listByTab("   ")).toEqual([]);

    harness.setFailureConfig({ abortNextDeleteAfterRequestSuccess: true });
    await expect(storage.deleteRecord(recTabA1.scope)).rejects.toMatchObject({
      code: "IDB_TRANSACTION_ABORTED",
    });
    expect(await storage.getRecord(recTabA1.scope)).not.toBeNull();

    await storage.deleteRecord(recTabA1.scope);
    expect(await storage.getRecord(recTabA1.scope)).toBeNull();
  });

  test("rejects corrupted records and getRequest errors", async () => {
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({
      idbFactory: harness.factory,
    });
    const key = buildOperationStorageKey(baseScope);

    harness.setRawRecord(key, { corrupted: true });
    await expect(storage.getRecord(baseScope)).rejects.toBeInstanceOf(
      PendingOperationStorageError,
    );

    harness.setFailureConfig({ failNextGetRequest: true });
    await expect(storage.getRecord(baseScope)).rejects.toMatchObject({
      code: "IDB_REQUEST_FAILED",
    });

    await expect(storage.getRecord("   ")).rejects.toThrow(
      "La clave de almacenamiento no puede estar vacía.",
    );

    const sample = createSampleRecord();
    expect(isPendingOperationChainRecord(null)).toBe(false);
    expect(
      isPendingOperationChainRecord({ ...sample, compositionIdentityMap: { a: 123 } }),
    ).toBe(false);
    expect(
      isPendingOperationChainRecord({ ...sample, nestedContext: "invalid" }),
    ).toBe(false);
    expect(
      isPendingOperationChainRecord(sample, (d): d is { brandName: string } => {
        return typeof d === "object" && d !== null && "brandName" in d;
      }),
    ).toBe(true);
    expect(
      isPendingOperationChainRecord(
        sample,
        (d): d is { brandName: string } => typeof d === "string" && false,
      ),
    ).toBe(false);
  });

  test("uses globalThis.indexedDB through native wrapper when idbFactory option is omitted", async () => {
    const harness = createControllableIndexedDbHarness();
    const originalIdb = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
    Object.defineProperty(globalThis, "indexedDB", {
      value: harness.factory,
      configurable: true,
      writable: true,
    });

    try {
      const storage = createIndexedDbPendingOperationStorage();
      const record = createSampleRecord();
      await storage.saveRecord(record);
      expect(harness.inspectRawStore().size).toBe(1);

      const loaded = await storage.getRecord(record.storageKey);
      expect(loaded?.storageKey).toBe(record.storageKey);

      const listed = await storage.listByTab(record.scope.tabId);
      expect(listed).toHaveLength(1);

      await storage.deleteRecord(record.storageKey);
      expect(await storage.getRecord(record.storageKey)).toBeNull();
    } finally {
      if (originalIdb) {
        Object.defineProperty(globalThis, "indexedDB", originalIdb);
      } else {
        Reflect.deleteProperty(globalThis, "indexedDB");
      }
    }
  });
});
