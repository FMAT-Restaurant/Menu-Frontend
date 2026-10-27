import "./dataRouter.test-helper";
import { lazy, StrictMode, Suspense, useEffect, useState, type ReactElement } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, Link, MemoryRouter, Outlet, Route, RouterProvider, Routes, useLocation, useNavigate } from "react-router-dom";
import { createRouteTransitionTracker, RouteContext } from "./RouteContext";
import { useLocalSaveReceipt } from "./localSaveReceipt";

function Heading({ children }: { children: string }) {
  return <h1 data-route-heading tabIndex={-1}>{children}</h1>;
}

function Controls() {
  const navigate = useNavigate();
  const location = useLocation();
  return <><button onClick={() => void navigate(-1)}>Atrás</button><button onClick={() => void navigate(1)}>Adelante</button><output data-testid="location">{location.pathname + location.search + location.hash}</output></>;
}

function List({ missing = false, actionMissing = false, busy = false }: { missing?: boolean; actionMissing?: boolean; busy?: boolean }) {
  const location = useLocation();
  return <><Heading>Entradas</Heading><input aria-label="Buscar entradas" /><Link to="/?q=Bowl&page=3#results">Cambiar página</Link>
    <section aria-busy={busy}>{!missing && <article data-return-key="entry:e1" tabIndex={-1}>Bowl
      {!actionMissing && <Link data-return-key="entry:e1:offers" to="/entries/e1/offers?q=Individual&page=2" state={{ returnTo: location.pathname + location.search + location.hash }}>Ver ofertas</Link>}
    </article>}</section></>;
}

function Offers() {
  const location = useLocation();
  return <><Heading>Ofertas de Bowl</Heading><Link to="/?q=Bowl&page=2#results">Volver al catálogo</Link>
    <article tabIndex={-1} data-return-key="offer:o1"><Link data-return-key="offer:o1:edit" to="/entries/e1/offers/o1/edit" state={{ returnTo: location.pathname + location.search }}>Editar Individual</Link></article></>;
}

function Editor() {
  const location = useLocation();
  return <><Heading>Editar oferta</Heading><Link to={location.state?.returnTo ?? "/entries/e1/offers?q=Individual&page=2"}>Volver a ofertas</Link></>;
}

function Fixture({ missing = false, actionMissing = false, busy = false }: { missing?: boolean; actionMissing?: boolean; busy?: boolean }) {
  return <div data-menu-module><RouteContext /><Controls /><Routes>
    <Route path="/" element={<List missing={missing} actionMissing={actionMissing} busy={busy} />} />
    <Route path="/entries/e1/offers" element={<Offers />} />
    <Route path="/entries/e1/offers/o1/edit" element={<Editor />} />
    <Route path="*" element={<Heading>Página no encontrada</Heading>} />
  </Routes></div>;
}

afterEach(() => {
  document.documentElement.removeAttribute("data-menu-standalone");
  document.title = "Menú | FMAT Restaurant";
});

test("focuses each task once, preserves demo title, and ignores result query, pagination and hash changes", async () => {
  document.documentElement.dataset.menuStandalone = "";
  document.title = "[DEMO] Menú | FMAT Restaurant";
  render(<StrictMode><MemoryRouter><Fixture /></MemoryRouter></StrictMode>);
  const heading = screen.getByRole("heading", { name: "Entradas" });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(document.title).toBe("[DEMO] Entradas | FMAT Restaurant");
  const focus = jest.spyOn(heading, "focus");
  const search = screen.getByRole("textbox", { name: "Buscar entradas" });
  search.focus();
  fireEvent.change(search, { target: { value: "Bowl" } });
  fireEvent.click(screen.getByRole("link", { name: "Cambiar página" }));
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/?q=Bowl&page=3#results"));
  expect(search).toHaveFocus();
  expect(focus).not.toHaveBeenCalled();
});

