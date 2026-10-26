import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

function isAvailable(element: HTMLElement) {
  if (!element.isConnected || element.closest("[hidden], [inert], [aria-hidden=true]")) return false;
  if (element.matches(":disabled, [aria-disabled=true]")) return false;
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") return false;
  }
  return true;
}

function currentUrl(location: { pathname: string; search: string; hash: string }) {
  return location.pathname + location.search + location.hash;
}

/** Router notifications precede a React transition that can retain the old view. */
export function createRouteTransitionTracker() {
  let observedPath: string | undefined;
  let interrupted = false;
  return {
    observe(pathname: string) {
      if (pathname === observedPath) return;
      observedPath = pathname;
      interrupted = false;
    },
    interrupt() { interrupted = true; },
    wasInterrupted(pathname: string) { return pathname === observedPath && interrupted; },
  };
}

type RouteTransitionTracker = ReturnType<typeof createRouteTransitionTracker>;

/** One route announcement, through the focused heading or returning control.
 * Save confirmations keep their existing local status region. */
export function RouteContext({ transitions }: { transitions?: RouteTransitionTracker }) {
  const location = useLocation();
  const marker = useRef<HTMLSpanElement>(null);
  const latestLocation = useRef(location);
  useLayoutEffect(() => { latestLocation.current = location; }, [location]);
  const origins = useRef(new Map<string, string>());

  useEffect(() => {
    const module = marker.current?.closest<HTMLElement>("[data-menu-module]");
    if (!module) return;
    const rememberOrigin = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>("a[href]");
      if (!link || !module.contains(link) || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      const source = latestLocation.current;
      if (destination.origin !== window.location.origin || destination.pathname === source.pathname) return;
      const key = link.closest<HTMLElement>("[data-return-key]")?.dataset.returnKey;
      if (key) origins.current.set(currentUrl(source), key);
    };
    module.addEventListener("click", rememberOrigin, true);
    return () => module.removeEventListener("click", rememberOrigin, true);
  }, []);

  useEffect(() => {
    const module = marker.current?.closest<HTMLElement>("[data-menu-module]");
    if (!module) return;
    let finished = false;
    const interruptedBeforeCommit = transitions?.wasInterrupted(location.pathname) ?? false;
    let frame = 0;
    const initialFocus = document.activeElement;
    const destination = currentUrl(latestLocation.current);
    const originKey = origins.current.get(destination);
    const ownedDocument = document.documentElement.hasAttribute("data-menu-standalone");
    const demoPrefix = document.title.startsWith("[DEMO]") ? "[DEMO] " : "";
    let previousTitle = "";

    const cancelFocus = (event: Event) => {
      finished = true;
      // Pointer/key events after the router notification belong to the user,
      // including while React still shows the previous screen. A programmatic
      // focus from the old view must not cancel the new route's focus request.
      if (event.type !== "focusin") transitions?.interrupt();
    };
    const attempt = () => {
      frame = 0;
      const heading = [...module.querySelectorAll<HTMLElement>("[data-route-heading]")]
        .find(element => !element.closest("dialog") && isAvailable(element));
      if (!heading) return;
      const title = heading.textContent?.trim() ?? "";
      if (ownedDocument && title && title !== previousTitle) {
        document.title = `${demoPrefix}${title} | FMAT Restaurant`;
        previousTitle = title;
      }
      if (finished) return;
      if (module.querySelector("dialog[open]")) { finished = true; return; }
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body && !module.contains(active)) {
        finished = true;
        return;
      }
      if (active instanceof HTMLElement && module.contains(active) && isAvailable(active) &&
        (interruptedBeforeCommit || active !== initialFocus || active.matches("input, textarea, select, [aria-invalid=true]") || active.closest("[role=alert]"))) {
        finished = true;
        return;
      }
      // Returning to a list waits for the entity or the definitive missing result.
      if (originKey && module.querySelector('[aria-busy="true"]')) return;
      const candidates = originKey ? [...module.querySelectorAll<HTMLElement>("[data-return-key]")] : [];
      const articleKey = originKey?.replace(/:(edit|offers|status|delete)$/, "");
      const target = candidates.find(element => element.dataset.returnKey === originKey && isAvailable(element)) ??
        candidates.find(element => element.dataset.returnKey === articleKey && isAvailable(element)) ?? heading;
      finished = true;
      target.focus();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(attempt);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(module, { childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ["hidden", "inert", "aria-hidden", "aria-busy", "disabled", "aria-disabled", "style"] });
    document.addEventListener("pointerdown", cancelFocus, true);
    document.addEventListener("keydown", cancelFocus, true);
    document.addEventListener("focusin", cancelFocus, true);
    schedule();
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", cancelFocus, true);
      document.removeEventListener("keydown", cancelFocus, true);
      document.removeEventListener("focusin", cancelFocus, true);
    };
    // Search, pagination, hash and receipt consumption keep the current task's focus.
  }, [location.pathname, transitions]);

  return <span ref={marker} hidden data-route-context />;
}
