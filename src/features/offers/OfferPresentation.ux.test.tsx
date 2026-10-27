import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MenuOffer } from "../../application/catalog";
import { OfferCard } from "./OfferCard";

test("offers without a tag retain separate state and omit deletion while active", () => {
  const offer: MenuOffer = { id: "offer-x", entryId: "entry-x", entryName: "Entrada", presentationTag: "", basePrice: 100, status: "ACTIVE", slotCount: 2, image: null };
  const changeStatus = jest.fn();
  const remove = jest.fn();
  const { container } = render(<MemoryRouter><OfferCard offer={offer} busy={false} returnTo="/entries/entry-x/offers?page=2" catalogReturnTo="/?q=Entrada" onStatusChange={changeStatus} onDelete={remove} /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Sin etiqueta de presentación" })).toBeVisible();
  const status = screen.getByRole("button", { name: "Cambiar estado de oferta Sin etiqueta de presentación: Activa" });
  expect(status).toHaveTextContent("Desactivar oferta");
  expect(status).toHaveAttribute("aria-pressed", "true");
  const indicator = screen.getByText("Activa", { selector: ".offer-state" });
  expect(indicator.closest("button")).toBeNull();
  expect(screen.queryByRole("button", { name: "Eliminar oferta Sin etiqueta de presentación" })).not.toBeInTheDocument();
  expect(screen.queryByText(/eliminarla|eliminación/)).not.toBeInTheDocument();
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(status);
  expect(changeStatus).toHaveBeenCalledWith(offer, "INACTIVE");
  const keys = [...container.querySelectorAll("[data-return-key]")].map(element => element.getAttribute("data-return-key"));
  expect(keys).toEqual(["offer:offer-x", "offer:offer-x:edit", "offer:offer-x:status"]);
  expect(new Set(keys).size).toBe(keys.length);
});

test("inactive offers expose deletion with a warning, block it while busy and remove it on activation", () => {
  const offer: MenuOffer = { id: "offer-x", entryId: "entry-x", entryName: "Entrada", presentationTag: "Individual", basePrice: 100, status: "INACTIVE", slotCount: 0, image: null };
  const remove = jest.fn();
  const props = { offer, busy: false, returnTo: "/", catalogReturnTo: "/", onStatusChange: jest.fn(), onDelete: remove };
  const { rerender } = render(<MemoryRouter><OfferCard {...props} /></MemoryRouter>);
  const deletion = screen.getByRole("button", { name: "Eliminar oferta Individual" });
  expect(deletion).toBeEnabled();
  expect(deletion).toHaveAccessibleDescription("La eliminación es definitiva.");
  expect(screen.getByRole("button", { name: /Cambiar estado/ })).toBeDisabled();
  fireEvent.click(deletion);
  expect(remove).toHaveBeenCalledWith(offer);
  rerender(<MemoryRouter><OfferCard {...props} busy /></MemoryRouter>);
  expect(deletion).toBeDisabled();
  fireEvent.click(deletion);
  expect(remove).toHaveBeenCalledTimes(1);
  rerender(<MemoryRouter><OfferCard {...props} offer={{ ...offer, status: "ACTIVE", slotCount: 1 }} /></MemoryRouter>);
  expect(screen.queryByRole("button", { name: "Eliminar oferta Individual" })).not.toBeInTheDocument();
  expect(screen.queryByText("La eliminación es definitiva.")).not.toBeInTheDocument();
});
