import { Link } from "react-router-dom";
import type { MenuOffer, OfferStatus } from "../../application/catalog";

interface OfferCardProps {
  offer: MenuOffer;
  busy: boolean;
  onStatusChange(offer: MenuOffer, status: OfferStatus): void;
  onDelete(offer: MenuOffer): void;
}

export function OfferCard({ offer, busy, onStatusChange, onDelete }: Readonly<OfferCardProps>) {
  const active = offer.status === "ACTIVE";
  const presentation = offer.presentationTag || "Sin etiqueta de presentación";
  return (
    <article className="offer-card">
      <div className="offer-card__image">
        {offer.image?.url ? <img src={offer.image.thumbnailUrl || offer.image.url} alt={`Imagen de ${offer.entryName}, ${presentation}`} loading="lazy" /> : <span>Sin imagen</span>}
        <span className={`status status--${offer.status.toLowerCase()}`}><span className="status__dot" aria-hidden="true" />{active ? "Activa" : "Inactiva"}</span>
      </div>
      <div className="offer-card__body">
        <p className="offer-card__eyebrow">Presentación</p>
        <h2>{presentation}</h2>
        <p className="offer-card__entry">{offer.entryName}</p>
        <div className="offer-card__facts">
          <span>Precio base <strong>{String(offer.basePrice)}</strong></span>
          <span>{offer.slotCount} {offer.slotCount === 1 ? "slot" : "slots"}</span>
        </div>
        <div className="offer-card__actions">
          <Link className="button button--secondary" to={`/entries/${encodeURIComponent(offer.entryId)}/offers/${encodeURIComponent(offer.id)}/edit`} aria-label={`Editar oferta ${presentation}`}>Editar</Link>
          {active ? (
            <button className="button button--quiet" type="button" disabled={busy} onClick={() => onStatusChange(offer, "INACTIVE")} aria-label={`Inactivar oferta ${presentation}`}>Inactivar</button>
          ) : (
            <button className="button button--quiet" type="button" disabled={busy || offer.slotCount === 0} onClick={() => onStatusChange(offer, "ACTIVE")} aria-label={`Activar oferta ${presentation}`}>Activar</button>
          )}
          {!active && <button className="button button--danger-link" type="button" disabled={busy} onClick={() => onDelete(offer)} aria-label={`Eliminar oferta ${presentation}`}>Eliminar</button>}
        </div>
        {!active && offer.slotCount === 0 && <p className="offer-card__hint">Agrega una composición válida para activar esta oferta.</p>}
      </div>
    </article>
  );
}
