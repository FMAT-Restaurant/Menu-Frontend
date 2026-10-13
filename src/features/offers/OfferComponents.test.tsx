import { render, screen, fireEvent } from "@testing-library/react";
import { OfferCommercialInfo } from "./OfferCommercialInfo";
import { SlotModal } from "./SlotModal";
import { OptionModal, type OptionDraft } from "./OptionModal";

describe("OfferCommercialInfo Component", () => {
  test("handles drag and drop for image upload", () => {
    const handleDropImage = jest.fn();
    const handleSelectImage = jest.fn();
    const handlePresentationTagChange = jest.fn();
    const handleBasePriceChange = jest.fn();
    const handleStatusChange = jest.fn();

    render(
      <OfferCommercialInfo
        presentationTag="Combo"
        onPresentationTagChange={handlePresentationTagChange}
        basePrice="120"
        onBasePriceChange={handleBasePriceChange}
        onStatusChange={handleStatusChange}
        desiredStatus="ACTIVE"
        hasActiveSlot={true}
        isEditing={false}
        existingImage={null}
        previewUrl=""
        onSelectImage={handleSelectImage}
        onDropImage={handleDropImage}
        imageError=""
        imageValidating={false}
      />
    );

    const dropzone = screen.getByRole("button", {
      name: "Seleccionar o arrastrar imagen de la oferta",
    });

    fireEvent.dragOver(dropzone);

    const file = new File(["bytes"], "offer.png", { type: "image/png" });
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(handleDropImage).toHaveBeenCalledWith(file);
  });

  test("renders status controls in editing mode and triggers status change", () => {
    const handleStatusChange = jest.fn();

    const { rerender } = render(
      <OfferCommercialInfo
        presentationTag="Combo"
        onPresentationTagChange={jest.fn()}
        basePrice="150"
        onBasePriceChange={jest.fn()}
        onStatusChange={handleStatusChange}
        desiredStatus="ACTIVE"
        hasActiveSlot={true}
        isEditing={true}
        existingImage={{ id: "img-1", url: "https://example.com/img.png" }}
        previewUrl=""
        onSelectImage={jest.fn()}
        onDropImage={jest.fn()}
        imageError=""
        imageValidating={false}
      />
    );

    expect(
      screen.getByText(
        "La oferta cuenta con grupos activos y cumple las condiciones para permanecer activa."
      )
    ).toBeVisible();

    const inactiveRadio = screen.getByLabelText("Inactiva");
    fireEvent.click(inactiveRadio);
    expect(handleStatusChange).toHaveBeenCalledWith("INACTIVE");

    // Re-render as auto-inactive (desired ACTIVE but hasActiveSlot is false)
    rerender(
      <OfferCommercialInfo
        presentationTag="Combo"
        onPresentationTagChange={jest.fn()}
        basePrice="150"
        onBasePriceChange={jest.fn()}
        onStatusChange={handleStatusChange}
        desiredStatus="ACTIVE"
        hasActiveSlot={false}
        isEditing={true}
        existingImage={{ id: "img-1", url: "https://example.com/img.png" }}
        previewUrl=""
        onSelectImage={jest.fn()}
        onDropImage={jest.fn()}
        imageError=""
        imageValidating={false}
      />
    );

    expect(
      screen.getByText(/La oferta se mantiene inactiva porque no tiene ningún grupo activo/)
    ).toBeVisible();
  });

  test("triggers file input click via keyboard Enter/Space", () => {
    render(
      <OfferCommercialInfo
        presentationTag=""
        onPresentationTagChange={jest.fn()}
        basePrice=""
        onBasePriceChange={jest.fn()}
        onStatusChange={jest.fn()}
        desiredStatus="INACTIVE"
        hasActiveSlot={false}
        isEditing={false}
        existingImage={null}
        previewUrl=""
        onSelectImage={jest.fn()}
        onDropImage={jest.fn()}
        imageError="Error de imagen"
        imageValidating={true}
      />
    );

    expect(screen.getByText("Validando imagen…")).toBeVisible();
    expect(screen.getByText("Error de imagen")).toBeVisible();

    const dropzone = screen.getByRole("button", {
      name: "Seleccionar o arrastrar imagen de la oferta",
    });
    fireEvent.keyDown(dropzone, { key: "Enter" });
    fireEvent.keyDown(dropzone, { key: " " });
  });
});

