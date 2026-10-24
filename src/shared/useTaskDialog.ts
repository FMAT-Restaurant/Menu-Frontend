import { useEffect, type RefObject } from "react";
import { acquireModalScrollLock } from "./useModalScrollLock";

const stacks = new WeakMap<Document, HTMLDialogElement[]>();

function updateBackdrops(stack: HTMLDialogElement[]) {
  stack.forEach((dialog, index) => {
    dialog.toggleAttribute("data-modal-covered", index < stack.length - 1);
  });
}

/** Native modal lifecycle only. Each consumer keeps its close and pending-operation policy. */
export function useTaskDialog(
  dialogRef: RefObject<HTMLDialogElement | null>,
  open: boolean,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const document = dialog.ownerDocument;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScroll = acquireModalScrollLock(document);
    const stack = stacks.get(document) ?? [];
    stack.push(dialog);
    stacks.set(document, stack);
    updateBackdrops(stack);
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute("open", "");
    initialFocusRef?.current?.focus({ preventScroll: true });
    let emptyFocusAnchor: HTMLElement | null = null;
    let originalAnchorTabIndex: string | null = null;
    const containTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || stack.at(-1) !== dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>(
        'button, a[href], input:not([type="hidden"]), select, textarea, [tabindex]',
      )].filter(element => {
        if (element.tabIndex < 0 || element.matches(":disabled") || element.closest("[hidden], [inert]")) return false;
        for (let ancestor: HTMLElement | null = element; ancestor && ancestor !== dialog; ancestor = ancestor.parentElement) {
          const style = document.defaultView?.getComputedStyle(ancestor);
          if (style?.display === "none" || style?.visibility === "hidden") return false;
        }
        return true;
      });
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) {
        event.preventDefault();
        if (!emptyFocusAnchor) {
          emptyFocusAnchor = dialog.querySelector<HTMLElement>("h1, h2, h3") ?? dialog;
          originalAnchorTabIndex = emptyFocusAnchor.getAttribute("tabindex");
          emptyFocusAnchor.tabIndex = -1;
        }
        emptyFocusAnchor.focus({ preventScroll: true });
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    // Disabling the focused submit button may move focus to BODY in Chromium.
    // Capture at the document so the active modal can recover that focus too.
    document.addEventListener("keydown", containTab, true);

    return () => {
      document.removeEventListener("keydown", containTab, true);
      if (emptyFocusAnchor) {
        if (originalAnchorTabIndex === null) emptyFocusAnchor.removeAttribute("tabindex");
        else emptyFocusAnchor.setAttribute("tabindex", originalAnchorTabIndex);
      }
      const index = stack.indexOf(dialog);
      if (index !== -1) stack.splice(index, 1);
      dialog.removeAttribute("data-modal-covered");
      updateBackdrops(stack);
      if (stack.length === 0) stacks.delete(document);
      if (dialog.open && typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      releaseScroll();
    };
  }, [dialogRef, open, initialFocusRef]);
}
