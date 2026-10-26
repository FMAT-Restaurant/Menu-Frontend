import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OfferCard } from "./OfferCard";

test("an offer article accepts programmatic return focus without adding a tab stop", () => {
  render(<MemoryRouter><OfferCard offer={{ id: "offer-1", entryId: "entry-1", entryName: "Bowl", presentationTag: "Individual", basePrice: 145, status: "INACTIVE", slotCount: 0, image: null }} busy={false} returnTo="/entries/entry-1/offers" catalogReturnTo="/" onStatusChange={jest.fn()} onDelete={jest.fn()} /></MemoryRouter>);
  const article = screen.getByRole("article");
  expect(article).toHaveAttribute("data-return-key", "offer:offer-1");
  expect(article).toHaveAttribute("tabindex", "-1");
  article.focus();
  expect(article).toHaveFocus();
  expect(screen.getByRole("link", { name: "Abrir oferta Individual para editar" })).toHaveAttribute("data-return-key", "offer:offer-1:edit");
});
