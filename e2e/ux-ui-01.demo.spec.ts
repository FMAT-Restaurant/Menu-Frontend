import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

function observeDemo(page: Page) {
  const apiRequests: string[] = [];
  const pageErrors: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  return () => {
    expect(apiRequests, "The demo must not call backend services").toEqual([]);
    expect(pageErrors, "The demo must not raise browser errors").toEqual([]);
  };
}

async function assertSeparatedContent(card: Locator) {
  await expect(card.locator("h2")).toBeVisible();
  await expect(card.locator(".offer-card__entry")).toBeVisible();
  await expect(card.locator(".offer-card__price")).toBeVisible();
  const geometry = await card.evaluate(element => {
    const rect = (target: Element) => {
      const { x, y, width, height, top, right, bottom, left } = target.getBoundingClientRect();
      return { x, y, width, height, top, right, bottom, left };
    };
    const image = element.querySelector(".offer-card__image")!;
    const img = image.querySelector("img");
    return {
      card: rect(element),
      image: rect(image),
      renderedImage: img ? rect(img) : null,
      intrinsicImage: img ? { width: img.naturalWidth, height: img.naturalHeight } : null,
      text: ["h2", ".offer-card__entry", ".offer-card__price"].map(selector => {
        const field = element.querySelector(selector)!;
        return { selector, text: field.textContent, ...rect(field) };
      }),
    };
  });
  for (const text of geometry.text) {
    expect(text.top, `${text.selector} must remain below the reserved image area`).toBeGreaterThanOrEqual(geometry.image.bottom);
    expect(text.left).toBeGreaterThanOrEqual(geometry.card.left);
    expect(text.right).toBeLessThanOrEqual(geometry.card.right);
  }
  if (geometry.renderedImage) {
    expect(geometry.renderedImage.top).toBeGreaterThanOrEqual(geometry.image.top);
    expect(geometry.renderedImage.bottom).toBeLessThanOrEqual(geometry.image.bottom);
    expect(geometry.renderedImage.left).toBeGreaterThanOrEqual(geometry.image.left);
    expect(geometry.renderedImage.right).toBeLessThanOrEqual(geometry.image.right);
  }
  return geometry;
}

async function capture(page: Page, testInfo: TestInfo, geometry: unknown) {
  const geometryPath = testInfo.outputPath("geometry.json");
  await writeFile(geometryPath, JSON.stringify({ viewport: page.viewportSize(), geometry }, null, 2));
  await testInfo.attach("offer-card-geometry", {
    path: geometryPath,
    contentType: "application/json",
  });
  await page.screenshot({ path: testInfo.outputPath("offer-cards.png"), fullPage: true });
}

for (const width of [390, 1440]) {
  test(`U01: Individual and Combo con bebida remain below their image at ${width}px`, async ({ page }, testInfo) => {
    const assertDemo = observeDemo(page);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/entries/demo-entry-burger/offers");
    await expect(page.getByRole("heading", { name: "Individual", exact: true })).toBeVisible();
    const geometry = [];
    for (const name of ["Individual", "Combo con bebida"]) {
      const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
      await expect(card.getByRole("img")).toHaveJSProperty("complete", true);
      geometry.push(await assertSeparatedContent(card));
    }
    await capture(page, testInfo, geometry);
    assertDemo();
  });

  for (const [shape, imageWidth, imageHeight] of [["square", 800, 800], ["portrait", 320, 1600], ["landscape", 1600, 320]] as const) {
    test(`U01: ${shape} upload cannot cover long presentation or price at ${width}px`, async ({ page }, testInfo) => {
      const assertDemo = observeDemo(page);
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto("/entries/demo-entry-burger/offers");
      await page.getByRole("link", { name: "Abrir oferta Individual para editar", exact: true }).click();
      const name = "PresentaciónExtraordinariamenteLargaSinSeparadores para compartir con bebida y acompañamientos";
      await page.getByLabel("Etiqueta de presentación").fill(name);
      await page.getByLabel("Precio base").fill("123456789.5");
      const buffer = Buffer.from(await page.evaluate(({ imageWidth, imageHeight }) => {
        const canvas = document.createElement("canvas");
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#374151";
        context.fillRect(0, 0, imageWidth, imageHeight);
        context.fillStyle = "#C2410C";
        context.fillRect(imageWidth / 4, imageHeight / 4, imageWidth / 2, imageHeight / 2);
        return canvas.toDataURL("image/png").split(",")[1];
      }, { imageWidth, imageHeight }), "base64");
      await page.getByLabel(/Imagen de la oferta/).setInputFiles({ name: `${shape}.png`, mimeType: "image/png", buffer });
      await expect(page.getByText("Validando imagen…", { exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Guardar Oferta", exact: true }).click();
      const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
      await expect(card.getByRole("img")).toHaveJSProperty("naturalWidth", imageWidth);
      const geometry = await assertSeparatedContent(card);
      await expect(card.locator(".offer-card__price")).toContainText("123456789.5");
      await capture(page, testInfo, geometry);
      assertDemo();
    });
  }

  test(`U01: failed image preserves fallback and text separation at ${width}px`, async ({ page }, testInfo) => {
    const assertDemo = observeDemo(page);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/entries/demo-entry-burger/offers");
    const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Individual", exact: true }) });
    await expect(card.getByRole("img")).toBeVisible();
    // Only the resource fails. The real React onError handler and card remain mounted.
    await card.getByRole("img").evaluate(image => { image.setAttribute("src", "data:image/png;base64,invalid"); });
    await expect(card.getByRole("img")).toHaveCount(0);
    await expect(card.getByText("Imagen de la oferta", { exact: true })).toBeVisible();
    await capture(page, testInfo, await assertSeparatedContent(card));
    assertDemo();
  });
}
