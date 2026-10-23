export const IDEMPOTENT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const PRE_SEND_STORAGE_ERROR_MESSAGE = "No se pudo enviar. Vuelve a intentarlo.";

export type IdempotentOperationKind =
  | "category.create"
  | "recipe.create"
  | "image.upload"
  | "entry.create"
  | "offer.create"
  | "offer.patch";

export type OperationFormKind =
  | "category-form"
  | "recipe-form"
  | "entry-form"
  | "offer-form"
  | (string & {});

export interface OperationFlowScope {
  readonly tabId: string;
  readonly formKind: OperationFormKind;
  readonly resourceKey: string;
}

export interface SealedJsonPayload {
  readonly kind: "json";
  readonly serializedBody: string;
  readonly payloadSnapshot: unknown;
  readonly ifMatch?: string;
}

export interface SealedMultipartFilePayload {
  readonly kind: "multipart-file";
  readonly fileBlob: Blob;
  readonly fileName: string;
  readonly mimeType: string;
  readonly byteSize: number;
}

export type SealedOperationPayload = SealedJsonPayload | SealedMultipartFilePayload;

export type OperationAttemptStatus =
  | "sealed"
  | "in_flight"
  | "pending_retry"
  | "uncertain"
  | "conflict_in_progress"
  | "requires_new_key"
  | "precondition_conflict"
  | "pre_commit_rejected"
  | "expired"
  | "succeeded";

export interface SealedOperationAttempt {
  readonly attemptId: string;
  readonly operationKind: IdempotentOperationKind;
  readonly method: "POST" | "PATCH";
  readonly endpointPath: string;
  readonly idempotencyKey: string;
  readonly payload: SealedOperationPayload;
  readonly createdAt: number;
  readonly firstSentAt: number | null;
  readonly firstConfirmedAt: number | null;
  readonly lastAttemptAt: number | null;
  readonly attemptCount: number;
  readonly status: OperationAttemptStatus;
  readonly submittedDraftVersion: number;
  readonly retryAfterSeconds: number | null;
  readonly retryAfterUntil: number | null;
  readonly retryAfterInvalid: boolean;
  readonly possibleWriteApplied: boolean;
  readonly lastErrorCode: string | null;
  readonly lastErrorMessage: string | null;
}

export interface PendingOperationChainRecord<TDraft = unknown> {
  readonly storageKey: string;
  readonly scope: OperationFlowScope;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly currentStageIndex: number;
  readonly stages: readonly SealedOperationAttempt[];
  readonly confirmedImageId: string | null;
  readonly ifMatch: string | null;
  readonly editableDraft: TDraft;
  readonly submittedDraft?: TDraft;
  readonly confirmedResult?: unknown;
  readonly submittedDraftVersion: number;
  readonly currentDraftVersion: number;
  readonly compositionIdentityMap?: Readonly<Record<string, string>>;
  readonly nestedContext?: Readonly<Record<string, unknown>>;
  readonly postStage1StorageFailed?: boolean;
  readonly postSuccessStorageCleanupFailed?: boolean;
}

export interface PendingOperationStorageAdapter {
  saveRecord<TDraft = unknown>(record: PendingOperationChainRecord<TDraft>): Promise<void>;
  getRecord<TDraft = unknown>(
    scopeOrKey: OperationFlowScope | string,
  ): Promise<PendingOperationChainRecord<TDraft> | null>;
  deleteRecord(scopeOrKey: OperationFlowScope | string): Promise<void>;
  listByTab(tabId: string): Promise<PendingOperationChainRecord[]>;
}

export class PreSendStorageError extends Error {
  readonly code = "PRE_SEND_STORAGE_FAILURE" as const;
  readonly causeError?: unknown;

  constructor(message = PRE_SEND_STORAGE_ERROR_MESSAGE, causeError?: unknown) {
    super(message);
    this.name = "PreSendStorageError";
    this.causeError = causeError;
  }
}

export class OperationRetryBlockedError extends Error {
  readonly code:
    | "RETRY_IN_FLIGHT"
    | "RETRY_AFTER_ACTIVE"
    | "RETRY_AFTER_INVALID"
    | "ATTEMPT_WINDOW_EXPIRED"
    | "REQUIRES_NEW_KEY"
    | "PRECONDITION_CONFLICT"
    | "ALREADY_SUCCEEDED";
  readonly remainingRetryAfterMs: number;

  constructor(
    code:
      | "RETRY_IN_FLIGHT"
      | "RETRY_AFTER_ACTIVE"
      | "RETRY_AFTER_INVALID"
      | "ATTEMPT_WINDOW_EXPIRED"
      | "REQUIRES_NEW_KEY"
      | "PRECONDITION_CONFLICT"
      | "ALREADY_SUCCEEDED",
    message: string,
    remainingRetryAfterMs = 0,
  ) {
    super(message);
    this.name = "OperationRetryBlockedError";
    this.code = code;
    this.remainingRetryAfterMs = remainingRetryAfterMs;
  }
}

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidV4(value: unknown): value is string {
  return typeof value === "string" && UUID_V4_PATTERN.test(value);
}

