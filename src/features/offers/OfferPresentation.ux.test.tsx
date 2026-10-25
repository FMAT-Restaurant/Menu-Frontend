import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MenuOffer } from "../../application/catalog";
import { OfferCard } from "./OfferCard";

test("offers without a tag retain separate state, restricted delete guidance and unique return actions", () => {
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
  const deletion = screen.getByRole("button", { name: "Eliminar oferta Sin etiqueta de presentación" });
  expect(deletion).toBeDisabled();
  expect(deletion).toHaveAccessibleDescription("Desactiva la oferta antes de eliminarla.");
  fireEvent.click(deletion);
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(status);
  expect(changeStatus).toHaveBeenCalledWith(offer, "INACTIVE");
  const keys = [...container.querySelectorAll("[data-return-key]")].map(element => element.getAttribute("data-return-key"));
  expect(keys).toEqual(["offer:offer-x", "offer:offer-x:edit", "offer:offer-x:status", "offer:offer-x:delete"]);
  expect(new Set(keys).size).toBe(keys.length);
});
