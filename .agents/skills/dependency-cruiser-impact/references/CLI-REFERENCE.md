# Dependency-cruiser CLI reference for agents

The examples use PowerShell from the repository root. Replace paths and roots with real project locations. Commands assume `dependency-cruiser` is already installed locally.

## Command decision table

| Task | Preferred command |
| --- | --- |
| Check installation | `npx --no-install depcruise --version` |
| Produce full graph | `npx --no-install depcruise src -T json -f .analysis/dependencies.json` |
| Include TypeScript-only import dependencies | Add `--ts-pre-compilation-deps` where appropriate |
| Resolve TypeScript aliases | Use the project's actual `--ts-config tsconfig.app.json` or its dependency-cruiser config |
| Render complete relationship list from JSON | `npx --no-install depcruise-fmt -T text .analysis/dependencies.json` |
| Query exact file's direct neighborhood from JSON | `npx --no-install depcruise-fmt -T text --focus "^src/lib/pricing\.ts$" .analysis/dependencies.json` |
| Query 2-hop neighborhood by re-cruising | `npx --no-install depcruise src --focus "^src/lib/pricing\.ts$" --focus-depth 2 -T text` |
| Query reverse transitive consumers by re-cruising | `npx --no-install depcruise src --reaches "^src/lib/pricing\.ts$" -T text` |
| Query Git-change-based impact by re-cruising | `npx --no-install depcruise src --affected main -T text` |
| Create Mermaid from JSON | `npx --no-install depcruise-fmt -T mermaid -f .analysis/dependencies.mmd .analysis/dependencies.json` |
| Summarize module groups from JSON | `npx --no-install depcruise-fmt -T text --collapse 2 .analysis/dependencies.json` |

Do not pass `--focus-depth`, `--reaches`, or `--affected` to `depcruise-fmt`; they belong to the source-analyzing `depcruise` command. `--focus` on `depcruise-fmt` is limited to directly connected modules.

## Scoping rules

- For a reverse-dependency question, the input crawl needs to include potential consumers. Indexing only `src/lib/pricing.ts` is not enough to identify other modules that import it.
- Include relevant workspace packages, test roots, and generated/type files when they matter. Do not blindly scan build outputs, vendor directories, or packages irrelevant to the task.
- Respect `.dependency-cruiser.*` settings; `includeOnly`, `exclude`, and `doNotFollow` can hide otherwise real edges.
- When TS aliases are unresolved, inspect which `tsconfig` owns the code. In multi-project setups, avoid forcing a single wrong config across unrelated workspaces.
- If checking a monorepo, create one graph per appropriate scope or a configured workspace-wide graph; state cross-scope gaps.
- Validate the target path as it appears in the graph, with `/` separators; CLI focus parameters are **regular expressions**, not literal filenames.

## Results and trade-offs

A dependency edge:

```text
src/pages/OffersPage.tsx → src/api/offers.ts
```

means `OffersPage.tsx` depends on `offers.ts`. It does not mean `offers.ts` depends on `OffersPage.tsx`.

**Outgoing edges** help identify likely implementation context. **Incoming edges** help identify likely regression/test candidates. Neither means a file must be changed.

Use `depcruise-fmt` when the graph is already fresh: it reformats stored JSON without reading/parsing all source files again. Use `depcruise` for graph construction, depth-limited neighborhoods, and reverse-transitive or Git-change-based impact queries. That may cost more CPU/I/O, so do it selectively.

## Quick verification checklist

1. The commands actually ran successfully (including nonzero exit diagnostics).
2. The JSON is valid, has a `modules` array, and contains at least one expected source.
3. Expected local dependencies resolve to real project paths rather than unexplained unresolved imports.
4. Configuration and include/exclude behavior are recorded.
5. The graph was regenerated after meaningful import/export/branch changes.
6. Any transitive analysis states which root directories were scanned.
7. The agent reports concrete evidence and caveats, not an unqualified guarantee of safety.

## Official references

- CLI reference: https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md
- Options reference: https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md
- Main repository: https://github.com/sverweij/dependency-cruiser
