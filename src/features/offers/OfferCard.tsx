import { Link } from "react-router-dom";
import type { MenuOffer, OfferStatus } from "../../application/catalog";

interface OfferCardProps {
  offer: MenuOffer;
  busy: boolean;
  returnTo: string;
  catalogReturnTo: string;
  onStatusChange(offer: MenuOffer, status: OfferStatus): void;
  onDelete(offer: MenuOffer): void;
}

export function OfferCard({ offer, busy, returnTo, catalogReturnTo, onStatusChange, onDelete }: Readonly<OfferCardProps>) {
  const active = offer.status === "ACTIVE";
  const presentation = offer.presentationTag || "Sin etiqueta de presentación";
  const editPath = `/entries/${encodeURIComponent(offer.entryId)}/offers/${encodeURIComponent(offer.id)}/edit`;

  return (
    <article className="offer-card">
      <Link className="offer-card__content" to={editPath} state={{ returnTo, catalogReturnTo }} aria-label={`Abrir oferta ${presentation} para editar`}>
        <div className="offer-card__image">
          {offer.image?.url ? <img src={offer.image.thumbnailUrl || offer.image.url} alt={`Imagen de la oferta ${presentation}`} loading="lazy" /> : <span className="offer-card__image-placeholder">Imagen de la oferta</span>}
        </div>
        <h2>{presentation}</h2>
        <p className="offer-card__entry">{offer.entryName}</p>
        <p className="offer-card__price">$ {offer.basePrice}</p>
      </Link>
      <div className="offer-card__details">
        <button className={`offer-card__status-control ${active ? "offer-card__status-control--active" : "offer-card__status-control--inactive"}`} type="button" disabled={busy || (!active && offer.slotCount === 0)} onClick={() => onStatusChange(offer, active ? "INACTIVE" : "ACTIVE")} aria-label={`Cambiar estado de oferta ${presentation}: ${active ? "Activa" : "Inactiva"}`} aria-pressed={active}>Estado: <span>{active ? "Activa" : "Inactiva"}</span></button>
        <p className="offer-card__composition">Grupos de composición: <strong>{offer.slotCount}</strong></p>
      </div>
      <div className="offer-card__actions">
        <button className="offer-card__delete" type="button" disabled={busy || active} onClick={() => onDelete(offer)} aria-label={`Eliminar oferta ${presentation}`}>Eliminar oferta</button>
      </div>
      {!active && offer.slotCount === 0 && <p className="offer-card__hint">Agrega una composición válida para activar esta oferta.</p>}
    </article>
  );
}
