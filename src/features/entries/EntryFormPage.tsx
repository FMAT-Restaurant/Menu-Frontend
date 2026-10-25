import { useEditGuard } from "../../shared/editGuard";
import { useCallback, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { EntryStatus, MenuRepository } from "../../application/catalog";
import type { PendingOperationStorageAdapter } from "../../application/operationAttempt";
import { Icon } from "../../shared/Icon";
import { EntryCategorySelector } from "./EntryCategorySelector";
import { EntryImageField } from "./EntryImageField";
import { EntryFormFeedback } from "./EntryFormFeedback";
import { useEntryForm } from "./useEntryForm";
import "./styles.css";

const statusLabels: Record<EntryStatus, string> = { ACTIVE: "Activa", INACTIVE: "Inactiva", ARCHIVED: "Archivada" };
const progressLabels = { idle: "Guardar entrada", upload: "Subiendo imagen…", persist: "Guardando entrada…" };

function safeReturnPath(state: unknown) {
  if (!state || typeof state !== "object" || !("returnTo" in state)) return "/";
  const destination = state.returnTo;
  if (typeof destination !== "string" || !destination.startsWith("/")) return "/";
  try {
    const url = new URL(destination, window.location.origin);
    if (url.origin === window.location.origin) return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/"; }
  return "/";
}

type Model = ReturnType<typeof useEntryForm>;

function revealFocusedControl(control: HTMLElement, footer: HTMLElement | null) {
  if (!footer || footer.contains(control)) return;
  const actions = footer.getBoundingClientRect();
  if (!actions.height) return;
  const bounds = control.getBoundingClientRect();
  const offset = bounds.bottom - actions.top + 12;
  // A resized textarea or long summary may exceed the available height: keep its start readable.
  if (offset > 0) window.scrollBy({ top: Math.min(offset, bounds.top - 12), behavior: "instant" });
}

function EntryStatusField({ model, busy }: Readonly<{ model: Model; busy: boolean }>) {
  const archived = model.entry?.status === "ARCHIVED";
  const statuses: EntryStatus[] = archived ? ["ARCHIVED", "INACTIVE"] : ["ACTIVE", "INACTIVE", "ARCHIVED"];
  let help = "Activar la entrada no cambia sus ofertas ni garantiza su publicación.";
  if (archived && model.draft.status === "INACTIVE") help = "Desarchivar deja la entrada inactiva; actívala después de forma expresa.";
  return <fieldset className="entry-status-selector">
    <legend>Estado administrativo</legend>
    <label className="sr-only" htmlFor="entry-status">Estado administrativo</label>
    <select id="entry-status" value={model.draft.status} disabled={busy || !model.editingReady} aria-invalid={Boolean(model.failure?.fields.status)} aria-describedby="entry-status-help entry-status-error" onChange={(event) => model.changeStatus(event.target.value as EntryStatus)}>
      {statuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}
    </select>
    <p id="entry-status-help" className="entry-form__muted">{help}</p>
    <p id="entry-status-error" className="entry-form__error">{model.failure?.fields.status}</p>
  </fieldset>;
}

function EntryIdentity({ model, disabled }: Readonly<{ model: Model; disabled: boolean }>) {
  return <section className="entry-form__identity" aria-labelledby="entry-identity-title">
    <h2 id="entry-identity-title">Identidad de la entrada</h2>
    <div className="entry-form__field">
      <label htmlFor="entry-brandName">Nombre comercial</label>
      <input id="entry-brandName" value={model.draft.brandName} onChange={(event) => model.changeText("brandName", event.target.value)} maxLength={255} required autoComplete="off" disabled={disabled} aria-invalid={Boolean(model.failure?.fields.brandName)} aria-describedby="entry-brandName-error" />
      <p id="entry-brandName-error" className="entry-form__error">{model.failure?.fields.brandName}</p>
    </div>
    <div className="entry-form__field">
      <label htmlFor="entry-description">Descripción</label>
      <textarea id="entry-description" value={model.draft.description} onChange={(event) => model.changeText("description", event.target.value)} rows={3} required disabled={disabled} aria-invalid={Boolean(model.failure?.fields.description)} aria-describedby="entry-description-error" />
      <p id="entry-description-error" className="entry-form__error">{model.failure?.fields.description}</p>
    </div>
  </section>;
}

export type EntryFormRepository = Pick<
  MenuRepository,
  "listCategories" | "getEntry" | "uploadEntryImage" | "createEntry" | "updateEntry"
>;

export interface EntryFormPageProps {
  repository: EntryFormRepository;
  storage?: PendingOperationStorageAdapter;
  onSaved?: () => Promise<void>;
}

function EntryFormEditor({
  repository,
  entryId,
  returnTo,
  storage,
  onSaved: customOnSaved,
}: Readonly<{
  repository: EntryFormRepository;
  entryId?: string;
  returnTo: string;
  storage?: PendingOperationStorageAdapter;
  onSaved?: () => Promise<void>;
}>) {
  const navigate = useNavigate();

  const defaultOnSaved = useCallback(async () => { await navigate(returnTo, { replace: true }); }, [navigate, returnTo]);
  const model = useEntryForm(repository, entryId, customOnSaved ?? defaultOnSaved, storage);
  const guard = useEditGuard({ get dirty() { return model.dirty; }, get blocked() { return model.exitBlocked; } }, model.abandon);
  const editing = model.editing;
  const summary = useRef<HTMLDivElement>(null);
  const actions = useRef<HTMLElement>(null);
  const busy = model.stage !== "idle";
  const disabled = busy || !model.editingReady;
  const conflict = editing && model.failure?.kind === "conflict";
  const missing = editing && model.entryLoadFailure?.kind === "notFound";
  const catalogReturnTo = returnTo === "/" || returnTo.startsWith("/?") ? returnTo : "/";
  const saveDisabled = disabled || model.saveSucceeded || model.imageValidating || Boolean(model.imageError) || !model.versionReady || conflict || model.uncertain !== "idle";
  let saveLabel = progressLabels[model.stage];
  if (editing && !busy) saveLabel = "Guardar cambios";

  useEffect(() => { if (model.failureEpoch) summary.current?.focus(); }, [model.failureEpoch]);

  return <div className="app-shell entry-form-shell">{guard.confirmation}
    <main className="menu-page menu-page--form entry-form-page">
      <header className="task-header entry-form-page__heading">
        <Link className="back-link" to={missing ? catalogReturnTo : returnTo} aria-disabled={busy} onClick={(event) => { if (busy) { event.preventDefault(); return; } }}>{missing ? "Volver al catálogo" : "← Volver a entradas"}</Link>
        <div className="task-header__content">
          <h1 data-route-heading tabIndex={-1}>{missing ? "Entrada no encontrada" : editing ? "Editar entrada" : "Nueva entrada"}</h1>
          <p className="task-header__intro">{missing ? "No pudimos abrir la entrada que intentas editar." : "Nombre, descripción, categorías e imagen de referencia."}</p>
        </div>
      </header>
      {missing ? <section className="entry-missing" role="alert" aria-label="Entrada no encontrada">
        <span className="entry-missing__icon"><Icon name="image" /></span>
        <p>La entrada solicitada ya no existe.</p>
        <p>Puede haber sido eliminada. Regresa al catálogo para consultar las entradas disponibles.</p>
      </section> : <form className="entry-form" noValidate onSubmit={(event) => { void model.save(event); }} aria-busy={busy} onFocusCapture={(event) => {
        const control = event.target;
        requestAnimationFrame(() => { if (document.activeElement === control) revealFocusedControl(control, actions.current); });
      }}>
        <EntryFormFeedback model={model} editing={editing} returnTo={returnTo} summaryRef={summary} />
        {model.entryLoading && <output className="feedback" aria-live="polite">Cargando la entrada…</output>}
        {model.entryError && <div className="feedback feedback--error" role="alert">{model.entryError} <button type="button" onClick={model.retryEntry}>Reintentar entrada</button></div>}
        {model.editingReady && !model.versionReady && <div className="feedback feedback--error" role="alert">No se recibió una versión fuerte de la entrada. Revisa los datos actuales antes de guardar. <button type="button" disabled={model.reviewLoading} onClick={() => { void model.reviewCurrent(); }}>Revisar entrada actual</button></div>}
        <div className="entry-form__layout">
          <div className="entry-form__primary">
            <EntryIdentity model={model} disabled={disabled} />
            <EntryCategorySelector categories={model.categories} selected={model.draft.categoryIds} loading={model.categoriesLoading} error={model.categoriesError} fieldError={model.failure?.fields.categoryIds} disabled={disabled} continuing={model.continuing} onChange={model.changeCategories} onRetry={model.retryCategories} onContinue={model.continueWithoutCategories} />
          </div>
          <aside className="entry-form__secondary">
            <EntryImageField file={model.file} entry={model.entry} validating={model.imageValidating} error={model.imageError || model.failure?.fields.image || ""} disabled={disabled} onSelect={(file) => { void model.selectImage(file); }} />
            {editing && <EntryStatusField model={model} busy={busy} />}
          </aside>
        </div>
        <footer ref={actions} className="entry-form__actions">
          <button className="button button--secondary" type="button" disabled={busy} onClick={() => { void navigate(returnTo); }}>Cancelar</button>
          <button className="button button--primary" type="submit" disabled={saveDisabled}>{saveLabel}</button>
        </footer>
      </form>}
    </main>
  </div>;
}

export function EntryFormPage({ repository, storage, onSaved }: Readonly<EntryFormPageProps>) {
  const { entryId } = useParams();
  const location = useLocation();
  return <EntryFormEditor key={entryId ?? "new"} repository={repository} entryId={entryId} returnTo={safeReturnPath(location.state)} storage={storage} onSaved={onSaved} />;
}
