import type { Page, TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

export async function routeEvidence(page: Page, info: TestInfo, name: string) {
  const data = await page.evaluate(() => {
    const active = document.activeElement;
    const box = active?.getBoundingClientRect();
    return { url: location.href, title: document.title,
      focus: active ? { tag: active.tagName, text: active.textContent, id: active.id, returnKey: active.getAttribute("data-return-key"), heading: active.hasAttribute("data-route-heading"), box: box ? { top: box.top, bottom: box.bottom, left: box.left, right: box.right } : null } : null,
      headings: [...document.querySelectorAll("[data-route-heading]")].map(node => node.textContent),
      statuses: [...document.querySelectorAll('[role="status"]')].map(node => node.textContent),
      dialogs: document.querySelectorAll("dialog[open]").length,
      extraLiveAnnouncements: document.querySelectorAll("[data-route-context][aria-live]").length,
      viewport: { width: innerWidth, height: innerHeight } };
  });
  const json = info.outputPath(`${name}.json`);
  await writeFile(json, JSON.stringify(data, null, 2));
  await info.attach(name, { path: json, contentType: "application/json" });
  const png = info.outputPath(`${name}.png`);
  await page.screenshot({ path: png });
  await info.attach(`${name}-image`, { path: png, contentType: "image/png" });
  return data;
}
