---
name: ts-morph-function-dependencies
description: Inspect the direct outgoing static dependencies of one named TypeScript or TSX function/method with ts-morph while planning, implementing, reviewing, or testing changes. Resolve calls, constructors, and referenced project-level values without constructing a repository-wide call graph.
compatibility: Node.js and a TypeScript/TSX repository. Requires ts-morph installed locally and a usable tsconfig. Run from repository root. Analysis is read-only.
metadata:
  version: "1.0.0"
  language: en
---

# Inspect one function's dependencies with ts-morph

## When to use

Use this skill when an issue or implementation task points to a **specific function or class method** and you need to understand what that function directly relies on before editing it. Use it again after meaningful edits to confirm how the function's outgoing dependencies changed.

**Scope: exactly one selected function or method per invocation.** This skill is independent of file-level dependency tools. Do not create or request a project-wide graph, enumerate every function, recursively walk callees, or claim to identify all affected consumers.

## Operating rules

1. Identify the **real file and callable name** from the repository. Do not invent file paths or infer a function from similarly named imports.
2. Choose the correct `tsconfig` for the source. Prefer `tsconfig.app.json` for Vite application code if the root config only references other projects; use another config when appropriate.
3. Use the bundled **read-only, on-demand** `scripts/analyze-function.mjs`. It loads TypeScript compiler context to resolve symbols, but traverses **only the selected function body** for the report.
4. First inspect direct call and constructor relationships. Review captured project-level references if they matter to the change.
5. Open the specific source definitions indicated by the report only when needed. Do not treat the report as a substitute for understanding behavior, state, validation, side effects, or tests.
6. Distinguish **static declaration resolution** from **runtime dispatch**. A method call resolved to an interface or base class is not proof of the concrete implementation used at runtime.
7. Explicitly disclose unresolved calls, dependency injection, callbacks, dynamic code, or missing TS resolution. Do not claim completeness.
8. **No transitive expansion by default.** Inspect an individual callee with a separate targeted invocation only when the issue requires it.

## Setup

At the **repository root**:

```powershell
# Inspect existing dependency first; do not silently change the repository.
npm ls ts-morph --depth=0
```

If it is missing, request permission or follow the repository's dependency policy, then install locally:

```powershell
npm install --save-dev ts-morph
```

Run the skill from its installed directory under the project, for example `.agents/skills/ts-morph-function-dependencies`. The script resolves the locally installed `ts-morph` from ancestor `node_modules` directories. It is not a globally installed command.

## Core commands

```powershell
# Named exported or top-level function
node .agents/skills/ts-morph-function-dependencies/scripts/analyze-function.mjs --tsconfig tsconfig.app.json --file src/services/offers.ts --function createOffer

# Class method (ClassName.method)
node .agents/skills/ts-morph-function-dependencies/scripts/analyze-function.mjs --tsconfig tsconfig.app.json --file src/services/OfferService.ts --function OfferService.createOffer

# Machine-readable result for a planning agent
node .agents/skills/ts-morph-function-dependencies/scripts/analyze-function.mjs --tsconfig tsconfig.app.json --file src/services/offers.ts --function createOffer --format json
```

Supported targets: top-level **named function declarations**, top-level **variable-assigned arrow/function expressions** (`const createOffer = () => {}`), and **class methods** (`OfferService.createOffer`). Unsupported targets such as anonymous default exports, arbitrary nested or object-literal methods, overload-only signatures, and arbitrary expressions require a focused extension or manual inspection. Fail clearly; do not silently select a different callable.

## How to interpret the report

- `calls[]`: call expressions and `new` expressions syntactically inside the selected function body. Each shows the expression, call-site line, declaration location if statically resolved, and whether it appears in a nested function/callback.
- `externalValues[]`: best-effort project-level value symbols referenced within that function whose declarations are outside the selected callable, excluding local variables and parameters. **Not a complete data-flow, mutation, or captured-closure analysis.**
- `resolution: unresolved`: the analyzer could not identify a declaration. Inspect the code; do not conclude the dependency is absent.
- `declaredAt.scope: dependency` or `typescript-lib`: TypeScript resolves the symbol to a third-party or standard declaration, not necessarily the runtime implementation.
- `nestedCallbackOrFunction: true`: code is lexically inside the target function but executes only if and when the nested function runs. Do not count it as an unconditional call.
- A resolved location is **evidence of a declaration**, not evidence of a runtime call path or behavioral coupling.

**Important:** A call or external reference is a dependency *candidate*. Whether changes to that dependency require changing the target is an engineering decision, not something this script proves.

## Protocol for PLANNING a change

1. From the issue description, locate the exact function or method.
2. Run one targeted query and summarize:
   - Resolved project-local callees and constructors.
   - Third-party/built-in/unresolved calls, where relevant.
   - Shared constants, config, and other project-level references.
   - Nested callback calls and obvious dynamic dispatch caveats.
3. Inspect the few definitions that affect the requested behavior. Determine whether their contracts or side effects constrain the proposed change.
4. List **likely edit targets**, **possible risks**, and **tests to run**. Do not infer reverse impact from an outgoing-only report.
5. When dividing work among agents, mark unclear shared contracts for coordination rather than assuming that every common callee causes a conflict.

## Protocol for IMPLEMENTATION and REVIEW

1. Run a baseline query before editing, when the function is non-trivial.
2. Modify only the code required by the issue; do not edit every function in the report.
3. Re-run the query if added/removed calls, constructor usages, config reads, or dependencies meaningfully change.
4. Review whether the new calls have the correct contracts and error handling; run focused unit/integration tests and project checks as appropriate.
5. Report any remaining unresolved/dynamic dependencies and the tests actually executed.

## Response template

```text
Target: <path>::<function or Class.method>
Direct calls/constructors: <names and declaration paths>
Project-level references: <relevant shared values/config>
Unresolved or dynamic: <items and why they matter>
Likely impact: <specific implementation and testing implications>
Scope caveat: one-function outgoing static analysis; no reverse or transitive guarantee
```

Keep the report short. Do not paste a massive JSON dump into an issue when a concise summary with source locations suffices.

## Safety and limits

- `ts-morph` does **not** provide a complete dynamic call graph. Reflection, JavaScript dynamic property access, DI wiring, dispatch through interfaces, closure invocation, runtime configuration and side-effect relationships may require further code inspection or execution traces.
- The script **does not modify source files**. It does instantiate a TypeScript project/type checker, which may be memory-intensive for very large codebases. Avoid repeated calls when unnecessary.
- No reverse-dependency lookup or function-level consumer graph is provided. Use a different, specifically justified analysis for incoming calls.
- Keep repository paths and output free of secrets; do not include `.env` contents or values in reports.

For argument details and known limitations, see [Reference](references/USAGE.md).
