import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { MenuEntry, MenuRepository, Page } from "../../application/catalog";
import { invalidateCatalogEntries } from "../../application/catalogCache";
import { CatalogPage } from "./CatalogPage";

const entry: MenuEntry = {
  id: "entry-1", brandName: "Bowl de pollo", description: "Pollo con arroz", status: "INACTIVE",
  image: { id: "image-1", url: "/bowl.jpg", thumbnailUrl: "/bowl-thumb.jpg" },
  categories: [{ id: "category-1", name: "Principales" }], offerCount: 2,
};
const listed = (data: MenuEntry[] = [entry], page = 1, total = data.length): Page<MenuEntry> => ({
  data, meta: { page, pageSize: 12, total, totalPages: total ? Math.ceil(total / 12) : 0 },
});

type CatalogRepository = Pick<MenuRepository, "listEntries" | "listCategories" | "deleteArchivedEntry">;

function api(): jest.Mocked<CatalogRepository> {
  return {
    listEntries: jest.fn().mockResolvedValue(listed()),
    listCategories: jest.fn().mockResolvedValue([{ id: "category-1", name: "Principales" }]),
    deleteArchivedEntry: jest.fn().mockResolvedValue(undefined),
  };
}

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function page(repository: CatalogRepository, url = "/") {
  return render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/" element={<><CatalogPage repository={repository} /><Location /></>} /></Routes></MemoryRouter>);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("searches after typing without submit and Enter applies immediately", async () => {
  const repository = api();
  page(repository, "/?page=3");
  await screen.findByRole("heading", { name: "Bowl de pollo" });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "arroz" } });
  await waitFor(() => expect(repository.listEntries).toHaveBeenLastCalledWith({ q: "arroz", page: 1, pageSize: 12 }, expect.any(AbortSignal)));
  expect(screen.getByTestId("location")).toHaveTextContent("/?q=arroz");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "pollo" } });
  fireEvent.submit(screen.getByRole("search"));
  await waitFor(() => expect(repository.listEntries).toHaveBeenLastCalledWith({ q: "pollo", page: 1, pageSize: 12 }, expect.any(AbortSignal)));
});

test("typing and clearing before debounce timer or history navigation never restores stale query (C04)", async () => {
  const repository = api();
  page(repository, "/");
  await screen.findByRole("heading", { name: "Bowl de pollo" });

  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "hamburguesa" } });
  expect(screen.getByRole("searchbox")).toHaveValue("hamburguesa");

  const clearBtn = screen.getByRole("button", { name: "Limpiar filtros" });
  expect(clearBtn).toBeEnabled();
  fireEvent.click(clearBtn);
  expect(screen.getByTestId("location").textContent).toBe("/");
  expect(screen.getByRole("searchbox")).toHaveValue("");

  await act(async () => {
    await new Promise((r) => setTimeout(r, 350));
  });

  expect(screen.getByTestId("location").textContent).toBe("/");
  expect(screen.getByRole("searchbox")).toHaveValue("");
  expect(repository.listEntries).not.toHaveBeenCalledWith(
    expect.objectContaining({ q: "hamburguesa" }),
    expect.any(AbortSignal),
  );
});

test("shows the count of active mobile filters and clears them to exactly root path (C12)", async () => {
  const repository = api();
  page(repository, "/?categoryId=category-1&status=INACTIVE");
  await screen.findByRole("heading", { name: "Bowl de pollo" });
  expect(screen.queryByRole("button", { name: /^Filtros/ })).not.toBeInTheDocument();
  expect(screen.getByText("2 activos", { exact: true })).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Categoría" })).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Estado administrativo" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
  await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/"));
});

