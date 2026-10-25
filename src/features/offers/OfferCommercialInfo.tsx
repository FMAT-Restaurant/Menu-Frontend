import { Icon } from "../../shared/Icon";
import { type ChangeEvent, type DragEvent, type KeyboardEvent, useRef } from "react";
import type { MenuImage, OfferStatus } from "../../application/catalog";

export interface OfferCommercialInfoProps {
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
  disabled?: boolean;
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
}

export function OfferCommercialInfo({
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
  disabled = false,
}: Readonly<OfferCommercialInfoProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isImageBlocked = disabled || imageValidating;

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
  const isAutoInactive = isEditing && desiredStatus === "ACTIVE" && !hasActiveSlot;

  return (
    <section className="offer-commercial-info" aria-labelledby="commercial-info-title">
      <h2 id="commercial-info-title" className="offer-commercial-info__title">
        1. Información comercial
      </h2>

      <div className="offer-commercial-info__grid">
        <div className="offer-commercial-info__fields">
          <div className="form-field">
            <label htmlFor="offer-tag-input">Etiqueta de presentación (opcional)</label>
            <input
              id="offer-tag-input"
              type="text"
              value={presentationTag}
              onChange={(e) => onPresentationTagChange(e.target.value)}
              placeholder="Ej. Individual, Mediana o Combo"
              disabled={disabled}
            />
            <p className="field-hint">
              La entrada ya identifica el producto; usa esta etiqueta para distinguir su presentación.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="offer-price-input">Precio base</label>
            <div className="price-input-wrapper">
              <span className="price-prefix" aria-hidden="true">$</span>
              <input
                id="offer-price-input"
                type="number"
                min="0"
                step="any"
                value={basePrice}
                onChange={(e) => onBasePriceChange(e.target.value)}
                placeholder="0.00"
                required
                disabled={disabled}
              />
            </div>
            <p className="field-hint">
              El precio base pertenece a la oferta y no suma automáticamente precios de componentes.
            </p>
          </div>

          <div className="form-field">
            <span className="field-label" id="offer-status-label">Estado de la oferta</span>
            {!isEditing ? (
              <div className="status-fixed-box">
                <span className="offer-state offer-state--inactive">Inactiva</span>
                <p className="field-hint">
                  Toda oferta se crea con estado inactivo (INACTIVE); la composición del borrador local no garantiza la aceptación del servidor ni activa la oferta automáticamente.
                </p>
              </div>
            ) : (
              <div>
                <div
                  className="radio-group"
                  role="radiogroup"
                  aria-labelledby="offer-status-label"
                >
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="offer-form-status"
                      value="ACTIVE"
                      checked={desiredStatus === "ACTIVE"}
                      onChange={() => onStatusChange("ACTIVE")}
                      disabled={disabled}
                    />
                    <span>Activa</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="offer-form-status"
                      value="INACTIVE"
                      checked={desiredStatus === "INACTIVE"}
                      onChange={() => onStatusChange("INACTIVE")}
                      disabled={disabled}
                    />
                    <span>Inactiva</span>
                  </label>
                </div>

                {isAutoInactive && (
                  <p className="feedback feedback--warning" role="alert">
                    La oferta se mantiene inactiva porque no tiene ningún grupo activo en este borrador. Toda oferta nueva inicia inactiva (INACTIVE) y la composición local no activa la oferta automáticamente ni garantiza la aceptación del servidor hasta guardar.
                  </p>
                )}
                {desiredStatus === "ACTIVE" && hasActiveSlot && (
                  <p className="field-hint">
                    El borrador incluye al menos un grupo con opciones activas para solicitar el estado activo. Toda oferta inicia inactiva (INACTIVE) al crearse y la composición local no garantiza la aceptación del servidor hasta guardar.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="offer-commercial-info__image-column">
          <div className="form-field">
            <label className="field-label" htmlFor="offer-image-input">
              Imagen de la oferta {isEditing ? "(opcional si se conserva)" : "(obligatoria)"}
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

            <button
              type="button"
              className={`image-dropzone ${effectivePreview ? "image-dropzone--has-preview" : ""}`}
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
            </button>

            {imageValidating && (
              <p className="feedback feedback--info">Validando imagen…</p>
            )}
            {imageError && (
              <p className="feedback feedback--error" role="alert">
                {imageError}
              </p>
            )}

            <p className="field-hint">
              Formatos aceptados: JPEG, PNG o WebP. Tamaño máximo: 10 MiB y 4096 × 4096 px.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
