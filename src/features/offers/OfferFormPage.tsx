import { type ChangeEvent, type SubmitEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { contractErrorResponse } from "../../api/catalogResponse";
import { analyzeIdempotentAttemptError } from "../../api/idempotencyResponse";
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
  RecipeSlotOptionUpdate,
  InventoryItemSlotOptionUpdate,
  SlotOptionInput,
  SlotOptionUpdate,
  VersionedResource,
} from "../../application/catalog";
import { invalidateCatalogEntries } from "../../application/catalogCache";
import {
  createOperationAttemptController,
  sealJsonPayload,
  type OperationAttemptController,
  type OperationFlowScope,
  type PendingOperationStorageAdapter,
} from "../../application/operationAttempt";
import { createIndexedDbPendingOperationStorage } from "../../shared/pendingOperationStorage";
import { RecipePage } from "../recipes/RecipePage";
import { buildRecipeCreateScope } from "../recipes/RecipeFormDialog";
import { CompositionEditor } from "./CompositionEditor";
import { OfferCommercialInfo } from "./OfferCommercialInfo";
import { type OptionDraft, OptionModal } from "./OptionModal";
import { type SlotDraft } from "./SlotCard";
import { type SlotModalData, SlotModal } from "./SlotModal";
import { validateOfferImage } from "./offerImage";
import "./styles.css";
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
    options: (s.options || []).map((o) => {
      const isRecipe = o.sourceType === "RECIPE";
      return {
        localId: generateLocalId(),
        optionId: o.optionId,
        displayName: o.displayName,
        status: o.status ?? "ACTIVE",
        sourceType: o.sourceType,
        recipeId: isRecipe ? o.recipeId : undefined,
        recipeName: isRecipe ? o.displayName : undefined,
        hasRecipeAssignmentIntent: false,
        inventoryItemId: !isRecipe ? o.inventoryItemId : undefined,
        inventoryItemName: !isRecipe ? o.displayName : undefined,
        quantity: !isRecipe ? o.quantity : undefined,
        unit: !isRecipe ? o.unit : undefined,
      };
    }),
  }));
}

function validateOfferForm(
  basePrice: string,
  isEditing: boolean,
  selectedFile: File | null,
  imageError: string,
  slots: SlotDraft[],
  confirmedImageId?: string | null,
  imageValidating?: boolean,
): string | null {
  if (imageValidating) {
    return "La imagen se está validando. Espera a que termine la validación.";
  }
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
    const cleanSlotName = slot.name.trim();
    if (!cleanSlotName) {
      return "Todos los grupos deben tener un nombre.";
    }
    if (!Number.isSafeInteger(slot.quantity) || slot.quantity < 1) {
      return `La cantidad de rondas del grupo "${slot.name}" debe ser al menos 1.`;
    }
    for (const opt of slot.options) {
      if (!opt.sourceType) {
        return `La opción "${opt.displayName || "sin nombre"}" en "${slot.name}" debe tener un origen seleccionado.`;
      }
      if (opt.sourceType === "RECIPE") {
        if (!opt.optionId && !opt.recipeId) {
          return `La nueva opción "${opt.displayName || "sin nombre"}" en "${slot.name}" requiere una receta asignada.`;
        }
      } else if (opt.sourceType === "INVENTORY_ITEM") {
        if (!opt.inventoryItemId) {
          return `La opción "${opt.displayName || "sin nombre"}" en "${slot.name}" requiere un artículo de inventario.`;
        }
        if (typeof opt.quantity !== "number" || !Number.isFinite(opt.quantity) || opt.quantity <= 0) {
          return `La opción "${opt.displayName || "sin nombre"}" en "${slot.name}" requiere una cantidad válida mayor a cero.`;
        }
        if (!opt.unit || !opt.unit.trim()) {
          return `La opción "${opt.displayName || "sin nombre"}" en "${slot.name}" requiere una unidad autoritativa.`;
        }
      }
    }
  }
  return null;
}

