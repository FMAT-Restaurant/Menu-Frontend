import { LoadingValue } from "../../shared/LoadingState";
import { NativeNumberInput } from "../../shared/NativeNumberInput";
import { Icon } from "../../shared/Icon";
import { type ChangeEvent, type DragEvent, type KeyboardEvent, type ReactNode, useRef } from "react";
import type { MenuImage, OfferStatus } from "../../application/catalog";
import { formatMoney } from "../../shared/formatMoney";

export interface OfferCommercialInfoProps {
  loading?: boolean;
  presentationTag: string;
  onPresentationTagChange: (value: string) => void;
  basePrice: string;
  onBasePriceChange: (value: string) => void;
  onStatusChange: (value: OfferStatus) => void;
  desiredStatus: OfferStatus;
  hasActiveSlot: boolean;
  isEditing: boolean;
  existingImage: MenuImage | null | undefined;
  previewUrl: string;
  onSelectImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onDropImage: (file: File) => void;
  imageError: string;
  imageValidating: boolean;
  canChangeStatus?: boolean;
  canUploadImage?: boolean;
  fieldErrors?: { presentationTag?: string; basePrice?: string; image?: string };
  disabled?: boolean;
}

interface OfferStatusFieldProps {
  loading: boolean;
  desiredStatus: OfferStatus;
  onStatusChange: (value: OfferStatus) => void;
  hasActiveSlot: boolean;
  isEditing: boolean;
  disabled: boolean;
  canChangeStatus: boolean;
}

function OfferStatusField({
  loading,
  desiredStatus,
  onStatusChange,
  hasActiveSlot,
  isEditing,
  disabled,
  canChangeStatus,
}: Readonly<OfferStatusFieldProps>) {
  let statusContent: ReactNode;
  if (loading) {
    statusContent = <LoadingValue />;
  } else if (!isEditing) {
    statusContent = <div className="status-fixed-box">
        <span className="offer-state offer-state--inactive">Inactiva</span>
        <p className="field-hint">
          La oferta se crea inactiva. Guardar la composición no la activa; podrás solicitar su activación después.
        </p>
      </div>;
  } else if (!canChangeStatus) {
    statusContent = <span className={`offer-state ${desiredStatus === "ACTIVE" ? "offer-state--active" : "offer-state--inactive"}`}>{desiredStatus === "ACTIVE" ? "Activa" : "Inactiva"}</span>;
  } else {
    statusContent = <div>
        <div className="radio-group" role="radiogroup" aria-labelledby="offer-status-label">
          <label className="radio-label">
            <input type="radio" name="offer-form-status" value="ACTIVE" checked={desiredStatus === "ACTIVE"}
              onChange={() => onStatusChange("ACTIVE")} disabled={disabled} />
            <span>Activa</span>
          </label>
          <label className="radio-label">
            <input type="radio" name="offer-form-status" value="INACTIVE" checked={desiredStatus === "INACTIVE"}
              onChange={() => onStatusChange("INACTIVE")} disabled={disabled} />
            <span>Inactiva</span>
          </label>
        </div>
        {isEditing && desiredStatus === "ACTIVE" && !hasActiveSlot && <p className="feedback feedback--warning" role="alert">
          Sin un grupo con opciones activas, la oferta se guardará inactiva. Añade opciones activas para solicitar su activación. Guardar no garantiza que se acepte la solicitud.
        </p>}
        {desiredStatus === "ACTIVE" && hasActiveSlot && <p className="field-hint">
          El borrador tiene un grupo con opciones activas. Al guardar solicitarás la activación; sólo se aplicará si la composición cumple los requisitos.
        </p>}
      </div>;
  }

  return <div className="form-field">
    <span className="field-label" id="offer-status-label">Estado de la oferta</span>
    {statusContent}
  </div>;
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
}

