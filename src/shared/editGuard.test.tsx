import "./dataRouter.test-helper";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { createMemoryRouter, Link, Outlet, RouterProvider, useNavigate } from "react-router-dom";
import { EditGuardProvider, sameDraft, useEditGuard } from "./editGuard";
import { SlotModal } from "../features/offers/SlotModal";
import { OptionModal } from "../features/offers/OptionModal";

const ownedRouters: ReturnType<typeof createMemoryRouter>[] = [];
afterEach(() => { ownedRouters.splice(0).forEach(router => router.dispose()); });

function Editor({ abandon }: { abandon: () => void }) {
  const [name, change] = useState("");
  const [blocked, lock] = useState(false);
  const saved = useRef(false);
  const navigate = useNavigate();
  useEditGuard({ get dirty() { return !saved.current && name !== ""; }, get blocked() { return !saved.current && blocked; } }, abandon);
  return <><label>Nombre<input value={name} onChange={e => change(e.target.value)} /></label>
    <Link to="/list?q=arroz&page=3#item" state={{ returnTo: "/categories" }}>Volver</Link>
    <button onClick={() => lock(true)}>Enviar</button>
    <button onClick={() => { saved.current = true; void navigate("/list?confirmed=1", { replace: true }); }}>Confirmar guardado</button>
  </>;
}
function mount(initialEntries = ["/list?q=anterior#row", "/edit"], initialIndex = 1) {
  const abandon = jest.fn();
  const router = createMemoryRouter([{ element: <div className="menu-module"><EditGuardProvider><Outlet /></EditGuardProvider></div>, children: [
    { path: "/edit", element: <Editor abandon={abandon} /> }, { path: "/list", element: <h1>Listado</h1> },
  ] }], { initialEntries, initialIndex });
  ownedRouters.push(router);
  render(<RouterProvider router={router} />);
  return { router, abandon };
}

test("an edited link preserves all fields and focus on continue, then discards once to its exact destination", async () => {
  const { router, abandon } = mount();
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Borrador" } });
  const link = screen.getByRole("link", { name: "Volver" });
  link.focus(); fireEvent.click(link);
  expect(await screen.findByRole("dialog")).toHaveAccessibleName("¿Descartar los cambios sin guardar?");
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(abandon).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
  expect(screen.getByLabelText("Nombre")).toHaveValue("Borrador");
  expect(link).toHaveFocus();
  expect(router.state.location.pathname).toBe("/edit");
  fireEvent.click(link); fireEvent.click(await screen.findByRole("button", { name: "Descartar cambios" }));
  await screen.findByRole("heading", { name: "Listado" });
  expect(router.state.location).toMatchObject({ pathname: "/list", search: "?q=arroz&page=3", hash: "#item", state: { returnTo: "/categories" } });
  expect(abandon).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("back and forward keep their actual history destination after continue and explicit discard", async () => {
  const { router } = mount();
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Conservar" } });
  await act(async () => { await router.navigate(-1); });
  fireEvent.click(await screen.findByRole("button", { name: "Seguir editando" }));
  expect(router.state.location.pathname).toBe("/edit");
  await act(async () => { await router.navigate(-1); });
  fireEvent.click(await screen.findByRole("button", { name: "Descartar cambios" }));
  await screen.findByRole("heading", { name: "Listado" });
  expect(router.state.location.search).toBe("?q=anterior");
  expect(router.state.location.hash).toBe("#row");
  await act(async () => { await router.navigate(1); });
  expect(screen.getByLabelText("Nombre")).toHaveValue("");
});

test("reverting to the confirmed draft removes unload protection and permits an intact exit", async () => {
  mount();
  const unload = () => { const event = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; };
  expect(unload()).toBe(false);
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Cambio" } });
  expect(unload()).toBe(true);
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "" } });
  expect(unload()).toBe(false);
  fireEvent.click(screen.getByRole("link", { name: "Volver" }));
  await screen.findByRole("heading", { name: "Listado" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("pending operations reject navigation and confirmed success exits without another warning", async () => {
  const { router, abandon } = mount();
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Enviado" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
  fireEvent.click(screen.getByRole("link", { name: "Volver" }));
  await waitFor(() => expect(router.state.blockers.size === 0 || [...router.state.blockers.values()].every(b => b.state === "unblocked")).toBe(true));
  expect(router.state.location.pathname).toBe("/edit");
  expect(abandon).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar guardado" }));
  await screen.findByRole("heading", { name: "Listado" });
  expect(router.state.location.search).toBe("?confirmed=1");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("a group confirms Escape within its existing dialog, preserves fields and focus, and closes intact after reversal", () => {
  const close = jest.fn();
  render(<SlotModal isOpen initialData={null} onSave={jest.fn()} onClose={close} />);
  const dialog = screen.getByRole("dialog");
  const name = screen.getByLabelText("Nombre del grupo");
  fireEvent.change(name, { target: { value: "Postres" } });
  fireEvent.change(screen.getByLabelText("Rondas de selección"), { target: { value: "3" } });
  name.focus(); fireEvent.keyDown(name, { key: "Escape" });
  expect(screen.getAllByRole("dialog")).toEqual([dialog]);
  fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
  expect(name).toHaveValue("Postres"); expect(name).toHaveFocus();
  expect(screen.getByLabelText("Rondas de selección")).toHaveValue("3");
  fireEvent.change(name, { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Rondas de selección"), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(close).toHaveBeenCalledTimes(1);
});

test("an option detects local edits without an onChangeDraft consumer and discards only after approval", () => {
  const close = jest.fn();
  render(<OptionModal isOpen slotName="Postres" initialData={null} onSave={jest.fn()} onClose={close} onOpenRecipePicker={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Nombre mostrado (opcional)"), { target: { value: "Etiqueta" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
  expect(screen.getByLabelText("Nombre mostrado (opcional)")).toHaveValue("Etiqueta");
  fireEvent.click(screen.getByRole("button", { name: "Cerrar modal de opción" }));
  fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));
  expect(close).toHaveBeenCalledTimes(1);
});

test("File identity distinguishes replacement images even when their names and metadata match", () => {
  const original = new File(["original"], "foto.png", { type: "image/png", lastModified: 1 });
  const replacement = new File(["replaced"], "foto.png", { type: "image/png", lastModified: 1 });
  expect(sameDraft({ file: original }, { file: original })).toBe(true);
  expect(sameDraft({ file: original }, { file: replacement })).toBe(false);
});
