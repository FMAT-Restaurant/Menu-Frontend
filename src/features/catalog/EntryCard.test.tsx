import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { MenuEntry } from "../../application/catalog";
import { EntryCard } from "./EntryCard";

const entry: MenuEntry = {
  id: "entry-identity", brandName: "Entrada de prueba", description: "Identidad administrativa",
  status: "ACTIVE", image: null, categories: [], offerCount: 2,
};

function Destination() {
  const location = useLocation();
  return <output>{location.pathname} {location.state.returnTo}</output>;
}

test.each(["offers", "edit"] as const)("the visible %s action keeps its own destination and catalog context", action => {
  const returnTo = "/?q=prueba&status=ACTIVE&page=3&pageSize=6";
  render(<MemoryRouter initialEntries={[returnTo]}><Routes>
    <Route path="/" element={<EntryCard entry={entry} busy={false} returnTo={returnTo} onDelete={jest.fn()} />} />
    <Route path="/entries/:entryId/:action" element={<Destination />} />
  </Routes></MemoryRouter>);
  const card = screen.getByRole("article");
  expect(within(card).getByText("Ver ofertas", { exact: true })).toBeVisible();
  expect(within(card).getByText("Editar", { exact: true })).toBeVisible();
  expect(card.querySelector("a a, a button, button a")).toBeNull();
  const keys = [card, ...card.querySelectorAll("[data-return-key]")].map(element => element.getAttribute("data-return-key"));
  expect(new Set(keys).size).toBe(keys.length);
  expect(card).toHaveAttribute("data-return-key", "entry:entry-identity");
  expect(card).toHaveAttribute("tabindex", "-1");
  const link = within(card).getByRole("link", { name: action === "offers" ? "Ver ofertas de Entrada de prueba" : "Editar Entrada de prueba" });
  expect(link).toHaveAttribute("data-return-key", `entry:entry-identity:${action}`);
  fireEvent.click(link);
  expect(screen.getByRole("status")).toHaveTextContent(`/entries/entry-identity/${action} ${returnTo}`);
});

test("restricted deletion has visible associated guidance and archived deletion keeps its callback", () => {
  const onDelete = jest.fn();
  const { rerender } = render(<MemoryRouter><EntryCard entry={entry} busy={false} returnTo="/" onDelete={onDelete} /></MemoryRouter>);
  const remove = screen.getByRole("button", { name: "Eliminar definitivamente Entrada de prueba" });
  expect(remove).toBeDisabled();
  expect(remove).toHaveAccessibleDescription("Solo se pueden eliminar entradas archivadas.");
  expect(screen.getByText("Solo se pueden eliminar entradas archivadas.")).toBeVisible();
  fireEvent.click(remove);
  expect(onDelete).not.toHaveBeenCalled();
  const archived = { ...entry, status: "ARCHIVED" as const };
  rerender(<MemoryRouter><EntryCard entry={archived} busy={false} returnTo="/" onDelete={onDelete} /></MemoryRouter>);
  expect(remove).toBeEnabled();
  expect(remove).toHaveAccessibleDescription("La eliminación es definitiva.");
  fireEvent.click(remove);
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onDelete).toHaveBeenCalledWith(archived);
});
