import { receiptState, saveReceiptMessage, type LocalSaveReceipt } from "../../shared/localSaveReceipt";
import { LoadingValue } from "../../shared/LoadingState";
import { revealFormControl, useFormActionsLayout } from "../../shared/useFormActionsLayout";
import { sameDraft, useEditGuard } from "../../shared/editGuard";
import { formatMoney } from "../../shared/formatMoney";
import { isStrongEtag } from "../../application/entryVersion";
import { Icon } from "../../shared/Icon";
import { type ChangeEvent, type SubmitEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { contractErrorResponse } from "../../api/catalogResponse";
import { analyzeIdempotentAttemptError } from "../../api/idempotencyResponse";
import type {
  InventoryItem,
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
import { InventoryPage } from "../inventory/InventoryPage";
import { invalidateCatalogEntries } from "../../application/catalogCache";
import {
  createOperationAttemptController,
  isAttemptWindowExpired,
  getOrCreateTabId,
  type OperationExecutionResult,
  sealJsonPayload,
  type OperationAttemptController,
  type OperationFlowScope,
  type PendingOperationChainRecord,
  type PendingOperationStorageAdapter,
  type SealedOperationAttempt,
} from "../../application/operationAttempt";
import { useRetryEligibility } from "../../shared/useRetryEligibility";
import { createIndexedDbPendingOperationStorage } from "../../shared/pendingOperationStorage";
import { RecipeSelectionTask, type RecipeSelectionTaskHandle } from "../recipes/RecipeSelectionTask";
import { buildRecipeCreateScope } from "../recipes/RecipeFormDialog";
import { CompositionEditor } from "./CompositionEditor";
import { OfferCommercialInfo } from "./OfferCommercialInfo";
import { OptionModal } from "./OptionModal";
import { optionRequest, validateOptionDraft, type OptionDraft } from "./optionDraft";
import { type SlotDraft } from "./SlotCard";
import { type SlotModalData, SlotModal } from "./SlotModal";
import { validateOfferImage } from "./offerImage";
import "./styles.css";
import {
  ensureOptionLocalId,
  ensureSlotLocalIds,
  generateLocalId,
  reconcileComposition,
  consumeConfirmedRecipeAssignments,
} from "./compositionReconciliation";

export function buildOfferCreateScope(entryId: string, tabId = getOrCreateTabId()): OperationFlowScope {
  return {
    tabId,
    formKind: "offer-form",
    resourceKey: `create:${entryId}`,
  };
}

export function buildOfferUpdateScope(offerId: string, tabId = getOrCreateTabId()): OperationFlowScope {
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
  imageFile?: File | null;
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
        originalSourceType: o.sourceType,
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

function validateOfferSlot(slot: SlotDraft, isEditing: boolean): string | null {
  if (slot.options.length === 0) {
    return `El grupo "${slot.name}" debe incluir al menos una opción.`;
  }
  if (!slot.name.trim()) {
    return "Todos los grupos deben tener un nombre.";
  }
  if (!Number.isSafeInteger(slot.quantity) || slot.quantity < 1) {
    return `El número de rondas de selección del grupo "${slot.name}" debe ser al menos 1.`;
  }
  for (const option of slot.options) {
    const result = validateOptionDraft(option, isEditing ? "update" : "create");
    if (!result.valid) {
      return `La opción "${option.displayName || "sin nombre"}" en "${slot.name}": ${result.message}`;
    }
  }
  return null;
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
    return "La composición debe incluir al menos un grupo.";
  }
  for (const slot of slots) {
    const slotError = validateOfferSlot(slot, isEditing);
    if (slotError) return slotError;
  }
  return null;
}

interface OfferSaveBlockerContext {
  action: "submit" | "retry";
  pending: SealedOperationAttempt | null;
  newOperationAuthorized: boolean;
  draft: Pick<OfferFormDraftState, "basePrice" | "slots">;
  isEditing: boolean;
  selectedFile: File | null;
  imageError: string;
  confirmedImageId: string | null;
  imageValidating: boolean;
}

function offerSaveBlockerMessage({
  action,
  pending,
  newOperationAuthorized,
  draft,
  isEditing,
  selectedFile,
  imageError,
  confirmedImageId,
  imageValidating,
}: Readonly<OfferSaveBlockerContext>): string | null {
  if (pending && pending.status !== "succeeded" && isAttemptWindowExpired(pending)) {
    return "La ventana de recuperación de 24 horas expiró. Revisa la oferta actual antes de iniciar otra operación.";
  }
  if (pending?.status === "requires_new_key" && !newOperationAuthorized) {
    return "El envío fue rechazado. Pulsa «Iniciar nueva operación» antes de guardar tus cambios.";
  }
  const recovering = action === "retry" || pending?.status === "uncertain" || pending?.status === "conflict_in_progress";
  if (recovering) return null;
  return validateOfferForm(draft.basePrice, isEditing, selectedFile, imageError, draft.slots, confirmedImageId, imageValidating);
}

function needsNewOfferAttempt(pending: SealedOperationAttempt | null, newOperationAuthorized: boolean) {
  return pending?.status === "pre_commit_rejected" || pending?.status === "succeeded" || pending?.status === "precondition_conflict" ||
    (pending?.status === "requires_new_key" && newOperationAuthorized);
}

function reconcileSubmittedOffer(
  current: OfferFormDraftState,
  sent: OfferFormDraftState | null | undefined,
  result: MenuOfferDetail,
): ReturnType<typeof reconcileComposition> {
  if (!sent) {
    return {
      status: "ambiguous",
      reason: "No se recuperó la identidad del envío original.",
      responseSlots: result.composition?.slots ?? [],
    };
  }
  return reconcileComposition({
    currentSlots: current.slots,
    sentSlots: sent.slots,
    responseSlots: result.composition?.slots ?? [],
  });
}

function confirmedBaseDraft(
  sent: OfferFormDraftState | null | undefined,
  result: MenuOfferDetail,
): OfferFormDraftState | null {
  if (!sent) return null;
  const reconciliation = reconcileComposition({
    currentSlots: sent.slots,
    sentSlots: sent.slots,
    responseSlots: result.composition?.slots ?? [],
  });
  if (reconciliation.status === "ambiguous") return null;
  return {
    ...sent,
    slots: consumeConfirmedRecipeAssignments(reconciliation.slots, sent.slots),
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
        options: s.options.map(option => optionRequest(option, "create")),
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
        options: s.options.map(option => optionRequest(option, "update")),
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

interface OfferNestedContext {
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
  offerFile?: { blob: Blob; name: string; type: string } | null;
}

function hasRestorableOfferContext(record: PendingOperationChainRecord<RecipeDraft>): boolean {
  const currentStage = record.stages[record.currentStageIndex];
  return Boolean(currentStage && (currentStage.status !== "succeeded" || record.confirmedResult) && record.nestedContext);
}

interface OfferContextSetters {
  markRestored(): void;
  setPresentationTag(value: string): void;
  setBasePrice(value: string): void;
  setDesiredStatus(value: OfferStatus): void;
  setSlots(value: SlotDraft[]): void;
  setTargetSlotIndex(value: number | null): void;
  setEditingOptionIndex(value: number | null): void;
  setCurrentOptionDraft(value: OptionDraft | null): void;
  setOptionModalOpen(value: boolean): void;
  setRecipePickerOpen(value: boolean): void;
  setSelectedFile(value: File): void;
}

function restoreOfferContext(
  context: OfferNestedContext,
  entryId: string,
  offerId: string | undefined,
  setters: OfferContextSetters,
) {
  if (context.entryId !== entryId || context.offerId !== offerId) return;
  setters.markRestored();
  if (context.presentationTag !== undefined) setters.setPresentationTag(context.presentationTag);
  if (context.basePrice !== undefined) setters.setBasePrice(context.basePrice);
  if (context.desiredStatus !== undefined) setters.setDesiredStatus(context.desiredStatus);
  if (context.slots) setters.setSlots(ensureSlotLocalIds(context.slots));
  if (context.targetSlotIndex !== undefined) setters.setTargetSlotIndex(context.targetSlotIndex);
  if (context.editingOptionIndex !== undefined) setters.setEditingOptionIndex(context.editingOptionIndex);
  if (context.currentOptionDraft !== undefined) setters.setCurrentOptionDraft(context.currentOptionDraft);
  if (context.optionModalOpen) setters.setOptionModalOpen(true);
  if (context.recipePickerOpen) setters.setRecipePickerOpen(true);
  if (context.offerFile) {
    setters.setSelectedFile(new File([context.offerFile.blob], context.offerFile.name, { type: context.offerFile.type }));
  }
}

function OfferLoadFeedback({
  loading,
  loadError,
  onRetry,
}: Readonly<{ loading: boolean; loadError: string; onRetry(): void }>) {
  return <>
    {loading && <output className="sr-only" aria-live="polite">Cargando datos de la oferta…</output>}
    {loadError && <div className="feedback feedback--error" role="alert">
      {loadError}{" "}
      {loadError !== "La oferta no pertenece a la entrada seleccionada." && <button type="button" onClick={onRetry}>Reintentar</button>}
    </div>}
  </>;
}

interface OfferRecoveryFeedbackProps {
  requiresNewOperation: boolean;
  recoveryExpired: boolean;
  hasOfferToReview: boolean;
  uncertainStage: "upload" | "persist" | null;
  retryAllowed?: boolean;
  saving: boolean;
  reviewLoading: boolean;
  conflictNotice: string;
  ambiguousNotice: string;
  onStartNewOperation(): void;
  onReview(): void | Promise<void>;
  onRetry(): void | Promise<void>;
  onAdopt(): void | Promise<void>;
}

function OfferRecoveryFeedback({
  requiresNewOperation,
  recoveryExpired,
  hasOfferToReview,
  uncertainStage,
  retryAllowed,
  saving,
  reviewLoading,
  conflictNotice,
  ambiguousNotice,
  onStartNewOperation,
  onReview,
  onRetry,
  onAdopt,
}: Readonly<OfferRecoveryFeedbackProps>) {
  return <>
    {requiresNewOperation && !recoveryExpired && <div className="feedback feedback--warning">
      <output>Conservamos el borrador del envío rechazado. Puedes preparar otra operación y guardar tus cambios.</output>{" "}
      <button type="button" className="button button--small button--secondary" disabled={saving || reviewLoading} onClick={onStartNewOperation}>Iniciar nueva operación</button>
    </div>}
    {recoveryExpired && <div className="feedback feedback--warning" role="alert">
      La ventana de recuperación de 24 horas expiró. El envío anterior no se repetirá.
      {hasOfferToReview && <button type="button" className="button button--small button--secondary" disabled={reviewLoading} onClick={() => { void onReview(); }}>
        {reviewLoading ? "Consultando…" : "Revisar oferta actual"}
      </button>}
    </div>}
    {uncertainStage && <div className="feedback feedback--warning" role="alert">
      La operación anterior no pudo confirmarse. Reintentar recupera el envío original; los cambios posteriores permanecen en el formulario.{" "}
      <button type="button" className="button button--small button--primary" disabled={saving || retryAllowed === false} onClick={() => { void onRetry(); }}>Reintentar</button>
    </div>}
    {conflictNotice && <div className="feedback feedback--error" role="alert">
      {conflictNotice}{" "}
      <button type="button" className="button button--small button--secondary" disabled={reviewLoading} onClick={() => { void onReview(); }}>
        {reviewLoading ? "Consultando…" : "Revisar oferta actual"}
      </button>
    </div>}
    {ambiguousNotice && <div className="feedback feedback--warning" role="alert">
      {ambiguousNotice}{" "}
      <button type="button" className="button button--small button--secondary" disabled={reviewLoading} onClick={() => { void onReview(); }}>Revisar oferta actual</button>
      <button type="button" className="button button--small button--primary" disabled={reviewLoading} onClick={() => { void onAdopt(); }}>Adoptar composición del servidor</button>
    </div>}
  </>;
}

interface OfferSavedFeedbackProps {
  reviewedOffer: VersionedResource<MenuOfferDetail> | null;
  navigationFailed: boolean;
  savedNotice: string;
  formError: string;
  requiresNewOperation: boolean;
  recoveryExpired: boolean;
  recoveryReady: boolean;
  reviewLoading: boolean;
  onReturnToList(): void;
  onAdoptReviewedOffer(): void | Promise<void>;
  onKeepDraft(): void;
  onRetryRecovery(): void;
}

function OfferSavedFeedback({
  reviewedOffer,
  navigationFailed,
  savedNotice,
  formError,
  requiresNewOperation,
  recoveryExpired,
  recoveryReady,
  reviewLoading,
  onReturnToList,
  onAdoptReviewedOffer,
  onKeepDraft,
  onRetryRecovery,
}: Readonly<OfferSavedFeedbackProps>) {
  return <>
    {reviewedOffer && <section className="feedback feedback--info" aria-label="Versión del servidor">
      <p><strong>Versión actual en el servidor:</strong> {reviewedOffer.data.presentationTag || "Sin etiqueta de presentación"}.</p>
      <p className="offer-review-price"><span>Precio base (MXN)</span><strong>{formatMoney(reviewedOffer.data.basePrice)}</strong></p>
      <p>Usar estos datos reemplaza la composición del formulario. Conservaremos los demás campos y no enviaremos cambios hasta que guardes.</p>
      <button type="button" className="button button--small button--primary" onClick={() => { void onAdoptReviewedOffer(); }} disabled={reviewLoading}>Adoptar versión del servidor</button>
      <button type="button" className="button button--small button--secondary" onClick={onKeepDraft}>Mantener borrador actual</button>
    </section>}
    {navigationFailed && <div className="feedback"><output>La oferta se guardó. No pudimos abrir el listado.</output>{" "}<button type="button" onClick={onReturnToList}>Volver al listado</button></div>}
    {savedNotice && <output className="feedback">{savedNotice}</output>}
    {formError && <p className="feedback feedback--error" role="alert">
      {requiresNewOperation && !recoveryExpired ? "El envío fue rechazado. Conservamos tus cambios; pulsa Iniciar nueva operación antes de volver a guardar." : formError}
      {!recoveryReady && <button type="button" onClick={onRetryRecovery}>Reintentar recuperación</button>}
    </p>}
  </>;
}

export function OfferFormPage({
  repository,
  storage: providedStorage,
}: Readonly<OfferFormPageProps>) {
  const [fallbackStorage] = useState(createIndexedDbPendingOperationStorage);
  const storage = providedStorage ?? fallbackStorage;
  const { entryId = "", offerId } = useParams();
  const [confirmedOfferId, setConfirmedOfferId] = useState<string>();
  const confirmedOfferIdRef = useRef<string | undefined>(undefined);
  const isEditing = Boolean(offerId || confirmedOfferId);

  const location = useLocation();
  const navigate = useNavigate();

  const defaultReturnTo = `/entries/${encodeURIComponent(entryId)}/offers`;
  const returnTo = safeReturnPath(location.state, defaultReturnTo);
  const catalogReturnTo = resolveCatalogReturnPath(location.state);

  const [entry, setEntry] = useState<MenuEntryDetail | null>(null);

  const baseDraft = useRef<OfferFormDraftState>({ presentationTag: "", basePrice: "", desiredStatus: "INACTIVE", slots: [] });
  const exitSucceeded = useRef(false);
  const confirmedReceipt = useRef<LocalSaveReceipt | null>(null);
  const [navigationFailed, setNavigationFailed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const actionsRef = useRef<HTMLElement>(null);
  const actionLayout = useFormActionsLayout(formRef, actionsRef);
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
  const openingEtagRef = useRef<string | undefined>(undefined);
  const confirmedImageIdRef = useRef<string | null>(null);

  const [conflictNotice, setConflictNotice] = useState("");
  const [ambiguousNotice, setAmbiguousNotice] = useState("");
  const [ambiguousResponse, setAmbiguousResponse] = useState<MenuOfferDetail | null>(null);
  const [uncertainStage, setUncertainStage] = useState<"upload" | "persist" | null>(null);
  const [reviewedOffer, setReviewedOffer] = useState<VersionedResource<MenuOfferDetail> | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [newOperationAuthorized, setNewOperationAuthorized] = useState(false);

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
  const [inventoryPickerOpen, setInventoryPickerOpen] = useState(false);
  const recipeTaskRef = useRef<RecipeSelectionTaskHandle>(null);
  const [recipeCreating, setRecipeCreating] = useState(false);
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
      const target =
        optionModalTriggerRef.current && optionModalTriggerRef.current !== document.body && optionModalTriggerRef.current.isConnected
          ? optionModalTriggerRef.current
          : Array.from(document.querySelectorAll<HTMLButtonElement>("button[aria-label]"))
            .find(button => button.getAttribute("aria-label") === `Agregar opción a ${slotName}`);
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
  const mountedRef = useRef(true);
  const selectedFileRef = useRef(selectedFile);
  selectedFileRef.current = selectedFile;
  const draftRef = useRef<OfferFormDraftState>({ presentationTag, basePrice, desiredStatus, slots });
  draftRef.current = { presentationTag, basePrice, desiredStatus, slots, imageFile: selectedFile ?? undefined };
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");


  useEffect(() => {
    imageValidationId.current += 1;
    controllerRef.current = null;
    confirmedImageIdRef.current = null;
    openingEtagRef.current = undefined;
    confirmedOfferIdRef.current = undefined;
    setConfirmedOfferId(undefined);
    setRecoveryReady(false);
    setSavedNotice("");
    mountedRef.current = true;
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

    setReviewedOffer(null);
    setReviewLoading(false);
    setNewOperationAuthorized(false);
    setSlotModalOpen(false);
    setEditingSlotIndex(null);
    setOptionModalOpen(false);
    setTargetSlotIndex(null);
    setEditingOptionIndex(null);
    setCurrentOptionDraft(null);
    setRecipePickerOpen(false);
    setInventoryPickerOpen(false);
    setSaving(false);
    return () => {
      mountedRef.current = false;
      imageValidationId.current += 1;
      const controller = controllerRef.current;
      controller?.detachForReload();
      if (activeContextRef.current.entryId !== entryId || activeContextRef.current.offerId !== offerId) {
        void controller?.abandonFlow().catch(() => {});
      }
    };
  }, [entryId, offerId]);

  function getOrInitController(
    overrideFile?: File | null,
  ): OperationAttemptController<OfferFormDraftState, MenuOfferDetail> {
    if (overrideFile !== undefined) selectedFileRef.current = overrideFile;
    const scope = offerId
      ? buildOfferUpdateScope(offerId!)
      : buildOfferCreateScope(entryId);

    controllerRef.current ??= createOperationAttemptController<
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
          imageFile: selectedFileRef.current ?? undefined,
        },
        retainConfirmedResult: true,
        getImageFile: () => selectedFileRef.current,
        executeImageUpload: async (attempt) => {
          if (attempt.payload.kind !== "multipart-file") throw new Error("Se requiere una imagen sellada.");
          const p = attempt.payload;
          const id = await repository.uploadEntryImage(
            new File([p.fileBlob], p.fileName, { type: p.mimeType }), attempt.idempotencyKey,
          );
          return { id };
        },
        buildFinalStageInput: ({
          draft: currentDraft,
          submittedDraftVersion,
          now,
        }) => {
          const priceNumber = Number(currentDraft.basePrice);
          const slotsWithIds = ensureSlotLocalIds(currentDraft.slots);


          const targetId = offerId ?? confirmedOfferIdRef.current;
          if (!targetId) {
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
              endpointPath: `/menu/offers/${encodeURIComponent(targetId)}`,
              payload: sealJsonPayload(updateDraft, openingEtagRef.current),
              submittedDraftVersion,
              now,
            };
          }
        },
        executeFinalStage: async ({ attempt, confirmedImageId }) => {
          if (attempt.payload.kind !== "json") {
            throw new Error("El intento requiere un payload JSON sellado.");
          }
          if (attempt.operationKind === "offer.create") {
            const sealedDraft = attempt.payload.payloadSnapshot as OfferCreateDraft;
            const imageId = confirmedImageId;
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
            const etag = attempt.payload.ifMatch;
            if (!etag) {
              throw new Error("No se dispone de la versión de apertura (If-Match) para la oferta.");
            }
            return await repository.updateOffer(
              offerId ?? confirmedOfferIdRef.current!,
              sealedDraft,
              etag,
              attempt.idempotencyKey,
              confirmedImageId || undefined,
            );
          }
        },
        classifyError: (err, attempt) =>
          analyzeIdempotentAttemptError(err, attempt.operationKind),
      });
    return controllerRef.current;
  }

  // Restore nested context from recipe dialog
  useEffect(() => {
    let cancelled = false;
    storage
      .getRecord<RecipeDraft>(buildRecipeCreateScope())
      .then((record) => {
        if (cancelled || !record || !hasRestorableOfferContext(record)) return;
        restoreOfferContext(record.nestedContext as OfferNestedContext, entryId, offerId, {
          markRestored: () => { restoredFromStorageRef.current = true; },
          setPresentationTag,
          setBasePrice,
          setDesiredStatus,
          setSlots,
          setTargetSlotIndex,
          setEditingOptionIndex,
          setCurrentOptionDraft,
          setOptionModalOpen,
          setRecipePickerOpen,
          setSelectedFile,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [entryId, offerId, storage]);


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
        if (offerData && offerData.data.entryId !== entryId) {
          setLoadError("La oferta no pertenece a la entrada seleccionada.");
          return;
        }
        if (offerData && !restoredFromStorageRef.current) {
          openingEtagRef.current = offerData.etag;
          baseDraft.current = { presentationTag: offerData.data.presentationTag || "", basePrice: String(offerData.data.basePrice ?? ""), desiredStatus: offerData.data.status, slots: mapOfferDetailToSlots(offerData.data) };
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
    let recovered = false;
    setRecoveryReady(false);
    operationController
      .restoreFromStorage()
      .then((restored) => {
        recovered = true;
        if (!mountedRef.current || controllerRef.current !== operationController || !restored) return;
        const currentStage = restored.stages[restored.currentStageIndex];
        if (!currentStage) return;

        if (restored.editableDraft) {
          restoredFromStorageRef.current = true;
          setPresentationTag(restored.editableDraft.presentationTag);
          setBasePrice(restored.editableDraft.basePrice);
          setDesiredStatus(restored.editableDraft.desiredStatus);
          setSlots(ensureSlotLocalIds(restored.editableDraft.slots));
        }

        if (restored.editableDraft.imageFile) {
          const p = restored.editableDraft.imageFile;
          setSelectedFile(p);
        } else if (restored.stages[0]?.payload.kind === "multipart-file") {
          const p = restored.stages[0].payload;
          const restoredFile = new File([p.fileBlob], p.fileName, { type: p.mimeType });
          setSelectedFile(restoredFile);
        }

        openingEtagRef.current = restored.ifMatch ?? undefined;
        if (currentStage.status === "succeeded" && restored.confirmedResult) {
          void handleConfirmedResult({ status: "succeeded", result: restored.confirmedResult as MenuOfferDetail,
            record: restored, hasDraftChangesSinceSubmission: restored.currentDraftVersion > restored.submittedDraftVersion }, true);
        }
        if (restored.confirmedImageId) {
          confirmedImageIdRef.current = restored.confirmedImageId;
        }

        if (currentStage.status === "uncertain" || currentStage.status === "conflict_in_progress") {
          setUncertainStage(restored.currentStageIndex === 0 ? "upload" : "persist");
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
      .catch(() => {
        if (isCurrentController(operationController)) setFormError("No se pudo recuperar la operación guardada. Reintenta la carga antes de enviar.");
      })
      .finally(() => { if (recovered && isCurrentController(operationController)) setRecoveryReady(true); });
  }, [entryId, offerId, retryCount]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!recoveryReady || !controller?.getRecord()) return;
    if (!exitSucceeded.current) void controller.updateEditableDraft(draftRef.current);
  }, [presentationTag, basePrice, desiredStatus, slots, selectedFile, recoveryReady]);

  const currentAttempt = controllerRef.current?.getCurrentAttempt() ?? null;
  const retryEligibility = useRetryEligibility(currentAttempt);
  const recoveryExpired = Boolean(currentAttempt && currentAttempt.status !== "succeeded" && isAttemptWindowExpired(currentAttempt));
  const requiresNewOperation = currentAttempt?.status === "requires_new_key" && !newOperationAuthorized;

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
    if (isSubmittingRef.current) return;
    const currentRun = imageValidationId.current + 1;
    imageValidationId.current = currentRun;
    setSelectedFile(file);
    setImageError("");
    setImageValidating(true);
    selectedFileRef.current = file;
    // This file belongs to the editable draft; an uncertain request keeps its sealed image.
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
          recipeAssignmentToken: generateLocalId(),
        };
      }
      return {
        ...prev,
        sourceType: "RECIPE",
        recipeId: recipe.id,
        recipeName: recipe.name,
        displayName: prev.displayName.trim() ? prev.displayName : recipe.name,
        hasRecipeAssignmentIntent: true,
        recipeAssignmentToken: generateLocalId(),
        inventoryItemId: undefined,
        inventoryItemName: undefined,
        quantity: undefined,
        unit: undefined,
      };
    });
    setRecipePickerOpen(false);
  }

  // Inventory item selection (V7)
  function handleOpenInventoryPicker() {
    setInventoryPickerOpen(true);
  }

  function handleSelectInventoryItem(item: InventoryItem) {
    setCurrentOptionDraft((prev) => {
      const prevAutoName = prev?.inventoryItemName || prev?.recipeName || "";
      const displayName =
        prev?.displayName.trim() && prev.displayName !== prevAutoName
          ? prev.displayName
          : item.name;
      return {
        localId: prev?.localId || generateLocalId(),
        optionId: prev?.optionId,
        originalSourceType: prev?.originalSourceType,
        displayName,
        status: prev?.status ?? "ACTIVE",
        sourceType: "INVENTORY_ITEM",
        recipeId: undefined,
        recipeName: undefined,
        hasRecipeAssignmentIntent: undefined,
        recipeAssignmentToken: undefined,
        inventoryItemId: item.id,
        inventoryItemName: item.name,
        quantity:
          prev?.sourceType === "INVENTORY_ITEM" &&
          typeof prev.quantity === "number" &&
          prev.quantity > 0
            ? prev.quantity
            : 1,
        unit: item.unit,
      };
    });
    setInventoryPickerOpen(false);
  }

  // Derived slot & offer status
  const hasActiveSlot = slots.some((slot) =>
    slot.options.some((opt) => opt.status === "ACTIVE"),
  );

  function isCurrentController(controller: OperationAttemptController<OfferFormDraftState, MenuOfferDetail>) {
    return mountedRef.current && controllerRef.current === controller;
  }

  async function finishNavigation(receipt: LocalSaveReceipt) {
    exitSucceeded.current = true;
    confirmedReceipt.current = receipt;
    setNavigationFailed(false);
    setSavedNotice(saveReceiptMessage(receipt));
    const controller = controllerRef.current;
    const record = controller?.getRecord();
    if (controller && record) {
      await controller.updateEditableDraft(record.editableDraft);
      controller.detachForReload();
    }
    try {
      await navigate(returnTo, { replace: true, state: receiptState({ ...location.state, returnTo: catalogReturnTo }, receipt) });
      if (record) {
        if (storage.deleteRecordIfAttemptMatches) {
          await storage.deleteRecordIfAttemptMatches(record.storageKey, record.stages[record.currentStageIndex].attemptId).catch(() => false);
        } else if (mountedRef.current) setSavedNotice(`${saveReceiptMessage(receipt)} La limpieza segura del envío no está disponible; conservamos su confirmación.`);
      }
    } catch {
      if (mountedRef.current) setNavigationFailed(true);
    }
  }

  async function preservePostSubmissionDraft(
    controller: OperationAttemptController<OfferFormDraftState, MenuOfferDetail>,
    current: OfferFormDraftState,
    confirmedSlots: SlotDraft[],
    result: MenuOfferDetail,
  ) {
    await controller.updateEditableDraft({ ...current, slots: confirmedSlots });
    if (!isCurrentController(controller)) return;
    setSavedNotice("El envío anterior se guardó. Tus cambios posteriores se conservan; guárdalos explícitamente.");
    if (isStrongEtag(result.etag)) {
      openingEtagRef.current = result.etag;
    } else {
      setConflictNotice("No se recibió la versión de la oferta confirmada. Revisa su versión antes de guardar los cambios posteriores.");
    }
  }

  async function finishConfirmedOffer(
    attemptResult: OperationExecutionResult<OfferFormDraftState, MenuOfferDetail>,
    controller: OperationAttemptController<OfferFormDraftState, MenuOfferDetail>,
    result: MenuOfferDetail,
    restoredOnly: boolean,
  ) {
    exitSucceeded.current = true;
    const receipt: LocalSaveReceipt = {
      receiptId: attemptResult.record.stages[attemptResult.record.currentStageIndex].idempotencyKey,
      entity: "offer",
      entityId: result.id,
      entryId,
      label: result.presentationTag,
      action: offerId ? "updated" : "created",
    };
    if (restoredOnly) {
      confirmedReceipt.current = receipt;
      controller.detachForReload();
      setSavedNotice(saveReceiptMessage(receipt));
      setNavigationFailed(true);
      return;
    }
    await finishNavigation(receipt);
  }

  async function handleConfirmedResult(attemptResult: OperationExecutionResult<OfferFormDraftState, MenuOfferDetail>, restoredOnly = false) {
    const controller = controllerRef.current;
    if (!controller || !isCurrentController(controller)) return;
    const result = attemptResult.result!;
    const sent = attemptResult.record.submittedDraft;
    const current = controller.getRecord()?.editableDraft ?? attemptResult.record.editableDraft;
    const reconciliation = reconcileSubmittedOffer(current, sent, result);
    confirmedOfferIdRef.current = result.id;
    setConfirmedOfferId(result.id);
    setUncertainStage(null);
    confirmedImageIdRef.current = attemptResult.record.confirmedImageId;
    invalidateCatalogEntries(repository);
    if (reconciliation.status === "ambiguous") {
      setAmbiguousResponse(result);
      setAmbiguousNotice(`El envío anterior se guardó correctamente, pero su composición requiere revisión (${reconciliation.reason}).`);
      return;
    }
    const confirmedSlots = consumeConfirmedRecipeAssignments(reconciliation.slots, sent?.slots ?? []);
    const confirmedDraft = confirmedBaseDraft(sent, result);
    if (confirmedDraft) baseDraft.current = confirmedDraft;
    setSlots(confirmedSlots);
    if (attemptResult.hasDraftChangesSinceSubmission) {
      await preservePostSubmissionDraft(controller, current, confirmedSlots, result);
      return;
    }
    await finishConfirmedOffer(attemptResult, controller, result, restoredOnly);
  }

  function handleAttemptFailure(controller: OperationAttemptController<OfferFormDraftState, MenuOfferDetail>) {
    const attempt = controller.getCurrentAttempt();
    setNewOperationAuthorized(false);
    setFormError(attempt?.lastErrorMessage ?? "La operación no pudo confirmarse.");
    if (attempt?.status === "precondition_conflict") {
      setConflictNotice("Los datos de la oferta cambiaron en el servidor desde que se abrieron. Revisa la versión actual para decidir si adoptarla.");
    } else if (attempt?.status === "uncertain" || attempt?.status === "conflict_in_progress") {
      setUncertainStage(attempt.operationKind === "image.upload" ? "upload" : "persist");
    } else {
      setUncertainStage(null);
    }
  }

  async function executeSave(action: "submit" | "retry") {
    if (exitSucceeded.current || isSubmittingRef.current || saving || !recoveryReady) return;
    if (ambiguousResponse || conflictNotice) return;
    const controller = getOrInitController();
    const pending = controller.getCurrentAttempt();
    const blockerMessage = offerSaveBlockerMessage({
      action,
      pending,
      newOperationAuthorized,
      draft: { basePrice, slots },
      isEditing,
      selectedFile,
      imageError,
      confirmedImageId: confirmedImageIdRef.current,
      imageValidating,
    });
    if (blockerMessage) { setFormError(blockerMessage); return; }
    const recovering = action === "retry" || pending?.status === "uncertain" || pending?.status === "conflict_in_progress";
    isSubmittingRef.current = true;
    setSaving(true);
    setFormError("");
    try {
      await controller.updateEditableDraft(draftRef.current);
      if (needsNewOfferAttempt(pending, newOperationAuthorized)) {
        await controller.startNewAttemptFromEditableDraft({ ifMatch: openingEtagRef.current,
          preserveConfirmedImage: selectedFile === controller.getRecord()?.submittedDraft?.imageFile });
        setNewOperationAuthorized(false);
      }
      const result = recovering ? await controller.retryPending() : await controller.submit();
      if (!isCurrentController(controller)) return;
      if (result.status === "succeeded") await handleConfirmedResult(result);
      else handleAttemptFailure(controller);
    } catch (err) {
      if (isCurrentController(controller)) setFormError(extractStructuredErrorMessage(err));
    } finally {
      if (isCurrentController(controller)) { isSubmittingRef.current = false; setSaving(false); }
    }
  }

  function handleSaveOffer(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || loadError) return;
    void executeSave("submit");
  }

  function handleManualRetry() { return executeSave("retry"); }

  function handleStartNewOperation() {
    const attempt = controllerRef.current?.getCurrentAttempt();
    if (!recoveryReady || saving || reviewLoading || isSubmittingRef.current ||
      attempt?.status !== "requires_new_key" || isAttemptWindowExpired(attempt)) return;
    // Authorization is explicit; sealing waits for Save so later edits are included.
    setNewOperationAuthorized(true);
    setUncertainStage(null);
    setFormError("");
    setSavedNotice("Nueva operación preparada. Pulsa Guardar Oferta para enviar tus cambios.");
  }

  const guard = useEditGuard({
    get dirty() { return !exitSucceeded.current && !sameDraft(draftRef.current, baseDraft.current); },
    get blocked() { return !exitSucceeded.current && (saving || isSubmittingRef.current || uncertainStage !== null || Boolean(controllerRef.current?.getCurrentAttempt()?.possibleWriteApplied && controllerRef.current.getCurrentAttempt()?.status !== "succeeded")); },
  }, abandonEditor);

  function abandonEditor() {
    mountedRef.current = false;
    imageValidationId.current += 1;
    const controller = controllerRef.current;
    controller?.detachForReload();
    void controller?.abandonFlow().catch(() => {});
  }

  async function handleReviewCurrentOffer() {
    const targetId = offerId ?? confirmedOfferIdRef.current;
    if (!targetId) return;
    const controller = controllerRef.current;
    setReviewLoading(true);
    setFormError("");
    try {
      const versioned = await repository.getOffer(targetId);
      if (!mountedRef.current || controllerRef.current !== controller) return;
      setReviewedOffer(versioned);
    } catch (err) {
      if (mountedRef.current && controllerRef.current === controller) setFormError(extractStructuredErrorMessage(err));
    } finally {
      if (mountedRef.current && controllerRef.current === controller) setReviewLoading(false);
    }
  }

  async function handleAdoptReviewedOffer() {
    if (!reviewedOffer || reviewLoading) return;
    const controller = controllerRef.current;
    const pending = controller?.getCurrentAttempt();
    const reviewedSlots = ensureSlotLocalIds(mapOfferDetailToSlots(reviewedOffer.data));
    if (controller && pending && pending.status !== "succeeded" && isAttemptWindowExpired(pending)) {
      setReviewLoading(true);
      try {
        await controller.updateEditableDraft({ ...draftRef.current, slots: reviewedSlots });
        openingEtagRef.current = reviewedOffer.etag;
        await controller.startNewAttemptFromEditableDraft({ ifMatch: reviewedOffer.etag,
          confirmExpiredWindow: true, forceDiscardUncertain: true,
          preserveConfirmedImage: selectedFile === controller.getRecord()?.submittedDraft?.imageFile });
        if (!isCurrentController(controller)) return;
        setUncertainStage(null);
        setFormError("");
      } catch (err) {
        if (isCurrentController(controller)) setFormError(extractStructuredErrorMessage(err));
        return;
      } finally {
        if (isCurrentController(controller)) setReviewLoading(false);
      }
    }
    openingEtagRef.current = reviewedOffer.etag;
    baseDraft.current = { ...baseDraft.current, slots: reviewedSlots };
    setSlots(reviewedSlots);

    setConflictNotice("");
    setAmbiguousNotice("");
    setAmbiguousResponse(null);
    setReviewedOffer(null);
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
      {guard.confirmation}
      <main className="menu-page offer-form-page">
        <header className="task-header offer-form-page__heading">
          <Link to={returnTo} state={{ returnTo: catalogReturnTo }} className="back-link">
            <Icon name="arrow-left" /> Volver a ofertas
          </Link>
          <div className="task-header__content">
            <p className="eyebrow">Ofertas</p>
            <h1 data-route-heading tabIndex={-1}>{isEditing ? "Editar oferta" : "Nueva oferta"}</h1>
            <p className="task-header__intro offer-form-page__subtitle">Entrada: <strong>{entry?.brandName || (loading ? <LoadingValue kind="line" /> : "No disponible")}</strong></p>
          </div>
        </header>

        <OfferLoadFeedback loading={loading} loadError={loadError} onRetry={() => setRetryCount((count) => count + 1)} />

        {!loadError && (
          <form ref={formRef} data-actions-persistent={actionLayout.persistent} data-actions-height={actionLayout.height} data-form-height={actionLayout.formHeight} data-available-height={actionLayout.available} className="offer-form" onFocusCapture={(event) => { const control = event.target; requestAnimationFrame(() => { if (document.activeElement === control) revealFormControl(control, actionsRef.current); }); }} onSubmit={handleSaveOffer} aria-busy={loading || saving} noValidate>
            <OfferRecoveryFeedback
              requiresNewOperation={requiresNewOperation}
              recoveryExpired={recoveryExpired}
              hasOfferToReview={Boolean(offerId || confirmedOfferIdRef.current)}
              uncertainStage={uncertainStage}
              retryAllowed={retryEligibility?.allowed}
              saving={saving}
              reviewLoading={reviewLoading}
              conflictNotice={conflictNotice}
              ambiguousNotice={ambiguousNotice}
              onStartNewOperation={handleStartNewOperation}
              onReview={handleReviewCurrentOffer}
              onRetry={handleManualRetry}
              onAdopt={handleAdoptReviewedOffer}
            />
            <OfferSavedFeedback
              reviewedOffer={reviewedOffer}
              navigationFailed={navigationFailed}
              savedNotice={savedNotice}
              formError={formError}
              requiresNewOperation={requiresNewOperation}
              recoveryExpired={recoveryExpired}
              recoveryReady={recoveryReady}
              reviewLoading={reviewLoading}
              onReturnToList={() => { if (confirmedReceipt.current) void finishNavigation(confirmedReceipt.current); }}
              onAdoptReviewedOffer={handleAdoptReviewedOffer}
              onKeepDraft={() => setReviewedOffer(null)}
              onRetryRecovery={() => setRetryCount((count) => count + 1)}
            />

            <OfferCommercialInfo
              loading={loading && isEditing}
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
              disabled={loading || saving || exitSucceeded.current}
            />

            <CompositionEditor
              loading={loading && isEditing}
              slots={slots}
              onAddSlot={handleOpenAddSlot}
              onEditSlot={handleOpenEditSlot}
              onDeleteSlot={handleDeleteSlot}
              onAddOption={handleOpenAddOption}
              onEditOption={handleOpenEditOption}
              onDeleteOption={handleDeleteOption}
              onToggleOptionStatus={handleToggleOptionStatus}
              disabled={loading || saving || exitSucceeded.current}
            />

            <footer ref={actionsRef} className="offer-form__actions">
              <Link to={returnTo} state={{ returnTo: catalogReturnTo }} className="button button--secondary">
                Cancelar
              </Link>
              <button
                type="submit"
                className="button button--primary"
                disabled={loading || exitSucceeded.current || !recoveryReady || saving || reviewLoading || requiresNewOperation || recoveryExpired || imageValidating || isSubmittingRef.current || Boolean(conflictNotice) || Boolean(ambiguousNotice)}
              >
                {saving ? "Guardando…" : "Guardar Oferta"}
              </button>
            </footer>
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
          isNestedPickerOpen={recipePickerOpen || inventoryPickerOpen}
          recipeStep={recipeCreating}
          inventoryStep={inventoryPickerOpen}
          onNestedBack={() => {
            if (inventoryPickerOpen) setInventoryPickerOpen(false);
            else recipeTaskRef.current?.back();
          }}
          isNestedBlocked={() => recipeTaskRef.current?.isBlocked() ?? false}
          hasNestedChanges={() => recipeTaskRef.current?.hasChanges() ?? false}
          onDiscardNested={() => recipeTaskRef.current?.discard()}
          onChangeDraft={(updated) => setCurrentOptionDraft(updated)}
          onSave={handleSaveOption}
          onClose={() => {
            setOptionModalOpen(false);
            setRecipePickerOpen(false);
            setInventoryPickerOpen(false);
            setTargetSlotIndex(null);
            setEditingOptionIndex(null);
            setCurrentOptionDraft(null);
          }}
          onOpenRecipePicker={handleOpenRecipePicker}
          onOpenInventoryPicker={handleOpenInventoryPicker}
        >
          {optionModalOpen && <RecipeSelectionTask repository={repository} storage={storage}
            nestedContext={nestedRecipeContext} active={recipePickerOpen} slotName={currentSlotName}
            onStepChange={setRecipeCreating} taskRef={recipeTaskRef}
            onSelect={handleSelectRecipe} onBack={() => setRecipePickerOpen(false)} />}
          {optionModalOpen && inventoryPickerOpen && (
            <InventoryPage
              repository={repository}
              context="option"
              onSelectItem={handleSelectInventoryItem}
              onClose={() => setInventoryPickerOpen(false)}
            />
          )}
        </OptionModal>
      </main>
    </div>
  );
}
