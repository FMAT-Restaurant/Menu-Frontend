import { render, screen, fireEvent } from "@testing-library/react";
import { OfferCommercialInfo } from "./OfferCommercialInfo";
import { SlotModal } from "./SlotModal";
import { OptionModal, type OptionDraft } from "./OptionModal";
import { CompositionEditor } from "./CompositionEditor";
import { SlotCard, type SlotDraft } from "./SlotCard";
import { SlotOptionItem } from "./SlotOptionItem";

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

  test("triggers onOpenRecipePicker and displays feature notice for inventory", () => {
    const handleOpenRecipePicker = jest.fn();
    render(
      <OptionModal
        isOpen={true}
        slotName="Bebidas"
        initialData={null}
        onSave={jest.fn()}
        onClose={jest.fn()}
        onOpenRecipePicker={handleOpenRecipePicker}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    expect(handleOpenRecipePicker).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Elegir artículo de inventario/ }));
    expect(
      screen.getByText("La selección interactiva de artículos de inventario se implementará en V7.")
    ).toBeVisible();
  });

  test("renders source summary with IDs when names are absent", () => {
    const recipeWithoutName: OptionDraft = {
      optionId: "opt-1",
      displayName: "",
      status: "ACTIVE",
      sourceType: "RECIPE",
      recipeId: "rec-999",
      recipeRevision: 2,
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
});

describe("SlotOptionItem Component", () => {
  test("renders recipe option with default label and handles actions", () => {
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

    render(
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

    fireEvent.click(screen.getByRole("button", { name: "Cambiar estado de Papas Fritas" }));
    expect(handleToggle).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Editar opción Papas Fritas" }));
    expect(handleEdit).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar opción Papas Fritas" }));
    expect(handleDelete).toHaveBeenCalled();
  });

  test("renders inventory item without name and shows custom label and source reference", () => {
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
    expect(screen.getByRole("button", { name: "Cambiar estado de Refresco Mediano" })).toBeDisabled();
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
