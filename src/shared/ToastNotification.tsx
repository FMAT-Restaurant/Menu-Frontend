import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export type NotificationTone = "success" | "error" | "info";

export interface NotificationItem {
  id: number;
  message: string;
  tone: NotificationTone;
}

/**
 * Convenio de notificaciones de acción:
 * - Solo se muestra 1 notificación flotante a la vez (cada nueva notificación reemplaza la anterior).
 * - Se cierra automáticamente tras `autoHideMs` o manualmente al pulsar el botón de cierre.
 * - Se limpia explícitamente al cambiar de contexto (búsqueda, filtros o apertura de un diálogo).
 */
export function useNotification(autoHideMs = 5000) {
  const [notification, setNotification] = useState<NotificationItem | null>(null);
  const nextId = useRef(1);

  const clear = useCallback(() => {
    setNotification(null);
  }, []);

  const notify = useCallback((message: string, tone: NotificationTone = "success") => {
    const trimmed = message.trim();
    if (!trimmed) {
      setNotification(null);
      return;
    }
    setNotification({ id: nextId.current++, message: trimmed, tone });
  }, []);

  useEffect(() => {
    if (!notification || autoHideMs <= 0) return;
    const timer = window.setTimeout(() => {
      setNotification((current) => (current?.id === notification.id ? null : current));
    }, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [notification, autoHideMs]);

  return { notification, notify, clear };
}

export function ToastNotification({
  notification,
  onDismiss,
}: Readonly<{
  notification: NotificationItem | null;
  onDismiss(): void;
}>) {
  if (!notification) return null;

  const isError = notification.tone === "error";
  const content = (
    <>
      <span className="toast-notification__message">{notification.message}</span>
      <button
        type="button"
        className="toast-notification__close"
        onClick={onDismiss}
        aria-label="Cerrar notificación"
      >
        <Icon name="close" />
      </button>
    </>
  );

  return (
    <div className="toast-region" data-tone={notification.tone}>
      {isError ? (
        <div className={`toast-notification toast-notification--${notification.tone}`} role="alert">
          {content}
        </div>
      ) : (
        <output className={`toast-notification toast-notification--${notification.tone}`} aria-live="polite">
          {content}
        </output>
      )}
    </div>
  );
}
