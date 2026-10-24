import { useTaskDialog } from "../../shared/useTaskDialog";
import { useEffect, useRef, useState } from "react";
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
import { analyzeNonIdempotentWriteError } from "../../api/idempotencyResponse";
import { createIndexedDbPendingOperationStorage } from "../../shared/pendingOperationStorage";
import { RecipeCard } from "./RecipeCard";
import { RecipeFormDialog, buildRecipeCreateScope } from "./RecipeFormDialog";
import "./styles.css";

export type RecipeRepository = Pick<
  MenuRepository,
  "listRecipes" | "getRecipe" | "createRecipe" | "updateRecipe" | "deleteRecipe" | "listInventoryItems"
>;

export interface RecipePageProps {
  repository: RecipeRepository;
  mode?: "management" | "selection";
  onSelectRecipe?: (recipe: RecipeSummary) => void;
  onClose?: () => void;
  storage?: PendingOperationStorageAdapter;
  nestedContext?: Readonly<Record<string, unknown>>;
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

  const returnTo =
    typeof location.state?.returnTo === "string" && /^\/(?:\?.*)?$/.test(location.state.returnTo)
      ? location.state.returnTo
      : "/";

  // URL-driven query and page state when not controlled via propMode
  const urlQ = searchParams.get("q") ?? "";
  const urlPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  // Local query and page state when propMode is supplied (e.g. selection modal)
  const [localQuery, setLocalQuery] = useState("");
  const [localPage, setLocalPage] = useState(1);

  const confirmedQuery = propMode ? localQuery : urlQ;
  const currentPage = propMode ? localPage : urlPage;

  const [draftSearch, setDraftSearch] = useState(confirmedQuery);

