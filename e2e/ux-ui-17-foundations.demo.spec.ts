import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const consumers = [
  { path: "/", title: ".entry-card h2", frame: ".entry-card", padding: ".entry-card__body", radius: "12px" },
  { path: "/categories", title: ".category-row h3", frame: ".category-row", padding: ".category-row", radius: "8px" },
  { path: "/recipes", title: ".recipe-card h3", frame: ".recipe-card", padding: ".recipe-card", radius: "12px" },
  { path: "/entries/demo-entry-burger/offers", title: ".offer-card__content h2", frame: ".offer-card", padding: ".offer-card__content", radius: "12px" },
  { path: "/entries/demo-entry-burger/offers/demo-offer-burger/edit", title: ".slot-card__title", frame: ".slot-card", padding: ".slot-card__header", radius: "12px" },
];

for (const width of [390, 1440]) {
  test(`UX17 equivalent component titles and spacing follow DESIGN at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const results = [];
    const errors: string[] = [];
    const api: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
    for (const [index, consumer] of consumers.entries()) {
      await page.goto(consumer.path);
      await expect(page.locator(consumer.title).first()).toBeVisible();
      const result = await page.evaluate(({ title, frame, padding }) => {
        const typography = (element: Element) => { const style = getComputedStyle(element); return { size: style.fontSize, line: style.lineHeight, weight: style.fontWeight }; };
        const box = getComputedStyle(document.querySelector(padding)!);
        return { path: location.pathname, heading: typography(document.querySelector("[data-route-heading]")!), title: typography(document.querySelector(title)!),
          radius: getComputedStyle(document.querySelector(frame)!).borderRadius,
          padding: [box.paddingTop, box.paddingRight, box.paddingBottom, box.paddingLeft] };
      }, consumer);
      results.push({ ...result, expectedRadius: consumer.radius });
      await page.screenshot({ path: info.outputPath(`role-${index}.png`) });
    }
    const json = info.outputPath("foundations.json");
    await writeFile(json, JSON.stringify({ width, results, errors, api }, null, 2));
    await info.attach("foundations", { path: json, contentType: "application/json" });
    for (const result of results) {
      expect(result.heading, result.path).toEqual({ size: "28px", line: "36px", weight: "700" });
      expect(result.title, result.path).toEqual({ size: "18px", line: "26px", weight: "600" });
      expect(result.radius, result.path).toBe(result.expectedRadius);
      for (const value of result.padding) expect(Number.parseFloat(value) % 4, `${result.path}: padding ${value}`).toBe(0);
    }
    expect(errors).toEqual([]);
    expect(api).toEqual([]);
  });
}
