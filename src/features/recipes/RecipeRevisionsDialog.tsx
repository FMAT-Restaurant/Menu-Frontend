import { useEffect, useRef, useState, type FormEvent } from "react";
import type { MenuRepository, Page, RecipeRevision, RecipeSupply } from "../../application/catalog";
import { isGlobalAuthError } from "../../api/globalAuthErrors";
import { formatSupplyUnit } from "../../shared/formatUnit";
import { Icon } from "../../shared/Icon";
import { LoadingState } from "../../shared/LoadingState";
import { useTaskDialog } from "../../shared/useTaskDialog";

export interface RecipeRevisionsRepository {
  listRecipeRevisions: NonNullable<MenuRepository["listRecipeRevisions"]>;
  getRecipeRevision?: MenuRepository["getRecipeRevision"];
}

export interface RecipeRevisionsDialogProps {
  repository: RecipeRevisionsRepository;
  initialRecipeId?: string;
  recipeName?: string;
  currentRevision?: number;
  isDeleted?: boolean;
  onClose(): void;
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const withResponse = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof withResponse.response?.status === "number") return withResponse.response.status;
  if (typeof withResponse.status === "number") return withResponse.status;
  return undefined;
}

function resolveRevisionErrorMessage(error: unknown): string {
  if (isGlobalAuthError(error)) return "";
  if (getHttpStatus(error) === 404) {
    return "No se encontró historial de revisiones para la receta indicada.";
  }
  return "No se pudo cargar el historial de revisiones.";
}

function formatRevisionSupply(supply: RecipeSupply): string {
  const name = supply.inventoryItem?.name ?? supply.inventoryItemId;
  const unit = formatSupplyUnit(supply.inventoryItem?.unit ?? "", supply.quantity);
  return unit ? `${name} (${supply.quantity} ${unit})` : `${name} (${supply.quantity})`;
}

function pickInitialRevision(
  revisions: readonly RecipeRevision[],
  preferredRevision?: number,
): number | null {
  if (revisions.length === 0) return null;
  if (
    preferredRevision !== undefined &&
    revisions.some((item) => item.revision === preferredRevision)
  ) {
    return preferredRevision;
  }
  return revisions.at(-1)?.revision ?? revisions[0].revision;
}

function RevisionLookupForm({
  draftId,
  loading,
  onDraftChange,
  onSubmit,
}: Readonly<{
  draftId: string;
  loading: boolean;
  onDraftChange(value: string): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
}>) {
  return (
    <form className="recipe-revisions-dialog__lookup" onSubmit={onSubmit}>
      <div className="recipe-revisions-dialog__lookup-field">
        <label htmlFor="history-recipe-id">ID de la receta</label>
        <input
          id="history-recipe-id"
          type="text"
          value={draftId}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Ej. demo-recipe-2"
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        className="button button--primary"
        disabled={loading || draftId.trim().length === 0}
      >
        Consultar historial
      </button>
    </form>
  );
}

