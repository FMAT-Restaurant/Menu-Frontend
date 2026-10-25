import { expect, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

export async function moneyEvidence(page: Page, info: TestInfo, name: string) {
  const geometry = await page.evaluate(() => {
    const rect = (element: Element) => {
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const module = document.querySelector("[data-menu-module]")!;
    const selectors = [".offer-card__price", "#offer-price-preview", "label[for=offer-price-input]", ".price-prefix", "#offer-price-input", ".offer-review-price span", ".offer-review-price strong"];
    return {
      module: rect(module), viewport: innerWidth, scroll: module.scrollWidth,
      fields: selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(element => {
        const style = getComputedStyle(element);
        const range = document.createRange(); range.selectNodeContents(element);
        return { selector, text: element.textContent, ...rect(element), parent: rect(element.parentElement!),
          textRects: [...range.getClientRects()].map(r => ({ left: r.left, right: r.right })),
          align: style.textAlign, weight: style.fontWeight };
      })),
      controls: [...document.querySelectorAll(".offer-commercial-info input:not([type=file]):not([type=radio]), .offer-form button, .offer-form .button, .offer-card button")]
        .filter(element => element.getBoundingClientRect().height > 0).map(element => {
          const form = element.closest(".offer-form");
          const offers = element.closest(".offers-page");
          const minimum = form ? (form.getBoundingClientRect().width < 768 ? 48 : 40)
            : offers && offers.getBoundingClientRect().width < 1200 ? 48 : 40;
          return { text: element.textContent, minimum, ...rect(element) };
        }),
    };
  });
  const json = info.outputPath(`${name}.json`);
  await writeFile(json, JSON.stringify(geometry, null, 2));
  await info.attach(name, { path: json, contentType: "application/json" });
  const png = info.outputPath(`${name}.png`);
  await page.screenshot({ path: png, fullPage: true });
  await info.attach(`${name}-image`, { path: png, contentType: "image/png" });
  // Persist the measured state before asserting, including states that fail geometry.
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.module.width + 1);
  for (const field of geometry.fields) {
    expect(field.left, field.selector).toBeGreaterThanOrEqual(geometry.module.left - 1);
    expect(field.right, field.selector).toBeLessThanOrEqual(geometry.module.right + 1);
    expect(field.left, field.selector).toBeGreaterThanOrEqual(field.parent.left - 1);
    expect(field.right, field.selector).toBeLessThanOrEqual(field.parent.right + 1);
    for (const text of field.textRects) {
      expect(text.left, field.selector).toBeGreaterThanOrEqual(field.left - 1);
      expect(text.right, field.selector).toBeLessThanOrEqual(field.right + 1);
    }
    if ([".offer-card__price", "#offer-price-preview", "#offer-price-input", ".offer-review-price strong"].includes(field.selector)) {
      expect(field.align).toBe("right");
      expect(["600", "700"]).toContain(field.weight);
    }
  }
  for (const [first, second] of [[".price-prefix", "#offer-price-input"], [".offer-review-price span", ".offer-review-price strong"]]) {
    const a = geometry.fields.find(field => field.selector === first);
    const b = geometry.fields.find(field => field.selector === second);
    if (a && b) expect(a.right <= b.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1, `${first} and ${second} must not overlap`).toBe(true);
  }
  for (const control of geometry.controls) expect(control.height, control.text ?? "control").toBeGreaterThanOrEqual(control.minimum);
  return geometry;
}
