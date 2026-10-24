import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

for (const width of [390, 1024]) {
  test(`UX05 category validation and keyboard correction at ${width}px`, async ({ page }, info) => {
    const api: string[] = [];
    const errors: string[] = [];
    page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/categories");
    await page.getByRole("button", { name: "Nueva categoría", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Crear categoría", exact: true });
    const name = dialog.getByRole("textbox", { name: "Nombre", exact: true });
    const description = dialog.getByRole("textbox", { name: "Descripción", exact: true });
    await expect(dialog.getByText("Obligatorio. Hasta 255 caracteres.")).toBeVisible();
    await expect(dialog.getByText("Opcional. Hasta 255 caracteres.")).toBeVisible();
    await description.fill("Descripción que permanece al corregir");
    await name.focus();
    await page.keyboard.press("Enter");
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAttribute("aria-describedby", "category-name-hint category-name-error");
    await expect(dialog.getByText("Indica el nombre de la categoría.", { exact: true })).toBeVisible();
    await expect(name).toBeFocused();
    await expect(description).toHaveValue("Descripción que permanece al corregir");
    await dialog.getByRole("button", { name: "Ir al nombre", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(name).toBeFocused();
    const measurements = await dialog.evaluate(el => {
      const box = (selector: string) => {
        const node = el.querySelector(selector)!;
        const rect = node.getBoundingClientRect();
        const css = getComputedStyle(node);
        return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, radius: css.borderRadius, fontSize: css.fontSize, lineHeight: css.lineHeight };
      };
      return { viewport: innerWidth, dialogWidth: el.getBoundingClientRect().width, dialogRadius: getComputedStyle(el).borderRadius,
        heading: box("h2"), name: box("#category-name"), error: box("#category-name-error"), close: box(".category-form-dialog__close"),
        svgDecorative: el.querySelector(".category-form-dialog__close svg")?.getAttribute("aria-hidden"), modalCount: document.querySelectorAll("dialog[open]:modal").length };
    });
    expect(measurements.name.height).toBe(48);
    expect(measurements.close.width).toBe(48);
    expect(measurements.close.height).toBe(48);
    expect(measurements.name.radius).toBe("8px");
    expect(measurements.dialogRadius).toBe("12px");
    expect(measurements.heading.fontSize).toBe("22px");
    expect(measurements.heading.lineHeight).toBe("30px");
    expect(measurements.error.top).toBeGreaterThanOrEqual(measurements.name.bottom);
    expect(measurements.modalCount).toBe(1);
    expect(measurements.svgDecorative).toBe("true");
    const path = info.outputPath("category-validation.json");
    await writeFile(path, JSON.stringify({ environment: "demo in memory; no physical device or screen reader", measurements }, null, 2));
    await info.attach("category-validation", { path, contentType: "application/json" });
    await page.screenshot({ path: info.outputPath("category-validation.png") });
    await name.fill(`Categoría UX05 ${width}`);
    await expect(name).toHaveAttribute("aria-invalid", "false");
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(description).toBeFocused();
    await dialog.getByRole("button", { name: "Guardar categoría", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { name: `Categoría UX05 ${width}`, exact: true })).toBeVisible();
    expect(api).toEqual([]);
    expect(errors).toEqual([]);
  });
}
