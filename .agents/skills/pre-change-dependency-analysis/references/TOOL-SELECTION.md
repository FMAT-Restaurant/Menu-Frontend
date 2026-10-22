# Tool selection and evidence guide

Use this reference **only when choosing a concrete analyzer** for a real pre-change decision. Examples are illustrative, not mandatory. Check the repository's own available tools and version-specific help before executing commands.

## Question → evidence → tool category

| Engineering question | Evidence needed | Good starting point |
| --- | --- | --- |
| What does this file depend on? | Imports, module references, package boundaries | Module dependency analyzer, compiler index, language server |
| What depends on this file? | Reverse imports, public consumers, re-exports | Reverse module dependency query, full-scoped index, symbol references |
| What does this function call? | Resolved call sites and declarations | IDE/LSP call hierarchy, compiler AST or semantic analyzer |
| Who calls this function? | References, call hierarchy incoming edges | IDE/LSP incoming calls and find references; verify actual call sites |
| What value/config/state is used here? | Reads, writes, resolved symbols, runtime wiring | Semantic index, AST, code inspection, tests, runtime tracing |
| What service is affected? | API schemas, event producers/consumers, config and runtime edges | OpenAPI/AsyncAPI, service contracts, logs/traces, architecture docs |
| Will this edit break an API? | Public contract, callers, versioning, tests | Compiler/type checker, reverse references, contract tests |
| Will two issues conflict? | Planned edit files, overlapping contracts, dependency prerequisites | Git diff/PR review plus targeted relationship queries |

## Examples by ecosystem

| Ecosystem | File/module-level starting points | Function/symbol-level starting points | Important caution |
| --- | --- | --- | --- |
| JavaScript / TypeScript | dependency-cruiser, TypeScript compiler/module resolution, IDE imports | ts-morph, TypeScript language service, IDE references/call hierarchy | Import graphs do not establish call paths; TypeScript type imports may differ from runtime imports. |
| Java / JVM | IDE package/class dependency views, `jdeps` for compiled classes, ArchUnit for architecture checks | IDE call hierarchy, compiler-aware navigation, semantic analysis | `jdeps` analyzes compiled classes/JARs and does not by itself resolve business or Spring DI relationships. |
| Python | Import graph tools such as pydeps, static AST/import analysis | Python language-server references, Jedi, AST/semantic inspection | Dynamic imports, monkey patching and duck typing can evade static analysis. |
| Go | `go list` package dependencies, IDE/package views | `gopls` references/call hierarchy | Package dependencies are not automatically a complete file-level or dynamic call graph. |
| Rust | `cargo tree` for crate dependencies, rust-analyzer module/navigation | rust-analyzer references/call hierarchy | Crate dependencies are broader than actual call sites; traits and macros complicate resolution. |
| C# / .NET | Project references / MSBuild dependency information, IDE dependency views | Roslyn/IDE find references and call hierarchy | Dependency injection, reflection, generated code and runtime registration need separate checks. |
| C / C++ | Compiler include data, clang tooling, IDE include hierarchy | clangd references/call hierarchy, compiler AST | Preprocessor configuration, templates and virtual dispatch matter. |
| Mixed or unfamiliar stack | IDE/LSP navigation, existing build/manifest metadata, precise text search | IDE references, language-specific AST/compiler tool if available | Do not mistake textual name matches for resolved dependencies. |

### Existing specialized skills (optional)

- `dependency-cruiser-impact`: use when available and the repository is JavaScript/TypeScript and the decision needs file-level relationships. Prefer a current JSON index and focused native CLI queries.
- `ts-morph-function-dependencies`: use when available and the repository is TypeScript/TSX and the decision needs one selected function's **outgoing** static calls or external references. It does not establish incoming calls or runtime dispatch.

This skill must still work when neither specialized skill is installed. Use appropriate alternatives instead of blocking.

## Examples of narrow queries (not a mandatory workflow)

The following apply only when the named tool already exists in the project and its input/configuration have been verified.

### JavaScript / TypeScript: file-level inspection

If a current dependency-cruiser JSON graph already exists:

```sh
npx --no-install depcruise-fmt -T text --focus '^src/services/offerService\.ts$' .analysis/dependencies.json
```

This is a **direct-neighbor** query on an existing graph. The full graph must have been built with sufficient roots and resolution configuration to include reverse consumers. Do not treat an absent result as proof the file is unused.

If a fresh, deeper reverse-dependency investigation is justified:

```sh
npx --no-install depcruise src --reaches '^src/services/offerService\.ts$' -T text
```

This re-analyzes sources; avoid if direct relationships already answer the decision. Actual CLI behavior and config can vary by installed version.

### Java: class/package dependencies

`jdeps` accepts compiled `.class`, directory or JAR inputs, not arbitrary uncompiled Java source files. For function/method references, use a symbol-aware IDE or language server instead. Dependency injection and cross-service contracts require separate evidence.

### Symbol-level investigation, any supported language

Start with **Go to Definition**, **Find All References**, and **Call Hierarchy** if offered by the project's language server/IDE. Incoming call hierarchy and all references are not equivalent; inspect actual usages and whether they are calls, callbacks, overrides, registrations, tests, or non-call references.

Use a dedicated semantic analyzer (such as ts-morph for TypeScript or Roslyn for C#) only when normal navigation cannot answer the specific decision. A text search is a useful fallback for discovery, not reliable proof of symbol identity.

## How to interpret evidence

| Evidence status | Meaning | Allowed conclusion |
| --- | --- | --- |
| Confirmed static relationship | An analyzer resolves an import, symbol, or declaration under stated configuration | A structural relation exists in the analyzed version |
| Confirmed contract relation | Verified schema, test, API/event documentation, registration, or explicit code contract | The contract connects the components under its stated assumptions |
| Observed runtime relationship | Tracing/logging/test observation with relevant context | The interaction occurred under observed conditions |
| Inferred impact | A plausible effect derived from the above | Worth checking, **not** a confirmed failure or mandatory edit |
| Unknown/unresolved | Missing scope, dynamic behavior, stale index, or failed resolution | Investigate if material; do not claim absence |

## Decision questions worth asking

- Would changing this function's signature or return type affect a caller? Which callers actually rely on it?
- Are callers using stable public contracts or reaching across architectural boundaries?
- Is the dependency necessary, or can the change remain localized?
- Could this introduce a cycle, inappropriate layering, or extra network calls?
- Are there effects on transactions, state, events, configuration, or persistent data that static tools miss?
- Which smallest test set covers the changed behavior and its consumers?
- Which evidence would actually change the implementation plan, and can the analysis stop now?

## Scope and reproducibility

State key provenance when needed: repository revision/worktree, path, tool, input roots, relevant filters/config, whether queries examine sources or an existing index, and any unresolved or runtime-only relationships.

**Never** imply that a dependency inventory by itself proves functional correctness, test coverage, safe parallelism, or completeness of impact analysis.