function byteToHex(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    const candidate = crypto.randomUUID();
    if (isUuidV4(candidate)) {
      return candidate.toLowerCase();
    }
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byteToHex);
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export function assertValidIdempotencyKey(value: unknown): string {
  if (!isUuidV4(value)) {
    throw new Error("La clave de idempotencia no es un UUID v4 válido.");
  }
  return value;
}

export function buildOperationStorageKey(scope: OperationFlowScope): string {
  const tabId = scope.tabId.trim();
  const formKind = scope.formKind.trim();
  const resourceKey = scope.resourceKey.trim();
  if (!tabId || !formKind || !resourceKey) {
    throw new Error("El alcance de la operación requiere tabId, formKind y resourceKey no vacíos.");
  }
  return `${tabId}::${formKind}::${resourceKey}`;
}

const TAB_ID_STORAGE_KEY = "menu.operationAttempt.tabId";

export function getOrCreateTabId(
  storage?: Pick<Storage, "getItem" | "setItem"> | null,
): string {
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== "undefined" && window.sessionStorage
        ? window.sessionStorage
        : null;

  if (targetStorage) {
    try {
      const existing = targetStorage.getItem(TAB_ID_STORAGE_KEY);
      if (isUuidV4(existing)) {
        return existing;
      }
      const created = generateIdempotencyKey();
      targetStorage.setItem(TAB_ID_STORAGE_KEY, created);
      return created;
    } catch {
      return generateIdempotencyKey();
    }
  }
  return generateIdempotencyKey();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function equalDraft(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Blob || b instanceof Blob) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => equalDraft(value, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every(key => equalDraft(a[key], b[key]));
  }
  return false;
}

function snapshotDraft<T>(draft: T): T {
  if (draft instanceof Blob) return draft;
  if (Array.isArray(draft)) return Object.freeze(draft.map(snapshotDraft)) as T;
  if (isPlainObject(draft)) {
    return Object.freeze(Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, snapshotDraft(value)]))) as T;
  }
  return draft;
}

export function canonicalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const clonedArray = value.map((item) => canonicalizeJsonValue(item));
    return Object.freeze(clonedArray);
  }
  if (isPlainObject(value)) {
    const sortedKeys = Object.keys(value).sort();
    const clonedRecord: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      const propValue = value[key];
      if (propValue !== undefined) {
        clonedRecord[key] = canonicalizeJsonValue(propValue);
      }
    }
    return Object.freeze(clonedRecord);
  }
  return value;
}

export function sealJsonPayload(payload: unknown, ifMatch?: string): SealedJsonPayload {
  const canonicalSnapshot = canonicalizeJsonValue(payload);
  const serializedBody = JSON.stringify(canonicalSnapshot);
  return Object.freeze({
    kind: "json",
    serializedBody,
    payloadSnapshot: canonicalSnapshot,
    ...(ifMatch !== undefined ? { ifMatch } : {}),
  });
}

function resolveFileName(file: Blob): string {
  if ("name" in file && typeof file.name === "string" && file.name.trim().length > 0) {
    return file.name.trim();
  }
  return "upload.bin";
}

export function sealMultipartFilePayload(
  file: Blob,
  explicitFileName?: string,
): SealedMultipartFilePayload {
  const fileName =
    typeof explicitFileName === "string" && explicitFileName.trim().length > 0
      ? explicitFileName.trim()
      : resolveFileName(file);
  const mimeType = file.type || "application/octet-stream";
  const clonedBlob = file.slice(0, file.size, mimeType);
  return Object.freeze({
    kind: "multipart-file",
    fileBlob: clonedBlob,
    fileName,
    mimeType,
    byteSize: clonedBlob.size,
  });
}

export function buildFormDataFromSealedFile(
  payload: SealedMultipartFilePayload,
  fieldName = "file",
): FormData {
  const formData = new FormData();
  formData.append(fieldName, payload.fileBlob, payload.fileName);
  return formData;
}

export interface CreateSealedAttemptInput {
  readonly operationKind: IdempotentOperationKind;
  readonly method: "POST" | "PATCH";
  readonly endpointPath: string;
  readonly payload: SealedOperationPayload;
  readonly idempotencyKey?: string;
  readonly submittedDraftVersion?: number;
  readonly now?: number;
}

