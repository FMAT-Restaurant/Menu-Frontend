import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OfferCard } from "./OfferCard";
import { OfferCommercialInfo, type OfferCommercialInfoProps } from "./OfferCommercialInfo";

const props: OfferCommercialInfoProps = {
  presentationTag: "Individual", onPresentationTagChange: jest.fn(), basePrice: "",
  onBasePriceChange: jest.fn(), onStatusChange: jest.fn(), desiredStatus: "INACTIVE",
  hasActiveSlot: false, isEditing: true, existingImage: null, previewUrl: "",
  onSelectImage: jest.fn(), onDropImage: jest.fn(), imageError: "", imageValidating: false,
};

test.each([
  ["145", "MXN\u00a0145.00"],
  ["145.5", "MXN\u00a0145.50"],
  ["123456789.5", "MXN\u00a0123,456,789.50"],
  ["0", "MXN\u00a00.00"],
  ["145.125", "MXN\u00a0145.13"],
])("UX12 card and editor share the money display for %s without changing the input", (raw, formatted) => {
  const { container } = render(<>
    <MemoryRouter><OfferCard offer={{ id: "offer", entryId: "entry", entryName: "Entrada", presentationTag: "Individual",
      basePrice: Number(raw), status: "INACTIVE", image: null, slotCount: 0 }} busy={false} returnTo="/" catalogReturnTo="/"
      onStatusChange={jest.fn()} onDelete={jest.fn()} /></MemoryRouter>
    <OfferCommercialInfo {...props} basePrice={raw} />
  </>);
  expect(container.querySelector(".offer-card__price")?.textContent).toBe(formatted);
  expect(container.querySelector("#offer-price-preview")?.textContent).toBe(formatted);
  const input = screen.getByLabelText("Precio base (MXN)");
  expect(input).toHaveAttribute("step", "any");
  expect((input as HTMLInputElement).value).toBe(raw);
  expect(input).toHaveAccessibleDescription(`${formatted} El precio base pertenece a la oferta y no suma automáticamente precios de componentes.`);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("UX12 empty or invalid editable price never invents a zero display", () => {
  const { container, rerender } = render(<OfferCommercialInfo {...props} />);
  expect(container.querySelector("#offer-price-preview")).toBeNull();
  rerender(<OfferCommercialInfo {...props} basePrice="not-a-number" />);
  expect(container.querySelector("#offer-price-preview")).toBeNull();
});

test("UX12 forwards a fractional price string without presentation rounding", () => {
  const onBasePriceChange = jest.fn();
  render(<OfferCommercialInfo {...props} onBasePriceChange={onBasePriceChange} />);
  fireEvent.change(screen.getByLabelText("Precio base (MXN)"), { target: { value: "145.125" } });
  expect(onBasePriceChange).toHaveBeenCalledWith("145.125");
});
