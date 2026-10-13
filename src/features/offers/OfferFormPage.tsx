import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type {
  MenuEntryDetail,
  MenuImage,
  MenuOfferDetail,
  MenuRepository,
  OfferCreateDraft,
  OfferStatus,
  OfferUpdateDraft,
  RecipeSummary,
} from "../../application/catalog";
import { RecipePage } from "../recipes/RecipePage";
import { CompositionEditor } from "./CompositionEditor";
import { OfferCommercialInfo } from "./OfferCommercialInfo";
import { type OptionDraft, OptionModal } from "./OptionModal";
import type { SlotDraft } from "./SlotCard";
import { type SlotModalData, SlotModal } from "./SlotModal";
import { validateOfferImage } from "./offerImage";

function safeReturnPath(state: unknown, fallback: string): string {
  if (!state || typeof state !== "object") return fallback;
  if ("returnTo" in state && typeof state.returnTo === "string") {
    const path = state.returnTo;
    if (path.startsWith("/") && !path.startsWith("//")) return path;
  }
  return fallback;
}

function mapOfferDetailToSlots(offer: MenuOfferDetail): SlotDraft[] {
  if (!offer.composition?.slots) return [];
  return offer.composition.slots.map((s) => ({
    slotId: s.slotId,
    name: s.name,
    quantity: s.quantity,
    course: s.course ?? null,
    options: (s.options || []).map((o) => ({
      optionId: o.optionId,
      displayName: o.displayName,
      status: o.status,
      sourceType: o.sourceType,
      recipeId: o.recipeId,
      recipeRevision: o.recipeRevision,
      recipeName: o.displayName,
      inventoryItemId: o.inventoryItemId,
      inventoryItemName: o.displayName,
      quantity: o.quantity,
      unit: o.unit,
    })),
  }));
}

export interface OfferFormPageProps {
  repository: MenuRepository;
}

