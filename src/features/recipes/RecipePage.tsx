import { LoadingState } from "../../shared/LoadingState";
import { ToastNotification, useNotification } from "../../shared/ToastNotification";
import { useTaskDialog } from "../../shared/useTaskDialog";
import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type {
  MenuRepository,
  Page,
  RecipeDetail,
  RecipeDraft,
  RecipeSummary,
  VersionedResource,
} from "../../application/catalog";
import type {
  PendingOperationChainRecord,
  PendingOperationStorageAdapter,
} from "../../application/operationAttempt";
import { SearchField } from "../../shared/SearchField";
import { Icon } from "../../shared/Icon";
import { usePermission } from "../../shared/permissions";
import { analyzeNonIdempotentWriteError } from "../../api/idempotencyResponse";
import { isGlobalAuthError } from "../../api/globalAuthErrors";
import { createIndexedDbPendingOperationStorage } from "../../shared/pendingOperationStorage";
import { RecipeCard } from "./RecipeCard";
import { RecipeFormDialog, buildRecipeCreateScope } from "./RecipeFormDialog";
import { RecipeRevisionsDialog } from "./RecipeRevisionsDialog";
import "./styles.css";

export type RecipeRepository = Pick<
  MenuRepository,
  "listRecipes" | "getRecipe" | "createRecipe" | "updateRecipe" | "deleteRecipe" | "listInventoryItems"
> &
  Partial<Pick<MenuRepository, "listRecipeRevisions" | "getRecipeRevision">>;

interface RecipeHistoryTarget {
  recipeId?: string;
  recipeName?: string;
  currentRevision?: number;
  isDeleted?: boolean;
}

export interface RecipePageProps {
  repository: RecipeRepository;
  mode?: "management" | "selection";
  onSelectRecipe?: (recipe: RecipeSummary) => void;
  onClose?: () => void;
  storage?: PendingOperationStorageAdapter;
  nestedContext?: Readonly<Record<string, unknown>>;
}

interface RecipeResultsContentProps {
  actionError: string;
  showActionError: boolean;
  error: string;
  onRetry(): void;
  loading: boolean;
  hasResults: boolean;
  mode: "management" | "selection";
  canWrite: boolean;
  olderResults: boolean;
  displayedContext: { query: string; page: number } | null;
  recipes: RecipeSummary[];
  confirmedQuery: string;
  onClearSearch(): void;
  onCreate(): void;
  resultsBusy: boolean;
  onSelect(recipe: RecipeSummary): void;
  onEdit(recipe: RecipeSummary): void;
  onDelete(recipe: RecipeSummary): void;
  onViewHistory?: (recipe: RecipeSummary) => void;
  recipesResult: Page<RecipeSummary> | null;
  currentPage: number;
  onPageChange(page: number): void;
}

function RecipeResultsContent({
  actionError, showActionError, error, onRetry, loading, hasResults, mode, canWrite,
  olderResults, displayedContext, recipes, confirmedQuery, onClearSearch, onCreate,
  resultsBusy, onSelect, onEdit, onDelete, onViewHistory, recipesResult, currentPage, onPageChange,
}: Readonly<RecipeResultsContentProps>) {
  return <>
    {showActionError && <div className="feedback feedback--error" role="alert">{actionError}</div>}
    {error && <div className="feedback feedback--error" role="alert">{error} <button type="button" onClick={onRetry}>Reintentar</button></div>}
    {loading && !hasResults && <LoadingState variant={mode === "selection" ? "recipe-selection" : "recipe-rows"} label="Cargando recetas…" />}
    {loading && hasResults && <output className="feedback">Actualizando recetas…</output>}
    {olderResults && <p className="feedback">Resultados anteriores: {displayedContext?.query ? `búsqueda “${displayedContext.query}”` : "todas las recetas"}, página {displayedContext?.page}. La nueva consulta aún no se ha confirmado.</p>}
    {!loading && !error && !olderResults && recipes.length === 0 && <RecipeEmptyState query={confirmedQuery} onClearSearch={onClearSearch} onCreate={onCreate} canCreate={canWrite} />}
    {recipes.length > 0 && <RecipeResultList
      recipes={recipes}
      mode={mode}
      resultsBusy={resultsBusy}
      onSelect={onSelect}
      onEdit={onEdit}
      onDelete={onDelete}
      onViewHistory={onViewHistory}
      canWrite={canWrite}
      recipesResult={recipesResult}
      currentPage={currentPage}
      onPageChange={onPageChange}
    />}
  </>;
}

