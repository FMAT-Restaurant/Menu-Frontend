import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBlocker } from "react-router-dom";
import { useTaskDialog } from "./useTaskDialog";
import "./editGuard.css";

export interface EditState { dirty: boolean; blocked: boolean }
interface Participant { state(): EditState; abandon?(): void }
interface Decision { accept(): void; cancel(): void }
const EditContext = createContext<{
  register(participant: Participant): () => void;
  confirm(decision: Decision): void;
  refresh(): void;
} | null>(null);

/** Files compare by identity; object key order and transient row keys do not affect business values. */
export function sameDraft(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof File || b instanceof File) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => sameDraft(v, b[i]));
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const ignored = new Set(["localId", "key"]);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => !ignored.has(k));
  return keys.every(k => sameDraft((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

function useUnload(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}

function Confirmation({ decision }: { decision: Decision }) {
  const [host] = useState(() => [...document.querySelectorAll<HTMLDialogElement>("dialog.menu-task-dialog[open]")].at(-1) ?? null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const trigger = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  useTaskDialog(dialogRef, !host);
  useEffect(() => {
    const container = host ?? dialogRef.current;
    const siblings = host ? [...host.children].filter(n => n !== sectionRef.current) as HTMLElement[] : [];
    const previous = siblings.map(n => ({ n, hidden: n.hidden, inert: n.inert }));
    previous.forEach(({ n }) => { n.hidden = true; n.inert = true; });
    const label = container?.getAttribute("aria-labelledby");
    container?.setAttribute("aria-labelledby", "edit-discard-title");
    sectionRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const cancel = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); decision.cancel(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") cancel(event); };
    container?.addEventListener("cancel", cancel, true);
    container?.addEventListener("keydown", escape, true);
    return () => {
      previous.forEach(({ n, hidden, inert }) => { n.hidden = hidden; n.inert = inert; });
      if (label) container?.setAttribute("aria-labelledby", label);
      else container?.removeAttribute("aria-labelledby");
      container?.removeEventListener("cancel", cancel, true);
      container?.removeEventListener("keydown", escape, true);
      if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
    };
  }, [host, decision]);
  const content = <section ref={sectionRef} className="edit-discard">
    <h2 id="edit-discard-title">¿Descartar los cambios sin guardar?</h2>
    <p>Si sigues editando, se conservarán todos los datos de este formulario.</p>
    <div className="edit-discard__actions">
      <button type="button" className="button button--secondary" onClick={decision.cancel}>Seguir editando</button>
      <button type="button" className="button button--primary" onClick={decision.accept}>Descartar cambios</button>
    </div>
  </section>;
  return host ? createPortal(content, host) : <dialog ref={dialogRef} className="menu-task-dialog edit-discard-dialog">{content}</dialog>;
}

/** Exactly one navigation blocker aggregates every mounted editing step. */
export function EditGuardProvider({ children }: { children: ReactNode }) {
  const participants = useRef(new Set<Participant>());
  const [revision, changed] = useState(0);
  const [decision, setDecision] = useState<Decision | null>(null);
  const bypass = useRef(false);
  const blocker = useBlocker(() => !bypass.current && [...participants.current].some(p => { const s = p.state(); return s.dirty || s.blocked; }));
  const register = useCallback((p: Participant) => { participants.current.add(p); changed(n => n + 1); return () => { participants.current.delete(p); changed(n => n + 1); }; }, []);
  const refresh = useCallback(() => changed(n => n + 1), []);
  const confirm = useCallback((d: Decision) => setDecision({ accept: () => { setDecision(null); d.accept(); }, cancel: () => { setDecision(null); d.cancel(); } }), []);
  const contextValue = useMemo(() => ({ register, confirm, refresh }), [register, confirm, refresh]);
  const states = [...participants.current].map(p => p.state());
  useUnload(states.some(s => s.dirty || s.blocked));
  useEffect(() => {
    if (blocker.state !== "blocked") { bypass.current = false; return; }
    if ([...participants.current].some(p => p.state().blocked)) { blocker.reset(); return; }
    confirm({ cancel: () => blocker.reset(), accept: () => {
      if ([...participants.current].some(p => p.state().blocked)) { blocker.reset(); return; }
      bypass.current = true;
      participants.current.forEach(p => p.abandon?.());
      blocker.proceed();
    } });
  }, [blocker, confirm, revision]);
  return <EditContext.Provider value={contextValue}>{children}{decision && <Confirmation decision={decision} />}</EditContext.Provider>;
}

export function useEditGuard(state: EditState, abandon?: () => void, enabled = true) {
  const context = useContext(EditContext);
  const latest = useRef({ state, abandon });
  latest.current = { state, abandon };
  const [decision, setDecision] = useState<Decision | null>(null);
  useEffect(() => context && enabled ? context.register({ state: () => latest.current.state, abandon: () => latest.current.abandon?.() }) : undefined,
    [context?.register, enabled]);
  useEffect(() => { if (enabled) context?.refresh(); }, [context?.refresh, enabled, state.dirty, state.blocked]);
  useUnload(!context && enabled && (state.dirty || state.blocked));
  function request(action: () => void) {
    if (latest.current.state.blocked) return;
    if (!latest.current.state.dirty) { action(); return; }
    const d = { accept: () => { if (!latest.current.state.blocked) action(); }, cancel: () => {} };
    if (context) context.confirm(d);
    else setDecision({ accept: () => { setDecision(null); d.accept(); }, cancel: () => setDecision(null) });
  }
  return { request, confirmation: decision ? <Confirmation decision={decision} /> : null };
}
