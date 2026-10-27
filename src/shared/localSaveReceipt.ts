import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export interface LocalSaveReceipt {
  receiptId: string;
  entity: "entry" | "offer";
  entityId: string;
  entryId?: string;
  label: string;
  action: "created" | "updated";
}

export function receiptState(state: unknown, receipt: LocalSaveReceipt) {
  return { ...(state && typeof state === "object" ? state : {}), saveResult: receipt };
}

export function readSaveReceipt(state: unknown, entity: LocalSaveReceipt["entity"], entryId?: string): LocalSaveReceipt | null {
  if (!state || typeof state !== "object" || !("saveResult" in state)) return null;
  const value = state.saveResult;
  if (!value || typeof value !== "object") return null;
  const receipt = value as Partial<LocalSaveReceipt>;
  if (receipt.entity !== entity || typeof receipt.receiptId !== "string" || !receipt.receiptId ||
    typeof receipt.entityId !== "string" || !receipt.entityId || typeof receipt.label !== "string" ||
    !["created", "updated"].includes(receipt.action ?? "") || (entity === "offer" && receipt.entryId !== entryId)) return null;
  return receipt as LocalSaveReceipt;
}

export function saveReceiptMessage(receipt: LocalSaveReceipt) {
  const noun = receipt.entity === "entry" ? "Entrada" : "Oferta";
  const label = receipt.label ? ` "${receipt.label}"` : "";
  return `${noun}${label} ${receipt.action === "created" ? "creada" : "actualizada"}.`;
}

/** Consume before loading the collection, preserving every unrelated history field. */
export function useLocalSaveReceipt(entity: LocalSaveReceipt["entity"], entryId?: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const consumed = useRef(new Set<string>());
  const [message, setMessage] = useState("");
  useEffect(() => {
    const receipt = readSaveReceipt(location.state, entity, entryId);
    if (!receipt || consumed.current.has(receipt.receiptId)) return;
    consumed.current.add(receipt.receiptId);
    setMessage(saveReceiptMessage(receipt));
    const state = { ...location.state };
    delete state.saveResult;
    void Promise.resolve(navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state })).catch(() => {
      // Keep the local confirmation if history replacement fails; never re-announce it in this mount.
    });
  }, [entity, entryId, location, navigate]);
  return message;
}