function DeletedRecipesHistoryBar({
  deletedRecipes,
  onViewDeletedHistory,
}: Readonly<{
  deletedRecipes: readonly RecipeSummary[];
  onViewDeletedHistory(recipe: RecipeSummary): void;
}>) {
  if (deletedRecipes.length === 0) return null;
  return (
    <section className="deleted-recipes-history" aria-label="Recetas eliminadas recientemente">
      <div className="deleted-recipes-history__header">
        <h2>Recetas eliminadas recientemente</h2>
        <p>El historial de revisiones se conserva para consulta.</p>
      </div>
      <ul className="deleted-recipes-history__list">
        {deletedRecipes.map((recipe) => (
          <li key={recipe.id} className="deleted-recipes-history__item">
            <div className="deleted-recipes-history__info">
              <strong>{recipe.name}</strong>
              {recipe.revision !== undefined && (
                <span className="recipe-card__revision">Revisión {recipe.revision}</span>
              )}
              <span className="deleted-recipes-history__id">ID: {recipe.id}</span>
            </div>
            <button
              type="button"
              className="button button--secondary"
              aria-label={`Ver historial de ${recipe.name}`}
              onClick={() => onViewDeletedHistory(recipe)}
            >
              Historial conservado
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecipeEmptyState({ query, onClearSearch, onCreate, canCreate }: Readonly<{
  query: string;
  onClearSearch(): void;
  onCreate(): void;
  canCreate: boolean;
}>) {
  return <div className="empty-state category-empty">
    <span className="empty-state__icon" aria-hidden="true"><Icon name="search" /></span>
    <h3>{query ? "No hay recetas que coincidan con tu búsqueda." : "Aún no hay recetas registradas."}</h3>
    <p>{query
      ? `No encontramos resultados para “${query}”. Cambia el término o limpia la búsqueda.`
      : "Crea una receta para asociar insumos y pasos de preparación."}</p>
    {query
      ? <button type="button" className="button button--secondary" onClick={onClearSearch}>Limpiar búsqueda</button>
      : canCreate ? <button className="button button--primary" type="button" onClick={onCreate}>Crear receta</button> : null}
  </div>;
}

function RecipeResultList({
  recipes, mode, resultsBusy, onSelect, onEdit, onDelete, onViewHistory, canWrite, recipesResult, currentPage, onPageChange,
}: Readonly<{
  recipes: RecipeSummary[];
  mode: "management" | "selection";
  resultsBusy: boolean;
  onSelect(recipe: RecipeSummary): void;
  onEdit(recipe: RecipeSummary): void;
  onDelete(recipe: RecipeSummary): void;
  onViewHistory?: (recipe: RecipeSummary) => void;
  canWrite: boolean;
  recipesResult: Page<RecipeSummary> | null;
  currentPage: number;
  onPageChange(page: number): void;
}>) {
  return <>
    <ul className="recipe-list">
      {recipes.map((recipe) => <li key={recipe.id} className="recipe-list__item">
        {mode === "selection"
          ? <RecipeCard recipe={recipe} mode="selection" onSelect={onSelect} isBusy={resultsBusy} />
          : <RecipeCard recipe={recipe} mode="management" onEdit={onEdit} onDelete={onDelete} onViewHistory={onViewHistory} isBusy={resultsBusy} canWrite={canWrite} />}
      </li>)}
    </ul>
    {recipesResult && recipesResult.meta.totalPages > 1 && <nav className="pagination" aria-label="Páginas de recetas">
      <button type="button" className="button button--secondary" disabled={(recipesResult.meta.page ?? 1) <= 1 || resultsBusy} onClick={() => onPageChange(currentPage - 1)} aria-label="Página anterior">Anterior</button>
      <span className="pagination__info">Página {recipesResult.meta.page} de {recipesResult.meta.totalPages}</span>
      <button type="button" className="button button--secondary" disabled={recipesResult.meta.page >= recipesResult.meta.totalPages || resultsBusy} onClick={() => onPageChange(currentPage + 1)} aria-label="Siguiente página">Siguiente</button>
    </nav>}
  </>;
}

function recipeDeleteFailure(error: unknown): { message: string; uncertain: boolean; blocked?: boolean } {
  const analysis = analyzeNonIdempotentWriteError(error);
  if (analysis.kind === "resource_in_use") {
    return { message: "No se puede eliminar la receta porque está referenciada por una oferta vigente.", uncertain: false, blocked: true };
  }
  if (analysis.kind === "precondition_conflict") {
    return { message: analysis.message || "No se pudo eliminar la receta debido a un conflicto de versión. Actualiza la lista e inténtalo de nuevo.", uncertain: false };
  }
  if ((analysis.status === 401 || analysis.status === 403) && isGlobalAuthError(error)) {
    return { message: "", uncertain: false };
  }
  if (analysis.status === 403) {
    return { message: analysis.message || "No tienes permisos para eliminar esta receta.", uncertain: false };
  }
  if (analysis.kind === "uncertain_outcome" || analysis.kind === "uncertain_write_response") {
    return { message: "No se pudo confirmar la eliminación. Se consultó la lista para verificar el estado actual.", uncertain: true };
  }
  return { message: analysis.message || "No se pudo eliminar la receta. Inténtalo de nuevo.", uncertain: false };
}

interface RecipeDeleteDialogProps {
  recipe: RecipeSummary;
  actionError: string;
  isDeleting: boolean;
  deleteBlocked: boolean;
  dialogRef: Ref<HTMLDialogElement>;
  cancelRef: Ref<HTMLButtonElement>;
  onCancel(): void;
  onConfirm(): void;
}

function RecipeDeleteDialog({ recipe, actionError, isDeleting, deleteBlocked, dialogRef, cancelRef, onCancel, onConfirm }: Readonly<RecipeDeleteDialogProps>) {
  return <div className="dialog-backdrop">
    <dialog ref={dialogRef} className="confirm-dialog menu-task-dialog" aria-labelledby="confirm-delete-title" onCancel={(event) => {
      if (isDeleting) {
        event.preventDefault();
        return;
      }
      onCancel();
    }}>
      <h2 id="confirm-delete-title">¿Eliminar receta?</h2>
      <p>¿Estás seguro de que deseas eliminar la receta &quot;{recipe.name}&quot;? Esta acción no se puede deshacer.</p>
      {actionError && <p className="feedback feedback--error" role="alert">{actionError}</p>}
      {deleteBlocked && <p>Quita las referencias a esta receta en las ofertas vigentes y vuelve a abrir este diálogo para intentar eliminarla.</p>}
      <div className="confirm-dialog__actions">
        <button ref={cancelRef} type="button" className="button button--secondary" disabled={isDeleting} onClick={onCancel}>Cancelar</button>
        <button type="button" className="button button--danger" disabled={isDeleting || deleteBlocked} onClick={onConfirm}>
          {isDeleting ? "Eliminando…" : "Eliminar receta"}
        </button>
      </div>
    </dialog>
  </div>;
}

interface RecipePageHeaderProps {
  mode: "management" | "selection";
  onClose?: () => void;
  returnTo: string;
  title: string;
  subtitle: string;
  onCreate(): void;
  canCreate: boolean;
}

function RecipePageHeader({ mode, onClose, returnTo, title, subtitle, onCreate, canCreate }: Readonly<RecipePageHeaderProps>) {
  const cancelAction = <><Icon name="close" /> Cancelar</>;
  const menuAction = <><Icon name="arrow-left" /> Volver al menú</>;
  let backLabel = menuAction;
  if (mode === "selection") backLabel = cancelAction;
  else if (onClose) backLabel = <>Volver al menú</>;

  return <header className="task-header category-screen__header">
    {onClose ? (
      <button type="button" className="button button--quiet category-screen__back" onClick={onClose}>
        {backLabel}
      </button>
    ) : (
      <Link className="back-link category-screen__back" to={returnTo}>
        {backLabel}
      </Link>
    )}
    <div className="task-header__row">
      <div className="task-header__content">
        <p className="eyebrow">Recetas</p>
        <h1 id="recipe-page-title" data-route-heading={onClose ? undefined : true} tabIndex={-1}>{title}</h1>
        <p className="task-header__intro">{subtitle}</p>
      </div>
      {canCreate && <button className="button button--primary" type="button" aria-label="+ Nueva receta" onClick={onCreate}>
        <Icon name="add" /> Nueva receta
      </button>}
    </div>
  </header>;
}

export function RecipePage({
  repository,
  mode: propMode,
  onSelectRecipe,
  onClose,
  storage: providedStorage,
  nestedContext,
}: Readonly<RecipePageProps>) {
  const [fallbackStorage] = useState(createIndexedDbPendingOperationStorage);
  const storage = providedStorage ?? fallbackStorage;
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const mode = propMode ?? (searchParams.get("mode") === "selection" ? "selection" : "management");
  const canRead = usePermission("menu:recipes:read");
  const canWrite = usePermission("menu:recipes:write");

  const returnTo =
    typeof location.state?.returnTo === "string" && /^\/(?:\?.*)?$/.test(location.state.returnTo)
      ? location.state.returnTo
      : "/";

  // URL-driven query and page state when not controlled via propMode
  const urlQ = searchParams.get("q") ?? "";
  const urlPage = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  // Local query and page state when propMode is supplied (e.g. selection modal)
  const [localQuery, setLocalQuery] = useState("");
  const [localPage, setLocalPage] = useState(1);

  const confirmedQuery = propMode ? localQuery : urlQ;
  const currentPage = propMode ? localPage : urlPage;

  const [draftSearch, setDraftSearch] = useState(confirmedQuery);

  const [recipesResult, setRecipesResult] = useState<Page<RecipeSummary> | null>(null);
  const [displayedContext, setDisplayedContext] = useState<{ query: string; page: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { notification, notify, clear: clearNotification } = useNotification();
  const [retry, setRetry] = useState(0);

  const [editingRecipe, setEditingRecipe] = useState<RecipeDetail | RecipeSummary | "new" | null>(null);
  const [openingResource, setOpeningResource] = useState<VersionedResource<RecipeDetail>>();
  const [initialPendingRecord, setInitialPendingRecord] =
    useState<PendingOperationChainRecord<RecipeDraft> | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<RecipeSummary | null>(null);
  const [actionError, setActionError] = useState("");
  const [deleteFailure, setDeleteFailure] = useState<ReturnType<typeof recipeDeleteFailure> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedRecipes, setDeletedRecipes] = useState<RecipeSummary[]>([]);
  const [historyTarget, setHistoryTarget] = useState<RecipeHistoryTarget | null>(() => {
    const initialHistoryId = !propMode ? searchParams.get("history")?.trim() : undefined;
    return initialHistoryId ? { recipeId: initialHistoryId } : null;
  });

  const openingRecipeIdRef = useRef<string | null>(null);
  const openingControllerRef = useRef<AbortController | null>(null);

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = useRef<HTMLElement | null>(null);
  const previousRecipeToDeleteRef = useRef<RecipeSummary | null>(null);

  useEffect(() => {
    if (previousRecipeToDeleteRef.current && !recipeToDelete) {
      const target =
        deleteTriggerRef.current ??
        document.querySelector<HTMLElement>(
          `button[aria-label="Eliminar ${previousRecipeToDeleteRef.current.name}"]`,
        );
      target?.focus();
    }
    previousRecipeToDeleteRef.current = recipeToDelete;
  }, [recipeToDelete]);

  useEffect(() => {
    if (!canRead || !canWrite) return undefined;
    let cancelled = false;
    storage
      .getRecord<RecipeDraft>(buildRecipeCreateScope())
      .then((record) => {
        if (cancelled || !record) return;
        const currentStage = record.stages[record.currentStageIndex];
        if (currentStage && (currentStage.status !== "succeeded" || record.confirmedResult)) {
          setInitialPendingRecord(record);
          setEditingRecipe("new");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storage, canRead, canWrite]);

  useEffect(() => {
    setDraftSearch(confirmedQuery);
  }, [confirmedQuery]);

  useEffect(() => {
    if (!canRead) {
      setRecipesResult(null);
      setDisplayedContext(null);
      setLoading(false);
      setError("");
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");

    repository
      .listRecipes(
        {
          q: confirmedQuery || undefined,
          page: currentPage,
          pageSize: 50,
        },
        controller.signal,
      )
      .then((items) => {
        if (!controller.signal.aborted) {
          setRecipesResult(items);
          setDisplayedContext({ query: confirmedQuery, page: currentPage });
        }
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(isGlobalAuthError(loadError) ? "" : "No se pudieron cargar las recetas.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [repository, confirmedQuery, currentPage, retry, canRead]);

  useTaskDialog(deleteDialogRef, Boolean(recipeToDelete), cancelDeleteRef);

  useEffect(() => {
    if (!recipeToDelete) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isDeleting) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        handleDeleteCancel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [recipeToDelete, isDeleting]);

  function handleSearchSubmit() {
    clearNotification();
    const trimmed = draftSearch.trim();
    if (propMode) {
      setLocalQuery(trimmed);
      setLocalPage(1);
    } else {
      const nextParams = new URLSearchParams(searchParams);
      if (trimmed) nextParams.set("q", trimmed);
      else nextParams.delete("q");
      nextParams.set("page", "1");
      setSearchParams(nextParams);
    }
  }

  function handlePageChange(newPage: number) {
    clearNotification();
    if (propMode) {
      setLocalPage(newPage);
    } else {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("page", String(newPage));
      setSearchParams(nextParams);
    }
  }

  function clearSearch() {
    clearNotification();
    setDraftSearch("");
    if (propMode) {
      setLocalQuery("");
      setLocalPage(1);
    } else {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("q");
      nextParams.set("page", "1");
      setSearchParams(nextParams);
    }
    document.getElementById("recipe-search")?.focus();
  }

  async function handleOpenEdit(recipe: RecipeSummary) {
    if (!canRead || !canWrite) return;
    openingControllerRef.current?.abort();
    const controller = new AbortController();
    openingControllerRef.current = controller;
    openingRecipeIdRef.current = recipe.id;
    setActionError("");

    try {
      const versioned = await repository.getRecipe(recipe.id, controller.signal);
      if (controller.signal.aborted || openingRecipeIdRef.current !== recipe.id) return;
      setEditingRecipe(versioned.data);
      setOpeningResource(versioned);
    } catch {
      if (controller.signal.aborted || openingRecipeIdRef.current !== recipe.id) return;
      setActionError("No se pudo cargar el detalle completo de la receta.");
    }
  }

  function handleRecipeCreated(created: RecipeDetail) {
    notify("Receta creada exitosamente.");
    setEditingRecipe(null);
    setInitialPendingRecord(null);
    openingRecipeIdRef.current = null;
    setRetry((r) => r + 1);

    if (mode === "selection") {
      if (onSelectRecipe) {
        onSelectRecipe(created);
      } else {
        void navigate(returnTo, { state: { selectedRecipe: created } });
      }
    }
  }

  function handleRecipeCreatedWithPendingEdits() {
    notify("Receta creada exitosamente. Continuando con las ediciones locales.");
    setRetry((r) => r + 1);
  }

  function handleRecipeUpdated() {
    notify("Receta actualizada exitosamente.");
    setEditingRecipe(null);
    setInitialPendingRecord(null);
    openingRecipeIdRef.current = null;
    setRetry((r) => r + 1);
  }

  async function handleConfirmDelete() {
    if (!canRead || !canWrite || !recipeToDelete || isDeleting || deleteFailure?.blocked) return;
    setIsDeleting(true);
    setDeleteFailure(null);

    try {
      const deletedSnapshot = recipeToDelete;
      await repository.deleteRecipe(deletedSnapshot.id);
      setDeletedRecipes((previous) => [
        deletedSnapshot,
        ...previous.filter((item) => item.id !== deletedSnapshot.id),
      ]);
      notify(`Receta "${deletedSnapshot.name}" eliminada.`);
      setRecipeToDelete(null);
      setRetry((r) => r + 1);
      deleteTriggerRef.current?.focus();
    } catch (err) {
      const failure = recipeDeleteFailure(err);
      if (failure.uncertain) {
        setRecipeToDelete(null);
        setRetry((r) => r + 1);
        setActionError(failure.message);
        deleteTriggerRef.current?.focus();
      } else {
        setDeleteFailure(failure);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSelect(recipe: RecipeSummary) {
    if (onSelectRecipe) {
      onSelectRecipe(recipe);
    } else {
      void navigate(returnTo, { state: { selectedRecipe: recipe } });
    }
  }

  function handleStartCreate() {
    if (!canRead || !canWrite) return;
    openingRecipeIdRef.current = null;
    setEditingRecipe("new");
  }

  function handleDeleteRequest(recipe: RecipeSummary) {
    if (!canRead || !canWrite) return;
    deleteTriggerRef.current =
      (document.activeElement as HTMLElement | null) ??
      document.querySelector<HTMLElement>(`button[aria-label="Eliminar ${recipe.name}"]`);
    setActionError("");
    setDeleteFailure(null);
    setRecipeToDelete(recipe);
  }

  function handleDeleteCancel() {
    setDeleteFailure(null);
    setRecipeToDelete(null);
    deleteTriggerRef.current?.focus();
  }

  function handleDeleteConfirm() {
    void handleConfirmDelete();
  }

  function handleCloseHistory() {
    setHistoryTarget(null);
    if (!propMode && searchParams.has("history")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("history");
      setSearchParams(nextParams);
    }
  }

  const revisionsRepository = useMemo(() => {
    if (!repository.listRecipeRevisions) return null;
    return {
      listRecipeRevisions: repository.listRecipeRevisions.bind(repository),
      getRecipeRevision: repository.getRecipeRevision?.bind(repository),
    };
  }, [repository]);
  const canConsultHistory = canRead && mode === "management" && revisionsRepository !== null;

  const recipes = recipesResult?.data ?? [];
  const olderResults = Boolean(displayedContext && (displayedContext.query !== confirmedQuery || displayedContext.page !== currentPage));
  const resultsBusy = loading || olderResults;
  const title = mode === "selection" ? "Biblioteca de recetas — elegir opción" : "Biblioteca de recetas";
  const recipeDialogKey = editingRecipe === "new"
    ? initialPendingRecord?.storageKey ?? "new"
    : editingRecipe?.id;
  const subtitle =
    mode === "selection"
      ? "Selecciona una receta para asignarla a la opción de la oferta."
      : "Consulta y administra las recetas base y sus insumos.";

  return (
    <div className="category-screen recipe-screen">
      <main className="menu-page category-screen__main">
      <RecipePageHeader
        mode={mode}
        onClose={onClose}
        returnTo={returnTo}
        title={title}
        subtitle={subtitle}
        onCreate={() => { clearNotification(); handleStartCreate(); }}
        canCreate={canRead && canWrite}
      />
        <ToastNotification notification={notification} onDismiss={clearNotification} />
        <section className="category-panel" aria-labelledby="recipe-page-title" aria-busy={loading}>
          {!canRead && <div className="feedback feedback--error" role="alert">No tienes permisos para consultar las recetas.</div>}
          {canRead && <div className={canConsultHistory ? "recipe-toolbar recipe-toolbar--with-actions" : "recipe-toolbar"}>
            <SearchField
              id="recipe-search"
              label="Buscar recetas"
              placeholder="Buscar por nombre o descripción…"
              value={draftSearch}
              onChange={setDraftSearch}
              onSearch={handleSearchSubmit}
            />
            {canConsultHistory && (
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  clearNotification();
                  setHistoryTarget({});
                }}
              >
                Consultar historial por ID
              </button>
            )}
          </div>}

          {canConsultHistory && (
            <DeletedRecipesHistoryBar
              deletedRecipes={deletedRecipes}
              onViewDeletedHistory={(recipe) => {
                clearNotification();
                setHistoryTarget({
                  recipeId: recipe.id,
                  recipeName: recipe.name,
                  currentRevision: recipe.revision,
                  isDeleted: true,
                });
              }}
            />
          )}

          {canRead && <RecipeResultsContent
            actionError={actionError}
            showActionError={!recipeToDelete && Boolean(actionError)}
            error={error}
            onRetry={() => setRetry((r) => r + 1)}
            loading={loading}
            hasResults={Boolean(recipesResult)}
            mode={mode}
            canWrite={canWrite}
            olderResults={olderResults}
            displayedContext={displayedContext}
            recipes={recipes}
            confirmedQuery={confirmedQuery}
            onClearSearch={clearSearch}
            onCreate={() => { clearNotification(); handleStartCreate(); }}
            resultsBusy={resultsBusy}
            onSelect={handleSelect}
            onEdit={(recipe) => { clearNotification(); void handleOpenEdit(recipe); }}
            onDelete={(recipe) => { clearNotification(); handleDeleteRequest(recipe); }}
            onViewHistory={
              canConsultHistory
                ? (recipe) => {
                    clearNotification();
                    setHistoryTarget({
                      recipeId: recipe.id,
                      recipeName: recipe.name,
                      currentRevision: recipe.revision,
                      isDeleted: false,
                    });
                  }
                : undefined
            }
            recipesResult={recipesResult}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />}
        </section>
      </main>

      {canRead && historyTarget && revisionsRepository && (
        <RecipeRevisionsDialog
          repository={revisionsRepository}
          initialRecipeId={historyTarget.recipeId}
          recipeName={historyTarget.recipeName}
          currentRevision={historyTarget.currentRevision}
          isDeleted={historyTarget.isDeleted}
          onClose={handleCloseHistory}
        />
      )}

      {canRead && canWrite && editingRecipe && (
        <RecipeFormDialog
          key={recipeDialogKey}
          recipe={editingRecipe === "new" ? undefined : editingRecipe}
          openingResource={editingRecipe === "new" ? undefined : openingResource}
          repository={repository}
          storage={storage}
          initialPendingRecord={initialPendingRecord}
          nestedContext={nestedContext}
          onClose={() => {
            setEditingRecipe(null);
            setInitialPendingRecord(null);
            openingRecipeIdRef.current = null;
          }}
          onCreated={handleRecipeCreated}
          onCreatedWithPendingEdits={handleRecipeCreatedWithPendingEdits}
          onUpdated={handleRecipeUpdated}
        />
      )}

      {canRead && canWrite && recipeToDelete && <RecipeDeleteDialog
        recipe={recipeToDelete}
        actionError={deleteFailure?.message ?? ""}
        deleteBlocked={Boolean(deleteFailure?.blocked)}
        isDeleting={isDeleting}
        dialogRef={deleteDialogRef}
        cancelRef={cancelDeleteRef}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />}
    </div>
  );
}