export function createSealedAttempt(input: CreateSealedAttemptInput): SealedOperationAttempt {
  const idempotencyKey =
    input.idempotencyKey !== undefined
      ? assertValidIdempotencyKey(input.idempotencyKey)
      : generateIdempotencyKey();
  const now = input.now ?? Date.now();
  return Object.freeze({
    attemptId: generateIdempotencyKey(),
    operationKind: input.operationKind,
    method: input.method,
    endpointPath: input.endpointPath,
    idempotencyKey,
    payload: input.payload,
    createdAt: now,
    firstSentAt: null,
    firstConfirmedAt: null,
    lastAttemptAt: null,
    attemptCount: 0,
    status: "sealed",
    submittedDraftVersion: input.submittedDraftVersion ?? 1,
    retryAfterSeconds: null,
    retryAfterUntil: null,
    retryAfterInvalid: false,
    possibleWriteApplied: false,
    lastErrorCode: null,
    lastErrorMessage: null,
  });
}

export function getAttemptWindowAnchor(
  attempt: Pick<SealedOperationAttempt, "firstSentAt" | "firstConfirmedAt">,
): number | null {
  if (attempt.firstConfirmedAt !== null) {
    return attempt.firstConfirmedAt;
  }
  return attempt.firstSentAt;
}

export function isAttemptWindowExpired(
  attempt: Pick<SealedOperationAttempt, "firstSentAt" | "firstConfirmedAt">,
  now = Date.now(),
): boolean {
  const anchor = getAttemptWindowAnchor(attempt);
  if (anchor === null) {
    return false;
  }
  return now - anchor >= IDEMPOTENT_WINDOW_MS;
}

export function getRemainingAttemptWindowMs(
  attempt: Pick<SealedOperationAttempt, "firstSentAt" | "firstConfirmedAt">,
  now = Date.now(),
): number | null {
  const anchor = getAttemptWindowAnchor(attempt);
  if (anchor === null) {
    return null;
  }
  return Math.max(0, IDEMPOTENT_WINDOW_MS - (now - anchor));
}

export interface ManualRetryEligibility {
  readonly allowed: boolean;
  readonly reason?:
    | "in_flight"
    | "retry_after_active"
    | "retry_after_invalid"
    | "window_expired"
    | "requires_new_key"
    | "precondition_conflict"
    | "already_succeeded";
  readonly remainingRetryAfterMs: number;
}

export function canManualRetryAttempt(
  attempt: SealedOperationAttempt,
  now = Date.now(),
): ManualRetryEligibility {
  if (attempt.status === "in_flight") {
    return { allowed: false, reason: "in_flight", remainingRetryAfterMs: 0 };
  }
  if (attempt.status === "succeeded") {
    return { allowed: false, reason: "already_succeeded", remainingRetryAfterMs: 0 };
  }
  if (attempt.status === "requires_new_key" || attempt.status === "pre_commit_rejected") {
    return { allowed: false, reason: "requires_new_key", remainingRetryAfterMs: 0 };
  }
  if (attempt.status === "precondition_conflict") {
    return { allowed: false, reason: "precondition_conflict", remainingRetryAfterMs: 0 };
  }
  if (attempt.status === "expired" || isAttemptWindowExpired(attempt, now)) {
    return { allowed: false, reason: "window_expired", remainingRetryAfterMs: 0 };
  }
  if (attempt.retryAfterInvalid) {
    return { allowed: false, reason: "retry_after_invalid", remainingRetryAfterMs: 0 };
  }
  if (attempt.retryAfterUntil !== null && now < attempt.retryAfterUntil) {
    return {
      allowed: false,
      reason: "retry_after_active",
      remainingRetryAfterMs: attempt.retryAfterUntil - now,
    };
  }
  return { allowed: true, remainingRetryAfterMs: 0 };
}

export interface AttemptFailureOutcome {
  readonly kind:
    | "in_progress_conflict"
    | "key_reused_conflict"
    | "invalid_key"
    | "precondition_conflict"
    | "pre_commit_rejection"
    | "uncertain_outcome"
    | "uncertain_write_response";
  readonly message: string;
  readonly errorCode?: string;
  readonly retryAfterSeconds?: number | null;
  readonly retryAfterInvalid?: boolean;
  readonly possibleWriteApplied?: boolean;
}

export function applyAttemptSendStart(
  attempt: SealedOperationAttempt,
  now = Date.now(),
): SealedOperationAttempt {
  return Object.freeze({
    ...attempt,
    firstSentAt: attempt.firstSentAt ?? now,
    lastAttemptAt: now,
    attemptCount: attempt.attemptCount + 1,
    status: "in_flight",
  });
}

export function applyAttemptSuccess(
  attempt: SealedOperationAttempt,
  now = Date.now(),
): SealedOperationAttempt {
  return Object.freeze({
    ...attempt,
    firstSentAt: attempt.firstSentAt ?? now,
    firstConfirmedAt: attempt.firstConfirmedAt ?? now,
    status: "succeeded",
    retryAfterSeconds: null,
    retryAfterUntil: null,
    retryAfterInvalid: false,
    possibleWriteApplied: false,
    lastErrorCode: null,
    lastErrorMessage: null,
  });
}

