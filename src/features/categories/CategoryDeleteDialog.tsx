import { useCallback, useEffect, useRef, useState } from "react";
import { contractErrorResponse } from "../../api/catalogResponse";
import {
  analyzeNonIdempotentWriteError,
  extractHttpFailureContext,
} from "../../api/idempotencyResponse";
import type { MenuCategory, MenuRepository, VersionedResource } from "../../application/catalog";
import { isStrongEtag } from "../../application/entryVersion";
import { useTaskDialog } from "../../shared/useTaskDialog";

export type CategoryDeleteRepository = Pick<MenuRepository, "getCategory" | "deleteCategory">;

/** Results that end the confirmation; the page re-queries the list for all of them. */
export type CategoryDeleteOutcome =
  | { kind: "deleted"; name: string }
  | { kind: "missing" }
  | { kind: "unconfirmed" };

type CategoryDeleteFailure =
  | { kind: "conflict"; message: string }
  | { kind: "rejected"; message: string }
  | { kind: "missing" }
  | { kind: "unconfirmed" };

type VersionState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; resource: VersionedResource<MenuCategory> };

/** Responses that guarantee the server applied nothing, so the user can decide again in place. */
function safeRejectionMessage(status: number | null): string | undefined {
  switch (status) {
    case 401:
      return "Tu sesión no es válida. Inicia sesión de nuevo para eliminar la categoría.";
    case 403:
      return "No tienes permisos para eliminar esta categoría.";
    case 429:
      return "Se enviaron demasiadas solicitudes. Intenta de nuevo en un momento.";
    default:
      return undefined;
  }
}

function categoryDeleteFailure(error: unknown): CategoryDeleteFailure {
  const context = extractHttpFailureContext(error);
  const analysis = analyzeNonIdempotentWriteError(error);
  const serverMessage = contractErrorResponse(context.rawBody)?.message;
  if (analysis.kind === "precondition_conflict") {
    return {
      kind: "conflict",
      message:
        serverMessage ??
        "La categoría cambió desde que la consultaste. Revisa los datos actuales y confirma de nuevo.",
    };
  }
  if (analysis.status === 404) return { kind: "missing" };
  const rejection = safeRejectionMessage(analysis.status);
  if (rejection) return { kind: "rejected", message: serverMessage ?? rejection };
  return { kind: "unconfirmed" };
}

interface CategoryDeleteDialogProps {
  category: MenuCategory;
  repository: CategoryDeleteRepository;
  formatEntryCount(entryCount?: number): string;
  onCancel(): void;
  onSettled(outcome: CategoryDeleteOutcome): void;
}

export function CategoryDeleteDialog({
  category,
  repository,
  formatEntryCount,
  onCancel,
  onSettled,
}: Readonly<CategoryDeleteDialogProps>) {
  const [version, setVersion] = useState<VersionState>({ status: "loading" });
  const [deleting, setDeleting] = useState(false);
  const [failure, setFailure] = useState("");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useTaskDialog(dialogRef, true, cancelRef);
  const activeRef = useRef(true);
  const versionRequestRef = useRef<AbortController | null>(null);
  // State updates are asynchronous: the ref is what stops a second click from sending another DELETE.
  const deletingRef = useRef(false);

  const loadVersion = useCallback(() => {
    versionRequestRef.current?.abort();
    const controller = new AbortController();
    versionRequestRef.current = controller;
    setVersion({ status: "loading" });
    repository.getCategory(category.id, controller.signal).then(
      (resource) => {
        if (!controller.signal.aborted) setVersion({ status: "ready", resource });
      },
      () => {
        if (!controller.signal.aborted) setVersion({ status: "failed" });
      },
    );
  }, [repository, category.id]);

  useEffect(() => {
    activeRef.current = true;
    loadVersion();
    return () => {
      activeRef.current = false;
      versionRequestRef.current?.abort();
    };
  }, [loadVersion]);

  useEffect(() => {
    if (!deleting) return undefined;
    // Chromium closes a modal on a repeated Escape even when its cancel event was prevented.
    const blockEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") event.preventDefault();
    };
    document.addEventListener("keydown", blockEscape, true);
    return () => document.removeEventListener("keydown", blockEscape, true);
  }, [deleting]);

  const current = version.status === "ready" ? version.resource.data : category;
  const etag = version.status === "ready" ? version.resource.etag : undefined;

  let versionProblem = "";
  if (version.status === "failed") {
    versionProblem = "No se pudo consultar la categoría.";
  } else if (version.status === "ready" && !isStrongEtag(etag)) {
    versionProblem =
      "No se recibió la versión de la categoría. Vuelve a consultarla antes de eliminarla.";
  }

  async function confirmDelete() {
    if (deletingRef.current || !isStrongEtag(etag)) return;
    deletingRef.current = true;
    setDeleting(true);
    setFailure("");

    const deleteFailure = await repository.deleteCategory(category.id, etag).then(
      (): CategoryDeleteFailure | null => null,
      categoryDeleteFailure,
    );

    if (!deleteFailure) {
      onSettled({ kind: "deleted", name: current.name });
      return;
    }
    if (deleteFailure.kind === "missing" || deleteFailure.kind === "unconfirmed") {
      onSettled({ kind: deleteFailure.kind });
      return;
    }

    deletingRef.current = false;
    if (!activeRef.current) return;
    setDeleting(false);
    setFailure(deleteFailure.message);
    // A conflict never retries by itself: the user confirms again with the reloaded version.
    if (deleteFailure.kind === "conflict") loadVersion();
  }

  return (
    <div className="dialog-backdrop">
      <dialog
        ref={dialogRef}
        className="confirm-dialog menu-task-dialog"
        aria-labelledby="category-delete-title"
        onCancel={(event) => {
          if (deleting) {
            event.preventDefault();
            return;
          }
          onCancel();
        }}
      >
        <h2 id="category-delete-title">¿Eliminar categoría?</h2>
        <p>Se eliminará la categoría &quot;{current.name}&quot;.</p>
        {version.status === "loading" && (
          <output className="feedback">Consultando los datos actuales de la categoría…</output>
        )}
        {version.status === "ready" && <p>{formatEntryCount(current.entryCount)}.</p>}
        <p>
          Las entradas no se eliminan: solo dejan de pertenecer a esta categoría. Esta acción no se
          puede deshacer.
        </p>
        {versionProblem && (
          <p className="feedback feedback--error" role="alert">
            {versionProblem}{" "}
            <button type="button" onClick={loadVersion}>Reintentar</button>
          </p>
        )}
        {failure && <p className="feedback feedback--error" role="alert">{failure}</p>}
        <div className="confirm-dialog__actions">
          <button
            ref={cancelRef}
            type="button"
            className="button button--secondary"
            disabled={deleting}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="button button--danger"
            disabled={deleting || !isStrongEtag(etag)}
            onClick={() => {
              void confirmDelete();
            }}
          >
            {deleting ? "Eliminando…" : "Eliminar categoría"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
