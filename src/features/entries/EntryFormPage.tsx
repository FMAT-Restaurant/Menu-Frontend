import { useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { EntryCreateDraft, EntryStatus, EntryUpdateDraft, MenuCategory, MenuEntryDetail, MenuRepository } from "../../application/catalog";
import { invalidateCatalogEntries } from "../../application/catalogCache";
import { validateEntryImage } from "./entryImage";

const statusLabels: Record<EntryStatus, string> = {
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
  ARCHIVED: "Archivada",
};

function safeReturnPath(state: unknown) {
  if (!state || typeof state !== "object" || !("returnTo" in state)) return "/";
  const returnTo = state.returnTo;
  if (typeof returnTo !== "string" || !returnTo.startsWith("/")) return "/";
  try {
    const destination = new URL(returnTo, window.location.origin);
    return destination.origin === window.location.origin
      ? `${destination.pathname}${destination.search}${destination.hash}`
      : "/";
  } catch {
    return "/";
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  const response = isRecord(error) ? error.response : null;
  const data = isRecord(response) ? response.data : null;
  if (isRecord(data) && typeof data.message === "string") {
    const details = Array.isArray(data.details) ? data.details.flatMap(errorDetailMessage) : [];
    return [data.message, ...details].join(" ");
  }
  return "No se pudo guardar la entrada. Conservamos tus cambios; revisa e inténtalo de nuevo.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function errorDetailMessage(detail: unknown): string[] {
  return isRecord(detail) && typeof detail.message === "string" ? [detail.message] : [];
}

function imageReference(entry: MenuEntryDetail) {
  return entry.image?.thumbnailUrl || entry.image?.url || entry.imageRef;
}

function validationMessage(brandName: string, description: string, entryId: string | undefined, image: File | null, imageError: string, imageValidating: boolean) {
  if (!brandName.trim()) return "Indica el nombre comercial de la entrada.";
  if (!description.trim()) return "Indica una descripción para la entrada.";
  if (!entryId && !image) return "Selecciona una imagen de referencia para la nueva entrada.";
  if (imageError || imageValidating) return imageError || "Espera a que termine la validación de la imagen.";
  return "";
}

async function persistEntry(repository: MenuRepository, entryId: string | undefined, draft: EntryCreateDraft, status: EntryStatus, image: File | null) {
  if (entryId) {
    const update: EntryUpdateDraft = { ...draft, status };
    await repository.updateEntry(entryId, update, image ?? undefined);
    return;
  }
  if (!image) throw new Error("Selecciona una imagen de referencia para la nueva entrada.");
  await repository.createEntry(draft, image);
}

function statusHelpText(editing: boolean, archived: boolean, status: EntryStatus) {
  if (!editing) return "Las entradas nuevas siempre comienzan inactivas.";
  if (archived && status === "INACTIVE") return "Desarchivar deja la entrada inactiva; actívala después de forma expresa.";
  return "Activa no significa publicada: se requiere al menos una oferta activa válida. Las ofertas conservan su propio estado.";
}

function formLabels(editing: boolean, selectedFile: File | null, saving: boolean) {
  let imageActionLabel = "Seleccionar imagen";
  let imageHelp = "La imagen es obligatoria para crear una entrada.";
  let saveLabel = "Guardar entrada";
  if (editing) {
    imageActionLabel = "Reemplazar imagen";
    imageHelp = "Si no seleccionas otra imagen, se conservará la actual.";
    saveLabel = "Guardar cambios";
  }
  if (selectedFile) {
    imageActionLabel = "Cambiar imagen";
    imageHelp = selectedFile.name;
  }
  if (saving) saveLabel = "Guardando…";
  return { imageActionLabel, imageHelp, saveLabel };
}

function EntryImagePreview({ source, currentImage }: Readonly<{ source: string | undefined; currentImage: string | undefined }>) {
  if (source) return <img src={source} alt="Vista previa de la imagen de la entrada" />;
  if (currentImage) return <span>Imagen actual conservada · referencia {currentImage}</span>;
  return <span>Selecciona una imagen para mostrar una vista previa.</span>;
}

export function EntryFormPage({ repository }: Readonly<{ repository: MenuRepository }>) {
  const { entryId } = useParams();
  const editing = Boolean(entryId);
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = safeReturnPath(location.state);
  const [entry, setEntry] = useState<MenuEntryDetail | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [status, setStatus] = useState<EntryStatus>("INACTIVE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [imageValidating, setImageValidating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const validationRun = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadingError("");
    Promise.all([
      repository.listCategories(controller.signal),
      entryId ? repository.getEntry(entryId, controller.signal) : Promise.resolve(null),
    ]).then(([items, currentEntry]) => {
      if (controller.signal.aborted) return;
      setCategories(items);
      setEntry(currentEntry);
      if (currentEntry) {
        setBrandName(currentEntry.brandName);
        setDescription(currentEntry.description);
        setCategoryIds(currentEntry.categoryIds);
        setStatus(currentEntry.status);
      }
    }).catch(() => {
      if (!controller.signal.aborted) setLoadingError("No se pudieron cargar los datos de la entrada. Reintenta la consulta.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [entryId, repository, retry]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    const run = validationRun.current + 1;
    validationRun.current = run;
    setSelectedFile(file);
    setImageError("");
    setFormError("");
    if (!file) {
      setImageValidating(false);
      return;
    }

    setImageValidating(true);
    try {
      await validateEntryImage(file);
      if (validationRun.current === run) setImageError("");
    } catch (error) {
      if (validationRun.current === run) setImageError(error instanceof Error ? error.message : "La imagen no es válida.");
    } finally {
      if (validationRun.current === run) setImageValidating(false);
    }
  }

  function toggleCategory(categoryId: string) {
    setCategoryIds((current) => current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId]);
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const error = validationMessage(brandName, description, entryId, selectedFile, imageError, imageValidating);
    if (error) {
      setFormError(error);
      return;
    }

    setSaving(true);
    const draft: EntryCreateDraft = {
      brandName: brandName.trim(),
      description: description.trim(),
      categoryIds: [...new Set(categoryIds)],
    };
    try {
      await persistEntry(repository, entryId, draft, status, selectedFile);
      invalidateCatalogEntries(repository);
      await navigate(returnTo, { replace: true });
    } catch (saveError) {
      setFormError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  const selectedMissingCategories = categoryIds.filter((id) => !categories.some((category) => category.id === id));
  const availableStatuses: EntryStatus[] = entry?.status === "ARCHIVED"
    ? ["ARCHIVED", "INACTIVE"]
    : ["ACTIVE", "INACTIVE", "ARCHIVED"];
  const currentImage = entry ? imageReference(entry) : undefined;
  const previewSource = previewUrl || entry?.image?.thumbnailUrl || entry?.image?.url;
  const statusHelp = statusHelpText(editing, entry?.status === "ARCHIVED", status);
  const { imageActionLabel, imageHelp, saveLabel } = formLabels(editing, selectedFile, saving);

  return (
    <div className="app-shell">
      <nav className="global-nav" aria-label="Navegación principal">
        <Link className="brand" to={returnTo}><span className="brand__mark" aria-hidden="true">F</span><span>FMAT <strong>Restaurant</strong></span></Link>
        <span className="global-nav__section">Administración del menú</span>
      </nav>

      <main className="entry-form-page">
        <header className="entry-form-page__heading">
          <p className="eyebrow">Administración / Menú</p>
          <h1>{editing ? "Editar entrada" : "Nueva entrada"}</h1>
          <p>Define la identidad comercial de la entrada. Las ofertas se administran por separado.</p>
        </header>

        {loading && <output className="feedback" aria-live="polite">Cargando datos de la entrada…</output>}
        {loadingError && <div className="feedback feedback--error" role="alert">{loadingError} <button type="button" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div>}

        {!loading && !loadingError && (
          <form className="entry-form" onSubmit={save} aria-busy={saving}>
            <section className="entry-form__section" aria-labelledby="entry-identity-title">
              <div className="entry-form__section-heading">
                <h2 id="entry-identity-title">Identidad de la entrada</h2>
                <p>El nombre y la descripción no representan una presentación u oferta.</p>
              </div>
              <div className="entry-form__field">
                <label htmlFor="entry-brand-name">Nombre comercial</label>
                <input id="entry-brand-name" value={brandName} onChange={(event) => setBrandName(event.target.value)} maxLength={255} required autoComplete="off" disabled={saving} />
              </div>
              <div className="entry-form__field">
                <label htmlFor="entry-description">Descripción</label>
                <textarea id="entry-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} required disabled={saving} />
              </div>
            </section>

            <div className="entry-form__columns">
              <fieldset className="entry-form__section entry-category-selector">
                <legend>Categorías</legend>
                <p>Selecciona las categorías del mismo menú que correspondan. Puedes continuar sin asignar categorías.</p>
                {categories.length === 0 && selectedMissingCategories.length === 0
                  ? <p className="entry-form__muted">Aún no hay categorías. Puedes guardar la entrada sin clasificación.</p>
                  : <div className="entry-category-selector__list">
                    {categories.length === 0 && <p className="entry-form__muted">Aún no hay categorías disponibles; puedes retirar las asignaciones anteriores.</p>}
                    {categories.map((category) => (
                      <label className="entry-category-selector__option" key={category.id}>
                        <input type="checkbox" checked={categoryIds.includes(category.id)} onChange={() => toggleCategory(category.id)} disabled={saving} />
                        <span>{category.name}</span>
                      </label>
                    ))}
                    {selectedMissingCategories.map((id) => (
                      <label className="entry-category-selector__option" key={id}>
                        <input type="checkbox" checked onChange={() => toggleCategory(id)} disabled={saving} />
                        <span>Categoría ya asignada ({id})</span>
                      </label>
                    ))}
                  </div>}
              </fieldset>

              <fieldset className="entry-form__section entry-status-selector">
                <legend>Estado administrativo</legend>
                <label htmlFor="entry-status">Estado administrativo</label>
                <select id="entry-status" value={status} disabled={!editing || saving} onChange={(event) => setStatus(event.target.value as EntryStatus)}>
                  {(editing ? availableStatuses : ["INACTIVE"] as EntryStatus[]).map((option) => (
                    <option value={option} key={option}>{statusLabels[option]}</option>
                  ))}
                </select>
                <p>{statusHelp}</p>
              </fieldset>
            </div>

            <section className="entry-form__section entry-image-field" aria-labelledby="entry-image-title">
              <div className="entry-form__section-heading">
                <h2 id="entry-image-title">Imagen de referencia</h2>
                <p>JPEG, PNG o WebP; máximo 10 MiB y 4096 × 4096 px.</p>
              </div>
              <div className="entry-image-field__preview">
                <EntryImagePreview source={previewSource} currentImage={currentImage} />
              </div>
              <label className="button button--secondary entry-image-field__select" htmlFor="entry-image">{imageActionLabel}</label>
              <input
                className="entry-image-field__input"
                id="entry-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selectImage}
                disabled={saving}
                aria-describedby="entry-image-help entry-image-error"
              />
              <p id="entry-image-help" className="entry-form__muted">{imageHelp}</p>
              {imageValidating && <output className="entry-image-field__validation">Validando archivo e imagen…</output>}
              <p id="entry-image-error" className="entry-form__error" role={imageError ? "alert" : undefined}>{imageError}</p>
            </section>

            {formError && <div className="feedback feedback--error" role="alert">{formError}</div>}
            <footer className="entry-form__actions">
              <button className="button button--secondary" type="button" disabled={saving} onClick={() => { void navigate(returnTo); }}>Cancelar</button>
              <button className="button button--primary" type="submit" disabled={saving || loading || imageValidating || Boolean(imageError)}>
                {saveLabel}
              </button>
            </footer>
          </form>
        )}
      </main>
    </div>
  );
}