test("keeps cards and their summary visible while a new query loads, then handles failure", async () => {
  const repository = api();
  const pending = deferred<Page<MenuEntry>>();
  repository.listEntries.mockResolvedValueOnce(listed()).mockImplementationOnce(() => pending.promise);
  page(repository);
  await screen.findByRole("heading", { name: "Bowl de pollo" });
  fireEvent.change(screen.getByRole("combobox", { name: "Estado administrativo" }), { target: { value: "ACTIVE" } });
  expect(screen.getByRole("heading", { name: "Bowl de pollo" })).toBeVisible();
  expect(screen.getByText(/Mostrando resultados anteriores/)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Eliminar definitivamente Bowl de pollo" })).not.toBeInTheDocument();
  const edit = screen.getByRole("link", { name: "Editar Bowl de pollo" });
  expect(edit).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(edit);
  fireEvent.click(screen.getByRole("link", { name: "Ver ofertas de Bowl de pollo" }));
  expect(screen.getByTestId("location")).toHaveTextContent("/?status=ACTIVE");
  pending.reject(new Error("offline"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Comprueba tu conexión");
  expect(screen.getByRole("heading", { name: "Bowl de pollo" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar entradas" }));
  await waitFor(() => expect(repository.listEntries).toHaveBeenCalledTimes(3));
  expect(screen.queryByText(/Mostrando resultados anteriores/)).not.toBeInTheDocument();
  expect(repository.listCategories).toHaveBeenCalledTimes(1);
});

test("ignores a late response from a canceled query, resolved within act (C14)", async () => {
  const repository = api();
  const old = deferred<Page<MenuEntry>>();
  repository.listEntries.mockResolvedValueOnce(listed()).mockImplementationOnce(() => old.promise)
    .mockResolvedValueOnce(listed([{ ...entry, id: "entry-2", brandName: "Postre" }]));
  page(repository);
  await screen.findByRole("heading", { name: "Bowl de pollo" });
  fireEvent.change(screen.getByRole("combobox", { name: "Estado administrativo" }), { target: { value: "ACTIVE" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Estado administrativo" }), { target: { value: "ARCHIVED" } });
  expect(await screen.findByRole("heading", { name: "Postre" })).toBeVisible();

  await act(async () => {
    old.resolve(listed([{ ...entry, brandName: "Respuesta antigua" }]));
  });

  expect(screen.getByRole("heading", { name: "Postre" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Respuesta antigua" })).not.toBeInTheDocument();
});

test("navigating during out-of-range page correction ignores old page correction response (C05)", async () => {
  const repository = api();
  const archived = { ...entry, status: "ARCHIVED" as const };
  const secondRead = deferred<Page<MenuEntry>>();

  repository.listEntries
    .mockResolvedValueOnce(listed([archived], 2, 13))
    .mockResolvedValueOnce({ data: [], meta: { page: 2, pageSize: 12, total: 12, totalPages: 1 } })
    .mockImplementationOnce(() => secondRead.promise)
    .mockResolvedValueOnce(listed([{ ...entry, id: "active-1", brandName: "Entrada Activa" }]));

  repository.deleteArchivedEntry.mockResolvedValueOnce(undefined);

  page(repository, "/?page=2");
  await screen.findByRole("heading", { name: "Bowl de pollo" });

  fireEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente Bowl de pollo" }));
  const dialog = screen.getByRole("dialog", { name: "Eliminar entrada archivada" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar eliminación" }));

  await waitFor(() => expect(repository.deleteArchivedEntry).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(repository.listEntries).toHaveBeenCalledTimes(3));

  // User changes filter while secondRead is pending
  fireEvent.change(screen.getByRole("combobox", { name: "Estado administrativo" }), { target: { value: "ACTIVE" } });
  expect(await screen.findByRole("heading", { name: "Entrada Activa" })).toBeVisible();

  // Resolve old stale page 1 correction
  await act(async () => {
    secondRead.resolve(listed([{ ...entry, brandName: "Entrada corregida vieja" }], 1, 12));
  });

  expect(screen.getByRole("heading", { name: "Entrada Activa" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Entrada corregida vieja" })).not.toBeInTheDocument();
});

test("caches the same query on return within TTL", async () => {
  const repository = api();
  const first = page(repository);
  await screen.findByRole("heading", { name: "Bowl de pollo" });
  first.unmount();
  page(repository);
  await screen.findByRole("heading", { name: "Bowl de pollo" });
  expect(screen.getByRole("heading", { name: "Bowl de pollo" })).toBeVisible();
  expect(repository.listEntries).toHaveBeenCalledTimes(1);
  expect(repository.listCategories).toHaveBeenCalledTimes(1);
});

test("fetches fresh entry query after cache invalidation within TTL (C15)", async () => {
  const repository = api();
  const updatedEntry = { ...entry, brandName: "Bowl de salmón" };
  repository.listEntries
    .mockResolvedValueOnce(listed([entry]))
    .mockResolvedValueOnce(listed([updatedEntry]));

  const first = page(repository);
  await screen.findByRole("heading", { name: "Bowl de pollo" });
  first.unmount();

  invalidateCatalogEntries(repository);

  page(repository);
  expect(await screen.findByRole("heading", { name: "Bowl de salmón" })).toBeVisible();
  expect(repository.listEntries).toHaveBeenCalledTimes(2);
});

test("keeps deletion pending until the list is reconciled", async () => {
  const repository = api();
  const mutation = deferred<void>();
  const refreshed = deferred<Page<MenuEntry>>();
  const archived = { ...entry, status: "ARCHIVED" as const };
  repository.listEntries.mockResolvedValueOnce(listed([archived])).mockImplementationOnce(() => refreshed.promise);
  repository.deleteArchivedEntry.mockReturnValueOnce(mutation.promise);
  page(repository);
  await screen.findByRole("heading", { name: "Bowl de pollo" });
  fireEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente Bowl de pollo" }));
  const confirm = screen.getByRole("button", { name: "Confirmar eliminación" });
  fireEvent.click(confirm);
  expect(confirm).toBeDisabled();
  fireEvent.click(confirm);
  expect(repository.deleteArchivedEntry).toHaveBeenCalledTimes(1);

  await act(async () => {
    mutation.resolve();
  });
  await waitFor(() => expect(repository.listEntries).toHaveBeenCalledTimes(2));
  expect(confirm).toBeDisabled();

  await act(async () => {
    refreshed.resolve(listed([]));
  });

  expect(await screen.findByText("Aún no hay entradas.")).toBeVisible();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(repository.listCategories).toHaveBeenCalledTimes(1);
});

test("keeps delete confirmation when deletion fails and recovers from inside active modal (C06, C12, C13)", async () => {
  const repository = api();
  const archived = { ...entry, status: "ARCHIVED" as const };
  repository.listEntries.mockResolvedValueOnce(listed([archived], 2, 13))
    .mockResolvedValueOnce({ data: [], meta: { page: 2, pageSize: 12, total: 12, totalPages: 1 } })
    .mockResolvedValueOnce(listed([entry], 1, 12));
  repository.deleteArchivedEntry.mockRejectedValueOnce({ response: { status: 412 } }).mockResolvedValueOnce(undefined);
  page(repository, "/?page=2");
  await screen.findByRole("heading", { name: "Bowl de pollo" });
  fireEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente Bowl de pollo" }));
  const dialog = screen.getByRole("dialog", { name: "Eliminar entrada archivada" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar eliminación" }));
  expect(await within(dialog).findByText(/La entrada cambió desde que la abriste/)).toBeVisible();
  expect(dialog).toBeVisible();

  // Control is inside dialog (C06, C13)
  const reconcileBtn = within(dialog).getByRole("button", { name: "Actualizar lista" });
  fireEvent.click(reconcileBtn);
  await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/"));
  expect(repository.deleteArchivedEntry).toHaveBeenCalledTimes(1);
});

test("recovers a direct URL whose page exceeds the server's total", async () => {
  const repository = api();
  repository.listEntries.mockResolvedValueOnce({ data: [], meta: { page: 9, pageSize: 12, total: 13, totalPages: 2 } })
    .mockResolvedValueOnce({ data: [entry], meta: { page: 2, pageSize: 12, total: 13, totalPages: 2 } });
  page(repository, "/?page=9");
  expect(await screen.findByRole("heading", { name: "Bowl de pollo" })).toBeVisible();
  expect(screen.getByTestId("location")).toHaveTextContent("/?page=2");
  expect(screen.getByText("Mostrando 13–13 de 13 entradas")).toBeVisible();
});

test("distinguishes a completed mutation from a failed list refresh and provides recovery in active dialog (C06, C13)", async () => {
  const repository = api();
  const archived = { ...entry, status: "ARCHIVED" as const };
  repository.listEntries.mockResolvedValueOnce(listed([archived])).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(listed([]));
  page(repository);
  await screen.findByRole("heading", { name: "Bowl de pollo" });
  fireEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente Bowl de pollo" }));
  const dialog = screen.getByRole("dialog", { name: "Eliminar entrada archivada" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar eliminación" }));

  expect(await within(dialog).findByRole("alert")).toHaveTextContent("El cambio se aplicó, pero no se pudo actualizar");
  expect(within(dialog).getByRole("button", { name: "Confirmar eliminación" })).toBeDisabled();
  expect(screen.queryByText("Entrada eliminada.")).not.toBeInTheDocument();

  // Reconcile from within dialog
  fireEvent.click(within(dialog).getByRole("button", { name: "Actualizar lista" }));
  expect(await screen.findByText("Aún no hay entradas.")).toBeVisible();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(repository.deleteArchivedEntry).toHaveBeenCalledTimes(1);
});

test("renders accessible text placeholder fallback when image fails to load (C16)", async () => {
  const repository = api();
  page(repository);
  await screen.findByRole("heading", { name: "Bowl de pollo" });
  fireEvent.error(screen.getByRole("img", { name: "Imagen de Bowl de pollo" }));
  expect(screen.getByRole("img", { name: "Sin imagen de Bowl de pollo" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Ver ofertas de Bowl de pollo" })).toBeVisible();
});
