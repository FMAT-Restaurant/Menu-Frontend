import { createContext, useContext, useMemo, type ReactNode } from "react";

export const MENU_PERMISSIONS = [
  "menu:catalog:read",
  "menu:catalog:print",
  "menu:categories:read",
  "menu:categories:write",
  "menu:entries:read",
  "menu:entries:write",
  "menu:entries:status",
  "menu:offers:read",
  "menu:offers:write",
  "menu:offers:status",
  "menu:recipes:read",
  "menu:recipes:write",
  "menu:images:write",
] as const;

type MenuPermission = typeof MENU_PERMISSIONS[number];
const allowedPermissions = new Set<string>(MENU_PERMISSIONS);
const PermissionContext = createContext<ReadonlySet<string>>(new Set());

function decodeBase64Url(segment: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(segment) || segment.length % 4 === 1) {
    throw new Error("JWT segment is not valid base64url");
  }
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(segment.length / 4) * 4, "=");
  const binary = atob(base64);
  return new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
}

export function getTokenPermissions(token?: string): ReadonlySet<string> {
  if (!token) return new Set();
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return new Set();
    JSON.parse(decodeBase64Url(parts[0]));
    const payload: unknown = JSON.parse(decodeBase64Url(parts[1]));
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return new Set();
    const claims = payload as { exp?: unknown; permissions?: unknown };
    if (claims.exp !== undefined && (typeof claims.exp !== "number" || !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000)) {
      return new Set();
    }
    if (!Array.isArray(claims.permissions)) return new Set();
    return new Set(claims.permissions.filter((permission): permission is string =>
      typeof permission === "string" && allowedPermissions.has(permission)));
  } catch {
    return new Set();
  }
}

function getStoredToken(): string | undefined {
  try {
    const session: unknown = JSON.parse(localStorage.getItem("fmat_restaurant_auth_session") ?? "null");
    if (!session || typeof session !== "object") return undefined;
    const data = session as { accessToken?: unknown; token?: unknown };
    if (typeof data.accessToken === "string") return data.accessToken;
    return typeof data.token === "string" ? data.token : undefined;
  } catch {
    return undefined;
  }
}

export function PermissionProvider({ token, children }: Readonly<{ token?: string; children: ReactNode }>) {
  const permissions = useMemo(() => getTokenPermissions(token || getStoredToken()), [token]);
  return <PermissionContext.Provider value={permissions}>{children}</PermissionContext.Provider>;
}

export function usePermission(permission: MenuPermission | string): boolean {
  return useContext(PermissionContext).has(permission);
}