export function OfferFormPage({ repository }: Readonly<OfferFormPageProps>) {
  const { entryId = "", offerId } = useParams();
  const isEditing = Boolean(offerId);

  const location = useLocation();
  const navigate = useNavigate();

  const defaultReturnTo = `/entries/${encodeURIComponent(entryId)}/offers`;
  const returnTo = safeReturnPath(location.state, defaultReturnTo);

  const [entry, setEntry] = useState<MenuEntryDetail | null>(null);

  const [presentationTag, setPresentationTag] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [desiredStatus, setDesiredStatus] = useState<OfferStatus>("INACTIVE");
  const [slots, setSlots] = useState<SlotDraft[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [existingImage, setExistingImage] = useState<MenuImage | null>(null);
  const [imageError, setImageError] = useState("");
  const [imageValidating, setImageValidating] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Modal states
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);
  const [currentOptionDraft, setCurrentOptionDraft] = useState<OptionDraft | null>(null);

  const [recipePickerOpen, setRecipePickerOpen] = useState(false);

  const imageValidationId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");

    const promises: [Promise<MenuEntryDetail>, Promise<MenuOfferDetail | null>] = [
      repository.getEntry(entryId, controller.signal),
      offerId ? repository.getOffer(offerId, controller.signal) : Promise.resolve(null),
    ];

    Promise.all(promises)
      .then(([entryData, offerData]) => {
        if (controller.signal.aborted) return;
        setEntry(entryData);
        if (offerData) {
          setPresentationTag(offerData.presentationTag || "");
          setBasePrice(String(offerData.basePrice ?? ""));
          setDesiredStatus(offerData.status);
          setExistingImage(offerData.image);
          setSlots(mapOfferDetailToSlots(offerData));
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          const message =
            err && typeof err === "object" && "message" in err && typeof err.message === "string"
              ? err.message
              : "No se pudieron cargar los datos de la oferta.";
          setLoadError(message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [entryId, offerId, repository, retryCount]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  async function processSelectedImage(file: File) {
    const currentRun = imageValidationId.current + 1;
    imageValidationId.current = currentRun;
    setSelectedFile(file);
    setImageError("");
    setImageValidating(true);

    try {
      await validateOfferImage(file);
    } catch (err) {
      if (imageValidationId.current === currentRun) {
        setImageError(err instanceof Error ? err.message : "Error al validar la imagen.");
        setSelectedFile(null);
      }
    } finally {
      if (imageValidationId.current === currentRun) {
        setImageValidating(false);
      }
    }
  }

  function handleSelectImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      void processSelectedImage(file);
    }
  }

  function handleDropImage(file: File) {
    void processSelectedImage(file);
  }

  // Slot modal handlers
  function handleOpenAddSlot() {
    setEditingSlotIndex(null);
    setSlotModalOpen(true);
  }

  function handleOpenEditSlot(index: number) {
    setEditingSlotIndex(index);
    setSlotModalOpen(true);
  }

  function handleSaveSlot(data: SlotModalData) {
    if (editingSlotIndex !== null) {
      setSlots((prev) =>
        prev.map((slot, idx) => (idx === editingSlotIndex ? { ...slot, ...data } : slot))
      );
    } else {
      setSlots((prev) => [...prev, { ...data, options: [] }]);
    }
    setSlotModalOpen(false);
    setEditingSlotIndex(null);
  }

  function handleDeleteSlot(index: number) {
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
  }

  // Option modal handlers
  function handleOpenAddOption(slotIndex: number) {
    setTargetSlotIndex(slotIndex);
    setEditingOptionIndex(null);
    setCurrentOptionDraft(null);
    setOptionModalOpen(true);
  }

  function handleOpenEditOption(slotIndex: number, optionIndex: number) {
    setTargetSlotIndex(slotIndex);
    setEditingOptionIndex(optionIndex);
    const existing = slots[slotIndex]?.options[optionIndex] || null;
    setCurrentOptionDraft(existing);
    setOptionModalOpen(true);
  }

  function handleSaveOption(optionData: OptionDraft) {
    if (targetSlotIndex === null) return;
    setSlots((prev) =>
      prev.map((slot, sIdx) => {
        if (sIdx !== targetSlotIndex) return slot;
        if (editingOptionIndex !== null) {
          const updatedOptions = slot.options.map((opt, oIdx) =>
            oIdx === editingOptionIndex ? optionData : opt
          );
          return { ...slot, options: updatedOptions };
        }
        return { ...slot, options: [...slot.options, optionData] };
      })
    );
    setOptionModalOpen(false);
    setTargetSlotIndex(null);
    setEditingOptionIndex(null);
    setCurrentOptionDraft(null);
  }

  function handleDeleteOption(slotIndex: number, optionIndex: number) {
    setSlots((prev) =>
      prev.map((slot, sIdx) => {
        if (sIdx !== slotIndex) return slot;
        return {
          ...slot,
          options: slot.options.filter((_, oIdx) => oIdx !== optionIndex),
        };
      })
    );
  }

  function handleToggleOptionStatus(slotIndex: number, optionIndex: number) {
    setSlots((prev) =>
      prev.map((slot, sIdx) => {
        if (sIdx !== slotIndex) return slot;
        return {
          ...slot,
          options: slot.options.map((opt, oIdx) => {
            if (oIdx !== optionIndex) return opt;
            const newStatus: OfferStatus = opt.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            return { ...opt, status: newStatus };
          }),
        };
      })
    );
  }

  // Recipe selection (V6)
  function handleOpenRecipePicker() {
    setRecipePickerOpen(true);
  }

  function handleSelectRecipe(recipe: RecipeSummary) {
    setCurrentOptionDraft((prev) => ({
      optionId: prev?.optionId,
      displayName: prev?.displayName || recipe.name,
      status: prev?.status ?? "ACTIVE",
      sourceType: "RECIPE",
      recipeId: recipe.id,
      recipeRevision: 1,
      recipeName: recipe.name,
      inventoryItemId: undefined,
      inventoryItemName: undefined,
      quantity: undefined,
      unit: undefined,
    }));
    setRecipePickerOpen(false);
  }

  // Derived slot & offer status
  const hasActiveSlot = slots.some((slot) =>
    slot.options.some((opt) => opt.status === "ACTIVE")
  );

  const effectiveStatus: OfferStatus = isEditing
    ? desiredStatus === "ACTIVE" && hasActiveSlot
      ? "ACTIVE"
      : "INACTIVE"
    : "INACTIVE";

  async function handleSaveOffer(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");

    const priceNumber = Number(basePrice);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      setFormError("El precio base debe ser un número positivo.");
      return;
    }

    if (!isEditing && !selectedFile) {
      setFormError("La imagen de la oferta es obligatoria al crear.");
      return;
    }

    if (imageError) {
      setFormError("Corrige el error de la imagen antes de guardar.");
      return;
    }

    if (slots.length === 0) {
      setFormError("La composición debe incluir al menos un grupo (slot).");
      return;
    }

    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      if (slot.options.length === 0) {
        setFormError(`El grupo "${slot.name}" debe incluir al menos una opción.`);
        return;
      }
      for (let j = 0; j < slot.options.length; j += 1) {
        const opt = slot.options[j];
        if (!opt.sourceType) {
          setFormError(`La opción "${opt.displayName || "sin nombre"}" en "${slot.name}" debe tener un origen seleccionado.`);
          return;
        }
      }
    }

    setSaving(true);

    try {
      if (!isEditing) {
        const createDraft: OfferCreateDraft = {
          presentationTag: presentationTag.trim(),
          basePrice: priceNumber,
          composition: {
            slots: slots.map((s) => ({
              name: s.name,
              quantity: s.quantity,
              course: s.course,
              options: s.options.map((o) => {
                if (o.sourceType === "RECIPE") {
                  return {
                    sourceType: "RECIPE" as const,
                    recipeId: o.recipeId!,
                    recipeRevision: o.recipeRevision ?? 1,
                    displayName: o.displayName || o.recipeName || "Receta",
                  };
                }
                return {
                  sourceType: "INVENTORY_ITEM" as const,
                  inventoryItemId: o.inventoryItemId!,
                  quantity: o.quantity ?? 1,
                  unit: o.unit || "u",
                  displayName: o.displayName || o.inventoryItemName || "Insumo",
                };
              }),
            })),
          },
        };

        await repository.createOffer(entryId, createDraft, selectedFile!);
      } else {
        const updateDraft: OfferUpdateDraft = {
          presentationTag: presentationTag.trim(),
          basePrice: priceNumber,
          status: effectiveStatus,
          composition: {
            slots: slots.map((s) => ({
              slotId: s.slotId,
              name: s.name,
              quantity: s.quantity,
              course: s.course,
              options: s.options.map((o) => {
                if (o.sourceType === "RECIPE") {
                  return {
                    optionId: o.optionId,
                    displayName: o.displayName || o.recipeName || "Receta",
                    status: o.status,
                    sourceType: "RECIPE" as const,
                    recipeId: o.recipeId!,
                    recipeRevision: o.recipeRevision ?? 1,
                  };
                }
                return {
                  optionId: o.optionId,
                  displayName: o.displayName || o.inventoryItemName || "Insumo",
                  status: o.status,
                  sourceType: "INVENTORY_ITEM" as const,
                  inventoryItemId: o.inventoryItemId!,
                  quantity: o.quantity ?? 1,
                  unit: o.unit || "u",
                };
              }),
            })),
          },
        };

        await repository.updateOffer(offerId!, updateDraft, selectedFile || undefined);
      }

      await navigate(returnTo, { replace: true });
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "Ocurrió un error al guardar la oferta.";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  const slotModalInitialData: SlotModalData | null =
    editingSlotIndex !== null && slots[editingSlotIndex]
      ? {
          name: slots[editingSlotIndex].name,
          quantity: slots[editingSlotIndex].quantity,
          course: slots[editingSlotIndex].course,
        }
      : null;

  const currentSlotName =
    targetSlotIndex !== null && slots[targetSlotIndex] ? slots[targetSlotIndex].name : "";

  return (
    <div className="app-shell offer-form-view">
      <nav className="global-nav" aria-label="Navegación principal">
        <Link className="brand" to={returnTo}>
          <span className="brand__mark" aria-hidden="true">F</span>
          <span>FMAT <strong>Restaurant</strong></span>
        </Link>
        <span className="global-nav__section">Administración del menú</span>
      </nav>

      <main className="offer-form-page">
        <header className="offer-form-page__heading">
          <Link to={returnTo} className="back-link">
            ← Volver a ofertas
          </Link>
          <p className="eyebrow">Administración / Menú / Ofertas</p>
          <h1>{isEditing ? "Editar oferta" : "Nueva oferta"}</h1>
          <p className="offer-form-page__subtitle">
            Entrada: <strong>{entry?.brandName || "Cargando…"}</strong>
          </p>
        </header>

        {loading && (
          <p className="feedback" aria-live="polite">
            Cargando datos de la oferta…
          </p>
        )}

        {loadError && (
          <div className="feedback feedback--error" role="alert">
            {loadError}{" "}
            <button type="button" onClick={() => setRetryCount((c) => c + 1)}>
              Reintentar
            </button>
          </div>
        )}

        {!loading && !loadError && (
          <form className="offer-form" onSubmit={handleSaveOffer} aria-busy={saving} noValidate>
            {formError && (
              <p className="feedback feedback--error" role="alert">
                {formError}
              </p>
            )}

            <OfferCommercialInfo
              presentationTag={presentationTag}
              onPresentationTagChange={setPresentationTag}
              basePrice={basePrice}
              onBasePriceChange={setBasePrice}
              onStatusChange={setDesiredStatus}
              desiredStatus={desiredStatus}
              hasActiveSlot={hasActiveSlot}
              isEditing={isEditing}
              existingImage={existingImage}
              previewUrl={previewUrl}
              onSelectImage={handleSelectImage}
              onDropImage={handleDropImage}
              imageError={imageError}
              imageValidating={imageValidating}
              disabled={saving}
            />

            <CompositionEditor
              slots={slots}
              onAddSlot={handleOpenAddSlot}
              onEditSlot={handleOpenEditSlot}
              onDeleteSlot={handleDeleteSlot}
              onAddOption={handleOpenAddOption}
              onEditOption={handleOpenEditOption}
              onDeleteOption={handleDeleteOption}
              onToggleOptionStatus={handleToggleOptionStatus}
              disabled={saving}
            />

            <div className="offer-form__actions">
              <Link to={returnTo} className="button button--secondary">
                Cancelar
              </Link>
              <button
                type="submit"
                className="button button--primary"
                disabled={saving || imageValidating}
              >
                {saving ? "Guardando…" : "Guardar Oferta"}
              </button>
            </div>
          </form>
        )}

        <SlotModal
          isOpen={slotModalOpen}
          initialData={slotModalInitialData}
          onSave={handleSaveSlot}
          onClose={() => setSlotModalOpen(false)}
        />

        <OptionModal
          isOpen={optionModalOpen}
          slotName={currentSlotName}
          initialData={currentOptionDraft}
          onSave={handleSaveOption}
          onClose={() => setOptionModalOpen(false)}
          onOpenRecipePicker={handleOpenRecipePicker}
        />

        {recipePickerOpen && (
          <div className="recipe-picker-modal" role="dialog" aria-modal="true">
            <RecipePage
              repository={repository}
              mode="selection"
              onSelectRecipe={handleSelectRecipe}
              onClose={() => setRecipePickerOpen(false)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