describe("SlotModal Component", () => {
  test("closes on Escape key and backdrop click", () => {
    const handleClose = jest.fn();
    render(
      <SlotModal isOpen={true} initialData={null} onSave={jest.fn()} onClose={handleClose} />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  test("validates required name and valid quantity", () => {
    const handleSave = jest.fn();
    render(
      <SlotModal isOpen={true} initialData={null} onSave={handleSave} onClose={jest.fn()} />
    );

    const submitBtn = screen.getByRole("button", { name: "Guardar grupo" });

    // Submit empty name
    fireEvent.click(submitBtn);
    expect(screen.getByText("El nombre del grupo es obligatorio.")).toBeVisible();
    expect(handleSave).not.toHaveBeenCalled();

    // Set name but invalid quantity
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), {
      target: { value: "Postre" },
    });
    fireEvent.change(screen.getByLabelText(/Unidades incluidas/), {
      target: { value: "0" },
    });
    fireEvent.click(submitBtn);
    // Note: onChange has Math.max(1), so quantity becomes 1
    expect(handleSave).toHaveBeenCalledWith({
      name: "Postre",
      quantity: 1,
      course: null,
    });
  });

  test("populates initialData for editing", () => {
    const handleSave = jest.fn();
    render(
      <SlotModal
        isOpen={true}
        initialData={{ name: "Entrada fría", quantity: 2, course: "entrada" }}
        onSave={handleSave}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Editar grupo" })).toBeVisible();
    expect(screen.getByDisplayValue("Entrada fría")).toBeVisible();
    expect(screen.getByDisplayValue("2")).toBeVisible();
    expect(screen.getByDisplayValue("Entrada")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));
    expect(handleSave).toHaveBeenCalledWith({
      name: "Entrada fría",
      quantity: 2,
      course: "entrada",
    });
  });
});

describe("OptionModal Component", () => {
  test("closes on Escape key and backdrop click", () => {
    const handleClose = jest.fn();
    render(
      <OptionModal
        isOpen={true}
        slotName="Bebidas"
        initialData={null}
        onSave={jest.fn()}
        onClose={handleClose}
        onOpenRecipePicker={jest.fn()}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  test("disables submit until a source is selected", () => {
    const handleSave = jest.fn();
    render(
      <OptionModal
        isOpen={true}
        slotName="Plato Fuerte"
        initialData={null}
        onSave={handleSave}
        onClose={jest.fn()}
        onOpenRecipePicker={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Nombre mostrado/), {
      target: { value: "Opcion Sin Origen" },
    });

    const submitBtn = screen.getByRole("button", { name: "Guardar opción" });
    expect(submitBtn).toBeDisabled();
  });

  test("renders inventory item source summary and allows editing option status", () => {
    const handleSave = jest.fn();
    const inventoryOption: OptionDraft = {
      optionId: "opt-1",
      displayName: "Refresco",
      status: "ACTIVE",
      sourceType: "INVENTORY_ITEM",
      inventoryItemId: "inv-1",
      inventoryItemName: "Refresco Cola",
      quantity: 1,
      unit: "lata",
    };

    render(
      <OptionModal
        isOpen={true}
        slotName="Bebidas"
        initialData={inventoryOption}
        onSave={handleSave}
        onClose={jest.fn()}
        onOpenRecipePicker={jest.fn()}
      />
    );

    expect(
      screen.getByText("Artículo de inventario: Refresco Cola (1 lata)")
    ).toBeVisible();

    // Toggle status to inactive
    fireEvent.click(screen.getByLabelText("Inactiva"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        ...inventoryOption,
        status: "INACTIVE",
      })
    );
  });
});
