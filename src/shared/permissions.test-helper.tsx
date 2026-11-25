import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { PermissionProvider } from "./permissions";

const permissions = [
  "menu:catalog:read", "menu:catalog:print", "menu:categories:read", "menu:categories:write",
  "menu:entries:read", "menu:entries:write", "menu:entries:status", "menu:offers:read",
  "menu:offers:write", "menu:offers:status", "menu:recipes:read", "menu:recipes:write", "menu:images:write",
];

const encode = (value: unknown) => btoa(JSON.stringify(value)).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({ permissions })}.signature`;

function PermissionTestWrapper({ children }: { children: ReactNode }) {
  return <PermissionProvider token={token}>{children}</PermissionProvider>;
}

export function renderWithMenuPermissions(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: PermissionTestWrapper, ...options });
}
