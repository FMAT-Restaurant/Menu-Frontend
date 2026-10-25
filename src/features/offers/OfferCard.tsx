import { useEffect, useState } from "react";
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
  const imageSource = offer.image?.url ? (offer.image.thumbnailUrl || offer.image.url) : "";
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageSource, offer.image?.url, offer.image?.thumbnailUrl]);

  return (
    <article className="offer-card" data-return-key={`offer:${offer.id}`}>
      <Link data-return-key={`offer:${offer.id}:edit`} className="offer-card__content" to={editPath} state={{ returnTo, catalogReturnTo }} aria-label={`Abrir oferta ${presentation} para editar`}>
        <div className="offer-card__image">
          {imageSource && !imageFailed ? (
            <img
              src={imageSource}
              alt={`Imagen de la oferta ${presentation}`}
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="offer-card__image-placeholder">Imagen de la oferta</span>
          )}
        </div>
        <h2>{presentation}</h2>
        <p className="offer-card__entry">{offer.entryName}</p>
        <p className="offer-card__price">$ {offer.basePrice}</p>
      </Link>
      <div className="offer-card__details">
        <span className={`offer-state ${active ? "offer-state--active" : "offer-state--inactive"}`}>{active ? "Activa" : "Inactiva"}</span>
        <button className={`offer-card__status-control button button--secondary ${active ? "offer-card__status-control--active" : "offer-card__status-control--inactive"}`} data-return-key={`offer:${offer.id}:status`} type="button" disabled={busy || (!active && offer.slotCount === 0)} onClick={() => onStatusChange(offer, active ? "INACTIVE" : "ACTIVE")} aria-label={`Cambiar estado de oferta ${presentation}: ${active ? "Activa" : "Inactiva"}`} aria-pressed={active}>{active ? "Desactivar oferta" : "Activar oferta"}</button>
        <p className="offer-card__composition">Grupos de composición: <strong>{offer.slotCount}</strong></p>
      </div>
      <div className="offer-card__actions">
        <button className="offer-card__delete" data-return-key={`offer:${offer.id}:delete`} aria-describedby={active ? `offer-delete-hint-${offer.id}` : undefined} type="button" disabled={busy || active} onClick={() => onDelete(offer)} aria-label={`Eliminar oferta ${presentation}`}>Eliminar oferta</button>
      </div>
      {active && <p className="offer-card__hint" id={`offer-delete-hint-${offer.id}`}>Desactiva la oferta antes de eliminarla.</p>}
      {!active && offer.slotCount === 0 && <p className="offer-card__hint">Agrega una composición válida para activar esta oferta.</p>}
    </article>
  );
}