  const [recipesResult, setRecipesResult] = useState<Page<RecipeSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);

  const [editingRecipe, setEditingRecipe] = useState<RecipeDetail | RecipeSummary | "new" | null>(null);
  const [openingResource, setOpeningResource] = useState<VersionedResource<RecipeDetail>>();
  const [initialPendingRecord, setInitialPendingRecord] =
    useState<PendingOperationChainRecord<RecipeDraft> | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<RecipeSummary | null>(null);
  const [actionError, setActionError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
  }, [storage]);

  useEffect(() => {
    setDraftSearch(confirmedQuery);
  }, [confirmedQuery]);

  useEffect(() => {
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
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("No se pudieron cargar las recetas.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [repository, confirmedQuery, currentPage, retry]);

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
        setRecipeToDelete(null);
        deleteTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [recipeToDelete, isDeleting]);

  function handleSearchSubmit() {
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
    if (propMode) {
      setLocalPage(newPage);
    } else {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("page", String(newPage));
      setSearchParams(nextParams);
    }
  }

  async function handleOpenEdit(recipe: RecipeSummary) {
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
    setNotice("Receta creada exitosamente.");
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
    setNotice("Receta creada exitosamente. Continuando con las ediciones locales.");
    setRetry((r) => r + 1);
  }

  function handleRecipeUpdated() {
    setNotice("Receta actualizada exitosamente.");
    setEditingRecipe(null);
    setInitialPendingRecord(null);
    openingRecipeIdRef.current = null;
    setRetry((r) => r + 1);
  }

  async function handleConfirmDelete() {
    if (!recipeToDelete) return;
    setIsDeleting(true);
    setActionError("");

    try {
      await repository.deleteRecipe(recipeToDelete.id);
      setNotice(`Receta "${recipeToDelete.name}" eliminada.`);
      setRecipeToDelete(null);
      setRetry((r) => r + 1);
      deleteTriggerRef.current?.focus();
    } catch (err) {
      const analysis = analyzeNonIdempotentWriteError(err);
      if (analysis.kind === "resource_in_use") {
        setActionError(
          analysis.message ||
            "No se puede eliminar la receta porque está referenciada por una oferta vigente.",
        );
      } else if (analysis.kind === "precondition_conflict") {
        setActionError(
          analysis.message ||
            "No se pudo eliminar la receta debido a un conflicto de versión. Actualiza la lista e inténtalo de nuevo.",
        );
      } else if (analysis.status === 403) {
        setActionError(
          analysis.message || "No tienes permisos para eliminar esta receta.",
        );
      } else if (
        analysis.kind === "uncertain_outcome" ||
        analysis.kind === "uncertain_write_response"
      ) {
        setRecipeToDelete(null);
        setRetry((r) => r + 1);
        setActionError(
          "No se pudo confirmar la eliminación. Se consultó la lista para verificar el estado actual.",
        );
        deleteTriggerRef.current?.focus();
      } else {
        setActionError(
          analysis.message || "No se pudo eliminar la receta. Inténtalo de nuevo.",
        );
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

  const recipes = recipesResult?.data ?? [];
  const title = mode === "selection" ? "Biblioteca de recetas — elegir opción" : "Biblioteca de recetas";
  const subtitle =
    mode === "selection"
      ? "Selecciona una receta para asignarla a la opción de la oferta."
      : "Consulta y administra las recetas base y sus insumos.";

  return (
    <div className="category-screen recipe-screen">
      <header className="category-screen__header">
        <div>
          <p className="eyebrow">Administración del menú</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            className="button category-screen__back"
            onClick={onClose}
          >
            {mode === "selection" ? "✕ Cancelar" : "← Volver al menú"}
          </button>
        ) : (
          <Link className="button category-screen__back" to={returnTo}>
            {mode === "selection" ? "✕ Cancelar" : "← Volver al menú"}
          </Link>
        )}
      </header>

      <main className="category-screen__main">
        <section className="category-panel" aria-labelledby="recipe-list-heading">
          <div className="category-panel__heading">
            <div>
              <h2 id="recipe-list-heading">
                {mode === "selection" ? "Recetas disponibles" : "Recetas de la biblioteca"}
              </h2>
              <p>Las recetas definen los insumos de inventario y preparación.</p>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={() => {
                openingRecipeIdRef.current = null;
                setEditingRecipe("new");
              }}
            >
              + Nueva receta
            </button>
          </div>

          <div className="recipe-toolbar">
            <SearchField
              id="recipe-search"
              label="Buscar recetas"
              placeholder="Buscar por nombre o descripción…"
              value={draftSearch}
              onChange={setDraftSearch}
              onSearch={handleSearchSubmit}
            />
          </div>

          {notice && <output className="feedback feedback--success">{notice}</output>}
          {!recipeToDelete && actionError && <div className="feedback feedback--error" role="alert">{actionError}</div>}
          {error && (
            <div className="feedback feedback--error" role="alert">
              {error} <button type="button" onClick={() => setRetry((r) => r + 1)}>Reintentar</button>
            </div>
          )}

          {loading && <output className="feedback">Cargando recetas…</output>}

          {!loading && !error && recipes.length === 0 && (
            <div className="empty-state category-empty">
              <span className="empty-state__icon" aria-hidden="true">⌕</span>
              <h3>Aún no hay recetas registradas.</h3>
              <p>
                {confirmedQuery
                  ? "No se encontraron recetas con el término buscado."
                  : "Crea una receta para asociar insumos y pasos de preparación."}
              </p>
              <button
                className="button button--primary"
                type="button"
                onClick={() => {
                  openingRecipeIdRef.current = null;
                  setEditingRecipe("new");
                }}
              >
                Crear receta
              </button>
            </div>
          )}

          {!loading && !error && recipes.length > 0 && (
            <>
              <ul className="recipe-list">
                {recipes.map((recipe) => (
                  <li key={recipe.id} className="recipe-list__item">
                    {mode === "selection" ? (
                      <RecipeCard
                        recipe={recipe}
                        mode="selection"
                        onSelect={handleSelect}
                        isBusy={loading}
                      />
                    ) : (
                      <RecipeCard
                        recipe={recipe}
                        mode="management"
                        onEdit={(rec) => { void handleOpenEdit(rec); }}
                        onDelete={(rec) => {
                          deleteTriggerRef.current =
                            (document.activeElement as HTMLElement | null) ??
                            document.querySelector<HTMLElement>(
                              `button[aria-label="Eliminar ${rec.name}"]`,
                            );
                          setActionError("");
                          setRecipeToDelete(rec);
                        }}
                        isBusy={loading}
                      />
                    )}
                  </li>
                ))}
              </ul>

              {recipesResult && recipesResult.meta.totalPages > 1 && (
                <nav className="pagination" aria-label="Páginas de recetas">
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => handlePageChange(currentPage - 1)}
                    aria-label="Página anterior"
                  >
                    Anterior
                  </button>
                  <span className="pagination__info">
                    Página {recipesResult.meta.page} de {recipesResult.meta.totalPages}
                  </span>
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={currentPage >= recipesResult.meta.totalPages || loading}
                    onClick={() => handlePageChange(currentPage + 1)}
                    aria-label="Siguiente página"
                  >
                    Siguiente
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </main>

      {editingRecipe && (
        <RecipeFormDialog
          key={
            editingRecipe === "new"
              ? (initialPendingRecord ? initialPendingRecord.storageKey : "new")
              : editingRecipe.id
          }
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

      {recipeToDelete && (
        <div className="dialog-backdrop">
          <dialog
            ref={deleteDialogRef}
            className="confirm-dialog menu-task-dialog"
            aria-labelledby="confirm-delete-title"
            onCancel={(event) => {
              if (isDeleting) {
                event.preventDefault();
                return;
              }
              setRecipeToDelete(null);
              deleteTriggerRef.current?.focus();
            }}
          >
            <h2 id="confirm-delete-title">¿Eliminar receta?</h2>
            <p>
              ¿Estás seguro de que deseas eliminar la receta &quot;{recipeToDelete.name}&quot;? Esta acción no se puede deshacer.
            </p>
            {actionError && <p className="feedback feedback--error" role="alert">{actionError}</p>}
            <div className="confirm-dialog__actions">
              <button
                ref={cancelDeleteRef}
                type="button"
                className="button button--secondary"
                disabled={isDeleting}
                onClick={() => {
                  if (isDeleting) return;
                  setRecipeToDelete(null);
                  deleteTriggerRef.current?.focus();
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button button--danger"
                disabled={isDeleting}
                onClick={() => {
                  void handleConfirmDelete();
                }}
              >
                {isDeleting ? "Eliminando…" : "Eliminar receta"}
              </button>
            </div>
          </dialog>
        </div>
      )}
    </div>
  );
}
