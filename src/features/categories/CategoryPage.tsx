import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { CategoryDraft, MenuCategory, MenuRepository } from "../../application/catalog";
import { CategoryFormDialog } from "./CategoryFormDialog";

type CategoryRepository = Pick<MenuRepository, "listCategories" | "createCategory" | "updateCategory">;

export function CategoryPage({ repository }: Readonly<{ repository: CategoryRepository }>) {
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

  async function saveCategory(draft: CategoryDraft) {
    if (!formCategory) return;
    if (formCategory === "new") await repository.createCategory(draft);
    else await repository.updateCategory(formCategory.id, draft, formCategory.etag ?? "");
    setNotice(formCategory === "new" ? "Categoría creada." : "Categoría actualizada.");
    setFormCategory(null);
    setRetry((current) => current + 1);
  }

  return (
    <div className="category-screen">
      <header className="category-screen__header">
        <div>
          <p className="eyebrow">Administración del menú</p>
          <h1>Catálogo de categorías</h1>
          <p>Organiza las entradas del menú por categorías.</p>
        </div>
        <Link className="button category-screen__back" to={returnTo}>← Volver al menú</Link>
      </header>

      <main className="category-screen__main">
        <section className="category-panel" aria-labelledby="category-list-title">
          <div className="category-panel__heading">
            <div>
              <h2 id="category-list-title">Categorías del menú</h2>
              <p>Una entrada puede pertenecer a varias categorías del mismo menú.</p>
            </div>
            <button className="button button--primary" type="button" onClick={() => setFormCategory("new")}>Nueva categoría</button>
          </div>

          {notice && <output className="feedback feedback--success">{notice}</output>}
          {error && <div className="feedback feedback--error" role="alert">{error} <button type="button" onClick={() => setRetry((current) => current + 1)}>Reintentar</button></div>}
          {loading && <output className="feedback">Cargando categorías…</output>}
          {!loading && !error && categories.length === 0 && (
            <div className="empty-state category-empty">
              <span className="empty-state__icon" aria-hidden="true">⌕</span>
              <h3>Aún no hay categorías.</h3>
              <p>Crea una categoría para organizar las entradas del menú.</p>
              <button className="button button--primary" type="button" onClick={() => setFormCategory("new")}>Crear categoría</button>
            </div>
          )}
          {!loading && !error && categories.length > 0 && (
            <ul className="category-list">
              {categories.map((category) => (
                <li className="category-row" key={category.id}>
                  <div>
                    <h3>{category.name}</h3>
                    <p>{category.description || "Sin descripción"}</p>
                    <span>{category.entryCount} {category.entryCount === 1 ? "entrada asociada" : "entradas asociadas"}</span>
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
          onClose={() => setFormCategory(null)}
          onSubmit={saveCategory}
        />
      )}
    </div>
  );
}
