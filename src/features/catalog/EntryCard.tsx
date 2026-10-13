import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { EntryStatus, MenuEntry } from "../../application/catalog";

const statusLabel = { ACTIVE: "Activa", INACTIVE: "Inactiva", ARCHIVED: "Archivada" };

interface EntryCardProps {
  entry: MenuEntry;
  busy: boolean;
  returnTo: string;
  onStatusChange(entry: MenuEntry, status: EntryStatus): void;
  onDelete(entry: MenuEntry): void;
}

export function EntryCard({ entry, busy, returnTo, onStatusChange, onDelete }: Readonly<EntryCardProps>) {
  const source = entry.image?.thumbnailUrl || entry.image?.url;
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [source]);
  return (
    <article className="entry-card">
      <div className="entry-card__image">
        {source && !imageFailed ? (
          <img src={source} alt={`Imagen de ${entry.brandName}`} loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <span role="img" aria-label={`Sin imagen de ${entry.brandName}`}>Sin imagen</span>
        )}
        <span className={`status status--${entry.status.toLowerCase()}`}>
          <span className="status__dot" aria-hidden="true" />{statusLabel[entry.status]}
        </span>
      </div>
      <div className="entry-card__body">
        <h2>{entry.brandName}</h2>
        <p className="entry-card__description" title={entry.description}>{entry.description}</p>
        <div className="entry-card__categories" aria-label="Categorías">
          {entry.categories.length ? entry.categories.map((category) => (
            <span className="category-chip" key={category.id}>{category.name}</span>
          )) : <span className="category-chip">Sin categoría</span>}
        </div>
        <div className="entry-card__meta"><span>Estado: <strong>{statusLabel[entry.status]}</strong></span><span>Ofertas: <strong>{entry.offerCount}</strong></span></div>
        <div className="entry-card__actions">
          <Link className="button button--secondary" to={`/entries/${entry.id}/edit`} state={{ returnTo }} aria-label={`Editar ${entry.brandName}`} aria-disabled={busy} tabIndex={busy ? -1 : undefined} onClick={(event) => { if (busy) event.preventDefault(); }}>Editar</Link>
          <Link className="button button--secondary" to={`/entries/${entry.id}/offers`} state={{ returnTo }} aria-label={`Ver ofertas de ${entry.brandName}`} aria-disabled={busy} tabIndex={busy ? -1 : undefined} onClick={(event) => { if (busy) event.preventDefault(); }}>Ver ofertas</Link>
        </div>
        <div className="entry-card__lifecycle">
          {entry.status === "INACTIVE" && <button className="button button--quiet" type="button" disabled aria-label={`Activar ${entry.brandName}`}>Activar</button>}
          {entry.status === "ACTIVE" && <button className="button button--quiet" type="button" disabled={busy} onClick={() => onStatusChange(entry, "INACTIVE")} aria-label={`Inactivar ${entry.brandName}`}>Inactivar</button>}
          {entry.status !== "ARCHIVED" && <button className="button button--quiet" type="button" disabled={busy} onClick={() => onStatusChange(entry, "ARCHIVED")} aria-label={`Archivar ${entry.brandName}`}>Archivar</button>}
          {entry.status === "ARCHIVED" && <button className="button button--quiet" type="button" disabled={busy} onClick={() => onStatusChange(entry, "INACTIVE")} aria-label={`Desarchivar ${entry.brandName}`}>Desarchivar</button>}
          {entry.status === "ARCHIVED" && <button className="button button--danger-link" type="button" disabled={busy} onClick={() => onDelete(entry)} aria-label={`Eliminar definitivamente ${entry.brandName}`}>Eliminar</button>}
        </div>
        {entry.status === "INACTIVE" && <p className="entry-card__hint">La activación estará disponible cuando se pueda verificar que existe una oferta activa válida.</p>}
      </div>
    </article>
  );
}
