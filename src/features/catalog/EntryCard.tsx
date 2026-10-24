import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import type { MenuEntry } from "../../application/catalog";
import { Icon } from "../../shared/Icon";

const statusLabel = { ACTIVE: "Activa", INACTIVE: "Inactiva", ARCHIVED: "Archivada" };

export interface EntryCardProps {
  entry: MenuEntry;
  busy: boolean;
  returnTo: string;
  onDelete(entry: MenuEntry): void;
}

export function EntryCard({ entry, busy, returnTo, onDelete }: Readonly<EntryCardProps>) {
  const source = entry.image?.thumbnailUrl || entry.image?.url;
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [source]);
  const encodedId = encodeURIComponent(entry.id);
  const deleteHelpId = useId();
  const returnKey = `entry:${entry.id}`;
  return (
    <article className="entry-card" data-return-key={returnKey} tabIndex={-1}>
      <div className="entry-card__image">
        {source && !imageFailed ? (
          <img src={source} alt={`Imagen de ${entry.brandName}`} loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <span className="entry-card__image-fallback" role="img" aria-label={`Sin imagen de ${entry.brandName}`}><Icon name="image" /><span>Sin imagen</span></span>
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
          <Link className="button button--primary" data-return-key={`${returnKey}:offers`} to={`/entries/${encodedId}/offers`} state={{ returnTo }} aria-label={`Ver ofertas de ${entry.brandName}`} aria-disabled={busy} tabIndex={busy ? -1 : undefined} onClick={(event) => { if (busy) event.preventDefault(); }}>Ver ofertas</Link>
          <Link className="button button--secondary" data-return-key={`${returnKey}:edit`} to={`/entries/${encodedId}/edit`} state={{ returnTo }} aria-label={`Editar ${entry.brandName}`} aria-disabled={busy} tabIndex={busy ? -1 : undefined} onClick={(event) => { if (busy) event.preventDefault(); }}>Editar</Link>
        </div>
        <div className="entry-card__secondary-actions">
          <button className="button button--quiet entry-card__delete" data-return-key={`${returnKey}:delete`} type="button" disabled={busy || entry.status !== "ARCHIVED"} onClick={() => onDelete(entry)} aria-label={`Eliminar definitivamente ${entry.brandName}`} aria-describedby={deleteHelpId}>Eliminar</button>
          <p className="entry-card__delete-help" id={deleteHelpId}>{entry.status === "ARCHIVED" ? "La eliminación es definitiva." : "Solo se pueden eliminar entradas archivadas."}</p>
        </div>
      </div>
    </article>
  );
}