function mapOptionCreate(o: OptionDraft): SlotOptionInput {
  if (o.sourceType === "RECIPE") {
    return {
      sourceType: "RECIPE",
      recipeId: o.recipeId!,
      displayName: o.displayName || o.recipeName || "Receta",
    };
  }
  return {
    sourceType: "INVENTORY_ITEM",
    inventoryItemId: o.inventoryItemId!,
    quantity: o.quantity ?? 1,
    unit: o.unit || "u",
    displayName: o.displayName || o.inventoryItemName || "Insumo",
  };
}

function mapOptionUpdate(o: OptionDraft): SlotOptionUpdate {
  if (o.sourceType === "RECIPE") {
    const isNew = !o.optionId;
    const shouldIncludeRecipeId = isNew || Boolean(o.hasRecipeAssignmentIntent);

    const recipeOption: RecipeSlotOptionUpdate = {
      ...(o.optionId ? { optionId: o.optionId } : {}),
      displayName: o.displayName || o.recipeName || "Receta",
      status: o.status,
      sourceType: "RECIPE",
      ...(shouldIncludeRecipeId && o.recipeId ? { recipeId: o.recipeId } : {}),
    };
    return recipeOption;
  }

  const inventoryOption: InventoryItemSlotOptionUpdate = {
    ...(o.optionId ? { optionId: o.optionId } : {}),
    displayName: o.displayName || o.inventoryItemName || "Insumo",
    status: o.status,
    sourceType: "INVENTORY_ITEM",
    inventoryItemId: o.inventoryItemId!,
    quantity: o.quantity ?? 1,
    unit: o.unit || "u",
  };
  return inventoryOption;
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

function extractStructuredErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const data =
      "response" in err && (err as { response?: { data?: unknown } }).response?.data
        ? (err as { response?: { data?: unknown } }).response!.data
        : err;
    const contract = contractErrorResponse(data);
    if (contract) {
      const violations = contract.details?.violations ?? [];
      const violationMessages = violations.map((item) => item.message).join(" ");
      if (violationMessages.length > 0 && contract.message) {
        return `${contract.message} ${violationMessages}`;
      }
      return contract.message;
    }
    if ("message" in err && typeof (err as { message: unknown }).message === "string") {
      return (err as { message: string }).message;
    }
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
  const slotModalTriggerRef = useRef<HTMLElement | null>(null);
  const optionModalTriggerRef = useRef<HTMLElement | null>(null);
  const wasOptionModalOpenRef = useRef(false);
  const wasSlotModalOpenRef = useRef(false);
  const previousTargetSlotNameRef = useRef("");

  if (targetSlotIndex !== null && slots[targetSlotIndex]?.name) {
    previousTargetSlotNameRef.current = slots[targetSlotIndex].name;
  }

  useEffect(() => {
    if (wasOptionModalOpenRef.current && !optionModalOpen) {
      const slotName = previousTargetSlotNameRef.current;
      const fallback = slotName
        ? document.querySelector<HTMLElement>(`button[aria-label="Agregar opción a ${slotName}"]`)
        : null;
      const target =
        optionModalTriggerRef.current && optionModalTriggerRef.current !== document.body && optionModalTriggerRef.current.isConnected
          ? optionModalTriggerRef.current
          : fallback;
      const restoreFocus = () => {
        target?.focus();
      };
      restoreFocus();
      requestAnimationFrame(restoreFocus);
      setTimeout(restoreFocus, 0);
    }
    wasOptionModalOpenRef.current = optionModalOpen;
  }, [optionModalOpen]);

  useEffect(() => {
    if (wasSlotModalOpenRef.current && !slotModalOpen) {
      const target =
        slotModalTriggerRef.current && slotModalTriggerRef.current !== document.body
          ? slotModalTriggerRef.current
          : null;
      const restoreFocus = () => {
        target?.focus();
      };
      restoreFocus();
      requestAnimationFrame(restoreFocus);
      setTimeout(restoreFocus, 0);
    }
    wasSlotModalOpenRef.current = slotModalOpen;
  }, [slotModalOpen]);

  const imageValidationId = useRef(0);
  const restoredFromStorageRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const activeContextRef = useRef({ entryId, offerId });
  activeContextRef.current = { entryId, offerId };

  useEffect(() => {
    if (!recipePickerOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setRecipePickerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [recipePickerOpen]);

  // O12: Reset all form state and invalidate in-flight validations when route identity changes
  useEffect(() => {
    imageValidationId.current += 1;
    controllerRef.current = null;
    confirmedImageIdRef.current = null;
    openingEtagRef.current = undefined;
    sentSlotsRef.current = [];
    restoredFromStorageRef.current = false;
    isSubmittingRef.current = false;

    setPresentationTag("");
    setBasePrice("");
    setDesiredStatus("INACTIVE");
    setSlots([]);
    setSelectedFile(null);
    setPreviewUrl("");
    setExistingImage(null);
    setImageError("");
    setImageValidating(false);
    setFormError("");
    setConflictNotice("");
    setAmbiguousNotice("");
    setAmbiguousResponse(null);
    setUncertainStage(null);
    setRetryCountdownMs(0);
    setReviewedOffer(null);
    setReviewLoading(false);
    setSlotModalOpen(false);
    setEditingSlotIndex(null);
    setOptionModalOpen(false);
    setTargetSlotIndex(null);
    setEditingOptionIndex(null);
    setCurrentOptionDraft(null);
    setRecipePickerOpen(false);
    setSaving(false);
  }, [entryId, offerId]);

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
        if (activeContextRef.current.entryId !== entryId || activeContextRef.current.offerId !== offerId) return;
        setEntry(entryData);
        if (offerData && !restoredFromStorageRef.current) {
          if (offerData.data.entryId && offerData.data.entryId !== entryId) {
            setLoadError("La oferta no pertenece a la entrada seleccionada.");
            return;
          }
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
        if (!controller.signal.aborted && activeContextRef.current.entryId === entryId && activeContextRef.current.offerId === offerId) {
          const message = extractStructuredErrorMessage(err);
          setLoadError(message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && activeContextRef.current.entryId === entryId && activeContextRef.current.offerId === offerId) {
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
    const active = document.activeElement as HTMLElement | null;
    slotModalTriggerRef.current = active && active !== document.body ? active : null;
    setEditingSlotIndex(null);
    setSlotModalOpen(true);
  }

  function handleOpenEditSlot(index: number) {
    const active = document.activeElement as HTMLElement | null;
    slotModalTriggerRef.current = active && active !== document.body ? active : null;
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
    const active = document.activeElement as HTMLElement | null;
    optionModalTriggerRef.current = active && active !== document.body ? active : null;
    setTargetSlotIndex(slotIndex);
    setEditingOptionIndex(null);
    setCurrentOptionDraft(null);
    setOptionModalOpen(true);
  }

  function handleOpenEditOption(slotIndex: number, optionIndex: number) {
    const active = document.activeElement as HTMLElement | null;
    optionModalTriggerRef.current = active && active !== document.body ? active : null;
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
    setCurrentOptionDraft((prev) => {
      if (!prev) {
        return {
          localId: generateLocalId(),
          displayName: recipe.name,
          status: "ACTIVE",
          sourceType: "RECIPE",
          recipeId: recipe.id,
          recipeName: recipe.name,
          hasRecipeAssignmentIntent: true,
        };
      }
      return {
        ...prev,
        sourceType: "RECIPE",
        recipeId: recipe.id,
        recipeName: recipe.name,
        displayName: prev.displayName.trim() ? prev.displayName : recipe.name,
        hasRecipeAssignmentIntent: true,
        inventoryItemId: undefined,
        inventoryItemName: undefined,
        quantity: undefined,
        unit: undefined,
      };
    });
    setRecipePickerOpen(false);
  }

  // Derived slot & offer status
  const hasActiveSlot = slots.some((slot) =>
    slot.options.some((opt) => opt.status === "ACTIVE"),
  );

  async function handleSaveOffer(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current || saving) {
      return;
    }
    if (imageValidating) {
      setFormError("La imagen se está validando. Espera a que termine la validación.");
      return;
    }
    isSubmittingRef.current = true;
    setSaving(true);
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
      imageValidating,
    );
    if (error) {
      setFormError(error);
      isSubmittingRef.current = false;
      setSaving(false);
      return;
    }

    if (ambiguousResponse) {
      setFormError("Debes resolver la revisión de la composición guardada antes de guardar nuevos cambios.");
      isSubmittingRef.current = false;
      setSaving(false);
      return;
    }

    const currentEntryId = entryId;
    const currentOfferId = offerId;
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

      if (activeContextRef.current.entryId !== currentEntryId || activeContextRef.current.offerId !== currentOfferId) {
        return;
      }

      if (attemptResult.status === "succeeded") {
        const result = attemptResult.result!;
        const reconciliation = reconcileComposition({
          currentSlots: slotsWithLocalIds,
          sentSlots: sentSlotsRef.current,
          responseSlots: result.composition?.slots || [],
        });

        if (reconciliation.status === "success") {
          invalidateCatalogEntries(repository);
          const confirmedSlots = reconciliation.slots.map((slot) => ({
            ...slot,
            options: slot.options.map((opt) => ({
              ...opt,
              hasRecipeAssignmentIntent: false,
            })),
          }));
          setSlots(confirmedSlots);
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
      if (activeContextRef.current.entryId !== currentEntryId || activeContextRef.current.offerId !== currentOfferId) {
        return;
      }
      const msg = extractStructuredErrorMessage(err);
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
      isSubmittingRef.current = false;
      if (activeContextRef.current.entryId === currentEntryId && activeContextRef.current.offerId === currentOfferId) {
        setSaving(false);
      }
    }
  }

  async function handleManualRetry() {
    if (isSubmittingRef.current || saving) return;
    isSubmittingRef.current = true;
    setSaving(true);
    setFormError("");
    const currentEntryId = entryId;
    const currentOfferId = offerId;
    const controller = getOrInitController();

    try {
      const attemptResult = await controller.retryPending();

      if (activeContextRef.current.entryId !== currentEntryId || activeContextRef.current.offerId !== currentOfferId) {
        return;
      }

      if (attemptResult.status === "succeeded") {
        setUncertainStage(null);
        const result = attemptResult.result!;
        const reconciliation = reconcileComposition({
          currentSlots: slots,
          sentSlots: sentSlotsRef.current,
          responseSlots: result.composition?.slots || [],
        });

        if (reconciliation.status === "success") {
          invalidateCatalogEntries(repository);
          const confirmedSlots = reconciliation.slots.map((slot) => ({
            ...slot,
            options: slot.options.map((opt) => ({
              ...opt,
              hasRecipeAssignmentIntent: false,
            })),
          }));
          setSlots(confirmedSlots);
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
      if (activeContextRef.current.entryId === currentEntryId && activeContextRef.current.offerId === currentOfferId) {
        setFormError(extractStructuredErrorMessage(err));
      }
    } finally {
      isSubmittingRef.current = false;
      if (activeContextRef.current.entryId === currentEntryId && activeContextRef.current.offerId === currentOfferId) {
        setSaving(false);
      }
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
      setFormError(extractStructuredErrorMessage(err));
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
    invalidateCatalogEntries(repository);
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
            {loadError !== "La oferta no pertenece a la entrada seleccionada." && (
              <button type="button" onClick={() => setRetryCount((c) => c + 1)}>
                Reintentar
              </button>
            )}
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
                disabled={saving || imageValidating || isSubmittingRef.current || Boolean(conflictNotice) || Boolean(ambiguousNotice)}
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
          onClose={() => {
            setSlotModalOpen(false);
            setEditingSlotIndex(null);
          }}
        />

        <OptionModal
          isOpen={optionModalOpen}
          slotName={currentSlotName}
          initialData={currentOptionDraft}
          isCreateMode={!isEditing}
          isNestedPickerOpen={recipePickerOpen}
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
              event.stopPropagation();
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
