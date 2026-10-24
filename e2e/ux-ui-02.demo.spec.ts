import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  const api: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url());
  });
  test.info().annotations.push({ type: "scope", description: "Demo in memory; browser emulation does not prove physical touch or screen reader behavior." });
  await page.exposeFunction("assertUx02Demo", () => {
    expect(errors, "Demo JavaScript errors").toEqual([]);
    expect(api, "Demo backend calls").toEqual([]);
  });
});

test.afterEach(async ({ page }) => {
  await page.evaluate(async () => {
    await (window as unknown as { assertUx02Demo(): Promise<void> }).assertUx02Demo();
  });
});

test("shared search controls follow module width, preserve keyboard focus and leave external controls alone", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const module = page.locator("[data-menu-module]");
  const input = page.getByRole("searchbox", { name: "Buscar entradas", exact: true });
  const submit = page.getByRole("button", { name: "Buscar ahora", exact: true });
  await expect(input).toBeVisible();
  await expect(submit).toBeVisible();
  await expect(input).toHaveCSS("min-height", "40px");
  await expect(submit).toHaveCSS("min-height", "40px");
  await expect(input.locator("..").locator("svg")).toHaveAttribute("aria-hidden", "true");
  await input.focus();
  await expect(input).toBeFocused();
  await expect(input).toHaveCSS("outline-style", "solid");
  await expect(input).toHaveCSS("outline-color", "rgb(194, 65, 12)");

  await page.evaluate(() => {
    const host = document.createElement("aside");
    host.id = "ux02-external-control";
    host.innerHTML = '<button class="button button--primary">Host action</button><label class="form-field">Host field<input type="text"></label>';
    document.body.append(host);
  });
  const external = page.locator("#ux02-external-control button");
  await expect(external).toHaveCSS("min-height", "0px");
  await expect(external).not.toHaveCSS("background-color", "rgb(194, 65, 12)");
  expect(await external.evaluate(el => getComputedStyle(el).getPropertyValue("--brand"))).toBe("");

  const measured = [];
  for (const width of [320, 390, 600, 740, 767, 768, 1024, 1199, 1200, 1440]) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await module.evaluate((el, width) => { (el as HTMLElement).style.width = `${width}px`; }, width);
    await expect(input).toHaveCSS("min-height", width < 1200 ? "48px" : "40px");
    await expect(submit).toHaveCSS("min-height", width < 1200 ? "48px" : "40px");
    const measure = await input.evaluate(el => {
      const input = el.getBoundingClientRect();
      const module = el.closest("[data-menu-module]")!.getBoundingClientRect();
      const submit = el.closest("form")!.querySelector("button")!.getBoundingClientRect();
      return { viewport: innerWidth, moduleWidth: module.width, inputHeight: input.height, submitHeight: submit.height, inputRadius: getComputedStyle(el).borderRadius };
    });
    expect(measure.inputHeight).toBe(width < 1200 ? 48 : 40);
    expect(measure.submitHeight).toBe(width < 1200 ? 48 : 40);
    measured.push(measure);
  }
  await module.evaluate(el => {
    (el as HTMLElement).style.removeProperty("width");
    el.setAttribute("data-input-mode", "touch");
  });
  await expect(submit).toHaveCSS("min-height", "48px");
  const touchRect = await submit.boundingBox();
  expect(touchRect?.height).toBe(48);
  const measurementsPath = testInfo.outputPath("shared-control-measurements.json");
  await writeFile(measurementsPath, JSON.stringify(measured, null, 2));
  await testInfo.attach("shared-control-measurements.json", { path: measurementsPath, contentType: "application/json" });
  await page.screenshot({ path: testInfo.outputPath("shared-controls-wide-host.png"), fullPage: true });
});

test("all task routes retain their real content within the shared module at desktop and mobile widths", async ({ page }, testInfo) => {
  const paths = ["/", "/categories", "/recipes", "/entries/new", "/entries/demo-entry-burger/edit", "/entries/demo-entry-burger/offers", "/entries/demo-entry-burger/offers/new", "/entries/demo-entry-burger/offers/demo-offer-burger/edit", "/ux02-missing-route"];
  const measures = [];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [index, path] of paths.entries()) {
      await page.goto(path);
      const title = page.getByRole("heading", { level: 1 });
      await expect(title).toBeVisible();
      await expect(page.locator("[data-menu-module]")).toHaveCount(1);
      if (path.includes("/offers/") && path !== "/entries/demo-entry-burger/offers") {
        const fields = page.locator('.form-field input[type="text"], .form-field input[type="number"]');
        await expect(fields.first()).toBeVisible();
        for (const field of await fields.all()) {
          expect((await field.boundingBox())?.height, `${path} field height at ${width}px`).toBe(width < 1200 ? 48 : 40);
        }
      }
      measures.push(await title.evaluate(el => {
        const module = el.closest("[data-menu-module]")!;
        const style = getComputedStyle(el);
        const controls = [...module.querySelectorAll("button,input,select,textarea")].map(control => {
          const rect = control.getBoundingClientRect();
          return { name: control.getAttribute("aria-label") || control.textContent?.trim() || control.getAttribute("id"), height: rect.height, width: rect.width };
        }).filter(control => control.height > 0);
        return { path: location.pathname, viewport: innerWidth, moduleWidth: module.getBoundingClientRect().width, heading: el.textContent, fontSize: style.fontSize, lineHeight: style.lineHeight, controls };
      }));
      await page.screenshot({ path: testInfo.outputPath(`route-${width}-${index}.png`), fullPage: true });
    }
  }
  const measurementsPath = testInfo.outputPath("route-measurements.json");
  await writeFile(measurementsPath, JSON.stringify(measures, null, 2));
  await testInfo.attach("route-measurements.json", { path: measurementsPath, contentType: "application/json" });
});