export function OfferCommercialInfo({
  loading = false,
  presentationTag,
  onPresentationTagChange,
  basePrice,
  onBasePriceChange,
  onStatusChange,
  desiredStatus,
  hasActiveSlot,
  isEditing,
  existingImage,
  previewUrl,
  onSelectImage,
  onDropImage,
  imageError,
  imageValidating,
  canChangeStatus = true,
  canUploadImage = true,
  fieldErrors = {},
  disabled = false,
}: Readonly<OfferCommercialInfoProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isImageBlocked = disabled || imageValidating || !canUploadImage;
  const numericPrice = basePrice.trim() === "" ? null : Number(basePrice);
  const formattedPrice = numericPrice !== null && Number.isFinite(numericPrice) && numericPrice > 0
    ? formatMoney(numericPrice)
    : null;
  const roundedPreview = formattedPrice !== null && numericPrice !== null && Number(numericPrice.toFixed(2)) !== numericPrice;

  function handleTriggerFileSelect() {
    if (isImageBlocked) return;
    fileInputRef.current?.click();
  }

  function handleDropzoneKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTriggerFileSelect();
    }
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (isImageBlocked) return;
    onSelectImage(e);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    if (isImageBlocked) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onDropImage(file);
    }
  }

  const effectivePreview = previewUrl || existingImage?.url || existingImage?.thumbnailUrl;
  return (
    <section className="offer-commercial-info" aria-labelledby="commercial-info-title">
      <h2 id="commercial-info-title" className="offer-commercial-info__title">
        1. Información comercial
      </h2>

      <div className="offer-commercial-info__grid">
        <div className="offer-commercial-info__fields">
          <div className="form-field">
            <label htmlFor="offer-tag-input">Etiqueta de presentación</label>
            {loading ? <LoadingValue /> : <input
              id="offer-tag-input"
              type="text"
              value={presentationTag}
              onChange={(e) => onPresentationTagChange(e.target.value)}
              placeholder="Ej. Individual, Mediana o Combo"
              required
              aria-required="true"
              aria-invalid={Boolean(fieldErrors.presentationTag)}
              aria-describedby={fieldErrors.presentationTag ? "offer-tag-error" : undefined}
              disabled={disabled}
            />}
            {fieldErrors.presentationTag && <p id="offer-tag-error" className="field-error">{fieldErrors.presentationTag}</p>}
            <p className="field-hint">
              La entrada ya identifica el producto; usa esta etiqueta para distinguir su presentación.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="offer-price-input">Precio base (MXN)</label>
            {loading ? <LoadingValue /> : <div className="price-input-wrapper">
              <span className="price-prefix" aria-hidden="true">MXN</span>
              <NativeNumberInput
                id="offer-price-input"
                errorMessage="Escribe un precio base mayor que 0."
                value={basePrice}
                onChange={(e) => onBasePriceChange(e.target.value)}
                placeholder="0.00"
                required
                disabled={disabled}
                aria-invalid={Boolean(fieldErrors.basePrice)}
                aria-describedby={[formattedPrice !== null && "offer-price-preview", "offer-price-help", fieldErrors.basePrice && "offer-price-error"].filter(Boolean).join(" ")}
                aria-details={roundedPreview ? "offer-price-exact" : undefined}
              />
            </div>}
            {fieldErrors.basePrice && <p id="offer-price-error" className="field-error">{fieldErrors.basePrice}</p>}
            {!loading && formattedPrice !== null && (
              <p id="offer-price-preview" className="offer-money-preview">
                {formattedPrice}
              </p>
            )}
            {roundedPreview && <p id="offer-price-exact" className="field-hint">Precio que se guardará: MXN {basePrice}. La vista previa se redondea a dos decimales.</p>}
            <p className="field-hint" id="offer-price-help">
              El precio base pertenece a la oferta y no suma automáticamente precios de componentes.
            </p>
          </div>

          <OfferStatusField loading={loading} desiredStatus={desiredStatus} onStatusChange={onStatusChange}
            hasActiveSlot={hasActiveSlot} isEditing={isEditing} canChangeStatus={canChangeStatus} disabled={disabled} />
        </div>

        <div className="offer-commercial-info__image-column">
          <div className="form-field">
            <label className="field-label" htmlFor="offer-image-input">
              Imagen de la oferta {isEditing ? "(opcional si se conserva)" : "(obligatoria)"}{!canUploadImage ? " (sin permiso para cambiarla)" : ""}
            </label>
            <input
              id="offer-image-input"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleInputChange}
              style={{ display: "none" }}
              disabled={isImageBlocked}
            />

            {loading ? <LoadingValue kind="image" /> : <button
              type="button"
              className={`image-dropzone ${effectivePreview ? "image-dropzone--has-preview" : ""}`}
              aria-invalid={Boolean(fieldErrors.image || imageError)}
              aria-describedby={fieldErrors.image || imageError ? "offer-image-error" : undefined}
              onClick={handleTriggerFileSelect}
              onKeyDown={handleDropzoneKeyDown}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              disabled={isImageBlocked}
              aria-label="Seleccionar o arrastrar imagen de la oferta"
            >
              {effectivePreview ? (
                <div className="image-preview">
                  <img src={effectivePreview} alt="Vista previa de la oferta" />
                  <span className="image-preview__overlay">Cambiar imagen</span>
                </div>
              ) : (
                <div className="image-dropzone__placeholder">
                  <Icon name="image" className="image-dropzone__icon" />
                  <span className="image-dropzone__text">
                    Arrastra una imagen aquí o haz clic para seleccionar
                  </span>
                  <span className="button button--small button--secondary">
                    Seleccionar archivo
                  </span>
                </div>
              )}
            </button>}

            {imageValidating && (
              <p className="feedback feedback--info">Validando imagen…</p>
            )}
            {(imageError || fieldErrors.image) && (
              <p id="offer-image-error" className="field-error" role="alert">
                {imageError || fieldErrors.image}
              </p>
            )}

            {!canUploadImage && <p className="field-hint">Solicita `menu:images:write` para cargar o reemplazar imágenes.</p>}
            <p className="field-hint">
              JPEG, PNG o WebP. Máximo 10 MiB y 4096 × 4096 px.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
