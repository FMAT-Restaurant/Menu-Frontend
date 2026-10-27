import type { RefObject } from "react";
import { Link } from "react-router-dom";
import { isStrongEntryVersion } from "../../application/entryVersion";
import type { useEntryForm } from "./useEntryForm";

type Model = ReturnType<typeof useEntryForm>;
interface Props { model: Model; editing: boolean; returnTo: string; summaryRef: RefObject<HTMLDivElement | null> }

function EntryReview({ model }: Readonly<{ model: Model }>) {
  if (!model.review) return null;
  const current = model.review;
  const versionValid = isStrongEntryVersion(current.etag);
  const statusLabels = { ACTIVE: "Activa", INACTIVE: "Inactiva", ARCHIVED: "Archivada" };
  const categories = current.categoryIds.map(id => ({ id, name: model.categories.find(category => category.id === id)?.name }));
  const unknownCategories = categories.filter(category => !category.name);

  let currentImageText = "Sin imagen";
  if (current.image?.url) {
    currentImageText = current.image.url;
  } else if (current.imageRef) {
    currentImageText = `Referencia: ${current.imageRef}`;
  } else if (current.image?.id) {
    currentImageText = `ID: ${current.image.id}`;
  }

  let draftImageText = "Sin imagen";
  if (model.file) {
    draftImageText = `Archivo local: ${model.file.name}`;
  } else if (model.entry?.image?.url) {
    draftImageText = `Imagen previa: ${model.entry.image.url}`;
  } else if (model.entry?.imageRef) {
    draftImageText = `Referencia previa: ${model.entry.imageRef}`;
  }
  return <section className="entry-form__review" aria-label="Datos actuales de la entrada">
    <h2>Datos actuales de la entrada</h2>
    <dl>
      <dt>Nombre</dt><dd>{current.brandName}</dd>
      <dt>Descripción</dt><dd>{current.description}</dd>
      <dt>Estado</dt><dd>{statusLabels[current.status]}</dd>
      <dt>Categorías</dt><dd>{categories.map(category => category.name || "Categoría no disponible").join(", ") || "Sin clasificación"}
        {unknownCategories.length > 0 && <details><summary>Referencias de categorías no disponibles</summary><ul>{unknownCategories.map(category => <li key={category.id}>{category.id}</li>)}</ul></details>}
      </dd>
      <dt>Imagen actual en servidor</dt>
      <dd>
        {current.image?.url ? <img src={current.image.url} alt="Imagen actual de la entrada en el servidor" className="entry-form__review-image" /> : null}
        {currentImageText === "Sin imagen" ? <span>Sin imagen</span> : <>
          {!current.image?.url && <span>Imagen asignada sin vista previa disponible.</span>}
          <details><summary>Referencia de imagen actual</summary><span>{currentImageText}</span></details>
        </>}
      </dd>
      <dt>Imagen en borrador local</dt>
      <dd>{model.file || draftImageText === "Sin imagen" ? draftImageText : <>Se conserva la imagen previa.<details><summary>Referencia de imagen previa</summary>{draftImageText}</details></>}</dd>
    </dl>
    <p>Tu borrador permanece en el formulario. Elige usar estos datos o conservar tu borrador con la versión que acabas de revisar.</p>
    {!versionValid && <p>No pudimos comprobar la versión actual. Reintenta la consulta antes de continuar.</p>}
    <div className="entry-form__review-actions">
      <button type="button" disabled={!versionValid || model.reviewLoading} onClick={() => model.acceptReview(false)}>Usar datos actuales</button>
      <button type="button" disabled={!versionValid || model.reviewLoading} onClick={() => model.acceptReview(true)}>Continuar con mi borrador y versión revisada</button>
    </div>
  </section>;
}

function UncertainSave({ model, editing, returnTo }: Readonly<Pick<Props, "model" | "editing" | "returnTo">>) {
  if (model.uncertain === "idle") return null;
  const upload = model.uncertain === "upload";
  return <div className="entry-form__uncertain">
    <p>No se confirmó el resultado. El servidor pudo haber recibido la operación; no se repetirá automáticamente.</p>
    {!editing && !upload && <Link to={returnTo} target="_blank" rel="noopener noreferrer">Revisar entradas en otra pestaña</Link>}
    {(!editing || upload) && <button type="button" onClick={model.allowExplicitRetry}>He verificado el resultado; permitir otro intento</button>}
  </div>;
}

export function EntryFormFeedback({ model, editing, returnTo, summaryRef }: Readonly<Props>) {
  const reviewNeeded = editing && model.versionReady && (model.failure?.kind === "conflict" || model.uncertain === "persist");
  return <>
    {model.navigationFailed && <div className="feedback"><output aria-live="polite">La entrada se guardó. No pudimos abrir el listado.</output> <button type="button" onClick={() => { void model.finishNavigation(); }}>Volver al listado</button></div>}
    {model.infoNotice && <output className="feedback" aria-live="polite">{model.infoNotice}</output>}
    {model.failure && <div ref={summaryRef} className="feedback feedback--error entry-form__summary" role="alert" aria-label="Error al guardar entrada" tabIndex={-1}>
      <p>{model.failure.message}</p>
      {!model.recoveryReady && <button type="button" onClick={model.retryRecovery}>Reintentar recuperación</button>}
      {model.failure.violations.length > 0 && <ul>{model.failure.violations.map((item, index) => <li key={`${item.field ?? "general"}-${index}`}>
        {item.message}
        {item.field && <button type="button" onClick={() => document.getElementById(`entry-${item.field}`)?.focus()}>Ir al campo</button>}
      </li>)}</ul>}
      <UncertainSave model={model} editing={editing} returnTo={returnTo} />
      {reviewNeeded && <button type="button" disabled={model.reviewLoading} onClick={() => { void model.reviewCurrent(); }}>Revisar entrada actual</button>}
    </div>}
    {model.reviewLoading && <output className="feedback" aria-live="polite">Consultando la entrada actual; tu borrador se conserva…</output>}
    {model.reviewError && <p className="feedback feedback--error" role="alert">{model.reviewError}</p>}
    <EntryReview model={model} />
  </>;
}
