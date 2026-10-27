# Usage and interpretation reference

## Commands

| Need | Example |
|---|---|
| Show dependencies of a top-level function | `node .agents/skills/ts-morph-function-dependencies/scripts/analyze-function.mjs --file src/a.ts --function save` |
| Show dependencies of a class method | `node .agents/skills/ts-morph-function-dependencies/scripts/analyze-function.mjs --file src/A.ts --function A.save` |
| Use application TypeScript config | Add `--tsconfig tsconfig.app.json` |
| Return machine-readable results | Add `--format json` |
| Show CLI help | Add `--help` |

All paths are resolved from **the working directory**, normally the repository root. Select a TS config containing the relevant code and its path mappings. Avoid running from the skill's own directory.

## Dependency model

A function's outgoing dependencies are approximated as:

1. **Call expressions:** `priceFor(offer)`, `repository.save(offer)`, `logger.info(...)`.
2. **Constructors:** `new PricePolicy(...)`.
3. **Referenced project values:** configuration constants, shared objects and values declared outside the function body.

Nested callback bodies are included as **lexically contained potential dependencies** but explicitly marked; they are not unconditional direct execution edges.

The report does **not** recursively open or analyze callees, trace variables through the whole program, determine runtime DI injection targets, or locate reverse callers. Type-only dependencies and implicit effects are not exhaustively indexed. Caller-specific behavior and test selection must still be reasoned about.

## Choosing what to inspect next

- If a call resolves to a project function and the change affects its contract: open the definition and inspect parameters, return values, errors and side effects.
- If a method resolves to an interface/base type: find the concrete implementation using targeted searches or runtime/DI configuration; note uncertainty.
- If a call resolves only to `.d.ts` in `node_modules`: use package documentation or implementation code when behavior matters.
- If a callee is unresolved: inspect computed property access, indirect functions, external module resolution and TypeScript configuration. Do not assign a fictional target.
- If many calls are nested: identify which callbacks run synchronously, asynchronously, or conditionally before inferring impact.
- If a function is an anonymous default export or nested declaration: inspect manually or adapt this focused script; never select a different symbol silently.

## Good planning output

```text
Target: src/services/offers.ts::createOffer
Calls: validateOffer (same file), calculatePrice (src/pricing.ts), repository.save (interface declaration)
Project values: DEFAULT_TAX_RATE (src/config/pricing.ts)
Unresolved/dynamic: none found; concrete repository implementation unknown
Likely checks: price validation, persistence error handling, unit tests for offer creation
Scope: outgoing static dependencies only; no reverse-call analysis
```

## Potential performance costs

`new Project({ tsConfigFilePath })` loads a TypeScript project and uses its type checker. For very large monorepos, setup and symbol resolution can be substantial even though **only the target function body is traversed for results**. Avoid calling this once for every function in the repo. When there is a real need for high-volume repeated queries, consider a reusable worker process; do not add one preemptively.

## Sources

- https://ts-morph.com/setup/
- https://ts-morph.com/details/expressions
- https://ts-morph.com/details/identifiers
- https://ts-morph.com/navigation/finding-references
- https://ts-morph.com/navigation/getting-source-files