function RevisionDetailPanel({
  revision,
  detailLoading,
  detailError,
  isCurrent,
  isDeleted,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onRetryDetail,
}: Readonly<{
  revision: RecipeRevision;
  detailLoading: boolean;
  detailError: string;
  isCurrent: boolean;
  isDeleted: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious(): void;
  onNext(): void;
  onRetryDetail(): void;
}>) {
  return (
    <article
      className="recipe-revisions-dialog__detail"
      aria-label={`Detalle de revisión ${revision.revision}`}
      aria-busy={detailLoading}
    >
      <div className="recipe-revisions-dialog__detail-header">
        <div className="recipe-revisions-dialog__detail-title">
          <h3>Revisión {revision.revision}</h3>
          {isCurrent && !isDeleted && (
            <span className="recipe-revisions-dialog__badge recipe-revisions-dialog__badge--current">
              Vigente
            </span>
          )}
          {isDeleted && (
            <span className="recipe-revisions-dialog__badge recipe-revisions-dialog__badge--deleted">
              Receta eliminada
            </span>
          )}
        </div>
        <div className="recipe-revisions-dialog__step-actions">
          <button
            type="button"
            className="button button--secondary"
            disabled={!canGoPrevious || detailLoading}
            onClick={onPrevious}
          >
            Revisión anterior
          </button>
          <button
            type="button"
            className="button button--secondary"
            disabled={!canGoNext || detailLoading}
            onClick={onNext}
          >
            Revisión siguiente
          </button>
        </div>
      </div>

      {detailError && (
        <div className="feedback feedback--error" role="alert">
          {detailError}{" "}
          <button type="button" onClick={onRetryDetail}>
            Reintentar
          </button>
        </div>
      )}

      <dl className="recipe-revisions-dialog__meta">
        <div>
          <dt>Nombre</dt>
          <dd>{revision.name}</dd>
        </div>
        <div>
          <dt>Descripción</dt>
          <dd>{revision.description || "Sin descripción"}</dd>
        </div>
        <div>
          <dt>Instrucciones</dt>
          <dd className="recipe-revisions-dialog__instructions">
            {revision.instructions || "Sin instrucciones"}
          </dd>
        </div>
        <div>
          <dt>Insumos</dt>
          <dd>
            {revision.supplies.length === 0 ? (
              "Ninguno"
            ) : (
              <ul className="recipe-revisions-dialog__supplies">
                {revision.supplies.map((supply) => (
                  <li key={supply.inventoryItemId}>{formatRevisionSupply(supply)}</li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}

interface RevisionBrowserBodyProps {
  revisions: RecipeRevision[];
  revisionsPage: Page<RecipeRevision>;
  selectedRevisionNumber: number | null;
  displayedRevision: RecipeRevision | undefined;
  effectiveCurrentRevision: number | undefined;
  isDeleted: boolean;
  listLoading: boolean;
  detailLoading: boolean;
  detailError: string;
  page: number;
  onSelectRevision(revisionNumber: number): void;
  onPageChange(nextPage: number): void;
  onRetryDetail(): void;
}

function RevisionBrowserBody({
  revisions,
  revisionsPage,
  selectedRevisionNumber,
  displayedRevision,
  effectiveCurrentRevision,
  isDeleted,
  listLoading,
  detailLoading,
  detailError,
  page,
  onSelectRevision,
  onPageChange,
  onRetryDetail,
}: Readonly<RevisionBrowserBodyProps>) {
  const selectedIndex = revisions.findIndex((item) => item.revision === selectedRevisionNumber);
  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex !== -1 && selectedIndex < revisions.length - 1;

  return (
    <div className="recipe-revisions-dialog__browser">
      <div className="recipe-revisions-dialog__sidebar">
        <nav aria-label="Lista de revisiones">
          <ul className="recipe-revisions-dialog__list">
            {revisions.map((item) => {
              const selected = item.revision === selectedRevisionNumber;
              const isCurrent = !isDeleted && item.revision === effectiveCurrentRevision;
              return (
                <li key={item.revision}>
                  <button
                    type="button"
                    className={`recipe-revisions-dialog__item${selected ? " recipe-revisions-dialog__item--active" : ""}`}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => onSelectRevision(item.revision)}
                  >
                    <span className="recipe-revisions-dialog__item-number">
                      Revisión {item.revision}
                    </span>
                    <span className="recipe-revisions-dialog__item-name">{item.name}</span>
                    {isCurrent && (
                      <span className="recipe-revisions-dialog__badge recipe-revisions-dialog__badge--current">
                        Vigente
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {revisionsPage.meta.totalPages > 1 && (
          <nav className="pagination" aria-label="Páginas de revisiones">
            <button
              type="button"
              className="button button--secondary"
              disabled={page <= 1 || listLoading}
              onClick={() => onPageChange(page - 1)}
              aria-label="Página anterior de revisiones"
            >
              Anterior
            </button>
            <span className="pagination__info">
              Página {revisionsPage.meta.page} de {revisionsPage.meta.totalPages}
            </span>
            <button
              type="button"
              className="button button--secondary"
              disabled={page >= revisionsPage.meta.totalPages || listLoading}
              onClick={() => onPageChange(page + 1)}
              aria-label="Siguiente página de revisiones"
            >
              Siguiente
            </button>
          </nav>
        )}
      </div>

      {displayedRevision && (
        <RevisionDetailPanel
          revision={displayedRevision}
          detailLoading={detailLoading}
          detailError={detailError}
          isCurrent={displayedRevision.revision === effectiveCurrentRevision}
          isDeleted={isDeleted}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onPrevious={() => {
            if (canGoPrevious) onSelectRevision(revisions[selectedIndex - 1].revision);
          }}
          onNext={() => {
            if (canGoNext) onSelectRevision(revisions[selectedIndex + 1].revision);
          }}
          onRetryDetail={onRetryDetail}
        />
      )}
    </div>
  );
}

export function RecipeRevisionsDialog({
  repository,
  initialRecipeId,
  recipeName,
  currentRevision,
  isDeleted = false,
  onClose,
}: Readonly<RecipeRevisionsDialogProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useTaskDialog(dialogRef, true, closeButtonRef);

  const [draftRecipeId, setDraftRecipeId] = useState(initialRecipeId ?? "");
  const [targetRecipeId, setTargetRecipeId] = useState(initialRecipeId?.trim() ?? "");
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const [detailRetryCount, setDetailRetryCount] = useState(0);

  const [revisionsPage, setRevisionsPage] = useState<Page<RecipeRevision> | null>(null);
  const [listLoading, setListLoading] = useState(Boolean(initialRecipeId?.trim()));
  const [listError, setListError] = useState("");

  const [selectedRevisionNumber, setSelectedRevisionNumber] = useState<number | null>(null);
  const [loadedRevisionDetail, setLoadedRevisionDetail] = useState<RecipeRevision | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    if (!targetRecipeId) {
      setRevisionsPage(null);
      setListLoading(false);
      setListError("");
      setSelectedRevisionNumber(null);
      setLoadedRevisionDetail(null);
      return undefined;
    }

    const controller = new AbortController();
    setListLoading(true);
    setListError("");

    repository
      .listRecipeRevisions(targetRecipeId, { page, pageSize: 12 }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setRevisionsPage(result);
        setSelectedRevisionNumber((previous) => {
          if (previous !== null && result.data.some((item) => item.revision === previous)) {
            return previous;
          }
          return pickInitialRevision(result.data, currentRevision);
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setRevisionsPage(null);
        setSelectedRevisionNumber(null);
        setLoadedRevisionDetail(null);
        setListError(resolveRevisionErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setListLoading(false);
        }
      });

    return () => controller.abort();
  }, [repository, targetRecipeId, page, retryCount, currentRevision]);

  useEffect(() => {
    const getRevision = repository.getRecipeRevision;
    if (!targetRecipeId || selectedRevisionNumber === null || !getRevision) {
      setLoadedRevisionDetail(null);
      setDetailLoading(false);
      setDetailError("");
      return undefined;
    }

    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError("");

    getRevision(targetRecipeId, selectedRevisionNumber, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) {
          setLoadedRevisionDetail(detail);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setDetailError(resolveRevisionErrorMessage(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
        }
      });

    return () => controller.abort();
  }, [repository, targetRecipeId, selectedRevisionNumber, detailRetryCount]);

  const revisions = revisionsPage?.data ?? [];
  const selectedFromList = revisions.find((item) => item.revision === selectedRevisionNumber);
  const displayedRevision =
    loadedRevisionDetail?.revision === selectedRevisionNumber &&
    loadedRevisionDetail.recipeId === targetRecipeId
      ? loadedRevisionDetail
      : selectedFromList;

  const resolvedTitleName = recipeName ?? revisions.at(-1)?.name;
  const dialogTitle = resolvedTitleName
    ? `Historial de ${resolvedTitleName}`
    : "Historial de revisiones";
  const effectiveCurrentRevision =
    currentRevision ?? (!isDeleted ? revisions.at(-1)?.revision : undefined);

  function handleLookupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draftRecipeId.trim();
    if (!trimmed) return;
    setSelectedRevisionNumber(null);
    setLoadedRevisionDetail(null);
    setPage(1);
    if (trimmed === targetRecipeId) {
      setRetryCount((count) => count + 1);
    } else {
      setTargetRecipeId(trimmed);
    }
  }

  return (
    <div className="dialog-backdrop">
      <dialog
        ref={dialogRef}
        className="recipe-revisions-dialog menu-task-dialog"
        aria-labelledby="recipe-revisions-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) onClose();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <div className="recipe-revisions-dialog__header">
          <div className="recipe-revisions-dialog__header-title">
            <h2 id="recipe-revisions-title">{dialogTitle}</h2>
            {targetRecipeId && (
              <p className="recipe-revisions-dialog__subtitle">
                ID: <code>{targetRecipeId}</code>
                {isDeleted && " · Receta eliminada · Historial conservado"}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="recipe-form-dialog__close"
            aria-label="Cerrar historial"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="recipe-revisions-dialog__body">
          {!initialRecipeId && (
            <RevisionLookupForm
              draftId={draftRecipeId}
              loading={listLoading}
              onDraftChange={setDraftRecipeId}
              onSubmit={handleLookupSubmit}
            />
          )}

          {listError && (
            <div className="feedback feedback--error" role="alert">
              {listError}{" "}
              {targetRecipeId && (
                <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
                  Reintentar
                </button>
              )}
            </div>
          )}

          {listLoading && !revisionsPage && (
            <LoadingState variant="recipe-rows" label="Cargando historial de revisiones…" />
          )}

          {!listLoading && !listError && targetRecipeId && revisionsPage && revisions.length === 0 && (
            <p className="feedback">Esta receta aún no registra revisiones publicadas.</p>
          )}

          {revisionsPage && revisions.length > 0 && (
            <RevisionBrowserBody
              revisions={revisions}
              revisionsPage={revisionsPage}
              selectedRevisionNumber={selectedRevisionNumber}
              displayedRevision={displayedRevision}
              effectiveCurrentRevision={effectiveCurrentRevision}
              isDeleted={isDeleted}
              listLoading={listLoading}
              detailLoading={detailLoading}
              detailError={detailError}
              page={page}
              onSelectRevision={setSelectedRevisionNumber}
              onPageChange={setPage}
              onRetryDetail={() => setDetailRetryCount((count) => count + 1)}
            />
          )}
        </div>
      </dialog>
    </div>
  );
}
