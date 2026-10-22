import { type ChangeEvent, type SubmitEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type {
  MenuEntryDetail,
  MenuImage,
  MenuOfferDetail,
  MenuRepository,
  OfferCreateDraft,
  OfferStatus,
  OfferUpdateDraft,
  RecipeDraft,
  RecipeSummary,
  VersionedResource,
} from "../../application/catalog";
import {
  createOperationAttemptController,
  sealJsonPayload,
  type OperationAttemptController,
  type OperationFlowScope,
  type PendingOperationStorageAdapter,
} from "../../application/operationAttempt";
import { analyzeIdempotentAttemptError } from "../../api/idempotencyResponse";
import { createIndexedDbPendingOperationStorage } from "../../shared/pendingOperationStorage";
import { RecipePage } from "../recipes/RecipePage";
import { buildRecipeCreateScope } from "../recipes/RecipeFormDialog";
import { CompositionEditor } from "./CompositionEditor";
import { OfferCommercialInfo } from "./OfferCommercialInfo";
import { type OptionDraft, OptionModal } from "./OptionModal";
import { type SlotDraft } from "./SlotCard";
import { type SlotModalData, SlotModal } from "./SlotModal";
import { validateOfferImage } from "./offerImage";
import {
  ensureOptionLocalId,
  ensureSlotLocalIds,
  generateLocalId,
  reconcileComposition,
} from "./compositionReconciliation";

export function buildOfferCreateScope(entryId: string, tabId = "singleton"): OperationFlowScope {
  return {
    tabId,
    formKind: "offer-form",
    resourceKey: `create:${entryId}`,
  };
}

export function buildOfferUpdateScope(offerId: string, tabId = "singleton"): OperationFlowScope {
  return {
    tabId,
    formKind: "offer-form",
    resourceKey: `update:${offerId}`,
  };
}

export interface OfferFormDraftState {
  presentationTag: string;
  basePrice: string;
  desiredStatus: OfferStatus;
  slots: SlotDraft[];
}

function safeReturnPath(state: unknown, fallback: string): string {
  if (!state || typeof state !== "object") return fallback;
  if ("returnTo" in state && typeof state.returnTo === "string") {
    const path = state.returnTo;
    if (path.startsWith("/") && !path.startsWith("//")) return path;
  }
  return fallback;
}

function resolveCatalogReturnPath(state: unknown): string {
  if (!state || typeof state !== "object") return "/";
  if ("catalogReturnTo" in state && typeof state.catalogReturnTo === "string") {
    const path = state.catalogReturnTo;
    if (path.startsWith("/") && !path.startsWith("//")) return path;
  }
  return "/";
}

function mapOfferDetailToSlots(offer: MenuOfferDetail): SlotDraft[] {
  if (!offer.composition?.slots) return [];
  return offer.composition.slots.map((s) => ({
    localId: generateLocalId(),
    slotId: s.slotId,
    name: s.name,
    quantity: s.quantity,
    course: s.course ?? null,
    options: (s.options || []).map((o) => ({
      localId: generateLocalId(),
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

function validateOfferForm(
  basePrice: string,
  isEditing: boolean,
  selectedFile: File | null,
  imageError: string,
  slots: SlotDraft[],
  confirmedImageId?: string | null,
): string | null {
  const priceNumber = Number(basePrice);
  if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
    return "El precio base debe ser un número positivo.";
  }
  if (imageError) {
    return "Corrige el error de la imagen antes de guardar.";
  }
  if (!isEditing && !selectedFile && !confirmedImageId) {
    return "La imagen de la oferta es obligatoria al crear.";
  }
  if (slots.length === 0) {
    return "La composición debe incluir al menos un grupo (slot).";
  }
  for (const slot of slots) {
    if (slot.options.length === 0) {
      return `El grupo "${slot.name}" debe incluir al menos una opción.`;
    }
    for (const opt of slot.options) {
      if (!opt.sourceType) {
        return `La opción "${opt.displayName || "sin nombre"}" en "${slot.name}" debe tener un origen seleccionado.`;
      }
    }
  }
  return null;
}

function mapOptionCreate(o: OptionDraft) {
  if (o.sourceType === "RECIPE") {
    return {
      sourceType: "RECIPE" as const,
      recipeId: o.recipeId!,
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
}

function mapOptionUpdate(o: OptionDraft) {
  if (o.sourceType === "RECIPE") {
    return {
      optionId: o.optionId,
      displayName: o.displayName || o.recipeName || "Receta",
      status: o.status,
      sourceType: "RECIPE" as const,
      recipeId: o.recipeId!,
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
}

function buildCreateDraft(presentationTag: string, basePrice: number, slots: SlotDraft[]): OfferCreateDraft {
  return {
    presentationTag: presentationTag.trim(),
    basePrice,
    composition: {
      slots: slots.map((s) => ({
        name: s.name,
        quantity: s.quantity,
        course: s.course,
        options: s.options.map(mapOptionCreate),
      })),
    },
  };
}

function buildUpdateDraft(
  presentationTag: string,
  basePrice: number,
  status: OfferStatus,
  slots: SlotDraft[],
): OfferUpdateDraft {
  return {
    presentationTag: presentationTag.trim(),
    basePrice,
    status,
    composition: {
      slots: slots.map((s) => ({
        slotId: s.slotId,
        name: s.name,
        quantity: s.quantity,
        course: s.course,
        options: s.options.map(mapOptionUpdate),
      })),
    },
  };
}

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Ocurrió un error al guardar la oferta.";
}

export type OfferFormRepository = Pick<
  MenuRepository,
  | "getEntry"
  | "getOffer"
  | "uploadEntryImage"
  | "uploadImage"
  | "createOffer"
  | "updateOffer"
  | "listRecipes"
  | "getRecipe"
  | "createRecipe"
  | "updateRecipe"
  | "deleteRecipe"
  | "listInventoryItems"
>;

export interface OfferFormPageProps {
  repository: OfferFormRepository;
  storage?: PendingOperationStorageAdapter;
}

export function OfferFormPage({
  repository,
  storage = createIndexedDbPendingOperationStorage(),
}: Readonly<OfferFormPageProps>) {
  const { entryId = "", offerId } = useParams();
  const isEditing = Boolean(offerId);

  const location = useLocation();
  const navigate = useNavigate();

  const defaultReturnTo = `/entries/${encodeURIComponent(entryId)}/offers`;
  const returnTo = safeReturnPath(location.state, defaultReturnTo);
  const catalogReturnTo = resolveCatalogReturnPath(location.state);

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

  // Recovery & Conflict states
  const [, setOpeningEtag] = useState<string | undefined>(undefined);
  const openingEtagRef = useRef<string | undefined>(undefined);
  const confirmedImageIdRef = useRef<string | null>(null);
  const sentSlotsRef = useRef<SlotDraft[]>([]);
  const [conflictNotice, setConflictNotice] = useState("");
  const [ambiguousNotice, setAmbiguousNotice] = useState("");
  const [ambiguousResponse, setAmbiguousResponse] = useState<MenuOfferDetail | null>(null);
  const [uncertainStage, setUncertainStage] = useState<"upload" | "persist" | null>(null);
  const [retryCountdownMs, setRetryCountdownMs] = useState(0);
  const [reviewedOffer, setReviewedOffer] = useState<VersionedResource<MenuOfferDetail> | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const controllerRef = useRef<OperationAttemptController<
    OfferFormDraftState,
    MenuOfferDetail
  > | null>(null);

  // Modal states
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);
  const [currentOptionDraft, setCurrentOptionDraft] = useState<OptionDraft | null>(null);

  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const recipeDialogRef = useRef<HTMLDialogElement>(null);

  const imageValidationId = useRef(0);
  const restoredFromStorageRef = useRef(false);

  function getOrInitController(
    overrideFile?: File | null,
  ): OperationAttemptController<OfferFormDraftState, MenuOfferDetail> {
    const activeFile = overrideFile !== undefined ? overrideFile : selectedFile;
    const scope = isEditing
      ? buildOfferUpdateScope(offerId!)
      : buildOfferCreateScope(entryId);

    if (!controllerRef.current) {
      controllerRef.current = createOperationAttemptController<
        OfferFormDraftState,
        MenuOfferDetail
      >({
        scope,
        storage,
        initialDraft: {
          presentationTag,
          basePrice,
          desiredStatus,
          slots: ensureSlotLocalIds(slots),
        },
        stage1ImageUpload:
          activeFile && !confirmedImageIdRef.current
            ? {
                endpointPath: "/media/images",
                file: activeFile,
                fileName: activeFile.name,
                executeUpload: async (stageAttempt) => {
                  const uploadKey = stageAttempt.idempotencyKey;
                  const fileToUpload =
                    stageAttempt.payload.kind === "multipart-file"
                      ? new File(
                          [stageAttempt.payload.fileBlob],
                          stageAttempt.payload.fileName,
                          { type: stageAttempt.payload.mimeType },
                        )
                      : activeFile;
                  const id = await repository.uploadEntryImage(fileToUpload, uploadKey);
                  confirmedImageIdRef.current = id;
                  return { id };
                },
              }
            : undefined,
        buildFinalStageInput: ({
          draft: currentDraft,
          confirmedImageId,
          submittedDraftVersion,
          now,
        }) => {
          const priceNumber = Number(currentDraft.basePrice);
          const slotsWithIds = ensureSlotLocalIds(currentDraft.slots);
          sentSlotsRef.current = slotsWithIds;

          if (confirmedImageId) {
            confirmedImageIdRef.current = confirmedImageId;
          }

          if (!isEditing) {
            const createDraft = buildCreateDraft(
              currentDraft.presentationTag,
              priceNumber,
              slotsWithIds,
            );
            return {
              operationKind: "offer.create",
              method: "POST",
              endpointPath: `/menu/entries/${encodeURIComponent(entryId)}/offers`,
              payload: sealJsonPayload(createDraft),
              submittedDraftVersion,
              now,
            };
          } else {
            let effStatus: OfferStatus = "INACTIVE";
            const hasActive = slotsWithIds.some((s) =>
              s.options.some((o) => o.status === "ACTIVE"),
            );
            if (currentDraft.desiredStatus === "ACTIVE" && hasActive) {
              effStatus = "ACTIVE";
            }
            const updateDraft = buildUpdateDraft(
              currentDraft.presentationTag,
              priceNumber,
              effStatus,
              slotsWithIds,
            );
            return {
              operationKind: "offer.patch",
              method: "PATCH",
              endpointPath: `/menu/offers/${encodeURIComponent(offerId!)}`,
              payload: sealJsonPayload(updateDraft, openingEtagRef.current),
              submittedDraftVersion,
              now,
            };
          }
        },
        executeFinalStage: async ({ attempt }) => {
          if (attempt.payload.kind !== "json") {
            throw new Error("El intento requiere un payload JSON sellado.");
          }
          if (!isEditing) {
            const sealedDraft = attempt.payload.payloadSnapshot as OfferCreateDraft;
            const imageId = confirmedImageIdRef.current;
            if (!imageId) {
              throw new Error("La imagen es obligatoria al crear una oferta.");
            }
            return await repository.createOffer(
              entryId,
              sealedDraft,
              imageId,
              attempt.idempotencyKey,
            );
          } else {
            const sealedDraft = attempt.payload.payloadSnapshot as OfferUpdateDraft;
            const etag = attempt.payload.ifMatch || openingEtagRef.current;
            if (!etag) {
              throw new Error("No se dispone de la versión de apertura (If-Match) para la oferta.");
            }
            return await repository.updateOffer(
              offerId!,
              sealedDraft,
              etag,
              attempt.idempotencyKey,
              confirmedImageIdRef.current || undefined,
            );
          }
        },
        classifyError: (err, attempt) =>
          analyzeIdempotentAttemptError(err, attempt.operationKind),
      });
    }
    return controllerRef.current;
  }

  // Restore nested context from recipe dialog
  useEffect(() => {
    let cancelled = false;
    storage
      .getRecord<RecipeDraft>(buildRecipeCreateScope())
      .then((record) => {
        if (cancelled || !record) return;
        const currentStage = record.stages[record.currentStageIndex];
        if (currentStage && currentStage.status !== "succeeded" && record.nestedContext) {
          const ctx = record.nestedContext as {
            entryId?: string;
            offerId?: string;
            presentationTag?: string;
            basePrice?: string;
            desiredStatus?: OfferStatus;
            slots?: SlotDraft[];
            targetSlotIndex?: number | null;
            editingOptionIndex?: number | null;
            currentOptionDraft?: OptionDraft | null;
            optionModalOpen?: boolean;
            recipePickerOpen?: boolean;
            offerFile?: {
              blob: Blob;
              name: string;
              type: string;
            } | null;
          };

          if (ctx.entryId === entryId) {
            restoredFromStorageRef.current = true;
            if (ctx.presentationTag !== undefined) setPresentationTag(ctx.presentationTag);
            if (ctx.basePrice !== undefined) setBasePrice(ctx.basePrice);
            if (ctx.desiredStatus !== undefined) setDesiredStatus(ctx.desiredStatus);
            if (ctx.slots) setSlots(ensureSlotLocalIds(ctx.slots));
            if (ctx.targetSlotIndex !== undefined) setTargetSlotIndex(ctx.targetSlotIndex);
            if (ctx.editingOptionIndex !== undefined) setEditingOptionIndex(ctx.editingOptionIndex);
            if (ctx.currentOptionDraft !== undefined) setCurrentOptionDraft(ctx.currentOptionDraft);
            if (ctx.optionModalOpen) setOptionModalOpen(true);
            if (ctx.recipePickerOpen) setRecipePickerOpen(true);
            if (ctx.offerFile) {
              const file = new File([ctx.offerFile.blob], ctx.offerFile.name, {
                type: ctx.offerFile.type,
              });
              setSelectedFile(file);
            }
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [entryId, storage]);

  useEffect(() => {
    if (!recipePickerOpen) return;
    const dialog = recipeDialogRef.current;
    if (typeof dialog?.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog?.setAttribute("open", "");
    }
    return () => {
      if (dialog?.open && typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog?.removeAttribute("open");
      }
    };
  }, [recipePickerOpen]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");

    const promises: [Promise<MenuEntryDetail>, Promise<VersionedResource<MenuOfferDetail> | null>] = [
      repository.getEntry(entryId, controller.signal),
      offerId ? repository.getOffer(offerId, controller.signal) : Promise.resolve(null),
    ];

    Promise.all(promises)
      .then(([entryData, offerData]) => {
        if (controller.signal.aborted) return;
        setEntry(entryData);
        if (offerData && !restoredFromStorageRef.current) {
          setOpeningEtag(offerData.etag);
          openingEtagRef.current = offerData.etag;
          setPresentationTag(offerData.data.presentationTag || "");
          setBasePrice(String(offerData.data.basePrice ?? ""));
          setDesiredStatus(offerData.data.status);
          setExistingImage(offerData.data.image);
          setSlots(ensureSlotLocalIds(mapOfferDetailToSlots(offerData.data)));
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

  // Restore own pending operation from storage (F5 reload scenario)
  useEffect(() => {
    const operationController = getOrInitController();
    operationController
      .restoreFromStorage()
      .then((restored) => {
        if (!restored) return;
        const currentStage = restored.stages[restored.currentStageIndex];
        if (!currentStage || currentStage.status === "succeeded") return;

        if (restored.editableDraft) {
          restoredFromStorageRef.current = true;
          setPresentationTag(restored.editableDraft.presentationTag);
          setBasePrice(restored.editableDraft.basePrice);
          setDesiredStatus(restored.editableDraft.desiredStatus);
          setSlots(ensureSlotLocalIds(restored.editableDraft.slots));
        }

        if (restored.stages[0]?.payload.kind === "multipart-file") {
          const p = restored.stages[0].payload;
          const restoredFile = new File([p.fileBlob], p.fileName, { type: p.mimeType });
          setSelectedFile(restoredFile);
        }

        if (restored.confirmedImageId) {
          confirmedImageIdRef.current = restored.confirmedImageId;
        }

        if (currentStage.status === "uncertain" || currentStage.status === "conflict_in_progress") {
          setUncertainStage(restored.currentStageIndex === 0 ? "upload" : "persist");
          if (currentStage.retryAfterUntil) {
            setRetryCountdownMs(Math.max(0, currentStage.retryAfterUntil - Date.now()));
          }
        }

        if (currentStage.status === "precondition_conflict") {
          setConflictNotice(
            "Los datos de la oferta cambiaron en el servidor desde que se abrieron. Revisa la versión actual para decidir si adoptarla.",
          );
        }

        if (currentStage.lastErrorMessage) {
          setFormError(currentStage.lastErrorMessage);
        }
      })
      .catch(() => {});
  }, [entryId, offerId, isEditing]);

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
    confirmedImageIdRef.current = null;
    controllerRef.current = null;

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
        prev.map((slot, idx) => (idx === editingSlotIndex ? { ...slot, ...data } : slot)),
      );
    } else {
      setSlots((prev) => [...prev, { localId: generateLocalId(), ...data, options: [] }]);
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
            oIdx === editingOptionIndex ? ensureOptionLocalId(optionData) : opt,
          );
          return { ...slot, options: updatedOptions };
        }
        return {
          ...slot,
          options: [...slot.options, { ...optionData, localId: optionData.localId || generateLocalId() }],
        };
      }),
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
      }),
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
      }),
    );
  }

  // Recipe selection (V6)
  function handleOpenRecipePicker() {
    setRecipePickerOpen(true);
  }

  function handleSelectRecipe(recipe: RecipeSummary) {
    setCurrentOptionDraft((prev) => ({
      localId: prev?.localId || generateLocalId(),
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
    slot.options.some((opt) => opt.status === "ACTIVE"),
  );

  async function handleSaveOffer(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setConflictNotice("");
    setAmbiguousNotice("");

    const error = validateOfferForm(
      basePrice,
      isEditing,
      selectedFile,
      imageError,
      slots,
      confirmedImageIdRef.current,
    );
    if (error) {
      setFormError(error);
      return;
    }

    if (ambiguousResponse) {
      setFormError("Debes resolver la revisión de la composición guardada antes de guardar nuevos cambios.");
      return;
    }

    setSaving(true);
    const controller = getOrInitController();

    try {
      const slotsWithLocalIds = ensureSlotLocalIds(slots);
      await controller.updateEditableDraft({
        presentationTag,
        basePrice,
        desiredStatus,
        slots: slotsWithLocalIds,
      });

      const isRetry =
        controller.getRecord() !== null &&
        (controller.getCurrentAttempt()?.status === "uncertain" ||
          controller.getCurrentAttempt()?.status === "conflict_in_progress" ||
          controller.getCurrentAttempt()?.status === "pending_retry");

      const attemptResult = isRetry
        ? await controller.retryPending()
        : await controller.submit();

      if (attemptResult.status === "succeeded") {
        const result = attemptResult.result!;
        const reconciliation = reconcileComposition({
          currentSlots: slotsWithLocalIds,
          sentSlots: sentSlotsRef.current,
          responseSlots: result.composition?.slots || [],
        });

        if (reconciliation.status === "success") {
          setSlots(reconciliation.slots);
          const scope = isEditing ? buildOfferUpdateScope(offerId!) : buildOfferCreateScope(entryId);
          await storage.deleteRecord(scope);
          await navigate(returnTo, { replace: true, state: { returnTo: catalogReturnTo } });
        } else {
          setAmbiguousNotice(
            `El envío anterior se guardó correctamente en el servidor, pero la correspondencia de la composición requiere revisión (${reconciliation.reason}).`,
          );
          setAmbiguousResponse(result);
        }
      } else {
        const currentAttempt = controller.getCurrentAttempt();
        if (currentAttempt?.status === "precondition_conflict") {
          setConflictNotice(
            "Los datos de la oferta cambiaron en el servidor desde que se abrieron. Revisa la versión actual para decidir si adoptarla.",
          );
        } else if (
          currentAttempt?.status === "uncertain" ||
          currentAttempt?.status === "conflict_in_progress"
        ) {
          const rec = controller.getRecord();
          setUncertainStage(rec?.currentStageIndex === 0 ? "upload" : "persist");
          if (currentAttempt.retryAfterUntil) {
            setRetryCountdownMs(Math.max(0, currentAttempt.retryAfterUntil - Date.now()));
          }
          setFormError(currentAttempt.lastErrorMessage || "La operación no pudo confirmarse.");
        } else if (currentAttempt?.lastErrorMessage) {
          setFormError(currentAttempt.lastErrorMessage);
        } else if (attemptResult.outcome?.message) {
          setFormError(attemptResult.outcome.message);
        }
      }
    } catch (err) {
      const msg = extractErrorMessage(err);
      if (err && typeof err === "object" && "response" in err) {
        const res = (err as { response?: { status?: number } }).response;
        if (res?.status === 412) {
          setConflictNotice(
            "Los datos de la oferta cambiaron en el servidor desde que se abrieron. Revisa la versión actual para decidir si adoptarla.",
          );
          return;
        }
      }
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleManualRetry() {
    if (saving) return;
    setSaving(true);
    setFormError("");
    const controller = getOrInitController();

    try {
      const attemptResult = await controller.retryPending();

      if (attemptResult.status === "succeeded") {
        setUncertainStage(null);
        const result = attemptResult.result!;
        const reconciliation = reconcileComposition({
          currentSlots: slots,
          sentSlots: sentSlotsRef.current,
          responseSlots: result.composition?.slots || [],
        });

        if (reconciliation.status === "success") {
          setSlots(reconciliation.slots);
          const scope = isEditing ? buildOfferUpdateScope(offerId!) : buildOfferCreateScope(entryId);
          await storage.deleteRecord(scope);
          await navigate(returnTo, { replace: true, state: { returnTo: catalogReturnTo } });
        } else {
          setAmbiguousNotice(
            `El envío anterior se guardó correctamente en el servidor, pero la correspondencia de la composición requiere revisión (${reconciliation.reason}).`,
          );
          setAmbiguousResponse(result);
        }
      } else {
        const currentAttempt = controller.getCurrentAttempt();
        if (currentAttempt?.status === "precondition_conflict") {
          setConflictNotice(
            "Los datos de la oferta cambiaron en el servidor desde que se abrieron. Revisa la versión actual para decidir si adoptarla.",
          );
        } else if (
          currentAttempt?.status === "uncertain" ||
          currentAttempt?.status === "conflict_in_progress"
        ) {
          const rec = controller.getRecord();
          setUncertainStage(rec?.currentStageIndex === 0 ? "upload" : "persist");
          if (currentAttempt.retryAfterUntil) {
            setRetryCountdownMs(Math.max(0, currentAttempt.retryAfterUntil - Date.now()));
          }
          setFormError(currentAttempt.lastErrorMessage || "La operación no pudo confirmarse.");
        } else if (currentAttempt?.lastErrorMessage) {
          setFormError(currentAttempt.lastErrorMessage);
        }
      }
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReviewCurrentOffer() {
    if (!offerId) return;
    setReviewLoading(true);
    setFormError("");
    try {
      const versioned = await repository.getOffer(offerId);
      setReviewedOffer(versioned);
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setReviewLoading(false);
    }
  }

  function handleAdoptReviewedOffer() {
    if (!reviewedOffer) return;
    setOpeningEtag(reviewedOffer.etag);
    openingEtagRef.current = reviewedOffer.etag;
    setSlots(ensureSlotLocalIds(mapOfferDetailToSlots(reviewedOffer.data)));
    setPresentationTag(reviewedOffer.data.presentationTag || "");
    setBasePrice(String(reviewedOffer.data.basePrice ?? ""));
    setDesiredStatus(reviewedOffer.data.status);
    setExistingImage(reviewedOffer.data.image);
    setConflictNotice("");
    setAmbiguousNotice("");
    setAmbiguousResponse(null);
    setReviewedOffer(null);
    controllerRef.current = null;
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

  const nestedRecipeContext = {
    entryId,
    offerId,
    presentationTag,
    basePrice,
    desiredStatus,
    slots,
    targetSlotIndex,
    editingOptionIndex,
    currentOptionDraft,
    optionModalOpen: true,
    recipePickerOpen: true,
    offerFile: selectedFile
      ? {
          blob: selectedFile,
          name: selectedFile.name,
          type: selectedFile.type,
        }
      : null,
  };

  return (
    <div className="app-shell offer-form-view">
      <nav className="global-nav" aria-label="Navegación principal">
        <Link className="brand" to={returnTo} state={{ returnTo: catalogReturnTo }}>
          <span className="brand__mark" aria-hidden="true">F</span>
          <span>FMAT <strong>Restaurant</strong></span>
        </Link>
        <span className="global-nav__section">Administración del menú</span>
      </nav>

      <main className="offer-form-page">
        <header className="offer-form-page__heading">
          <Link to={returnTo} state={{ returnTo: catalogReturnTo }} className="back-link">
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
            {uncertainStage && (
              <div className="feedback feedback--warning" role="alert">
                La operación anterior no pudo confirmarse. Puedes reintentar con los mismos datos guardados o cancelar para revisar el borrador.{" "}
                <button
                  type="button"
                  className="button button--small button--primary"
                  onClick={() => void handleManualRetry()}
                  disabled={saving || retryCountdownMs > 0}
                >
                  Reintentar
                </button>
              </div>
            )}

            {conflictNotice && (
              <div className="feedback feedback--error" role="alert">
                {conflictNotice}{" "}
                <button
                  type="button"
                  className="button button--small button--secondary"
                  onClick={() => void handleReviewCurrentOffer()}
                  disabled={reviewLoading}
                >
                  {reviewLoading ? "Consultando…" : "Revisar oferta actual"}
                </button>
              </div>
            )}

            {ambiguousNotice && (
              <div className="feedback feedback--warning" role="alert">
                {ambiguousNotice}{" "}
                <button
                  type="button"
                  className="button button--small button--secondary"
                  onClick={() => void handleReviewCurrentOffer()}
                  disabled={reviewLoading}
                >
                  Revisar oferta actual
                </button>
                <button
                  type="button"
                  className="button button--small button--primary"
                  onClick={handleAdoptReviewedOffer}
                >
                  Adoptar composición del servidor
                </button>
              </div>
            )}

            {reviewedOffer && (
              <div className="feedback feedback--info" role="region" aria-label="Versión del servidor">
                <p>
                  <strong>Versión actual en el servidor:</strong> ETag {reviewedOffer.etag}, etiqueta “{reviewedOffer.data.presentationTag}”, precio $ {reviewedOffer.data.basePrice}.
                </p>
                <p>
                  Adoptar esta versión actualizará la composición y versión de apertura del formulario, conservando los demás campos.
                </p>
                <button
                  type="button"
                  className="button button--small button--primary"
                  onClick={handleAdoptReviewedOffer}
                >
                  Adoptar versión del servidor
                </button>
                <button
                  type="button"
                  className="button button--small button--secondary"
                  onClick={() => setReviewedOffer(null)}
                >
                  Mantener borrador actual
                </button>
              </div>
            )}

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
              <Link to={returnTo} state={{ returnTo: catalogReturnTo }} className="button button--secondary">
                Cancelar
              </Link>
              <button
                type="submit"
                className="button button--primary"
                disabled={saving || imageValidating || Boolean(conflictNotice) || Boolean(ambiguousNotice)}
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
          onChangeDraft={(updated) => setCurrentOptionDraft(updated)}
          onSave={handleSaveOption}
          onClose={() => {
            setOptionModalOpen(false);
            setTargetSlotIndex(null);
            setEditingOptionIndex(null);
            setCurrentOptionDraft(null);
          }}
          onOpenRecipePicker={handleOpenRecipePicker}
        />

        {recipePickerOpen && (
          <dialog
            ref={recipeDialogRef}
            className="recipe-picker-modal"
            aria-label="Biblioteca de recetas"
            onCancel={(event) => {
              event.preventDefault();
              setRecipePickerOpen(false);
            }}
          >
            <RecipePage
              repository={repository}
              mode="selection"
              storage={storage}
              nestedContext={nestedRecipeContext}
              onSelectRecipe={handleSelectRecipe}
              onClose={() => setRecipePickerOpen(false)}
            />
          </dialog>
        )}
      </main>
    </div>
  );
}
