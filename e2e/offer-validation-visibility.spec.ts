import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 640 }]) {
  test(`issue 80 reveals invalid offer fields after saving from composition at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let writes = 0;
    await page.route("**/api/v1/**", async route => {
      if (route.request().method() !== "GET") writes++;
      await route.fulfill({ json: { data: {
        id: "entry-1", brandName: "Pastel de chocolate", description: "Pastel", status: "ACTIVE", categoryIds: [], categories: [], image: null,
      } } });
    });
    await page.goto("/entries/entry-1/offers/new");
    await page.getByLabel("Etiqueta de presentación").fill("Rebanada");
    const price = page.getByLabel("Precio base (MXN)");
    await price.fill("-12.999");
    const save = page.getByRole("button", { name: "Guardar Oferta" });
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.getByRole("heading", { name: "2. Composición" }).scrollIntoViewIfNeeded();
      await save.click();
      await expect(price).toBeFocused();
      await expect(price).toBeInViewport();
      await expect(price).toHaveAttribute("aria-invalid", "true");
      await expect(price).toHaveAccessibleDescription(/El precio base debe ser un número positivo\./);
    }
    await price.fill("150");
    await save.click();
    const image = page.getByRole("button", { name: "Seleccionar o arrastrar imagen de la oferta" });
    await expect(image).toBeFocused();
    await expect(image).toBeInViewport();
    await expect(image).toHaveAttribute("aria-invalid", "true");
    await expect(image).toHaveAccessibleDescription(/La imagen de la oferta es obligatoria al crear\./);
    await page.screenshot({ path: testInfo.outputPath("missing-image.png") });
    expect(writes).toBe(0);
    expect(errors).toEqual([]);
  });
}
