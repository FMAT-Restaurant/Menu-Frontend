import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { RecipeDraft, RecipeSummary } from "../../application/catalog";
import type { PendingOperationChainRecord, PendingOperationStorageAdapter } from "../../application/operationAttempt";
import type { RecipeRepository } from "./RecipePage";
import { RecipeFormContent, buildRecipeCreateScope, type RecipeFormContentHandle } from "./RecipeFormContent";
import { RecipeSelector, emptyRecipeSelection, type RecipeSelectionState } from "./RecipeSelector";
import "./styles.css";

export interface RecipeSelectionTaskHandle { back(): void; hasChanges(): boolean; discard(): void }

/** Stays mounted for the option task, including while its option step is visible. */
export function RecipeSelectionTask({ repository, storage, nestedContext, active, slotName, onSelect, onBack, onStepChange, taskRef }: {
  repository: RecipeRepository;
  storage: PendingOperationStorageAdapter;
  nestedContext: Readonly<Record<string, unknown>>;
  active: boolean;
  slotName: string;
  onSelect(recipe: RecipeSummary): void;
  onBack(): void;
  onStepChange(creating: boolean): void;
  taskRef: Ref<RecipeSelectionTaskHandle>;
}) {
  const [creating, setCreating] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [foreignPending, setForeignPending] = useState(false);
  const [visited, setVisited] = useState(active);
  useEffect(() => { if (active) setVisited(true); }, [active]);
  const [hasSession, setHasSession] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [initialPendingRecord, setInitialPendingRecord] = useState<PendingOperationChainRecord<RecipeDraft> | null>(null);
  const [selection, setSelection] = useState<RecipeSelectionState>(emptyRecipeSelection);
  const sessionRef = useRef<RecipeFormContentHandle>(null);
  useEffect(() => {
    let cancelled = false;
    void storage.getRecord<RecipeDraft>(buildRecipeCreateScope()).then(record => {
      if (cancelled || !record) return;
      // A recipe operation from another offer must never open in this option task.
      const context = record.nestedContext;
      if (!context || context.entryId !== nestedContext.entryId || context.offerId !== nestedContext.offerId) { setForeignPending(true); return; }
      const restoredOption = context.currentOptionDraft as { localId?: string } | undefined;
      const currentOption = nestedContext.currentOptionDraft as { localId?: string } | undefined;
      if (restoredOption?.localId && currentOption?.localId && restoredOption.localId !== currentOption.localId) { setForeignPending(true); return; }
      if (context.targetSlotIndex !== nestedContext.targetSlotIndex || context.editingOptionIndex !== nestedContext.editingOptionIndex) { setForeignPending(true); return; }
      const stage = record.stages[record.currentStageIndex];
      if (stage && (stage.status !== "succeeded" || record.confirmedResult)) {
        setInitialPendingRecord(record);
        const restoredSelection = context.recipeSelection as RecipeSelectionState | undefined;
        if (restoredSelection && typeof restoredSelection.query === "string" && typeof restoredSelection.page === "number") setSelection(restoredSelection);
        setHasSession(true);
        setCreating(true);
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setRecoveryReady(true); });
    return () => { cancelled = true; };
    // Restore once for this option session; subsequent context updates belong to its controller.
  }, [storage]);
  useEffect(() => { onStepChange(creating); }, [creating, onStepChange]);
  useImperativeHandle(taskRef, () => ({ back() { if (creating) sessionRef.current?.back(); else onBack(); }, hasChanges: () => sessionRef.current?.hasChanges() ?? false, discard: () => sessionRef.current?.discard() }));
  const finish = (recipe: RecipeSummary) => {
    setCreating(false);
    setHasSession(false);
    setInitialPendingRecord(null);
    setSessionKey(value => value + 1);
    onSelect(recipe);
  };
  return <div className="recipe-selection-task" hidden={!active}>
    {foreignPending && active && <p role="alert" className="feedback feedback--error">Hay una creación de receta pendiente en otra tarea. Vuelve a esa tarea para confirmar su resultado antes de crear otra receta.</p>}
    {(visited || active) && <RecipeSelector repository={repository} state={selection} onChange={setSelection} onSelect={onSelect}
      active={active && !creating} focusCreate={hasSession} slotName={slotName} createDisabled={!recoveryReady || foreignPending} onBack={onBack} onCreate={() => { setHasSession(true); setCreating(true); }} />}
    {hasSession && <RecipeFormContent key={sessionKey} repository={repository} storage={storage}
      initialPendingRecord={initialPendingRecord} nestedContext={{ ...nestedContext, recipeStep: "create", recipeSelection: selection }}
      active={active && creating} sessionRef={sessionRef} onBack={() => setCreating(false)}
      onCreated={finish} onUpdated={finish}
      onClose={() => setCreating(false)} />}
  </div>;
}