export function applyAttemptFailure(
  attempt: SealedOperationAttempt,
  outcome: AttemptFailureOutcome,
  now = Date.now(),
): SealedOperationAttempt {
  let nextStatus: OperationAttemptStatus;
  let retryAfterSeconds: number | null = null;
  let retryAfterUntil: number | null = null;
  let retryAfterInvalid = false;
  let possibleWriteApplied = Boolean(outcome.possibleWriteApplied);

  if (outcome.kind === "in_progress_conflict") {
    nextStatus = "conflict_in_progress";
    if (
      typeof outcome.retryAfterSeconds === "number" &&
      Number.isSafeInteger(outcome.retryAfterSeconds) &&
      outcome.retryAfterSeconds >= 1
    ) {
      retryAfterSeconds = outcome.retryAfterSeconds;
      retryAfterUntil = now + outcome.retryAfterSeconds * 1000;
      retryAfterInvalid = false;
    } else {
      retryAfterSeconds = null;
      retryAfterUntil = null;
      retryAfterInvalid = true;
    }
  } else if (outcome.kind === "key_reused_conflict" || outcome.kind === "invalid_key") {
    nextStatus = "requires_new_key";
  } else if (outcome.kind === "precondition_conflict") {
    nextStatus = "precondition_conflict";
  } else if (outcome.kind === "pre_commit_rejection") {
    nextStatus = "pre_commit_rejected";
  } else if (outcome.kind === "uncertain_write_response") {
    nextStatus = "uncertain";
    possibleWriteApplied = true;
  } else {
    nextStatus = "uncertain";
  }

  return Object.freeze({
    ...attempt,
    firstSentAt: attempt.firstSentAt ?? now,
    status: nextStatus,
    retryAfterSeconds,
    retryAfterUntil,
    retryAfterInvalid,
    possibleWriteApplied,
    lastErrorCode: outcome.errorCode ?? outcome.kind,
    lastErrorMessage: outcome.message,
  });
}

export function markAttemptExpired(attempt: SealedOperationAttempt): SealedOperationAttempt {
  return Object.freeze({
    ...attempt,
    status: "expired",
    lastErrorCode: "ATTEMPT_WINDOW_EXPIRED",
    lastErrorMessage:
      "La ventana de recuperación de 24 horas expiró. Confirma explícitamente antes de iniciar un nuevo intento.",
  });
}

export interface StageExecutionContext {
  readonly attempt: SealedOperationAttempt;
  readonly confirmedImageId: string | null;
  readonly ifMatch: string | null;
}

export interface SingleOrTwoStageFlowConfig<TDraft, TResult> {
  readonly scope: OperationFlowScope;
  readonly storage: PendingOperationStorageAdapter;
  readonly initialDraft: TDraft;
  readonly ifMatch?: string | null;
  readonly compositionIdentityMap?: Readonly<Record<string, string>>;
  readonly nestedContext?: Readonly<Record<string, unknown>>;
  readonly now?: () => number;
  /** Retain confirmed writes until the consumer durably reconciles its editable draft. */
  readonly retainConfirmedResult?: boolean;
  readonly executeImageUpload?: (attempt: SealedOperationAttempt) => Promise<{ id: string }>;
  readonly getImageFile?: () => File | null;
  readonly stage1ImageUpload?: {
    readonly endpointPath?: string;
    readonly file: Blob;
    readonly fileName?: string;
    readonly executeUpload: (attempt: SealedOperationAttempt) => Promise<{ id: string }>;
  };
  readonly buildFinalStageInput: (context: {
    readonly draft: TDraft;
    readonly confirmedImageId: string | null;
    readonly ifMatch: string | null;
    readonly submittedDraftVersion: number;
    readonly now: number;
  }) => CreateSealedAttemptInput;
  readonly executeFinalStage: (context: StageExecutionContext) => Promise<TResult>;
  readonly classifyError: (
    error: unknown,
    attempt: SealedOperationAttempt,
  ) => AttemptFailureOutcome;
}

export interface OperationExecutionResult<TDraft, TResult> {
  readonly status: "succeeded" | "failed";
  readonly result?: TResult;
  readonly outcome?: AttemptFailureOutcome;
  readonly record: PendingOperationChainRecord<TDraft>;
  readonly hasDraftChangesSinceSubmission: boolean;
}

export interface OperationAttemptController<TDraft, TResult> {
  getRecord(): PendingOperationChainRecord<TDraft> | null;
  getCurrentAttempt(): SealedOperationAttempt | null;
  hasDraftChangesSinceSubmission(): boolean;
  updateEditableDraft(
    nextDraft: TDraft,
    options?: {
      compositionIdentityMap?: Readonly<Record<string, string>>;
      nestedContext?: Readonly<Record<string, unknown>>;
    },
  ): Promise<PendingOperationChainRecord<TDraft> | null>;
  restoreFromStorage(): Promise<PendingOperationChainRecord<TDraft> | null>;
  submit(): Promise<OperationExecutionResult<TDraft, TResult>>;
  retryPending(): Promise<OperationExecutionResult<TDraft, TResult>>;
  startNewAttemptFromEditableDraft(options?: {
    ifMatch?: string | null;
    confirmExpiredWindow?: boolean;
    forceDiscardUncertain?: boolean;
    preserveConfirmedImage?: boolean;
  }): Promise<PendingOperationChainRecord<TDraft>>;
  abandonFlow(): Promise<void>;
  detachForReload(): void;
}

