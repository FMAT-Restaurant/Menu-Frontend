import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { readSaveReceipt, receiptState, useLocalSaveReceipt } from "./localSaveReceipt";
import { CatalogPage } from "../features/catalog/CatalogPage";

const receipt = { receiptId: "confirmed-1", entity: "entry" as const, entityId: "entry-1", label: "Bowl", action: "created" as const };
function StateViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><pre data-testid="state">{JSON.stringify({ path: location.pathname + location.search + location.hash, state: location.state })}</pre><button onClick={() => void navigate(0)}>Recargar ruta</button></>;
}

test("a destination consumes a confirmed receipt once while failed collection retries preserve success and unrelated history", async () => {
  const repository = { listEntries: jest.fn().mockRejectedValue(new Error("offline")), listCategories: jest.fn().mockResolvedValue([]), deleteArchivedEntry: jest.fn() };
  const view = render(<StrictMode><MemoryRouter initialEntries={[{ pathname: "/", search: "?q=Bowl&page=3", hash: "#list", state: receiptState({ returnTo: "/?status=ACTIVE", custom: 42 }, receipt) }]}><CatalogPage repository={repository} /><StateViewer /></MemoryRouter></StrictMode>);
  expect(await screen.findByRole("status")).toHaveTextContent('Entrada "Bowl" creada.');
  await waitFor(() => expect(screen.getByTestId("state")).not.toHaveTextContent("saveResult"));
  expect(screen.getByTestId("state")).toHaveTextContent('"path":"/?q=Bowl&page=3#list"');
  expect(screen.getByTestId("state")).toHaveTextContent('"custom":42');
  expect(screen.getByTestId("state")).toHaveTextContent('"returnTo":"/?status=ACTIVE"');
  fireEvent.click(await screen.findByRole("button", { name: "Reintentar entradas" }));
  expect(screen.getAllByText('Entrada "Bowl" creada.')).toHaveLength(1);
  const state = JSON.parse(screen.getByTestId("state").textContent!).state;
  view.unmount();
  function Message() { const message = useLocalSaveReceipt("entry"); return <p role="status">{message}</p>; }
  render(<MemoryRouter initialEntries={[{ pathname: "/", state }]}><Message /></MemoryRouter>);
  expect(screen.queryByText('Entrada "Bowl" creada.')).not.toBeInTheDocument();
});

test("an offer receipt belongs only to its entry and an invalid or uncertain result is ignored", () => {
  expect(readSaveReceipt({ saveResult: { ...receipt, entity: "offer", entryId: "other" } }, "offer", "entry-1")).toBeNull();
  expect(readSaveReceipt({ saveResult: { ...receipt, action: "uncertain" } }, "entry")).toBeNull();
  expect(readSaveReceipt({ saveResult: { ...receipt, entity: "offer", entryId: "entry-1" } }, "offer", "entry-1")?.entityId).toBe("entry-1");
});
