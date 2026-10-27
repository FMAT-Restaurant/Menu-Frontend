---
name: dependency-cruiser-impact
description: Use dependency-cruiser to inspect JavaScript/TypeScript file-level dependencies and reverse dependents before planning, dividing, implementing, or reviewing issues. Prefer the native CLI and cached JSON reports; escalate to deeper analysis only when the change warrants it.
compatibility: Requires a JavaScript/TypeScript repository with Node.js, dependency-cruiser installed locally, and permission to run its CLI. Run commands from the repository root. Examples use PowerShell but the dependency-cruiser flags are shell-independent.
metadata:
  version: "2.0.0"
  language: en
---

# Dependency analysis for planning and implementing issues

## Purpose

Use dependency-cruiser as a **file/module dependency index**, not as an oracle of runtime or business impact. Find enough context to plan or implement a change reliably without reading the entire repository.

**Default strategy: native commands only.** Do not create or invoke a custom graph-query script for ordinary issues. Generate a complete project-scoped JSON graph once when necessary, then reuse `depcruise-fmt` for fast, direct-neighbor inspection. Use a fresh `depcruise` run with `--reaches`, `--focus-depth`, or `--affected` only when the question actually needs those capabilities.

## 0. Establish scope and tool availability

1. From the repository root, inspect the package manager and existing `package.json` scripts, dependency-cruiser configuration (`.dependency-cruiser.*`), TypeScript configuration, and workspace structure.
2. Verify dependency-cruiser is installed locally:
   ```powershell
   npx --no-install depcruise --version
   npx --no-install depcruise-fmt --help
   ```
   If unavailable, check the repository's normal installation process. Do **not** silently install packages, modify a lockfile, or run an unapproved remote executable.
3. Choose the **full relevant source scope**, not just the target file, if you need to identify reverse dependents. Example: `src`, `test`, `packages/*/src` as appropriate. A crawl starting at a single file cannot establish who else imports that file.
4. Check filters and resolution configuration: `includeOnly`, `exclude`, `doNotFollow`, path aliases, and the right TS project (`tsconfig.app.json` may be more appropriate than `tsconfig.json`). Missing nodes may mean *excluded or unresolved*, not unused.
5. Use an existing JSON graph only when its commit/worktree state, input roots, configuration, and TypeScript resolution settings are known to match the current task. Otherwise rebuild it.

## 1. Build a reusable graph only when needed

PowerShell example (adjust roots and tsconfig; do not add directories that do not exist):

```powershell
New-Item -ItemType Directory -Force .analysis | Out-Null
npx --no-install depcruise src --ts-config tsconfig.app.json --ts-pre-compilation-deps -T json -f .analysis/dependencies.json
```

- `-T json` exports the graph (all detected relations within the configured scope, not only rule violations).
- `--ts-pre-compilation-deps` includes TypeScript-only dependencies that disappear after compilation, which can matter for changes to shared types; omit if unsuitable for the repository.
- Respect existing project configuration. Do not bypass rules or exclusions merely to make output look clean; report missing coverage explicitly.
- Record graph provenance: revision or working tree state, roots, config, TS config, and creation time. Store reports as temporary/generated artifacts unless the repository explicitly tracks them.

**Sanity-check before trusting the graph:** inspect the JSON's `modules` and dependency entries, confirm known internal imports resolve to expected files, and investigate unexpected unresolved imports or missing target modules.

For rapid reuse without re-parsing source files:

```powershell
npx --no-install depcruise-fmt -T text .analysis/dependencies.json
npx --no-install depcruise-fmt -T text --focus "^src/services/offerService\.ts$" .analysis/dependencies.json
```

`depcruise-fmt --focus` shows the matching file(s) and **direct neighbors in both directions**. A relation `A → B` means A depends on B. Separate **outgoing** imports from **incoming** consumers when interpreting the result; the display itself is not a business-impact verdict.

## 2. Choose the least expensive native command that answers the question

| Question | Command or approach | Cost / caveat |
| --- | --- | --- |
| What directly imports this file, and what does it import? | `depcruise-fmt -T text --focus "^src/services/offerService\.ts$" .analysis/dependencies.json` | Fast; reuses JSON; direct neighbors only. |
| Show all recorded file-level relationships | `depcruise-fmt -T text .analysis/dependencies.json` | Fast formatting, but output may be huge; avoid placing it all in agent context. |
| Explore neighbors up to two hops in either direction | `depcruise src --focus "^src/services/offerService\.ts$" --focus-depth 2 -T text` | Re-cruises code; use selectively. |
| Find direct and transitive consumers of the target | `depcruise src --reaches "^src/services/offerService\.ts$" -T text` | Re-cruises code; impact candidates, not guaranteed failures. |
| Find modules affected by changes since a Git revision | `depcruise src --affected main -T text` | Re-cruises code; confirm the correct base revision. |
| Create a diagram from an existing graph | `depcruise-fmt -T mermaid -f .analysis/dependencies.mmd .analysis/dependencies.json` | Fast formatting; use only when a diagram adds value. |

