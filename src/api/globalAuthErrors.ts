import type { AxiosError, AxiosInstance } from "axios";

export const GLOBAL_AUTH_ERROR_EVENT = "menu:global-auth-error";
const GLOBAL_AUTH_HANDLED = "__menuGlobalAuthHandled";
export type GlobalAuthErrorDetail = { status: 401 | 403; message: string };

export function globalAuthMessage(status: 401 | 403): string {
  return status === 401 ? "Sesión caducada. Inicia sesión de nuevo." : "No tienes permiso para esta acción.";
}

export function globalAuthStatus(error: unknown): 401 | 403 | undefined {
  if (!error || typeof error !== "object" || !("response" in error)) return undefined;
  const response = error.response;
  if (!response || typeof response !== "object" || !("status" in response)) return undefined;
  const status = response.status;
  return status === 401 || status === 403 ? status : undefined;
}

export function isGlobalAuthError(error: unknown): boolean {
  return !!error && typeof error === "object" && GLOBAL_AUTH_HANDLED in error;
}

/** Installs the same auth response behavior on menu and inventory clients. */
export function installGlobalAuthInterceptor(client: AxiosInstance): number {
  return client.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
      const status = globalAuthStatus(error);
      if (status) {
        Object.defineProperty(error, GLOBAL_AUTH_HANDLED, { value: true });
        const detail = { status, message: globalAuthMessage(status) } satisfies GlobalAuthErrorDetail;
        window.dispatchEvent(new CustomEvent<GlobalAuthErrorDetail>(GLOBAL_AUTH_ERROR_EVENT, { detail }));
      }
      return Promise.reject(error);
    },
  );
}
