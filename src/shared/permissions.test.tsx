import { render, screen } from "@testing-library/react";
import { MENU_PERMISSIONS, PermissionProvider, usePermission } from "./permissions";

function tokenFor(claims: Record<string, unknown>) {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(claims)}.signature`;
}

function Result({ permission }: { permission: string }) {
  return <li>{permission}: {String(usePermission(permission))}</li>;
}

function Probe({ permissions = MENU_PERMISSIONS }: { permissions?: readonly string[] }) {
  return <ul>{permissions.map(permission => <Result key={permission} permission={permission} />)}</ul>;
}

describe("JWT permissions context", () => {
  beforeEach(() => localStorage.clear());

  test("denies all thirteen permissions for an empty list and ignores ADMIN and wildcard shortcuts", () => {
    const empty = render(<PermissionProvider token={tokenFor({ permissions: [], userType: "ADMIN" })}><Probe /></PermissionProvider>);
    for (const permission of MENU_PERMISSIONS) expect(screen.getByText(`${permission}: false`)).toBeInTheDocument();
    empty.unmount();
    const wildcard = render(<PermissionProvider token={tokenFor({ permissions: ["*"], userType: "ADMIN" })}><Probe permissions={["menu:entries:write"]} /></PermissionProvider>);
    expect(wildcard.getByText("menu:entries:write: false")).toBeInTheDocument();
  });

  test("grants a listed permission and recognizes all thirteen declared permissions", () => {
    const selected = "menu:entries:write";
    const { rerender } = render(<PermissionProvider token={tokenFor({ permissions: [selected, "*", "unknown:permission"] })}><Probe permissions={[selected, "menu:entries:read"]} /></PermissionProvider>);
    expect(screen.getByText("menu:entries:write: true")).toBeInTheDocument();
    expect(screen.getByText("menu:entries:read: false")).toBeInTheDocument();
    rerender(<PermissionProvider token={tokenFor({ permissions: MENU_PERMISSIONS })}><Probe /></PermissionProvider>);
    for (const permission of MENU_PERMISSIONS) expect(screen.getByText(`${permission}: true`)).toBeInTheDocument();
  });

  test.each([
    ["missing token", undefined],
    ["malformed token", "not-a-jwt"],
    ["expired token", tokenFor({ permissions: ["menu:entries:write"], exp: Math.floor(Date.now() / 1000) - 1 })],
  ])("%s grants no permissions", (_label, token) => {
    render(<PermissionProvider token={token}><Probe permissions={["menu:entries:write"]} /></PermissionProvider>);
    expect(screen.getByText("menu:entries:write: false")).toBeInTheDocument();
  });

  test("uses the stored auth session when no Shell token is provided", () => {
    localStorage.setItem("fmat_restaurant_auth_session", JSON.stringify({ accessToken: tokenFor({ permissions: ["menu:entries:write"] }) }));
    render(<PermissionProvider><Probe permissions={["menu:entries:write"]} /></PermissionProvider>);
    expect(screen.getByText("menu:entries:write: true")).toBeInTheDocument();
  });
});
