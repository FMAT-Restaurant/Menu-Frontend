import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MenuOffer } from "../../application/catalog";
import { OfferCard } from "./OfferCard";
import { OfferCommercialInfo } from "./OfferCommercialInfo";
import { SlotModal } from "./SlotModal";
import { OptionModal, type OptionDraft } from "./OptionModal";
import { CompositionEditor } from "./CompositionEditor";
import { SlotCard, type SlotDraft } from "./SlotCard";
import { SlotOptionItem } from "./SlotOptionItem";

describe("OfferCard Component", () => {
  const baseOffer: MenuOffer = {
    id: "offer-1",
    entryId: "entry-1",
    entryName: "Hamburguesa Clásica",
    presentationTag: "Individual",
    basePrice: 150,
    status: "ACTIVE",
    image: {
      id: "img-1",
      url: "https://example.com/broken.jpg",
      thumbnailUrl: "https://example.com/broken-thumb.jpg",
    },
    slotCount: 1,
  };

  test("shows fallback placeholder when existing image URL fails to load and retries when URL changes", () => {
    const { rerender } = render(
      <MemoryRouter>
        <OfferCard
          offer={baseOffer}
          busy={false}
          returnTo="/entries/entry-1/offers"
          catalogReturnTo="/"
          onStatusChange={jest.fn()}
          onDelete={jest.fn()}
        />
      </MemoryRouter>
    );

    const initialImg = screen.getByRole("img", { name: "Imagen de la oferta Individual" });
    expect(initialImg).toHaveAttribute("src", "https://example.com/broken-thumb.jpg");
    expect(screen.queryByText("Imagen de la oferta")).not.toBeInTheDocument();

    // Image load fails -> fallback placeholder is shown
    fireEvent.error(initialImg);
    expect(screen.queryByRole("img", { name: "Imagen de la oferta Individual" })).not.toBeInTheDocument();
    expect(screen.getByText("Imagen de la oferta")).toBeVisible();

    // Re-rendering with the same broken URL keeps the fallback
    rerender(
      <MemoryRouter>
        <OfferCard
          offer={{ ...baseOffer }}
          busy={false}
          returnTo="/entries/entry-1/offers"
          catalogReturnTo="/"
          onStatusChange={jest.fn()}
          onDelete={jest.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.queryByRole("img", { name: "Imagen de la oferta Individual" })).not.toBeInTheDocument();
    expect(screen.getByText("Imagen de la oferta")).toBeVisible();

    // Re-rendering with a new image URL resets fallback and attempts loading the new URL
    rerender(
      <MemoryRouter>
        <OfferCard
          offer={{
            ...baseOffer,
            image: {
              id: "img-2",
              url: "https://example.com/recovered.jpg",
              thumbnailUrl: "https://example.com/recovered-thumb.jpg",
            },
          }}
          busy={false}
          returnTo="/entries/entry-1/offers"
          catalogReturnTo="/"
          onStatusChange={jest.fn()}
          onDelete={jest.fn()}
        />
      </MemoryRouter>
    );

    const recoveredImg = screen.getByRole("img", { name: "Imagen de la oferta Individual" });
    expect(recoveredImg).toHaveAttribute("src", "https://example.com/recovered-thumb.jpg");
    expect(screen.queryByText("Imagen de la oferta")).not.toBeInTheDocument();
  });
});

describe("OfferCommercialInfo Component", () => {
  test("handles drag and drop for image upload and shows creation draft status notice", () => {
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

    expect(
      screen.getByText(
        "Toda oferta se crea con estado inactivo (INACTIVE); la composición del borrador local no garantiza la aceptación del servidor ni activa la oferta automáticamente."
      )
    ).toBeVisible();

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

  test("renders status controls in editing mode and distinguishes draft from server acceptance without promising automatic activation", () => {
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
        "El borrador incluye al menos un grupo con opciones activas para solicitar el estado activo. Toda oferta inicia inactiva (INACTIVE) al crearse y la composición local no garantiza la aceptación del servidor hasta guardar."
      )
    ).toBeVisible();
    expect(
      screen.queryByText(/cumple las condiciones para permanecer activa/i)
    ).not.toBeInTheDocument();

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

    const warningAlert = screen.getByRole("alert");
    expect(warningAlert).toHaveTextContent(
      "La oferta se mantiene inactiva porque no tiene ningún grupo activo en este borrador. Toda oferta nueva inicia inactiva (INACTIVE) y la composición local no activa la oferta automáticamente ni garantiza la aceptación del servidor hasta guardar."
    );
    expect(screen.queryByText(/Se activará automáticamente/i)).not.toBeInTheDocument();
  });

  test("activates file input selector via keyboard Enter and Space when enabled", () => {
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
        imageError=""
        imageValidating={false}
        disabled={false}
      />
    );

    const dropzone = screen.getByRole("button", {
      name: "Seleccionar o arrastrar imagen de la oferta",
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    expect(dropzone).toBeEnabled();
    expect(fileInput).toBeEnabled();

    const clickSpy = jest.spyOn(fileInput, "click");
    try {
      fireEvent.keyDown(dropzone, { key: "Enter" });
      expect(clickSpy).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(dropzone, { key: " " });
      expect(clickSpy).toHaveBeenCalledTimes(2);

      fireEvent.click(dropzone);
      expect(clickSpy).toHaveBeenCalledTimes(3);
    } finally {
      clickSpy.mockRestore();
    }
  });

  test("blocks click, keyboard, file input change, and drag-and-drop during image validation and saving", () => {
    const handleSelectImage = jest.fn();
    const handleDropImage = jest.fn();

    const { rerender } = render(
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
        onSelectImage={handleSelectImage}
        onDropImage={handleDropImage}
        imageError="Error de imagen"
        imageValidating={true}
        disabled={false}
      />
    );

    expect(screen.getByText("Validando imagen…")).toBeVisible();
    expect(screen.getByText("Error de imagen")).toBeVisible();

    const dropzone = screen.getByRole("button", {
      name: "Seleccionar o arrastrar imagen de la oferta",
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["bytes"], "offer.png", { type: "image/png" });

    expect(dropzone).toBeDisabled();
    expect(fileInput).toBeDisabled();

    const clickSpy = jest.spyOn(fileInput, "click");
    try {
      fireEvent.click(dropzone);
      fireEvent.keyDown(dropzone, { key: "Enter" });
      fireEvent.keyDown(dropzone, { key: " " });
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

      expect(clickSpy).not.toHaveBeenCalled();
      expect(handleSelectImage).not.toHaveBeenCalled();
      expect(handleDropImage).not.toHaveBeenCalled();

      // Also verify blocking when saving (disabled = true, imageValidating = false)
      rerender(
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
          onSelectImage={handleSelectImage}
          onDropImage={handleDropImage}
          imageError=""
          imageValidating={false}
          disabled={true}
        />
      );

      expect(dropzone).toBeDisabled();
      expect(fileInput).toBeDisabled();

      fireEvent.click(dropzone);
      fireEvent.keyDown(dropzone, { key: "Enter" });
      fireEvent.keyDown(dropzone, { key: " " });
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

      expect(clickSpy).not.toHaveBeenCalled();
      expect(handleSelectImage).not.toHaveBeenCalled();
      expect(handleDropImage).not.toHaveBeenCalled();
    } finally {
      clickSpy.mockRestore();
    }
  });

  test("handles file input change and renders preview", () => {
    const handleSelectImage = jest.fn();
    const handlePresentationTag = jest.fn();
    const handleBasePrice = jest.fn();

    const { rerender } = render(
      <OfferCommercialInfo
        presentationTag="Combo"
        onPresentationTagChange={handlePresentationTag}
        basePrice="120"
        onBasePriceChange={handleBasePrice}
        onStatusChange={jest.fn()}
        desiredStatus="ACTIVE"
        hasActiveSlot={true}
        isEditing={false}
        existingImage={null}
        previewUrl=""
        onSelectImage={handleSelectImage}
        onDropImage={jest.fn()}
        imageError=""
        imageValidating={false}
      />
    );

    fireEvent.change(screen.getByLabelText(/Etiqueta de presentación/), { target: { value: "Familiar" } });
    expect(handlePresentationTag).toHaveBeenCalledWith("Familiar");

    fireEvent.change(screen.getByLabelText(/Precio base/), { target: { value: "199" } });
    expect(handleBasePrice).toHaveBeenCalledWith("199");

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "burger.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(handleSelectImage).toHaveBeenCalledTimes(1);

    rerender(
      <OfferCommercialInfo
        presentationTag="Combo"
        onPresentationTagChange={handlePresentationTag}
        basePrice="120"
        onBasePriceChange={handleBasePrice}
        onStatusChange={jest.fn()}
        desiredStatus="ACTIVE"
        hasActiveSlot={true}
        isEditing={false}
        existingImage={null}
        previewUrl="blob:http://localhost/dummy-url"
        onSelectImage={handleSelectImage}
        onDropImage={jest.fn()}
        imageError=""
        imageValidating={false}
      />
    );
    expect(screen.getByAltText("Vista previa de la oferta")).toBeVisible();
    expect(screen.getByText("Cambiar imagen")).toBeVisible();
  });

  test("handles drop event with no files gracefully", () => {
    const handleDropImage = jest.fn();
    render(
      <OfferCommercialInfo
        presentationTag=""
        onPresentationTagChange={jest.fn()}
        basePrice=""
        onBasePriceChange={jest.fn()}
        onStatusChange={jest.fn()}
        desiredStatus="INACTIVE"
        hasActiveSlot={false}
        isEditing={true}
        existingImage={null}
        previewUrl=""
        onSelectImage={jest.fn()}
        onDropImage={handleDropImage}
        imageError=""
        imageValidating={false}
      />
    );

    const dropzone = screen.getByRole("button", {
      name: "Seleccionar o arrastrar imagen de la oferta",
    });
    fireEvent.drop(dropzone, { dataTransfer: { files: [] } });
    expect(handleDropImage).not.toHaveBeenCalled();

    expect(screen.getByLabelText("Inactiva")).toBeChecked();
  });
});

describe("SlotModal Component", () => {
  test("closes on Escape key and close button click", () => {
    const handleClose = jest.fn();
    render(
      <SlotModal isOpen={true} initialData={null} onSave={jest.fn()} onClose={handleClose} />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole("button", { name: "Cerrar modal de grupo" });
    fireEvent.click(closeBtn);
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
    expect(screen.getByText("La cantidad de rondas debe ser al menos 1.")).toBeVisible();

    // Now set valid quantity
    fireEvent.change(screen.getByLabelText(/Unidades incluidas/), {
      target: { value: "1" },
    });
    fireEvent.click(submitBtn);
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

  test("returns null when isOpen is false", () => {
    const { container } = render(
      <SlotModal isOpen={false} initialData={null} onSave={jest.fn()} onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("closes when Cancel button is clicked", () => {
    const handleClose = jest.fn();
    render(
      <SlotModal isOpen={true} initialData={null} onSave={jest.fn()} onClose={handleClose} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(handleClose).toHaveBeenCalled();
  });

  test("allows selecting course and validating positive quantity", () => {
    const handleSave = jest.fn();
    render(
      <SlotModal isOpen={true} initialData={null} onSave={handleSave} onClose={jest.fn()} />
    );

    fireEvent.change(screen.getByLabelText("Nombre del grupo"), { target: { value: "Bebidas" } });
    fireEvent.change(screen.getByLabelText(/Curso/), { target: { value: "bebida" } });
    fireEvent.change(screen.getByLabelText(/Unidades incluidas/), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));

    expect(handleSave).toHaveBeenCalledWith({
      name: "Bebidas",
      quantity: 3,
      course: "bebida",
    });
  });

  test("validates full conversion of rounds quantity without truncation: rejects 1.5, 0, negatives, and non-numeric; accepts 1e2 as 100 (O07, O38)", () => {
    const handleSave = jest.fn();
    render(
      <SlotModal isOpen={true} initialData={null} onSave={handleSave} onClose={jest.fn()} />
    );

    const submitBtn = screen.getByRole("button", { name: "Guardar grupo" });
    const nameInput = screen.getByLabelText("Nombre del grupo");
    const qtyInput = screen.getByLabelText(/Unidades incluidas/);

    fireEvent.change(nameInput, { target: { value: "Acompañamiento" } });

    // Try float 1.5 -> rejected without truncation
    fireEvent.change(qtyInput, { target: { value: "1.5" } });
    fireEvent.click(submitBtn);
    expect(screen.getByText("La cantidad de rondas debe ser al menos 1.")).toBeVisible();
    expect(handleSave).not.toHaveBeenCalled();

    // Try negative -> rejected
    fireEvent.change(qtyInput, { target: { value: "-1" } });
    fireEvent.click(submitBtn);
    expect(screen.getByText("La cantidad de rondas debe ser al menos 1.")).toBeVisible();
    expect(handleSave).not.toHaveBeenCalled();

    // Try non-numeric -> rejected
    fireEvent.change(qtyInput, { target: { value: "abc" } });
    fireEvent.click(submitBtn);
    expect(screen.getByText("La cantidad de rondas debe ser al menos 1.")).toBeVisible();
    expect(handleSave).not.toHaveBeenCalled();

    // Try 1e2 -> accepted as 100 without truncation
    fireEvent.change(qtyInput, { target: { value: "1e2" } });
    fireEvent.click(submitBtn);
    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith({
      name: "Acompañamiento",
      quantity: 100,
      course: null,
    });
  });
});

describe("OptionModal Component", () => {
  test("closes on Escape key and close button click", () => {
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

    const closeBtn = screen.getByRole("button", { name: "Cerrar modal de opción" });
    fireEvent.click(closeBtn);
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

  test("returns null when isOpen is false", () => {
    const { container } = render(
      <OptionModal
        isOpen={false}
        slotName="Bebidas"
        initialData={null}
        onSave={jest.fn()}
        onClose={jest.fn()}
        onOpenRecipePicker={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test("omits unavailable inventory selection without operations while recipe picker remains functional", () => {
    const handleOpenRecipePicker = jest.fn();
    const handleSave = jest.fn();
    const handleClose = jest.fn();
    render(
      <OptionModal
        isOpen={true}
        slotName="Bebidas"
        initialData={null}
        onSave={handleSave}
        onClose={handleClose}
        onOpenRecipePicker={handleOpenRecipePicker}
      />
    );

    expect(screen.queryByRole("button", { name: /Elegir artículo de inventario/ })).not.toBeInTheDocument();
    expect(document.getElementById("inventory-source-pending-hint")).not.toBeInTheDocument();
    expect(handleOpenRecipePicker).not.toHaveBeenCalled();
    expect(handleSave).not.toHaveBeenCalled();
    expect(handleClose).not.toHaveBeenCalled();
    expect(
      screen.getByText("Elige una receta de la biblioteca para esta opción.")
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar opción" })).toBeDisabled();

    const recipeBtn = screen.getByRole("button", { name: /Elegir receta/ });
    expect(recipeBtn).toBeEnabled();
    fireEvent.click(recipeBtn);
    expect(handleOpenRecipePicker).toHaveBeenCalledTimes(1);
  });

  test("renders source summary with IDs when names are absent", () => {
    const recipeWithoutName: OptionDraft = {
      optionId: "opt-1",
      displayName: "",
      status: "ACTIVE",
      sourceType: "RECIPE",
      recipeId: "rec-999",
    };

    const { rerender } = render(
      <OptionModal
        isOpen={true}
        slotName="Plato"
        initialData={recipeWithoutName}
        onSave={jest.fn()}
        onClose={jest.fn()}
        onOpenRecipePicker={jest.fn()}
      />
    );
    expect(screen.getByText("Receta asignada (ID: rec-999)")).toBeVisible();

    const invWithoutName: OptionDraft = {
      optionId: "opt-2",
      displayName: "",
      status: "ACTIVE",
      sourceType: "INVENTORY_ITEM",
      inventoryItemId: "inv-999",
    };
    rerender(
      <OptionModal
        isOpen={true}
        slotName="Plato"
        initialData={invWithoutName}
        onSave={jest.fn()}
        onClose={jest.fn()}
        onOpenRecipePicker={jest.fn()}
      />
    );
    expect(screen.getByText("Artículo de inventario (ID: inv-999)")).toBeVisible();
  });

  test("validates recipe without recipeId and inventory item with non-positive quantity", () => {
    const handleSave = jest.fn();
    const recipeWithoutId: OptionDraft = {
      displayName: "Receta incompleta",
      status: "ACTIVE",
      sourceType: "RECIPE",
    };

    const { rerender } = render(
      <OptionModal
        isOpen={true}
        slotName="Plato"
        initialData={recipeWithoutId}
        onSave={handleSave}
        onClose={jest.fn()}
        onOpenRecipePicker={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));
    expect(screen.getByText("Debes elegir una receta de la biblioteca.")).toBeVisible();

    const invInvalid: OptionDraft = {
      displayName: "Item inválido",
      status: "ACTIVE",
      sourceType: "INVENTORY_ITEM",
      inventoryItemId: "inv-1",
      quantity: 0,
    };
    rerender(
      <OptionModal
        isOpen={true}
        slotName="Plato"
        initialData={invInvalid}
        onSave={handleSave}
        onClose={jest.fn()}
        onOpenRecipePicker={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));
    expect(screen.getByText("El artículo de inventario requiere una cantidad positiva.")).toBeVisible();
  });

  test("closes on Cancel button click", () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(handleClose).toHaveBeenCalled();
  });

  test("validates inventory item requiring positive quantity and authoritative non-empty unit (O09, O10, O38)", () => {
    const handleSave = jest.fn();
    const invWithoutUnit: OptionDraft = {
      displayName: "Refresco",
      status: "ACTIVE",
      sourceType: "INVENTORY_ITEM",
      inventoryItemId: "inv-soda",
      quantity: 1,
      unit: "   ",
    };

    const { rerender } = render(
      <OptionModal
        isOpen={true}
        slotName="Bebidas"
        initialData={invWithoutUnit}
        onSave={handleSave}
        onClose={jest.fn()}
        onOpenRecipePicker={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));
    expect(screen.getByText("El artículo de inventario requiere una unidad autoritativa.")).toBeVisible();
    expect(handleSave).not.toHaveBeenCalled();

    // Now provide valid unit and quantity
    const invValid: OptionDraft = {
      displayName: "Refresco",
      status: "ACTIVE",
      sourceType: "INVENTORY_ITEM",
      inventoryItemId: "inv-soda",
      inventoryItemName: "Refresco de Cola",
      quantity: 2,
      unit: "lata",
    };

    rerender(
      <OptionModal
        isOpen={true}
        slotName="Bebidas"
        initialData={invValid}
        onSave={handleSave}
        onClose={jest.fn()}
        onOpenRecipePicker={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));
    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith({
      displayName: "Refresco",
      status: "ACTIVE",
      sourceType: "INVENTORY_ITEM",
      inventoryItemId: "inv-soda",
      inventoryItemName: "Refresco de Cola",
      quantity: 2,
      unit: "lata",
    });
  });

  test("in creation mode does not offer INACTIVE status and locks to ACTIVE (O15)", () => {
    const handleSave = jest.fn();
    const recipeOpt: OptionDraft = {
      displayName: "Taco de pastor",
      status: "ACTIVE",
      sourceType: "RECIPE",
      recipeId: "rec-1",
      recipeName: "Tacos",
    };

    const { rerender } = render(
      <OptionModal
        isOpen={true}
        slotName="Tacos"
        initialData={recipeOpt}
        isCreateMode={true}
        onSave={handleSave}
        onClose={jest.fn()}
        onOpenRecipePicker={jest.fn()}
      />
    );

    expect(screen.queryByRole("radio", { name: /Inactiva/ })).not.toBeInTheDocument();
    expect(screen.getByText("Las opciones se crean activas por defecto.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));
    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ACTIVE",
      })
    );

    // In edit mode (isCreateMode=false), status choices are offered
    rerender(
      <OptionModal
        isOpen={true}
        slotName="Tacos"
        initialData={recipeOpt}
        isCreateMode={false}
        onSave={handleSave}
        onClose={jest.fn()}
        onOpenRecipePicker={jest.fn()}
      />
    );
    expect(screen.getByRole("radio", { name: /Inactiva/ })).toBeInTheDocument();
  });

  test("respects modal hierarchy for Escape and restores focus to recipe picker button when nested picker closes (O19, O34)", () => {
    const handleClose = jest.fn();
    const { rerender } = render(
      <OptionModal
        isOpen={true}
        slotName="Bebidas"
        initialData={null}
        isNestedPickerOpen={true}
        onSave={jest.fn()}
        onClose={handleClose}
        onOpenRecipePicker={jest.fn()}
      />
    );

    // Escape while nested picker is open does NOT close OptionModal
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).not.toHaveBeenCalled();

    // Nested picker closes -> focus restores to "Elegir receta" button
    rerender(
      <OptionModal
        isOpen={true}
        slotName="Bebidas"
        initialData={null}
        isNestedPickerOpen={false}
        onSave={jest.fn()}
        onClose={handleClose}
        onOpenRecipePicker={jest.fn()}
      />
    );
    const pickerBtn = screen.getByRole("button", { name: /Elegir receta/ });
    expect(document.activeElement).toBe(pickerBtn);

    // Now Escape closes OptionModal
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe("SlotOptionItem Component", () => {
  test("renders recipe option with default label, coherent accessible status, and updates state on toggle", () => {
    const handleEdit = jest.fn();
    const handleDelete = jest.fn();
    const handleToggle = jest.fn();

    const option: OptionDraft = {
      displayName: "",
      status: "ACTIVE",
      sourceType: "RECIPE",
      recipeId: "rec-1",
      recipeName: "Papas Fritas",
    };

    const { rerender } = render(
      <SlotOptionItem
        option={option}
        optionIndex={0}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggle}
      />
    );

    expect(screen.getByText("Papas Fritas")).toBeVisible();
    expect(screen.getByText("Receta")).toBeVisible();

    const statusButton = screen.getByRole("button", {
      name: "Cambiar estado de Papas Fritas",
      pressed: true,
    });
    expect(statusButton).toHaveAttribute("aria-pressed", "true");
    expect(statusButton).toHaveTextContent("Desactivar");

    fireEvent.click(statusButton);
    expect(handleToggle).toHaveBeenCalledTimes(1);

    rerender(
      <SlotOptionItem
        option={{ ...option, status: "INACTIVE" }}
        optionIndex={0}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggle}
      />
    );

    const updatedStatusButton = screen.getByRole("button", {
      name: "Cambiar estado de Papas Fritas",
      pressed: false,
    });
    expect(updatedStatusButton).toHaveAttribute("aria-pressed", "false");
    expect(updatedStatusButton).toHaveTextContent("Activar");

    fireEvent.click(screen.getByRole("button", { name: "Editar opción Papas Fritas" }));
    expect(handleEdit).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar opción Papas Fritas" }));
    expect(handleDelete).toHaveBeenCalled();
  });

  test("renders inventory item without name and shows custom label, source reference, and inactive accessible state", () => {
    const option: OptionDraft = {
      displayName: "Refresco Mediano",
      status: "INACTIVE",
      sourceType: "INVENTORY_ITEM",
      inventoryItemId: "inv-1",
      quantity: 2,
    };

    render(
      <SlotOptionItem
        option={option}
        optionIndex={1}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onToggleStatus={jest.fn()}
        disabled={true}
      />
    );

    expect(screen.getByText("Refresco Mediano")).toBeVisible();
    expect(screen.getByText("Origen: Artículo de inventario")).toBeVisible();
    expect(screen.getByText("2 u")).toBeVisible();

    const statusButton = screen.getByRole("button", {
      name: "Cambiar estado de Refresco Mediano",
      pressed: false,
    });
    expect(statusButton).toHaveAttribute("aria-pressed", "false");
    expect(statusButton).toHaveTextContent("Activar");
    expect(statusButton).toBeDisabled();
  });
});

describe("SlotCard Component", () => {
  test("renders empty slot card with inactive badge and triggers actions", () => {
    const handleEdit = jest.fn();
    const handleDelete = jest.fn();
    const handleAddOption = jest.fn();

    const slot: SlotDraft = {
      name: "Bebidas",
      quantity: 2,
      course: "bebida",
      options: [],
    };

    render(
      <SlotCard
        slot={slot}
        slotIndex={0}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddOption={handleAddOption}
        onEditOption={jest.fn()}
        onDeleteOption={jest.fn()}
        onToggleOptionStatus={jest.fn()}
      />
    );

    expect(screen.getByText("Bebidas")).toBeVisible();
    expect(screen.getByText("2 rondas")).toBeVisible();
    expect(screen.getByText("Bebida")).toBeVisible();
    expect(screen.getByText("Inactivo")).toBeVisible();
    expect(screen.getByText(/Este grupo aún no tiene opciones/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Editar grupo Bebidas" }));
    expect(handleEdit).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar grupo Bebidas" }));
    expect(handleDelete).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Bebidas" }));
    expect(handleAddOption).toHaveBeenCalled();
  });

  test("renders active slot card with options and forwards option actions", () => {
    const handleEditOption = jest.fn();
    const handleDeleteOption = jest.fn();
    const handleToggleOptionStatus = jest.fn();

    const slot: SlotDraft = {
      name: "Plato Fuerte",
      quantity: 1,
      course: "plato fuerte",
      options: [
        {
          displayName: "Tacos",
          status: "ACTIVE",
          sourceType: "RECIPE",
          recipeName: "Tacos al Pastor",
        },
      ],
    };

    render(
      <SlotCard
        slot={slot}
        slotIndex={0}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onAddOption={jest.fn()}
        onEditOption={handleEditOption}
        onDeleteOption={handleDeleteOption}
        onToggleOptionStatus={handleToggleOptionStatus}
      />
    );

    expect(screen.getByText("1 ronda")).toBeVisible();
    expect(screen.getByText("Activo")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Editar opción Tacos" }));
    expect(handleEditOption).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar opción Tacos" }));
    expect(handleDeleteOption).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole("button", { name: "Cambiar estado de Tacos" }));
    expect(handleToggleOptionStatus).toHaveBeenCalledWith(0);
  });
});

describe("CompositionEditor Component", () => {
  test("omits unavailable composition copy without operations while slot actions remain functional", () => {
    const handleAddSlot = jest.fn();
    const handleEditSlot = jest.fn();
    const handleDeleteSlot = jest.fn();
    const handleAddOption = jest.fn();
    const handleEditOption = jest.fn();
    const handleDeleteOption = jest.fn();
    const handleToggleOptionStatus = jest.fn();

    render(
      <CompositionEditor
        slots={[]}
        onAddSlot={handleAddSlot}
        onEditSlot={handleEditSlot}
        onDeleteSlot={handleDeleteSlot}
        onAddOption={handleAddOption}
        onEditOption={handleEditOption}
        onDeleteOption={handleDeleteOption}
        onToggleOptionStatus={handleToggleOptionStatus}
        disabled={false}
      />
    );

    expect(screen.queryByRole("button", { name: "Copiar composición desde otra oferta" })).not.toBeInTheDocument();
    expect(document.getElementById("copy-composition-pending-hint")).not.toBeInTheDocument();
    expect(handleAddSlot).not.toHaveBeenCalled();
    expect(handleEditSlot).not.toHaveBeenCalled();
    expect(handleDeleteSlot).not.toHaveBeenCalled();
    expect(handleAddOption).not.toHaveBeenCalled();
    expect(handleEditOption).not.toHaveBeenCalled();
    expect(handleDeleteOption).not.toHaveBeenCalled();
    expect(handleToggleOptionStatus).not.toHaveBeenCalled();

    const addGroupBtn = screen.getByRole("button", { name: "Agregar grupo" });
    expect(addGroupBtn).toBeEnabled();
    fireEvent.click(addGroupBtn);
    expect(handleAddSlot).toHaveBeenCalledTimes(1);
  });

  test("renders warning when no slots are present and triggers onAddSlot", () => {
    const handleAddSlot = jest.fn();

    render(
      <CompositionEditor
        slots={[]}
        onAddSlot={handleAddSlot}
        onEditSlot={jest.fn()}
        onDeleteSlot={jest.fn()}
        onAddOption={jest.fn()}
        onEditOption={jest.fn()}
        onDeleteOption={jest.fn()}
        onToggleOptionStatus={jest.fn()}
      />
    );

    expect(
      screen.getByText("La composición debe contener al menos un grupo (slot) con opciones válidas.")
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Agregar grupo" }));
    expect(handleAddSlot).toHaveBeenCalled();
  });

  test("renders list of slots and forwards edit and delete slot events", () => {
    const handleEditSlot = jest.fn();
    const handleDeleteSlot = jest.fn();

    const slots: SlotDraft[] = [
      {
        name: "Entrada",
        quantity: 1,
        course: "entrada",
        options: [],
      },
    ];

    render(
      <CompositionEditor
        slots={slots}
        onAddSlot={jest.fn()}
        onEditSlot={handleEditSlot}
        onDeleteSlot={handleDeleteSlot}
        onAddOption={jest.fn()}
        onEditOption={jest.fn()}
        onDeleteOption={jest.fn()}
        onToggleOptionStatus={jest.fn()}
        disabled={false}
      />
    );

    expect(screen.getByRole("heading", { name: "Entrada" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Editar grupo Entrada" }));
    expect(handleEditSlot).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar grupo Entrada" }));
    expect(handleDeleteSlot).toHaveBeenCalledWith(0);
  });
});
