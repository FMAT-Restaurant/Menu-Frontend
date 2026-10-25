import { useEffect, useRef, useState, type RefObject } from "react";

/** The footer stays in the form's flow, so its measured height is reserved. */
export function useFormActionsLayout(form: RefObject<HTMLFormElement | null>, actions: RefObject<HTMLElement | null>) {
  const [layout, setLayout] = useState({ persistent: false, height: 0, available: 0, formHeight: 0 });
  // Run after each commit: async form loading can replace the observed nodes.
  const observed = useRef<() => void>(() => {});
  useEffect(() => {
    observed.current();
    const element = form.current;
    const footer = actions.current;
    if (!element || !footer) return;
    const measure = () => {
      const height = footer.getBoundingClientRect().height;
      const viewport = window.visualViewport?.height ?? window.innerHeight;
      const control = element.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select");
      const controlHeight = control?.getBoundingClientRect().height ?? 40;
      const bounds = element.getBoundingClientRect();
      const formHeight = bounds.height;
      // Compare against the space left after the task header. Document position
      // stays stable while scrolling, so reaching the form does not toggle it.
      let scrollport = element.parentElement;
      while (scrollport && scrollport !== document.body) {
        if (/(auto|scroll)/.test(getComputedStyle(scrollport).overflowY) && scrollport.scrollHeight > scrollport.clientHeight) break;
        scrollport = scrollport.parentElement;
      }
      const port = scrollport && scrollport !== document.body ? scrollport : null;
      const portHeight = port ? Math.min(viewport, port.clientHeight) : viewport;
      const formStart = port
        ? bounds.top - port.getBoundingClientRect().top + port.scrollTop
        : (bounds.top || 0) + window.scrollY;
      const available = Math.max(0, portHeight - Math.max(0, formStart));
      // Leave two complete controls and their labels readable above the actions.
      const editableMinimum = 2 * (Math.max(40, controlHeight) + 24);
      const persistent = height > 0 && formHeight > available && portHeight - height >= editableMinimum;
      element.style.setProperty("--form-actions-height", `${persistent ? height : 0}px`);
      const next = { persistent, height, available, formHeight };
      setLayout(previous => Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    observer?.observe(footer);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    const cleanup = () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
    observed.current = cleanup;
    return cleanup;
  });
  return layout;
}

export function revealFormControl(control: HTMLElement, footer: HTMLElement | null) {
  if (!footer || footer.contains(control)) return;
  const actions = footer.getBoundingClientRect();
  if (!actions.height) return;
  const bounds = control.getBoundingClientRect();
  const offset = bounds.bottom - actions.top + 12;
  if (offset <= 0) return;
  let parent = control.parentElement;
  while (parent && parent !== document.body) {
    const style = getComputedStyle(parent);
    if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) break;
    parent = parent.parentElement;
  }
  const top = Math.min(offset, bounds.top - 12);
  if (parent && parent !== document.body) parent.scrollBy({ top, behavior: "instant" });
  else window.scrollBy({ top, behavior: "instant" });
}