test("restores both nested origins and exact list queries through links, back and forward", async () => {
  render(<MemoryRouter initialEntries={["/?q=Bowl&page=2#results"]}><Fixture /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Entradas" })).toHaveFocus());
  fireEvent.click(screen.getByRole("link", { name: "Ver ofertas" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Ofertas de Bowl" })).toHaveFocus());
  fireEvent.click(screen.getByRole("link", { name: "Editar Individual" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Editar oferta" })).toHaveFocus());
  fireEvent.click(screen.getByRole("link", { name: "Volver a ofertas" }));
  await waitFor(() => expect(screen.getByRole("link", { name: "Editar Individual" })).toHaveFocus());
  expect(screen.getByTestId("location")).toHaveTextContent("/entries/e1/offers?q=Individual&page=2");
  fireEvent.click(screen.getByRole("link", { name: "Volver al catálogo" }));
  await waitFor(() => expect(screen.getByRole("link", { name: "Ver ofertas" })).toHaveFocus());
  expect(screen.getByTestId("location")).toHaveTextContent("/?q=Bowl&page=2#results");
  fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
  await waitFor(() => expect(screen.getByRole("link", { name: "Editar Individual" })).toHaveFocus());
  fireEvent.click(screen.getByRole("button", { name: "Adelante" }));
  await waitFor(() => expect(screen.getByRole("link", { name: "Ver ofertas" })).toHaveFocus());
});

test.each([false, true])("waits for the returning collection, then falls back when the action or entity is absent (entityMissing=%s)", async missing => {
  const view = render(<MemoryRouter initialEntries={["/?q=Bowl&page=2#results"]}><Fixture /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Entradas" })).toHaveFocus());
  fireEvent.click(screen.getByRole("link", { name: "Ver ofertas" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Ofertas de Bowl" })).toHaveFocus());
  view.rerender(<MemoryRouter initialEntries={["/?q=Bowl&page=2#results"]}><Fixture busy missing={missing} actionMissing /></MemoryRouter>);
  fireEvent.click(screen.getByRole("link", { name: "Volver al catálogo" }));
  const heading = await screen.findByRole("heading", { name: "Entradas" });
  await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); });
  expect(heading).not.toHaveFocus();
  view.rerender(<MemoryRouter initialEntries={["/?q=Bowl&page=2#results"]}><Fixture missing={missing} actionMissing /></MemoryRouter>);
  await waitFor(() => expect(missing ? heading : screen.getByRole("article")).toHaveFocus());
});

test("updates a delayed task title without taking focus after the user interacts", async () => {
  document.documentElement.dataset.menuStandalone = "";
  let show: (() => void) | undefined;
  function Delayed() {
    const [ready, setReady] = useState(false);
    show = () => setReady(true);
    return <><input aria-label="Dato disponible" />{ready && <Heading>Receta recibida</Heading>}</>;
  }
  render(<MemoryRouter><div data-menu-module><RouteContext /><Delayed /></div></MemoryRouter>);
  const input = screen.getByRole("textbox", { name: "Dato disponible" });
  input.focus();
  fireEvent.keyDown(input, { key: "a" });
  act(() => show!());
  await waitFor(() => expect(document.title).toBe("Receta recibida | FMAT Restaurant"));
  expect(input).toHaveFocus();
});

test.each(["dialog", "error"])("a %s keeps priority over route focus", async kind => {
  function Priority() {
    useEffect(() => { document.querySelector<HTMLElement>("#priority")!.focus(); }, []);
    return <><Heading>Editar entrada</Heading>{kind === "dialog" ? <dialog open><button id="priority">Seguir editando</button></dialog> : <div role="alert" id="priority" tabIndex={-1}>Revisa los datos</div>}</>;
  }
  render(<MemoryRouter><div data-menu-module><RouteContext /><Priority /></div></MemoryRouter>);
  await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); });
  expect(document.getElementById("priority")).toHaveFocus();
});

test("consuming a save receipt does not repeat the route focus or add another live announcement", async () => {
  function Destination() {
    const message = useLocalSaveReceipt("entry");
    return <><Heading>Entradas</Heading>{message && <p role="status">{message}</p>}</>;
  }
  const receipt = { receiptId: "done", entity: "entry", entityId: "e1", action: "created", label: "Bowl" };
  render(<StrictMode><MemoryRouter initialEntries={[{ pathname: "/", search: "?q=Bowl", state: { saveResult: receipt, custom: 42 } }]}><div data-menu-module><RouteContext /><Destination /></div></MemoryRouter></StrictMode>);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Entradas" })).toHaveFocus());
  expect(screen.getAllByRole("status")).toHaveLength(1);
  expect(screen.getByRole("status")).toHaveTextContent('Entrada "Bowl" creada.');
  expect(document.querySelector("[data-route-context]")).not.toHaveAttribute("aria-live");
});

test("an embedded mount preserves the document owner's title and focus", async () => {
  document.title = "Panel anfitrión";
  const host = document.createElement("button");
  document.body.append(host);
  host.focus();
  const view = render(<MemoryRouter initialEntries={["/missing"]}><Fixture /></MemoryRouter>);
  await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); });
  expect(document.title).toBe("Panel anfitrión");
  expect(host).toHaveFocus();
  view.unmount();
  host.remove();
});

test.each([
  ["link", "persistent"], ["back", "persistent"], ["forward", "persistent"], ["link", "removed"], ["link", "none"],
] as const)("a real suspended data-router transition preserves available focus or restores useful context (%s, interaction=%s)", async (method, interaction) => {
  document.documentElement.dataset.menuStandalone = "";
  const transitions = createRouteTransitionTracker();
  let release!: () => void;
  let requested = false;
  const module = new Promise<{ default: () => ReactElement }>(resolve => {
    release = () => resolve({ default: () => <Heading>Editor diferido</Heading> });
  });
  const DeferredEditor = lazy(() => { requested = true; return module; });
  function PreviousScreen() {
    const navigate = useNavigate();
    return <><Heading>Catálogo disponible</Heading><input aria-label="Buscar durante la espera" />
      {method === "link" ? <Link to="/deferred">Abrir editor</Link> : <button onClick={() => void navigate(method === "back" ? -1 : 1)}>Abrir editor</button>}</>;
  }
  const router = createMemoryRouter([{ element: <div data-menu-module><RouteContext transitions={transitions} /><button>Control persistente</button><Suspense fallback={<p>Cargando tarea</p>}><Outlet /></Suspense></div>, children: [
    { path: "/", element: <PreviousScreen /> }, { path: "/deferred", element: <DeferredEditor /> },
  ] }], { initialEntries: method === "back" ? ["/deferred", "/"] : ["/", "/deferred"], initialIndex: method === "back" ? 1 : 0 });
  transitions.observe(router.state.location.pathname);
  const unsubscribe = router.subscribe(state => transitions.observe(state.location.pathname));
  const view = render(<RouterProvider router={router} />);
  try {
    await waitFor(() => expect(screen.getByRole("heading", { name: "Catálogo disponible" })).toHaveFocus());
    fireEvent.click(screen.getByRole(method === "link" ? "link" : "button", { name: "Abrir editor" }));
    await waitFor(() => expect(requested).toBe(true));
    expect(router.state.location.pathname).toBe("/deferred");
    expect(screen.getByRole("heading", { name: "Catálogo disponible" })).toBeVisible();
    if (interaction !== "none") {
      const control = interaction === "persistent" ? screen.getByRole("button", { name: "Control persistente" }) : screen.getByRole("textbox", { name: "Buscar durante la espera" });
      fireEvent.pointerDown(control);
      control.focus();
      fireEvent.keyDown(control, { key: "ArrowRight" });
      expect(control).toHaveFocus();
    }
    await act(async () => release());
    const heading = await screen.findByRole("heading", { name: "Editor diferido" });
    await waitFor(() => expect(document.title).toBe("Editor diferido | FMAT Restaurant"));
    if (interaction === "persistent") expect(screen.getByRole("button", { name: "Control persistente" })).toHaveFocus();
    else await waitFor(() => expect(heading).toHaveFocus());
  } finally {
    view.unmount(); unsubscribe(); router.dispose();
  }
});
