import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { EntryStatus, MenuOffer, OfferStatus } from "../../application/catalog";
import { evaluateOfferOrderability } from "../../application/availability";
import { formatMoney } from "../../shared/formatMoney";
import { Icon } from "../../shared/Icon";

interface OfferCardProps {
  offer: MenuOffer;
  entryStatus?: EntryStatus;
  entryAvailable?: boolean;
  busy: boolean;
  returnTo: string;
  catalogReturnTo: string;
  canWrite?: boolean;
  canChangeStatus?: boolean;
  onStatusChange(offer: MenuOffer, status: OfferStatus): void;
  onDelete(offer: MenuOffer): void;
}

export function OfferCard({
  offer,
  entryStatus,
  entryAvailable,
  busy,
  returnTo,
  catalogReturnTo,
  canWrite = true,
  canChangeStatus = true,
  onStatusChange,
  onDelete,
}: Readonly<OfferCardProps>) {
  const active = offer.status === "ACTIVE";
  const presentation = offer.presentationTag || "Sin etiqueta de presentación";
  const editPath = `/entries/${encodeURIComponent(offer.entryId)}/offers/${encodeURIComponent(offer.id)}/edit`;
  const imageSource = offer.image?.url ? (offer.image.thumbnailUrl || offer.image.url) : "";
  const [imageFailed, setImageFailed] = useState(false);
  const orderability = evaluateOfferOrderability({
    offerStatus: offer.status,
    offerAvailable: offer.isAvailable,
    entryStatus,
    entryAvailable,
  });
  const unavailableClass = offer.isAvailable === false ? " offer-card--unavailable" : "";

  useEffect(() => {
    setImageFailed(false);
  }, [imageSource, offer.image?.url, offer.image?.thumbnailUrl]);

  const content = <>
    <div className="offer-card__image">
      {imageSource && !imageFailed ? (
        <img src={imageSource} alt={`Imagen de la oferta ${presentation}`} loading="lazy" onError={() => setImageFailed(true)} />
      ) : (
        <span className="offer-card__image-placeholder">Imagen de la oferta</span>
      )}
    </div>
    <div className="offer-card__body">
      <div className="offer-card__summary">
        <div className="offer-card__identity">
          <h2>{presentation}</h2>
          <p className="offer-card__entry">Entrada: {offer.entryName}</p>
        </div>
        <p className="offer-card__price">{formatMoney(offer.basePrice)}</p>
      </div>
      <div className="offer-card__details">
        <div className="offer-card__badges">
          <span className={`offer-state ${active ? "offer-state--active" : "offer-state--inactive"}`}>{active ? "Activa" : "Inactiva"}</span>
          {offer.isAvailable !== undefined && (
            <span className={`availability-pill ${offer.isAvailable ? "availability-pill--available" : "availability-pill--unavailable"}`}>
              {offer.isAvailable ? "Disponible" : "No disponible"}
            </span>
          )}
          {orderability && (
            <span className={`orderable-pill ${orderability.orderable ? "orderable-pill--yes" : "orderable-pill--no"}`}>
              {orderability.label}{orderability.reason ? ` · ${orderability.reason}` : ""}
            </span>
          )}
        </div>
        <p className="offer-card__composition"><strong>{offer.slotCount}</strong> grupos de composición</p>
      </div>
      {canWrite && <span className="offer-card__edit">Editar oferta <Icon name="arrow-right" /></span>}
    </div>
  </>;

  return (
    <article className={`offer-card${unavailableClass}`} data-return-key={`offer:${offer.id}`} tabIndex={-1}>
      {canWrite
        ? <Link data-return-key={`offer:${offer.id}:edit`} className="offer-card__content" to={editPath} state={{ returnTo, catalogReturnTo }} aria-label={`Abrir oferta ${presentation} para editar`}>{content}</Link>
        : <div className="offer-card__content">{content}</div>}
      <div className="offer-card__actions">
        {canChangeStatus && <button className={`offer-card__status-control button button--secondary ${active ? "offer-card__status-control--active" : "offer-card__status-control--inactive"}`} data-return-key={`offer:${offer.id}:status`} type="button" disabled={busy || (!active && offer.slotCount === 0)} onClick={() => onStatusChange(offer, active ? "INACTIVE" : "ACTIVE")} aria-label={`Cambiar estado de oferta ${presentation}: ${active ? "Activa" : "Inactiva"}`} aria-pressed={active}>{active ? "Desactivar oferta" : "Activar oferta"}</button>}
        {canWrite && !active && <button className="button offer-card__delete" data-return-key={`offer:${offer.id}:delete`} aria-describedby={`offer-delete-hint-${offer.id}`} type="button" disabled={busy} onClick={() => onDelete(offer)} aria-label={`Eliminar oferta ${presentation}`}>Eliminar oferta</button>}
      </div>
      {canWrite && (active ? (
        <p className="offer-card__hint">Desactiva la oferta para poder eliminarla.</p>
      ) : (
        <p className="offer-card__hint" id={`offer-delete-hint-${offer.id}`}>La eliminación es definitiva.</p>
      ))}
      {!active && offer.slotCount === 0 && <p className="offer-card__hint">Agrega una composición válida para activar esta oferta.</p>}
    </article>
  );
}