**Important:** `depcruise-fmt` supports `--focus`, `--include-only`, `--exclude`, `--collapse`, and reporters, but **not** the same transitive query options as `depcruise`. Do not tell an agent to pass `--focus-depth`, `--reaches`, or `--affected` to `depcruise-fmt`.

**Regex safety:** `--focus`, `--reaches`, etc. accept regular expressions rather than literal paths. Anchor a single-file query with `^` and `$`, and escape `.` in the extension as `\.`. Path strings in reports normally use `/` separators. Verify the actual normalized path before concluding a file has no dependencies.

See [CLI reference and examples](references/CLI-REFERENCE.md) for setup variants, troubleshooting, and interpretation.

## 3. Protocol: before PLANNING or DELEGATING an issue

1. Identify the likely entry points from the issue description (feature, route, service, component, shared type, and relevant tests). Locate concrete file paths with targeted filename/symbol search; do not guess paths.
2. For each candidate file, inspect **direct neighbors** using the existing graph. Prefer several small `--focus` outputs over dumping the entire graph.
3. Ask distinct questions:
   - **Outgoing:** Which imported modules must be understood to implement the change?
   - **Incoming:** Which consumers might be affected by the change?
4. Escalate only when justified: public interfaces, shared types, reusable components, barrel exports, changes with substantial fan-out, or issue-to-issue dependency questions may merit `--reaches`, `--focus-depth 2`, or `--affected`.
5. Compare issues on **proposed edit sets, shared contracts, and relevant consumers**. A shared import alone does **not** prove a merge conflict or a required sequencing constraint.
6. Prioritize prerequisites and likely critical-path work; parallelize independent changes where editing overlap and contract risk are low. Do not assume a graph edge is a task dependency.
7. Produce a short evidence-based plan with actual paths, risks, open questions, testing scope, and the graph's known limitations.

## 4. Protocol: during IMPLEMENTATION and REVIEW

1. Check that the graph is current for the branch/worktree. If another agent changes relevant imports, shared modules, or configuration, refresh before making new impact claims.
2. Read only the small set of code files justified by the issue and graph. A neighboring module is **a candidate for inspection**, not an automatic edit target.
3. Implement the change and validate direct consumers. Broaden to indirect consumers when altering exported APIs or shared data contracts.
4. If imports, exports, moved files, or module boundaries change, regenerate the JSON and re-run relevant native queries.
5. Run the repository's relevant unit/integration tests, type checks, lint checks, and/or build. A dependency graph does not substitute for runtime validation.
6. During review, report actual changed paths, consumers investigated, tests performed, and remaining unknowns. Never report 'no impact' solely because a filtered graph was empty.

## 5. Standard compact report

```markdown
### Dependency impact — ISSUE-123
- Graph: [commit or working tree], roots [...], config [...], TS config [...]; freshness: [verified/rebuilt/unknown]
- Target files: [path and reason]
- Direct outgoing dependencies: [important paths]
- Direct incoming dependents: [important paths]
- Further impact checks: [query and relevant findings, or "not needed"]
- Parallel work: [overlapping edit targets/contracts and coordination]
- Confidence and blind spots: [confirmed static edges vs possible runtime/business impact]
- Plan: [ordered modifications]
- Validation: [tests/checks; results after implementation]
```

If the target is absent, first inspect graph scope, normalized paths, filters, and unresolved dependencies; do not fabricate a clean bill of health. Keep full generated reports out of model context; cite precise file paths and the smallest relevant relations.

## 6. Hard limits

- Dependency-cruiser detects file/module-level relationships, **not** a complete function/method call graph. For precise symbol references or calls, use TypeScript-aware analysis or a separate authorized tool; do not infer those from import edges.
- Dynamic imports, aliases, runtime injection, reflection, framework wiring, network API calls, events, databases, and cross-service relationships may be incomplete or absent.
- `A → B → C` represents structural reachability, **not** proof that changing C will break A.
- Never modify dependency-cruiser config, introduce helper scripts, install new packages, or upload full graphs merely to satisfy this skill unless the task and permissions call for it.
