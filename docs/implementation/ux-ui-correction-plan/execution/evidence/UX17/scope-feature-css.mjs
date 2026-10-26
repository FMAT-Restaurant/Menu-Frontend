import fs from "node:fs";
import crypto from "node:crypto";
import process from "node:process";
import postcss from "postcss";

const files = ["catalog", "categories", "entries", "offers", "recipes"].map(area => `src/features/${area}/styles.css`);
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const declarations = root => { const values = []; root.walkDecls(decl => values.push([decl.prop, decl.value, decl.important])); return JSON.stringify(values); };
const conditions = root => { const values = []; root.walkAtRules(rule => values.push([rule.name, rule.params])); return JSON.stringify(values); };
const report = [];
for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const root = postcss.parse(before, { from: file });
  const originalDeclarations = declarations(root);
  const originalConditions = conditions(root);
  let prefixed = 0;
  let existing = 0;
  root.walkRules(rule => {
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === "atrule" && /keyframes$/i.test(parent.name)) return;
    }
    rule.selectors = rule.selectors.map(selector => {
      if (selector.includes(".menu-module") || selector.includes("[data-menu-module]")) { existing++; return selector; }
      prefixed++;
      return `:where(.menu-module[data-menu-module]) ${selector}`;
    });
  });
  const after = root.toString();
  const parsed = postcss.parse(after, { from: file });
  if (declarations(parsed) !== originalDeclarations || conditions(parsed) !== originalConditions) throw new Error(`Unexpected declaration or condition change: ${file}`);
  fs.writeFileSync(file, after);
  report.push({ file, beforeSha256: hash(before), afterSha256: hash(after), prefixed, existing, declarationsAndConditionsPreserved: true });
}
fs.writeFileSync("docs/implementation/ux-ui-correction-plan/execution/evidence/UX17/css-scope-report.json", JSON.stringify(report, null, 2));
process.stdout.write(JSON.stringify(report.map(({ file, prefixed, existing }) => ({ file, prefixed, existing })), null, 2));
