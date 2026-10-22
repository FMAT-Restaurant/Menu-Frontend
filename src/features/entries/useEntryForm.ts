import { useCallback, useEffect, useRef, useState, type SubmitEvent } from "react";
import type { EntryStatus, EntryUpdateDraft, MenuEntryDetail, MenuRepository } from "../../application/catalog";
import { invalidateCatalogEntries } from "../../application/catalogCache";
import { isStrongEntryVersion } from "../../application/entryVersion";
import { clearFieldFailure, entryFailure, localFieldFailure, type EntryFailure, type EntryField } from "./entryError";
import { validateEntryImage } from "./entryImage";
import { useEntryResources } from "./useEntryResources";

type Stage = "idle" | "upload" | "persist";
const emptyDraft: EntryUpdateDraft = { brandName: "", description: "", categoryIds: [], status: "INACTIVE" };

function draftFrom(entry: MenuEntryDetail): EntryUpdateDraft {
  return { brandName: entry.brandName, description: entry.description, categoryIds: [...entry.categoryIds], status: entry.status };
}

function validateDraft(draft: EntryUpdateDraft, editing: boolean, file: File | null, imageError: string, imagePending: boolean): EntryFailure | null {
  if (!draft.brandName.trim()) return localFieldFailure("brandName", "Indica el nombre comercial de la entrada.");
  if (!draft.description.trim()) return localFieldFailure("description", "Indica una descripción para la entrada.");
  if (!editing && !file) return localFieldFailure("image", "Selecciona una imagen de referencia para la nueva entrada.");
  if (imageError) return localFieldFailure("image", imageError);
  if (imagePending) return localFieldFailure("image", "Espera a que termine la validación de la imagen.");
  return null;
}

export type EntryFormRepository = Pick<
  MenuRepository,
  "listCategories" | "getEntry" | "uploadEntryImage" | "createEntry" | "updateEntry"
>;

