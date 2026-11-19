import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RequirePermission } from "./RequirePermission";
import { PermissionProvider } from "./permissions";

function tokenFor(permissions: string[]) {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\\+/g, "-").replace(/\\//g, "_");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ permissions })}.signature`;
}

function renderGuard(permissions: string[]) {
  return render(
    <MemoryRouter>
      <PermissionProvider token={tokenFor(permissions)}>
        <RequirePermission permission="menu:catalog:read">
          <p>Contenido protegido</p>
        </RequirePermission>
      </PermissionProvider>
    </MemoryRouter>,
  );
}

describe("RequirePermission", () => {
  test("renders protected content when the JWT grants the requested permission", () => {
    renderGuard(["menu:catalog:read"]);

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sin acceso" })).not.toBeInTheDocument();
  });

  test("shows the access-denied page when the JWT lacks the requested permission", () => {
    renderGuard([]);

    expect(screen.getByRole("heading", { name: "Sin acceso" })).toBeInTheDocument();
    expect(screen.getByText("No tienes permiso para consultar esta sección.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al menú" })).toHaveAttribute("href", "/");
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
  });
});
