import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { OfferCommercialInfo } from "./OfferCommercialInfo";

function CommercialInfo() {
  const [price, setPrice] = useState("125");
  return <OfferCommercialInfo presentationTag="Individual" onPresentationTagChange={() => {}}
    basePrice={price} onBasePriceChange={setPrice} desiredStatus="INACTIVE" onStatusChange={() => {}}
    hasActiveSlot={false} isEditing={false} existingImage={null} previewUrl=""
    onSelectImage={() => {}} onDropImage={() => {}} imageError="" imageValidating={false} />;
}

test.each(["-12.999", "0", ""])("issue 84 identifies an invalid price %s during editing without a rounded preview", value => {
  const { container } = render(<CommercialInfo />);
  const price = screen.getByLabelText("Precio base (MXN)") as HTMLInputElement;
  fireEvent.change(price, { target: { value } });
  expect(price).toHaveAttribute("aria-invalid", "true");
  expect(price.checkValidity()).toBe(false);
  expect(price).toHaveAccessibleDescription(/Escribe un precio base mayor que 0\./);
  expect(container.querySelector(".offer-money-preview")).not.toBeInTheDocument();
});

test("issue 84 clears native and visible price errors when the value is corrected", () => {
  render(<CommercialInfo />);
  const price = screen.getByLabelText("Precio base (MXN)") as HTMLInputElement;
  fireEvent.change(price, { target: { value: "0" } });
  expect(price).toHaveAttribute("aria-invalid", "true");
  fireEvent.change(price, { target: { value: "12.50" } });
  expect(price).toHaveAttribute("aria-invalid", "false");
  expect(price.checkValidity()).toBe(true);
  expect(screen.queryByText("Escribe un precio base mayor que 0.")).not.toBeInTheDocument();
  expect(price).toHaveAccessibleDescription(/MXN.*12\.50/);
});

test("issue 84 explains the captured precision alongside the rounded preview", () => {
  render(<CommercialInfo />);
  const price = screen.getByLabelText("Precio base (MXN)") as HTMLInputElement;
  fireEvent.change(price, { target: { value: "12.999" } });
  expect(price).toHaveValue(12.999);
  expect(price.checkValidity()).toBe(true);
  expect(price).toHaveAttribute("aria-details", "offer-price-exact");
  expect(screen.getByText(/Precio que se guardará: MXN 12\.999/)).toBeVisible();
});