export function useEntryForm(repository: EntryFormRepository, entryId: string | undefined, onSaved: () => Promise<void>) {
  const [draft, setDraft] = useState<EntryUpdateDraft>(emptyDraft);
  const [file, setFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [imageValidating, setImageValidating] = useState(false);
  const [failure, setFailure] = useState<EntryFailure | null>(null);
  const [failureEpoch, setFailureEpoch] = useState(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [uncertain, setUncertain] = useState<Stage>("idle");
  const [review, setReview] = useState<MenuEntryDetail | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const loaded = useRef(false);
  const mounted = useRef(true);
  const saving = useRef(false);
  const validationRun = useRef(0);
  const validationPending = useRef(false);
  const uploaded = useRef<{ file: File; id: string } | null>(null);
  const reviewController = useRef<AbortController | null>(null);
  const onLoaded = useCallback((entry: MenuEntryDetail) => {
    if (!loaded.current) { setDraft(draftFrom(entry)); loaded.current = true; }
  }, []);
  const resources = useEntryResources(repository, entryId, onLoaded);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; validationRun.current += 1; reviewController.current?.abort(); };
  }, []);

  function clearField(field: EntryField) { setFailure((current) => clearFieldFailure(current, field)); }
  function changeText(field: "brandName" | "description", value: string) {
    setDraft((current) => ({ ...current, [field]: value })); clearField(field);
  }
  function changeCategories(categoryIds: string[]) {
    setDraft((current) => ({ ...current, categoryIds: [...new Set(categoryIds)] })); clearField("categoryIds");
  }
  function changeStatus(status: EntryStatus) {
    setDraft((current) => ({ ...current, status })); clearField("status");
  }

  async function selectImage(selected: File) {
    if (saving.current) return;
    const run = ++validationRun.current;
    uploaded.current = null;
    setFile(selected); setImageError(""); clearField("image");
    validationPending.current = true; setImageValidating(true);
    try {
      await validateEntryImage(selected);
      if (mounted.current && validationRun.current === run) clearField("image");
    } catch (error: unknown) {
      if (mounted.current && validationRun.current === run) setImageError(entryFailure(error).message);
    } finally {
      if (mounted.current && validationRun.current === run) { validationPending.current = false; setImageValidating(false); }
    }
  }

  async function imageIdForSave(): Promise<string | undefined> {
    if (!file) return undefined;
    if (uploaded.current?.file === file) return uploaded.current.id;
    setStage("upload");
    const id = await repository.uploadEntryImage(file);
    uploaded.current = { file, id };
    return id;
  }

  function checkBeforeSave(): EntryFailure | null {
    const invalid = validateDraft(draft, Boolean(entryId), file, imageError, validationPending.current);
    if (invalid) return invalid;
    if (!resources.categoriesReady) return localFieldFailure("categoryIds", "Espera a que carguen las categorías o decide continuar sin añadirlas.");
    if (entryId && !isStrongEntryVersion(resources.entry?.etag)) return entryFailure(new Error("No se recibió una versión fuerte de la entrada. Revisa los datos actuales antes de guardar."));
    return null;
  }

  async function persist(imageId: string | undefined) {
    const identity = { brandName: draft.brandName.trim(), description: draft.description.trim(), categoryIds: [...draft.categoryIds] };
    if (entryId) {
      const update = { ...identity, status: draft.status, ...(imageId ? { imageId } : {}) };
      await repository.updateEntry(entryId, update, resources.entry?.etag ?? "");
      return;
    }
    if (!imageId) throw new Error("No se recibió el identificador de la imagen. La entrada no se guardó.");
    await repository.createEntry({ ...identity, imageId });
  }

  function saveFailure(error: unknown, attempted: Stage) {
    const current = entryFailure(error);
    setFailure(current);
    setFailureEpoch((value) => value + 1);
    if (current.uncertain) setUncertain(attempted);
    if (current.fields.image) uploaded.current = null;
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || uncertain !== "idle" || (entryId && failure?.kind === "conflict")) return;
    const invalid = checkBeforeSave();
    if (invalid) { setFailure(invalid); setFailureEpoch((value) => value + 1); return; }
    saving.current = true;
    setFailure(null);
    let attempted: Stage = "upload";
    try {
      const imageId = await imageIdForSave();
      if (!mounted.current) return;
      attempted = "persist"; setStage("persist");
      await persist(imageId);
      if (!mounted.current) return;
      invalidateCatalogEntries(repository);
      await onSaved();
    } catch (error: unknown) {
      if (mounted.current) saveFailure(error, attempted);
    } finally {
      saving.current = false;
      if (mounted.current) setStage("idle");
    }
  }

  async function reviewCurrent() {
    if (!entryId || reviewLoading) return;
    const controller = new AbortController();
    reviewController.current = controller;
    setReviewLoading(true); setReviewError("");
    try {
      const current = await repository.getEntry(entryId, controller.signal);
      if (!controller.signal.aborted) setReview(current);
    } catch (error: unknown) {
      if (!controller.signal.aborted) setReviewError(entryFailure(error).message);
    } finally {
      if (!controller.signal.aborted) setReviewLoading(false);
    }
  }

  function acceptReview(keepDraft: boolean) {
    if (reviewLoading || !review || !isStrongEntryVersion(review.etag)) return;
    resources.setEntry(review);
    if (!keepDraft) {
      setDraft(draftFrom(review)); setFile(null); uploaded.current = null;
      validationRun.current += 1; validationPending.current = false;
      setImageError(""); setImageValidating(false);
    }
    else if (review.status === "ARCHIVED" && draft.status === "ACTIVE") changeStatus("INACTIVE");
    setFailure(null); setReview(null); setUncertain("idle");
  }

  return {
    ...resources, draft, file, imageError, imageValidating, failure, failureEpoch, stage, uncertain,
    review, reviewLoading, reviewError, selectImage, changeText, changeCategories, changeStatus, save,
    reviewCurrent, acceptReview,
    allowExplicitRetry: () => { setUncertain("idle"); setFailure(null); },
    editingReady: !entryId || Boolean(resources.entry),
    versionReady: !entryId || isStrongEntryVersion(resources.entry?.etag),
  };
}
