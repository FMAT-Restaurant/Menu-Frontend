import { LoadingState } from "../../shared/LoadingState";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "../../shared/Icon";
import type { CategoryDraft, MenuCategory, MenuRepository } from "../../application/catalog";
import { invalidateCatalogCategories, invalidateCatalogEntries } from "../../application/catalogCache";
import type { PendingOperationChainRecord } from "../../application/operationAttempt";
import {
  createIndexedDbPendingOperationStorage,
  type PendingOperationStorageAdapter,
} from "../../shared/pendingOperationStorage";
import {
  buildCategoryCreateScope,
  CategoryFormDialog,
} from "./CategoryFormDialog";
import "./styles.css";
import "./styles.css";

export type CategoryRepository = Pick<
  MenuRepository,
  "listCategories" | "getCategory" | "createCategory" | "updateCategory"
>;

export function formatCategoryEntryCount(entryCount?: number): string {
  if (entryCount === undefined || entryCount === null) {
    return "Cuenta de entradas no disponible";
  }
  if (entryCount === 0) {
    return "0 entradas asociadas";
  }
  if (entryCount === 1) {
    return "1 entrada asociada";
  }
  return `${entryCount} entradas asociadas`;
}

interface CategoryPageProps {
  repository: CategoryRepository;
  storage?: PendingOperationStorageAdapter;
}

export function CategoryPage({ repository, storage }: Readonly<CategoryPageProps>) {
  const actualStorage = useMemo(
    () => storage ?? createIndexedDbPendingOperationStorage(),
    [storage],
  );
  const location = useLocation();
  const returnTo = typeof location.state?.returnTo === "string" && /^\/(?:\?.*)?$/.test(location.state.returnTo)
    ? location.state.returnTo
    : "/";
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [formCategory, setFormCategory] = useState<MenuCategory | "new" | null>(null);
  const [restoredPendingRecord, setRestoredPendingRecord] =
    useState<PendingOperationChainRecord<CategoryDraft> | null>(null);

  useEffect(() => {
    let active = true;
    void actualStorage
      .getRecord<CategoryDraft>(buildCategoryCreateScope())
      .then((record) => {
        if (!active || !record) return;
        const stage = record.stages[record.currentStageIndex];
        if (stage && stage.status !== "succeeded") {
          setRestoredPendingRecord(record);
          setFormCategory("new");
        }
      })
      .catch(() => {
        // Ignorar error de lectura de almacenamiento al montar
      });
    return () => {
      active = false;
    };
  }, [actualStorage]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    repository.listCategories(controller.signal).then((items) => {
      if (!controller.signal.aborted) setCategories(items);
    }).catch(() => {
      if (!controller.signal.aborted) setError("No se pudieron cargar las categorías.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [repository, retry]);

  return (
    <div className="category-screen">
      <main className="menu-page category-screen__main">
        <header className="task-header category-screen__header">
          <Link className="back-link" to={returnTo}><Icon name="arrow-left" /> Volver al menú</Link>
          <div className="task-header__row">
            <div className="task-header__content">
              <p className="eyebrow">Organización del menú</p>
              <h1 id="category-page-title" data-route-heading tabIndex={-1}>Catálogo de categorías</h1>
              <p className="task-header__intro">Organiza las entradas del menú por categorías. Una entrada puede pertenecer a varias categorías.</p>
            </div>
            <button className="button button--primary" type="button" onClick={() => setFormCategory("new")}>Nueva categoría</button>
          </div>
        </header>
        <section className="category-panel" aria-labelledby="category-page-title" aria-busy={loading}>
          {notice && <output className="feedback feedback--success">{notice}</output>}
          {error && <div className="feedback feedback--error" role="alert">{error} <button type="button" onClick={() => setRetry((current) => current + 1)}>Reintentar</button></div>}
          {loading && categories.length === 0 && <LoadingState variant="category-rows" label="Cargando categorías…" />}
          {loading && categories.length > 0 && <output className="feedback">Actualizando categorías…</output>}
          {!loading && !error && categories.length === 0 && (
            <div className="empty-state category-empty">
              <span className="empty-state__icon" aria-hidden="true"><Icon name="search" /></span>
              <h3>Aún no hay categorías.</h3>
              <p>Crea una categoría para organizar las entradas del menú.</p>
              <button className="button button--primary" type="button" onClick={() => setFormCategory("new")}>Crear categoría</button>
            </div>
          )}
          {categories.length > 0 && (
            <ul className="category-list">
              {categories.map((category) => (
                <li className="category-row" key={category.id}>
                  <div>
                    <h3>{category.name}</h3>
                    <p>{category.description || "Sin descripción"}</p>
                    <span>{formatCategoryEntryCount(category.entryCount)}</span>
                  </div>
                  <button className="button button--secondary" type="button" onClick={() => setFormCategory(category)} aria-label={`Editar ${category.name}`}>Editar</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {formCategory && (
        <CategoryFormDialog
          key={formCategory === "new" ? "new" : formCategory.id}
          category={formCategory === "new" ? undefined : formCategory}
          repository={repository}
          storage={actualStorage}
          initialPendingRecord={formCategory === "new" ? restoredPendingRecord : null}
          onClose={() => {
            setRestoredPendingRecord(null);
            setFormCategory(null);
          }}
          onCreated={() => {
            setRestoredPendingRecord(null);
            invalidateCatalogCategories(repository);
            invalidateCatalogEntries(repository);
            setNotice("Categoría creada.");
            setFormCategory(null);
            setRetry((current) => current + 1);
          }}
          onCreatedWithPendingEdits={() => {
            setRestoredPendingRecord(null);
            invalidateCatalogCategories(repository);
            invalidateCatalogEntries(repository);
            setNotice(
              "La categoría se creó. Conservamos tus cambios posteriores; guárdalos para actualizarla.",
            );
            setRetry((current) => current + 1);
          }}
          onUpdated={() => {
            invalidateCatalogCategories(repository);
            invalidateCatalogEntries(repository);
            setNotice("Categoría actualizada.");
            setFormCategory(null);
            setRetry((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}
