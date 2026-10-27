import {
  buildOperationStorageKey,
  isUuidV4,
  type IdempotentOperationKind,
  type OperationAttemptStatus,
  type OperationFlowScope,
  type PendingOperationChainRecord,
  type PendingOperationStorageAdapter,
  type SealedOperationAttempt,
  type SealedOperationPayload,
} from "../application/operationAttempt";

export type {
  PendingOperationChainRecord,
  PendingOperationStorageAdapter,
} from "../application/operationAttempt";

export type PendingOperationStorageErrorCode =
  | "IDB_UNAVAILABLE"
  | "IDB_OPEN_FAILED"
  | "IDB_REQUEST_FAILED"
  | "IDB_TRANSACTION_ABORTED"
  | "IDB_TRANSACTION_FAILED"
  | "IDB_CORRUPTED_RECORD";

export class PendingOperationStorageError extends Error {
  readonly code: PendingOperationStorageErrorCode;
  readonly causeError?: unknown;

  constructor(
    code: PendingOperationStorageErrorCode,
    message: string,
    causeError?: unknown,
  ) {
    super(message);
    this.name = "PendingOperationStorageError";
    this.code = code;
    this.causeError = causeError;
  }
}

export interface MinimalIdbRequest<TResult = unknown> {
  readonly result: TResult;
  readonly error: { readonly message?: string; readonly name?: string } | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

export interface MinimalIdbOpenRequest extends MinimalIdbRequest<MinimalIdbDatabase> {
  onupgradeneeded: (() => void) | null;
}

export interface MinimalIdbObjectStore {
  put(value: unknown, key?: string): MinimalIdbRequest<unknown>;
  get(key: string): MinimalIdbRequest<unknown>;
  delete(key: string): MinimalIdbRequest<unknown>;
  getAll(): MinimalIdbRequest<unknown[]>;
}

export interface MinimalIdbTransaction {
  readonly error: { readonly message?: string; readonly name?: string } | null;
  objectStore(name: string): MinimalIdbObjectStore;
  oncomplete: (() => void) | null;
  onabort: (() => void) | null;
  onerror: (() => void) | null;
}

export interface MinimalIdbDatabase {
  readonly objectStoreNames: {
    contains(name: string): boolean;
  };
  createObjectStore(name: string): MinimalIdbObjectStore;
  transaction(
    storeNames: string | Iterable<string>,
    mode?: "readonly" | "readwrite",
  ): MinimalIdbTransaction;
  close(): void;
}

export interface MinimalIdbFactory {
  open(name: string, version?: number): MinimalIdbOpenRequest;
}

function createSettlers<TResult>(
  db: MinimalIdbDatabase,
  resolve: (value: TResult) => void,
  reject: (error: PendingOperationStorageError) => void,
) {
  let settled = false;
  return {
    reject(error: PendingOperationStorageError) {
      if (settled) return;
      settled = true;
      db.close();
      reject(error);
    },
    resolve(value: TResult) {
      if (settled) return;
      settled = true;
      db.close();
      resolve(value);
    },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isOperationKind(value: unknown): value is IdempotentOperationKind {
  return (
    value === "category.create" ||
    value === "recipe.create" ||
    value === "image.upload" ||
    value === "entry.create" ||
    value === "offer.create" ||
    value === "offer.patch"
  );
}

function isAttemptStatus(value: unknown): value is OperationAttemptStatus {
  return (
    value === "sealed" ||
    value === "in_flight" ||
    value === "pending_retry" ||
    value === "uncertain" ||
    value === "conflict_in_progress" ||
    value === "requires_new_key" ||
    value === "precondition_conflict" ||
    value === "pre_commit_rejected" ||
    value === "expired" ||
    value === "succeeded"
  );
}

function isBlobInstance(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isSealedPayload(value: unknown): value is SealedOperationPayload {
  if (!isPlainObject(value)) return false;
  if (value.kind === "json") {
    return (
      typeof value.serializedBody === "string" &&
      "payloadSnapshot" in value &&
      (value.ifMatch === undefined || typeof value.ifMatch === "string")
    );
  }
  if (value.kind === "multipart-file") {
    return (
      isBlobInstance(value.fileBlob) &&
      isNonEmptyString(value.fileName) &&
      isNonEmptyString(value.mimeType) &&
      isFiniteNumber(value.byteSize) &&
      value.byteSize >= 0
    );
  }
  return false;
}

function isSealedAttempt(value: unknown): value is SealedOperationAttempt {
  if (!isPlainObject(value)) return false;
  return (
    isUuidV4(value.attemptId) &&
    isOperationKind(value.operationKind) &&
    (value.method === "POST" || value.method === "PATCH") &&
    isNonEmptyString(value.endpointPath) &&
    isUuidV4(value.idempotencyKey) &&
    isSealedPayload(value.payload) &&
    isFiniteNumber(value.createdAt) &&
    isNullableFiniteNumber(value.firstSentAt) &&
    isNullableFiniteNumber(value.firstConfirmedAt) &&
    isNullableFiniteNumber(value.lastAttemptAt) &&
    isFiniteNumber(value.attemptCount) &&
    value.attemptCount >= 0 &&
    isAttemptStatus(value.status) &&
    isFiniteNumber(value.submittedDraftVersion) &&
    isNullableFiniteNumber(value.retryAfterSeconds) &&
    isNullableFiniteNumber(value.retryAfterUntil) &&
    typeof value.retryAfterInvalid === "boolean" &&
    typeof value.possibleWriteApplied === "boolean" &&
    isNullableString(value.lastErrorCode) &&
    isNullableString(value.lastErrorMessage)
  );
}

function isStringMap(value: unknown): value is Readonly<Record<string, string>> {
  if (!isPlainObject(value)) return false;
  return Object.values(value).every((entry) => typeof entry === "string");
}

export function isPendingOperationChainRecord<TDraft = unknown>(
  value: unknown,
  isDraft?: (draft: unknown) => draft is TDraft,
): value is PendingOperationChainRecord<TDraft> {
  if (!isPlainObject(value)) return false;
  if (
    !isNonEmptyString(value.storageKey) ||
    !isPlainObject(value.scope) ||
    !isNonEmptyString(value.scope.tabId) ||
    !isNonEmptyString(value.scope.formKind) ||
    !isNonEmptyString(value.scope.resourceKey) ||
    !isFiniteNumber(value.createdAt) ||
    !isFiniteNumber(value.updatedAt) ||
    !isFiniteNumber(value.currentStageIndex) ||
    value.currentStageIndex < 0 ||
    !Array.isArray(value.stages) ||
    value.stages.length === 0 ||
    value.currentStageIndex >= value.stages.length ||
    !value.stages.every(isSealedAttempt) ||
    !isNullableString(value.confirmedImageId) ||
    !isNullableString(value.ifMatch) ||
    !isFiniteNumber(value.submittedDraftVersion) ||
    !isFiniteNumber(value.currentDraftVersion)
  ) {
    return false;
  }
  if (
    value.compositionIdentityMap !== undefined &&
    !isStringMap(value.compositionIdentityMap)
  ) {
    return false;
  }
  if (value.nestedContext !== undefined && !isPlainObject(value.nestedContext)) {
    return false;
  }
  if (isDraft && !isDraft(value.editableDraft)) {
    return false;
  }
  return true;
}

const DEFAULT_DB_NAME = "menu-pending-operations-db";
const DEFAULT_DB_VERSION = 1;
const DEFAULT_STORE_NAME = "pending_operations";

export interface IndexedDbPendingOperationStorageOptions {
  readonly idbFactory?: MinimalIdbFactory | null;
  readonly dbName?: string;
  readonly storeName?: string;
}

function resolveKey(scopeOrKey: OperationFlowScope | string): string {
  if (typeof scopeOrKey === "string") {
    const trimmed = scopeOrKey.trim();
    if (!trimmed) {
      throw new Error("La clave de almacenamiento no puede estar vacía.");
    }
    return trimmed;
  }
  return buildOperationStorageKey(scopeOrKey);
}

function wrapNativeRequest<T>(req: IDBRequest<T>): MinimalIdbRequest<T> {
  return {
    get result() {
      return req.result;
    },
    get error() {
      return req.error;
    },
    get onsuccess() {
      return null;
    },
    set onsuccess(fn: (() => void) | null) {
      req.onsuccess = fn ? () => fn() : null;
    },
    get onerror() {
      return null;
    },
    set onerror(fn: (() => void) | null) {
      req.onerror = fn ? () => fn() : null;
    },
  };
}

function wrapNativeStore(store: IDBObjectStore): MinimalIdbObjectStore {
  return {
    put(value: unknown, key?: string) {
      return wrapNativeRequest(store.put(value, key));
    },
    get(key: string) {
      return wrapNativeRequest(store.get(key));
    },
    delete(key: string) {
      return wrapNativeRequest(store.delete(key));
    },
    getAll() {
      return wrapNativeRequest(store.getAll());
    },
  };
}

function wrapNativeDatabase(db: IDBDatabase): MinimalIdbDatabase {
  return {
    objectStoreNames: {
      contains(name: string) {
        return db.objectStoreNames.contains(name);
      },
    },
    createObjectStore(name: string) {
      return wrapNativeStore(db.createObjectStore(name));
    },
    transaction(
      storeNames: string | Iterable<string>,
      mode?: "readonly" | "readwrite",
    ): MinimalIdbTransaction {
      const tx = db.transaction(storeNames, mode);
      return {
        get error() {
          return tx.error;
        },
        objectStore(name: string) {
          return wrapNativeStore(tx.objectStore(name));
        },
        get oncomplete() {
          return null;
        },
        set oncomplete(fn: (() => void) | null) {
          tx.oncomplete = fn ? () => fn() : null;
        },
        get onabort() {
          return null;
        },
        set onabort(fn: (() => void) | null) {
          tx.onabort = fn ? () => fn() : null;
        },
        get onerror() {
          return null;
        },
        set onerror(fn: (() => void) | null) {
          tx.onerror = fn ? () => fn() : null;
        },
      };
    },
    close() {
      db.close();
    },
  };
}

function wrapNativeIndexedDb(nativeFactory: IDBFactory): MinimalIdbFactory {
  return {
    open(name: string, version?: number): MinimalIdbOpenRequest {
      const openReq = nativeFactory.open(name, version);
      return {
        get result() {
          return wrapNativeDatabase(openReq.result);
        },
        get error() {
          return openReq.error;
        },
        get onupgradeneeded() {
          return null;
        },
        set onupgradeneeded(fn: (() => void) | null) {
          openReq.onupgradeneeded = fn ? () => fn() : null;
        },
        get onsuccess() {
          return null;
        },
        set onsuccess(fn: (() => void) | null) {
          openReq.onsuccess = fn ? () => fn() : null;
        },
        get onerror() {
          return null;
        },
        set onerror(fn: (() => void) | null) {
          openReq.onerror = fn ? () => fn() : null;
        },
      };
    },
  };
}

function resolveDefaultIdbFactory(): MinimalIdbFactory | null {
  if (typeof indexedDB !== "undefined" && indexedDB !== null) {
    return wrapNativeIndexedDb(indexedDB);
  }
  return null;
}

export function createIndexedDbPendingOperationStorage(
  options?: IndexedDbPendingOperationStorageOptions,
): PendingOperationStorageAdapter {
  const dbName = options?.dbName ?? DEFAULT_DB_NAME;
  const storeName = options?.storeName ?? DEFAULT_STORE_NAME;

  function openDatabase(): Promise<MinimalIdbDatabase> {
    const factory =
      options?.idbFactory !== undefined ? options.idbFactory : resolveDefaultIdbFactory();
    if (!factory) {
      return Promise.reject(
        new PendingOperationStorageError(
          "IDB_UNAVAILABLE",
          "IndexedDB no está disponible en este entorno.",
        ),
      );
    }

    return new Promise<MinimalIdbDatabase>((resolve, reject) => {
      let openRequest: MinimalIdbOpenRequest;
      try {
        openRequest = factory.open(dbName, DEFAULT_DB_VERSION);
      } catch (error) {
        reject(
          new PendingOperationStorageError(
            "IDB_OPEN_FAILED",
            "No se pudo abrir la base de datos de operaciones pendientes.",
            error,
          ),
        );
        return;
      }

      openRequest.onupgradeneeded = () => {
        const db = openRequest.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };

      openRequest.onsuccess = () => {
        resolve(openRequest.result);
      };

      openRequest.onerror = () => {
        reject(
          new PendingOperationStorageError(
            "IDB_OPEN_FAILED",
            openRequest.error?.message ??
              "Error al abrir la base de datos de operaciones pendientes.",
            openRequest.error,
          ),
        );
      };
    });
  }

  return {
    async saveRecord<TDraft = unknown>(
      record: PendingOperationChainRecord<TDraft>,
    ): Promise<void> {
      const db = await openDatabase();
      return new Promise<void>((resolve, reject) => {
        let putSucceeded = false;
        const { reject: settleReject, resolve: settleResolve } = createSettlers<void>(db, resolve, reject);

        let tx: MinimalIdbTransaction;
        try {
          tx = db.transaction(storeName, "readwrite");
        } catch (error) {
          settleReject(
            new PendingOperationStorageError(
              "IDB_TRANSACTION_FAILED",
              "No se pudo iniciar la transacción de escritura en IndexedDB.",
              error,
            ),
          );
          return;
        }

        tx.onabort = () => {
          settleReject(
            new PendingOperationStorageError(
              "IDB_TRANSACTION_ABORTED",
              tx.error?.message ?? "La transacción de IndexedDB fue abortada antes de confirmar.",
              tx.error,
            ),
          );
        };

        tx.onerror = () => {
          settleReject(
            new PendingOperationStorageError(
              "IDB_TRANSACTION_FAILED",
              tx.error?.message ?? "Error en la transacción de IndexedDB.",
              tx.error,
            ),
          );
        };

        tx.oncomplete = () => {
          if (!putSucceeded) {
            settleReject(
              new PendingOperationStorageError(
                "IDB_REQUEST_FAILED",
                "La transacción finalizó sin confirmación del comando put.",
              ),
            );
            return;
          }
          settleResolve(undefined);
        };

        try {
          const store = tx.objectStore(storeName);
          const putRequest = store.put(record, record.storageKey);
          putRequest.onsuccess = () => {
            putSucceeded = true;
          };
          putRequest.onerror = () => {
            settleReject(
              new PendingOperationStorageError(
                "IDB_REQUEST_FAILED",
                putRequest.error?.message ??
                  "Falló la solicitud de escritura del intento pendiente.",
                putRequest.error,
              ),
            );
          };
        } catch (error) {
          settleReject(
            new PendingOperationStorageError(
              "IDB_REQUEST_FAILED",
              "Excepción al escribir el intento pendiente en IndexedDB.",
              error,
            ),
          );
        }
      });
    },

    async getRecord<TDraft = unknown>(
      scopeOrKey: OperationFlowScope | string,
    ): Promise<PendingOperationChainRecord<TDraft> | null> {
      const key = resolveKey(scopeOrKey);
      const db = await openDatabase();
      return new Promise<PendingOperationChainRecord<TDraft> | null>((resolve, reject) => {
        const { reject: settleReject, resolve: settleResolve } = createSettlers(db, resolve, reject);
        let getSucceeded = false;
        let fetchedValue: unknown = undefined;

        let tx: MinimalIdbTransaction;
        try {
          tx = db.transaction(storeName, "readonly");
        } catch (error) {
          settleReject(
            new PendingOperationStorageError(
              "IDB_TRANSACTION_FAILED",
              "No se pudo iniciar la transacción de lectura en IndexedDB.",
              error,
            ),
          );
          return;
        }

        tx.onabort = () => {
          settleReject(
            new PendingOperationStorageError(
              "IDB_TRANSACTION_ABORTED",
              tx.error?.message ?? "La transacción de lectura fue abortada.",
              tx.error,
            ),
          );
        };

        tx.onerror = () => {
          settleReject(
            new PendingOperationStorageError(
              "IDB_TRANSACTION_FAILED",
              tx.error?.message ?? "Error en la transacción de lectura de IndexedDB.",
              tx.error,
            ),
          );
        };

        tx.oncomplete = () => {
          if (!getSucceeded) {
            settleReject(
              new PendingOperationStorageError(
                "IDB_REQUEST_FAILED",
                "La transacción de lectura completó sin resultado.",
              ),
            );
            return;
          }
          if (fetchedValue === undefined) {
            settleResolve(null);
            return;
          }
          if (!isPendingOperationChainRecord<TDraft>(fetchedValue)) {
            settleReject(
              new PendingOperationStorageError(
                "IDB_CORRUPTED_RECORD",
                "El registro almacenado en IndexedDB no cumple el esquema esperado.",
              ),
            );
            return;
          }
          settleResolve(fetchedValue);
        };

        try {
          const store = tx.objectStore(storeName);
          const getRequest = store.get(key);
          getRequest.onsuccess = () => {
            getSucceeded = true;
            fetchedValue = getRequest.result;
          };
          getRequest.onerror = () => {
            settleReject(
              new PendingOperationStorageError(
                "IDB_REQUEST_FAILED",
                getRequest.error?.message ?? "Falló la lectura del intento pendiente.",
                getRequest.error,
              ),
            );
          };
        } catch (error) {
          settleReject(
            new PendingOperationStorageError(
              "IDB_REQUEST_FAILED",
              "Excepción al leer el intento pendiente en IndexedDB.",
              error,
            ),
          );
        }
      });
    },

    async deleteRecordIfAttemptMatches(storageKey: string, attemptId: string): Promise<boolean> {
      const db = await openDatabase();
      return new Promise<boolean>((resolve, reject) => {
        let deleted = false;
        let checked = false;
        let settled = false;
        const fail = (error: unknown) => {
          if (settled) return;
          settled = true;
          db.close();
          reject(new PendingOperationStorageError("IDB_TRANSACTION_FAILED", "No pudimos retirar el envío confirmado.", error));
        };
        try {
          const tx = db.transaction(storeName, "readwrite");
          tx.onabort = () => fail(tx.error);
          tx.onerror = () => fail(tx.error);
          tx.oncomplete = () => {
            if (settled) return;
            if (!checked) { fail(new Error("La transacción terminó sin comprobar la identidad.")); return; }
            settled = true;
            db.close();
            resolve(deleted);
          };
          const store = tx.objectStore(storeName);
          const request = store.get(storageKey);
          request.onerror = () => fail(request.error);
          request.onsuccess = () => {
            checked = true;
            const record = request.result;
            if (!isPendingOperationChainRecord(record) || record.storageKey !== storageKey ||
              record.currentStageIndex !== record.stages.length - 1 ||
              record.currentDraftVersion !== record.submittedDraftVersion || !record.confirmedResult) return;
            const final = record.stages[record.currentStageIndex];
            if (final.attemptId !== attemptId || final.status !== "succeeded") return;
            const removal = store.delete(storageKey);
            // Resolve only after transaction completion, including a possible abort.
            checked = false;
            removal.onerror = () => fail(removal.error);
            removal.onsuccess = () => { checked = true; deleted = true; };
          };
        } catch (error) { fail(error); }
      });
    },

    async deleteRecord(scopeOrKey: OperationFlowScope | string): Promise<void> {
      const key = resolveKey(scopeOrKey);
      const db = await openDatabase();
      return new Promise<void>((resolve, reject) => {
        let deleteSucceeded = false;
        const { reject: settleReject, resolve: settleResolve } = createSettlers<void>(db, resolve, reject);

        let tx: MinimalIdbTransaction;
        try {
          tx = db.transaction(storeName, "readwrite");
        } catch (error) {
          settleReject(
            new PendingOperationStorageError(
              "IDB_TRANSACTION_FAILED",
              "No se pudo iniciar la transacción de borrado en IndexedDB.",
              error,
            ),
          );
          return;
        }

        tx.onabort = () => {
          settleReject(
            new PendingOperationStorageError(
              "IDB_TRANSACTION_ABORTED",
              tx.error?.message ?? "La transacción de borrado fue abortada.",
              tx.error,
            ),
          );
        };

        tx.onerror = () => {
          settleReject(
            new PendingOperationStorageError(
              "IDB_TRANSACTION_FAILED",
              tx.error?.message ?? "Error en la transacción de borrado de IndexedDB.",
              tx.error,
            ),
          );
        };

        tx.oncomplete = () => {
          if (!deleteSucceeded) {
            settleReject(
              new PendingOperationStorageError(
                "IDB_REQUEST_FAILED",
                "La transacción de borrado finalizó sin confirmar delete.",
              ),
            );
            return;
          }
          settleResolve(undefined);
        };

        try {
          const store = tx.objectStore(storeName);
          const deleteRequest = store.delete(key);
          deleteRequest.onsuccess = () => {
            deleteSucceeded = true;
          };
          deleteRequest.onerror = () => {
            settleReject(
              new PendingOperationStorageError(
                "IDB_REQUEST_FAILED",
                deleteRequest.error?.message ?? "Falló la eliminación del intento pendiente.",
                deleteRequest.error,
              ),
            );
          };
        } catch (error) {
          settleReject(
            new PendingOperationStorageError(
              "IDB_REQUEST_FAILED",
              "Excepción al eliminar el intento pendiente en IndexedDB.",
              error,
            ),
          );
        }
      });
    },

    async listByTab(tabId: string): Promise<PendingOperationChainRecord[]> {
      const normalizedTabId = tabId.trim();
      if (!normalizedTabId) {
        return [];
      }
      const db = await openDatabase();
      return new Promise<PendingOperationChainRecord[]>((resolve, reject) => {
        const { reject: settleReject, resolve: settleResolve } = createSettlers(db, resolve, reject);
        let getAllSucceeded = false;
        let rawList: unknown[] = [];

        let tx: MinimalIdbTransaction;
        try {
          tx = db.transaction(storeName, "readonly");
        } catch (error) {
          settleReject(
            new PendingOperationStorageError(
              "IDB_TRANSACTION_FAILED",
              "No se pudo iniciar la transacción de listado en IndexedDB.",
              error,
            ),
          );
          return;
        }

        tx.onabort = () => {
          settleReject(
            new PendingOperationStorageError(
              "IDB_TRANSACTION_ABORTED",
              tx.error?.message ?? "La transacción de listado fue abortada.",
              tx.error,
            ),
          );
        };

        tx.onerror = () => {
          settleReject(
            new PendingOperationStorageError(
              "IDB_TRANSACTION_FAILED",
              tx.error?.message ?? "Error en la transacción de listado.",
              tx.error,
            ),
          );
        };

        tx.oncomplete = () => {
          if (!getAllSucceeded) {
            settleReject(
              new PendingOperationStorageError(
                "IDB_REQUEST_FAILED",
                "La transacción de listado completó sin resultados.",
              ),
            );
            return;
          }
          const matching: PendingOperationChainRecord[] = [];
          for (const candidate of rawList) {
            if (
              isPendingOperationChainRecord(candidate) &&
              candidate.scope.tabId === normalizedTabId
            ) {
              matching.push(candidate);
            }
          }
          settleResolve(matching);
        };

        try {
          const store = tx.objectStore(storeName);
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            getAllSucceeded = true;
            rawList = Array.isArray(getAllRequest.result) ? getAllRequest.result : [];
          };
          getAllRequest.onerror = () => {
            settleReject(
              new PendingOperationStorageError(
                "IDB_REQUEST_FAILED",
                getAllRequest.error?.message ?? "Falló la consulta getAll en IndexedDB.",
                getAllRequest.error,
              ),
            );
          };
        } catch (error) {
          settleReject(
            new PendingOperationStorageError(
              "IDB_REQUEST_FAILED",
              "Excepción al listar operaciones pendientes en IndexedDB.",
              error,
            ),
          );
        }
      });
    },
  };
}

export interface ControllableIdbFailureConfig {
  failNextOpen?: boolean;
  failNextPutRequest?: boolean;
  abortNextPutAfterRequestSuccess?: boolean;
  failNextTransactionError?: boolean;
  abortNextDeleteAfterRequestSuccess?: boolean;
  failNextGetRequest?: boolean;
}

export interface ControllableIdbHarness {
  readonly factory: MinimalIdbFactory;
  setFailureConfig(config: ControllableIdbFailureConfig): void;
  setRawRecord(key: string, value: unknown): void;
  inspectRawStore(): ReadonlyMap<string, unknown>;
}

function invokeHandler(handler: (() => void) | null): void {
  if (!handler) return;
  handler();
}

interface ControllableRequest<TResult = unknown> extends MinimalIdbRequest<TResult> {
  result: TResult;
  error: { readonly message?: string; readonly name?: string } | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

interface ControllableOpenRequest extends ControllableRequest<MinimalIdbDatabase> {
  onupgradeneeded: (() => void) | null;
}

interface ControllableTransaction extends MinimalIdbTransaction {
  error: { readonly message?: string; readonly name?: string } | null;
  oncomplete: (() => void) | null;
  onabort: (() => void) | null;
  onerror: (() => void) | null;
}

interface ControllableFailureState {
  current: ControllableIdbFailureConfig;
}

type ControllableWrite = { type: "put" | "delete"; value?: unknown };

function scheduleControllablePut(
  key: string,
  value: unknown,
  request: ControllableRequest<unknown>,
  transaction: ControllableTransaction,
  store: Map<string, unknown>,
  writes: Map<string, ControllableWrite>,
  failures: ControllableFailureState,
) {
  queueMicrotask(() => {
    if (failures.current.failNextPutRequest) {
      failures.current.failNextPutRequest = false;
      request.error = { name: "ConstraintError", message: "Fallo simulado en putRequest.onerror" };
      transaction.error = request.error;
      invokeHandler(request.onerror);
      invokeHandler(transaction.onerror);
      return;
    }

    if (failures.current.failNextTransactionError) {
      failures.current.failNextTransactionError = false;
      transaction.error = { name: "QuotaExceededError", message: "Cuota excedida en transacción IndexedDB" };
      invokeHandler(transaction.onerror);
      return;
    }

    writes.set(key, { type: "put", value });
    invokeHandler(request.onsuccess);
    queueMicrotask(() => commitControllablePut(transaction, store, writes, failures));
  });
}

function commitControllablePut(
  transaction: ControllableTransaction,
  store: Map<string, unknown>,
  writes: Map<string, ControllableWrite>,
  failures: ControllableFailureState,
) {
  if (failures.current.abortNextPutAfterRequestSuccess) {
    failures.current.abortNextPutAfterRequestSuccess = false;
    writes.clear();
    transaction.error = { name: "AbortError", message: "Transacción abortada tras put.onsuccess" };
    invokeHandler(transaction.onabort);
    return;
  }

  for (const [key, operation] of writes.entries()) {
    if (operation.type === "put") store.set(key, operation.value);
  }
  writes.clear();
  invokeHandler(transaction.oncomplete);
}

function scheduleControllableGet(
  key: string,
  request: ControllableRequest<unknown>,
  transaction: ControllableTransaction,
  store: Map<string, unknown>,
  writes: Map<string, ControllableWrite>,
  failures: ControllableFailureState,
) {
  queueMicrotask(() => {
    if (failures.current.failNextGetRequest) {
      failures.current.failNextGetRequest = false;
      request.error = { name: "UnknownError", message: "Fallo simulado en getRequest.onerror" };
      transaction.error = request.error;
      invokeHandler(request.onerror);
      invokeHandler(transaction.onerror);
      return;
    }

    request.result = store.get(key);
    invokeHandler(request.onsuccess);
    queueMicrotask(() => {
      if (writes.size === 0) invokeHandler(transaction.oncomplete);
    });
  });
}

function scheduleControllableDelete(
  key: string,
  request: ControllableRequest<unknown>,
  transaction: ControllableTransaction,
  store: Map<string, unknown>,
  writes: Map<string, ControllableWrite>,
  failures: ControllableFailureState,
) {
  queueMicrotask(() => {
    writes.set(key, { type: "delete" });
    invokeHandler(request.onsuccess);
    queueMicrotask(() => commitControllableDelete(transaction, store, writes, failures));
  });
}

function commitControllableDelete(
  transaction: ControllableTransaction,
  store: Map<string, unknown>,
  writes: Map<string, ControllableWrite>,
  failures: ControllableFailureState,
) {
  if (failures.current.abortNextDeleteAfterRequestSuccess) {
    failures.current.abortNextDeleteAfterRequestSuccess = false;
    writes.clear();
    transaction.error = { name: "AbortError", message: "Transacción de borrado abortada tras delete.onsuccess" };
    invokeHandler(transaction.onabort);
    return;
  }

  for (const [key, operation] of writes.entries()) {
    if (operation.type === "delete") store.delete(key);
  }
  writes.clear();
  invokeHandler(transaction.oncomplete);
}

function scheduleControllableGetAll(
  request: ControllableRequest<unknown[]>,
  transaction: ControllableTransaction,
  store: Map<string, unknown>,
) {
  queueMicrotask(() => {
    request.result = Array.from(store.values());
    invokeHandler(request.onsuccess);
    queueMicrotask(() => invokeHandler(transaction.oncomplete));
  });
}

export function createControllableIndexedDbHarness(): ControllableIdbHarness {
  const storesByDb = new Map<string, Map<string, Map<string, unknown>>>();
  const failures: ControllableFailureState = { current: {} };

  function getOrCreateDbStores(dbName: string): Map<string, Map<string, unknown>> {
    let dbStores = storesByDb.get(dbName);
    if (!dbStores) {
      dbStores = new Map<string, Map<string, unknown>>();
      storesByDb.set(dbName, dbStores);
    }
    return dbStores;
  }

  function getOrCreateStore(dbName: string, storeName: string): Map<string, unknown> {
    const dbStores = getOrCreateDbStores(dbName);
    let store = dbStores.get(storeName);
    if (!store) {
      store = new Map<string, unknown>();
      dbStores.set(storeName, store);
    }
    return store;
  }

  const factory: MinimalIdbFactory = {
    open(dbName: string): MinimalIdbOpenRequest {
      const dbStores = getOrCreateDbStores(dbName);

      const database: MinimalIdbDatabase = {
        objectStoreNames: {
          contains(name: string) {
            return dbStores.has(name);
          },
        },
        createObjectStore(name: string): MinimalIdbObjectStore {
          getOrCreateStore(dbName, name);
          return database.transaction(name, "readwrite").objectStore(name);
        },
        transaction(
          storeNames: string | Iterable<string>,
        ): MinimalIdbTransaction {
          const resolvedName =
            typeof storeNames === "string"
              ? storeNames
              : Array.from(storeNames)[0] ?? DEFAULT_STORE_NAME;
          const backingStore = getOrCreateStore(dbName, resolvedName);
          const stagedWrites = new Map<string, { type: "put" | "delete"; value?: unknown }>();

          const tx: ControllableTransaction = {
            error: null,
            oncomplete: null,
            onabort: null,
            onerror: null,
            objectStore(): MinimalIdbObjectStore {
              return {
                put(value: unknown, key: string = ""): MinimalIdbRequest<unknown> {
                  const req: ControllableRequest<unknown> = {
                    result: key,
                    error: null,
                    onsuccess: null,
                    onerror: null,
                  };

                  scheduleControllablePut(key, value, req, tx, backingStore, stagedWrites, failures);

                  return req;
                },

                get(key: string): MinimalIdbRequest<unknown> {
                  const req: ControllableRequest<unknown> = {
                    result: undefined,
                    error: null,
                    onsuccess: null,
                    onerror: null,
                  };

                  scheduleControllableGet(key, req, tx, backingStore, stagedWrites, failures);

                  return req;
                },

                delete(key: string): MinimalIdbRequest<unknown> {
                  const req: ControllableRequest<unknown> = {
                    result: undefined,
                    error: null,
                    onsuccess: null,
                    onerror: null,
                  };

                  scheduleControllableDelete(key, req, tx, backingStore, stagedWrites, failures);

                  return req;
                },

                getAll(): MinimalIdbRequest<unknown[]> {
                  const req: ControllableRequest<unknown[]> = {
                    result: [],
                    error: null,
                    onsuccess: null,
                    onerror: null,
                  };

                  scheduleControllableGetAll(req, tx, backingStore);

                  return req;
                },
              };
            },
          };

          return tx;
        },
        close() {
          // No-op in controllable memory harness
        },
      };

      const openReq: ControllableOpenRequest = {
        result: database,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };

      queueMicrotask(() => {
        if (failures.current.failNextOpen) {
          failures.current.failNextOpen = false;
          openReq.error = {
            name: "InvalidStateError",
            message: "No se pudo abrir IndexedDB (simulado)",
          };
          invokeHandler(openReq.onerror);
          return;
        }
        if (!dbStores.has(DEFAULT_STORE_NAME)) {
          invokeHandler(openReq.onupgradeneeded);
        }
        invokeHandler(openReq.onsuccess);
      });

      return openReq;
    },
  };

  return {
    factory,
    setFailureConfig(nextConfig: ControllableIdbFailureConfig) {
      failures.current = { ...nextConfig };
    },
    setRawRecord(key: string, value: unknown) {
      const store = getOrCreateStore(DEFAULT_DB_NAME, DEFAULT_STORE_NAME);
      store.set(key, value);
    },
    inspectRawStore() {
      return getOrCreateStore(DEFAULT_DB_NAME, DEFAULT_STORE_NAME);
    },
  };
}