const pendingStorageWrites = new WeakMap<PendingOperationStorageAdapter, Map<string, Promise<unknown>>>();

export function createOperationAttemptController<TDraft, TResult>(
  config: SingleOrTwoStageFlowConfig<TDraft, TResult>,
): OperationAttemptController<TDraft, TResult> {
  const getNow = config.now ?? (() => Date.now());
  const storageKey = buildOperationStorageKey(config.scope);
  let currentRecord: PendingOperationChainRecord<TDraft> | null = null;
  let editableDraft: TDraft = config.initialDraft;
  let currentDraftVersion = 1;
  let currentIfMatch: string | null = config.ifMatch ?? null;
  let currentCompositionMap = config.compositionIdentityMap;
  let currentNestedContext = config.nestedContext;
  let inFlightPromise: Promise<OperationExecutionResult<TDraft, TResult>> | null = null;
  let detached = false;
  let abandoned = false;
  // Serialize storage mutations so an older draft cannot overwrite a newer one or resurrect
  // a voluntarily abandoned operation after an in-flight request completes.
  let storageQueue: Promise<unknown> = Promise.resolve();
  function store(record: PendingOperationChainRecord<TDraft>): Promise<void> {
    const write = storageQueue.then(() => {
      if (!abandoned) return config.storage.saveRecord(record);
    });
    storageQueue = write.catch(() => {});
    let queues = pendingStorageWrites.get(config.storage);
    if (!queues) { queues = new Map(); pendingStorageWrites.set(config.storage, queues); }
    queues.set(storageKey, storageQueue);
    return write;
  }

  function buildInitialRecord(now: number): PendingOperationChainRecord<TDraft> {
    const submittedVersion = currentDraftVersion;
    const imageFile = config.getImageFile?.() ?? config.stage1ImageUpload?.file;
    if (imageFile) {
      const stage1Attempt = createSealedAttempt({
        operationKind: "image.upload",
        method: "POST",
        endpointPath: config.stage1ImageUpload?.endpointPath ?? "/media/images",
        payload: sealMultipartFilePayload(
          imageFile,
          config.stage1ImageUpload?.fileName,
        ),
        submittedDraftVersion: submittedVersion,
        now,
      });
      return {
        storageKey,
        scope: config.scope,
        createdAt: now,
        updatedAt: now,
        currentStageIndex: 0,
        stages: [stage1Attempt],
        confirmedImageId: null,
        ifMatch: currentIfMatch,
        editableDraft,
        submittedDraft: snapshotDraft(editableDraft),
        submittedDraftVersion: submittedVersion,
        currentDraftVersion,
        ...(currentCompositionMap !== undefined
          ? { compositionIdentityMap: currentCompositionMap }
          : {}),
        ...(currentNestedContext !== undefined ? { nestedContext: currentNestedContext } : {}),
      };
    }

    const finalAttempt = createSealedAttempt(
      config.buildFinalStageInput({
        draft: editableDraft,
        confirmedImageId: null,
        ifMatch: currentIfMatch,
        submittedDraftVersion: submittedVersion,
        now,
      }),
    );
    return {
      storageKey,
      scope: config.scope,
      createdAt: now,
      updatedAt: now,
      currentStageIndex: 0,
      stages: [finalAttempt],
      confirmedImageId: null,
      ifMatch: finalAttempt.payload.kind === "json" ? finalAttempt.payload.ifMatch ?? currentIfMatch : currentIfMatch,
      editableDraft,
      submittedDraft: snapshotDraft(editableDraft),
      submittedDraftVersion: submittedVersion,
      currentDraftVersion,
      ...(currentCompositionMap !== undefined
        ? { compositionIdentityMap: currentCompositionMap }
        : {}),
      ...(currentNestedContext !== undefined ? { nestedContext: currentNestedContext } : {}),
    };
  }

  function replaceCurrentStage(
    record: PendingOperationChainRecord<TDraft>,
    updatedStage: SealedOperationAttempt,
    now: number,
  ): PendingOperationChainRecord<TDraft> {
    const nextStages = record.stages.map((stage, idx) =>
      idx === record.currentStageIndex ? updatedStage : stage,
    );
    return {
      ...record,
      updatedAt: now,
      stages: nextStages,
      editableDraft,
      currentDraftVersion,
    };
  }

  async function persistPreSendOrThrow(
    record: PendingOperationChainRecord<TDraft>,
  ): Promise<void> {
    try {
      await store(record);
    } catch (error) {
      throw new PreSendStorageError(PRE_SEND_STORAGE_ERROR_MESSAGE, error);
    }
  }

  async function persistBestEffortAfterProgress(
    record: PendingOperationChainRecord<TDraft>,
    isPostStage1Transition = false,
  ): Promise<PendingOperationChainRecord<TDraft>> {
    try {
      await store(record);
      return record;
    } catch {
      if (isPostStage1Transition) {
        return {
          ...record,
          postStage1StorageFailed: true,
        };
      }
      return record;
    }
  }

  async function runActiveRecord(): Promise<OperationExecutionResult<TDraft, TResult>> {
    if (!currentRecord) {
      const now = getNow();
      const freshRecord = buildInitialRecord(now);
      await persistPreSendOrThrow(freshRecord);
      currentRecord = freshRecord;
    } else {
      const activeStage = currentRecord.stages[currentRecord.currentStageIndex];
      if (activeStage.firstSentAt === null) {
        await persistPreSendOrThrow(currentRecord);
      }
    }

    while (currentRecord) {
      if (detached) {
        return {
          status: "failed",
          outcome: {
            kind: "uncertain_outcome",
            message: "La operación quedó pausada porque saliste de la página.",
          },
          record: currentRecord,
          hasDraftChangesSinceSubmission:
            currentRecord.currentDraftVersion > currentRecord.submittedDraftVersion,
        };
      }
      const now = getNow();
      const stageIndex = currentRecord.currentStageIndex;
      const stage = currentRecord.stages[stageIndex];

      if (stage.status !== "succeeded" && isAttemptWindowExpired(stage, now)) {
        const expiredStage = markAttemptExpired(stage);
        currentRecord = await persistBestEffortAfterProgress(
          replaceCurrentStage(currentRecord, expiredStage, now),
        );
        throw new OperationRetryBlockedError(
          "ATTEMPT_WINDOW_EXPIRED",
          expiredStage.lastErrorMessage ??
            "La ventana de recuperación de 24 horas expiró.",
        );
      }

      const eligibility = canManualRetryAttempt(stage, now);
      if (!eligibility.allowed && stage.attemptCount > 0) {
        if (eligibility.reason === "retry_after_invalid") {
          throw new OperationRetryBlockedError(
            "RETRY_AFTER_INVALID",
            "La cabecera Retry-After no es válida. La operación permanece pausada; revisa su estado antes de continuar.",
          );
        }
        if (eligibility.reason === "retry_after_active") {
          throw new OperationRetryBlockedError(
            "RETRY_AFTER_ACTIVE",
            "La operación sigue en progreso. Espera el tiempo indicado en Retry-After antes de reintentar.",
            eligibility.remainingRetryAfterMs,
          );
        }
        if (eligibility.reason === "requires_new_key") {
          throw new OperationRetryBlockedError(
            "REQUIRES_NEW_KEY",
            "Este intento requiere generar una nueva clave de idempotencia.",
          );
        }
        if (eligibility.reason === "precondition_conflict") {
          throw new OperationRetryBlockedError(
            "PRECONDITION_CONFLICT",
            "El recurso cambió en el servidor. Recarga la versión actual antes de volver a intentar.",
          );
        }
        if (eligibility.reason === "already_succeeded") {
          throw new OperationRetryBlockedError(
            "ALREADY_SUCCEEDED",
            "La operación ya fue confirmada previamente.",
          );
        }
      }

      const inFlightStage = applyAttemptSendStart(stage, now);
      currentRecord = replaceCurrentStage(currentRecord, inFlightStage, now);
      // Every send, including stage two and retries, must have durable bytes/key first.
      try {
        await persistPreSendOrThrow(currentRecord);
      } catch (error) {
        currentRecord = replaceCurrentStage(currentRecord, stage, now);
        throw error;
      }
      if (detached) continue;

      const isStage1Upload =
        stageIndex === 0 &&
        inFlightStage.operationKind === "image.upload";

      if (isStage1Upload) {
        try {
          const upload = config.executeImageUpload ?? config.stage1ImageUpload?.executeUpload;
          if (!upload) throw new Error("No se configuró el ejecutor de carga de imagen.");
          const uploaded = await upload(inFlightStage);
          if (abandoned) throw new Error("La operación fue abandonada.");
          if (detached) {
            return {
              status: "failed",
              outcome: { kind: "uncertain_outcome", message: "La carga quedó pausada al salir de la página." },
              record: currentRecord,
              hasDraftChangesSinceSubmission: currentDraftVersion > currentRecord.submittedDraftVersion,
            };
          }
          const stage1SuccessNow = getNow();
          const completedStage1 = applyAttemptSuccess(inFlightStage, stage1SuccessNow);
          const stage2Attempt = createSealedAttempt(
            config.buildFinalStageInput({
              draft: currentRecord.submittedDraft ?? currentRecord.editableDraft,
              confirmedImageId: uploaded.id,
              ifMatch: currentRecord.ifMatch,
              submittedDraftVersion: currentRecord.submittedDraftVersion,
              now: stage1SuccessNow,
            }),
          );
          const nextRecordWithStage2: PendingOperationChainRecord<TDraft> = {
            ...currentRecord,
            updatedAt: stage1SuccessNow,
            currentStageIndex: 1,
            stages: [completedStage1, stage2Attempt],
            confirmedImageId: uploaded.id,
            ifMatch: stage2Attempt.payload.kind === "json" ? stage2Attempt.payload.ifMatch ?? currentRecord.ifMatch : currentRecord.ifMatch,
          };
          currentRecord = await persistBestEffortAfterProgress(nextRecordWithStage2, true);
          if (detached) {
            return {
              status: "failed",
              outcome: {
                kind: "uncertain_outcome",
                message: "La operación quedó pausada porque saliste de la página.",
              },
              record: currentRecord,
              hasDraftChangesSinceSubmission:
                currentRecord.currentDraftVersion > currentRecord.submittedDraftVersion,
            };
          }
          continue;
        } catch (error) {
          const failNow = getNow();
          const outcome = config.classifyError(error, inFlightStage);
          const failedStage1 = applyAttemptFailure(inFlightStage, outcome, failNow);
          currentRecord = await persistBestEffortAfterProgress(
            replaceCurrentStage(currentRecord, failedStage1, failNow),
          );
          return {
            status: "failed",
            outcome,
            record: currentRecord,
            hasDraftChangesSinceSubmission:
              currentRecord.currentDraftVersion > currentRecord.submittedDraftVersion,
          };
        }
      }

      try {
        const finalResult = await config.executeFinalStage({
          attempt: inFlightStage,
          confirmedImageId: currentRecord.confirmedImageId,
          ifMatch: currentRecord.ifMatch,
        });
        const successNow = getNow();
        const succeededStage = applyAttemptSuccess(inFlightStage, successNow);
        let finalRecord = replaceCurrentStage(currentRecord, succeededStage, successNow);
        if (config.retainConfirmedResult) {
          finalRecord = { ...finalRecord, confirmedResult: finalResult };
          finalRecord = await persistBestEffortAfterProgress(finalRecord);
        } else {
          try {
            await storageQueue;
            await config.storage.deleteRecord(storageKey);
          } catch {
            finalRecord = { ...finalRecord, postSuccessStorageCleanupFailed: true };
          }
        }
        currentRecord = finalRecord;
        return {
          status: "succeeded",
          result: finalResult,
          record: finalRecord,
          hasDraftChangesSinceSubmission:
            finalRecord.currentDraftVersion > finalRecord.submittedDraftVersion,
        };
      } catch (error) {
        const failNow = getNow();
        const outcome = config.classifyError(error, inFlightStage);
        const failedStage = applyAttemptFailure(inFlightStage, outcome, failNow);
        currentRecord = await persistBestEffortAfterProgress(
          replaceCurrentStage(currentRecord, failedStage, failNow),
        );
        return {
          status: "failed",
          outcome,
          record: currentRecord,
          hasDraftChangesSinceSubmission:
            currentRecord.currentDraftVersion > currentRecord.submittedDraftVersion,
        };
      }
    }

    throw new Error("No hay intento activo para ejecutar.");
  }

  function executeSingleFlight(): Promise<OperationExecutionResult<TDraft, TResult>> {
    if (inFlightPromise) {
      return inFlightPromise;
    }
    const activePromise = runActiveRecord().finally(() => {
      inFlightPromise = null;
    });
    inFlightPromise = activePromise;
    return activePromise;
  }

  return {
    getRecord() {
      return abandoned ? null : currentRecord;
    },

    getCurrentAttempt() {
      if (!currentRecord || abandoned) return null;
      return currentRecord.stages[currentRecord.currentStageIndex] ?? null;
    },

    hasDraftChangesSinceSubmission() {
      if (!currentRecord) return false;
      return currentDraftVersion > currentRecord.submittedDraftVersion;
    },

    async updateEditableDraft(nextDraft, options) {
      const changed = !equalDraft(editableDraft, nextDraft);
      editableDraft = nextDraft;
      if (changed) currentDraftVersion += 1;
      if (options?.compositionIdentityMap !== undefined) {
        currentCompositionMap = options.compositionIdentityMap;
      }
      if (options?.nestedContext !== undefined) {
        currentNestedContext = options.nestedContext;
      }
      if (!currentRecord) {
        return null;
      }
      const now = getNow();
      currentRecord = {
        ...currentRecord,
        updatedAt: now,
        editableDraft,
        currentDraftVersion,
        ...(currentCompositionMap !== undefined
          ? { compositionIdentityMap: currentCompositionMap }
          : {}),
        ...(currentNestedContext !== undefined ? { nestedContext: currentNestedContext } : {}),
      };
      if (!detached) {
        await persistBestEffortAfterProgress(currentRecord);
      }
      return currentRecord;
    },

    async restoreFromStorage() {
      await pendingStorageWrites.get(config.storage)?.get(storageKey);
      const stored = await config.storage.getRecord<TDraft>(storageKey);
      if (!stored) {
        return null;
      }
      const now = getNow();
      const restoredStages = stored.stages.map((stage) => {
        if (stage.status !== "succeeded" && isAttemptWindowExpired(stage, now)) {
          return markAttemptExpired(stage);
        }
        if (stage.status === "in_flight") {
          return Object.freeze({
            ...stage,
            status: "uncertain" as const,
            lastErrorCode: stage.lastErrorCode ?? "INTERRUPTED_BY_RELOAD",
            lastErrorMessage:
              stage.lastErrorMessage ??
              "La operación quedó pendiente tras recargar la página. Puedes reintentar con la misma clave de idempotencia.",
          });
        }
        return stage;
      });
      editableDraft = stored.editableDraft;
      currentDraftVersion = stored.currentDraftVersion;
      currentIfMatch = stored.ifMatch;
      currentCompositionMap = stored.compositionIdentityMap;
      currentNestedContext = stored.nestedContext;
      currentRecord = {
        ...stored,
        // Legacy records without later edits still contain the original submitted draft.
        ...(stored.submittedDraft === undefined && stored.currentDraftVersion === stored.submittedDraftVersion
          ? { submittedDraft: stored.editableDraft } : {}),
        updatedAt: now,
        stages: restoredStages,
      };
      await persistBestEffortAfterProgress(currentRecord);
      return currentRecord;
    },

    submit() {
      return executeSingleFlight();
    },

    retryPending() {
      if (!currentRecord) {
        throw new Error("No existe una operación pendiente para reintentar.");
      }
      return executeSingleFlight();
    },

    async startNewAttemptFromEditableDraft(options) {
      if (inFlightPromise) {
        throw new OperationRetryBlockedError(
          "RETRY_IN_FLIGHT",
          "No se puede iniciar un nuevo intento mientras una solicitud sigue en vuelo.",
        );
      }
      const now = getNow();
      if (currentRecord) {
        const activeStage = currentRecord.stages[currentRecord.currentStageIndex];
        const expired = activeStage.status !== "succeeded" &&
          (activeStage.status === "expired" || isAttemptWindowExpired(activeStage, now));
        if (expired && !options?.confirmExpiredWindow) {
          throw new OperationRetryBlockedError(
            "ATTEMPT_WINDOW_EXPIRED",
            "Debes confirmar explícitamente antes de crear un nuevo intento tras expirar la ventana de 24 horas.",
          );
        }
        const isUncertainOrConflict =
          activeStage.status === "uncertain" ||
          activeStage.status === "conflict_in_progress";
        if (isUncertainOrConflict && !options?.forceDiscardUncertain) {
          throw new OperationRetryBlockedError(
            "RETRY_AFTER_ACTIVE",
            "Existe una operación con estado incierto o en progreso. Resuélvela o descártala explícitamente antes de generar una nueva clave.",
          );
        }
      }

      if (options?.ifMatch !== undefined) {
        currentIfMatch = options.ifMatch;
      }

      const confirmedImageIdToPreserve = options?.preserveConfirmedImage === false
        ? null : currentRecord?.confirmedImageId ?? null;
      const submittedVersion = currentDraftVersion;

      if (confirmedImageIdToPreserve !== null) {
        const previousStage1 = currentRecord?.stages[0];
        const finalAttempt = createSealedAttempt(
          config.buildFinalStageInput({
            draft: editableDraft,
            confirmedImageId: confirmedImageIdToPreserve,
            ifMatch: currentIfMatch,
            submittedDraftVersion: submittedVersion,
            now,
          }),
        );
        const stages = previousStage1 ? [previousStage1, finalAttempt] : [finalAttempt];
        const nextRecord: PendingOperationChainRecord<TDraft> = {
          storageKey,
          scope: config.scope,
          createdAt: now,
          updatedAt: now,
          currentStageIndex: stages.length - 1,
          stages,
          confirmedImageId: confirmedImageIdToPreserve,
          ifMatch: currentIfMatch,
          editableDraft,
          submittedDraft: snapshotDraft(editableDraft),
          submittedDraftVersion: submittedVersion,
          currentDraftVersion,
          ...(currentCompositionMap !== undefined
            ? { compositionIdentityMap: currentCompositionMap }
            : {}),
          ...(currentNestedContext !== undefined ? { nestedContext: currentNestedContext } : {}),
        };
        await persistPreSendOrThrow(nextRecord);
        currentRecord = nextRecord;
        return nextRecord;
      }

      const nextRecord = buildInitialRecord(now);
      await persistPreSendOrThrow(nextRecord);
      currentRecord = nextRecord;
      return nextRecord;
    },

    async abandonFlow() {
      detached = true;
      abandoned = true;
      await storageQueue;
      await config.storage.deleteRecord(storageKey);
    },

    detachForReload() {
      detached = true;
    },
  };
}
