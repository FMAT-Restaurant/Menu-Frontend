import { useEffect, useRef } from "react";
import { useTaskDialog } from "../../shared/useTaskDialog";
import { RecipeFormContent, type RecipeFormContentHandle, type RecipeFormDialogProps } from "./RecipeFormContent";
export { buildRecipeCreateScope } from "./RecipeFormContent";
export type { RecipeFormDialogProps, SupplyRow } from "./RecipeFormContent";

/** Administration adapts the same session/content used by the option task. */
export function RecipeFormDialog(props: Readonly<RecipeFormDialogProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sessionRef = useRef<RecipeFormContentHandle>(null);
  useTaskDialog(dialogRef, true);
  useEffect(() => { dialogRef.current?.querySelector<HTMLInputElement>("#recipe-name")?.focus({ preventScroll: true }); }, []);
  return <dialog ref={dialogRef} className="recipe-form-dialog menu-task-dialog" aria-labelledby="recipe-form-title"
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!event.repeat) sessionRef.current?.back(); } }}
    onCancel={event => { event.preventDefault(); sessionRef.current?.back(); }}>
    <RecipeFormContent {...props} sessionRef={sessionRef} />
  </dialog>;
}
