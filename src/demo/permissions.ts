import { MENU_PERMISSIONS } from "../shared/permissions";

export function parseDemoPermissions(search: string): string[] {
  const params = new URLSearchParams(search);
  if (!params.has("permissions")) return [...MENU_PERMISSIONS];
  const requested = new Set((params.get("permissions") ?? "").split(",").map(value => value.trim()).filter(Boolean));
  return MENU_PERMISSIONS.filter(permission => requested.has(permission));
}

export function createDemoToken(search: string): string {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ permissions: parseDemoPermissions(search) })}.demo`;
}
