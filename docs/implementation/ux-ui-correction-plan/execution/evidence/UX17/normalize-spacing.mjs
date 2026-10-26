import fs from "node:fs";
import postcss from "postcss";

const files = ["src/features/offers/styles.css", "src/shared/primitives.css"];
const changes = [];
for (const file of files) {
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  root.walkDecls(decl => {
    let next = decl.value;
    if (file.includes("offers/") && decl.prop === "gap" && decl.value === "6px") next = "8px";
    if (file.includes("offers/") && decl.prop === "gap" && decl.value === "10px") next = "12px";
    if (file.includes("offers/") && decl.prop === "padding" && decl.value === "14px 16px") next = "16px";
    if (file.includes("offers/") && decl.prop === "padding" && decl.value === "14px 20px") next = "16px 20px";
    if (file.includes("offers/") && decl.prop === "margin-bottom" && decl.value === "6px") next = "8px";
    if (decl.prop === "margin" && decl.value === "14px 0 16px auto") next = "16px 0 16px auto";
    if (next !== decl.value) { changes.push({ file, selector: decl.parent.selector, property: decl.prop, before: decl.value, after: next }); decl.value = next; }
  });
  fs.writeFileSync(file, root.toString());
}
fs.writeFileSync("docs/implementation/ux-ui-correction-plan/execution/evidence/UX17/spacing-corrections.json", JSON.stringify(changes, null, 2));
